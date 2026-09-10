import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const userId = '00000000-0000-4000-8000-000000000001';
const otherId = '00000000-0000-4000-8000-000000000002';
const photo = 'data:image/png;base64,iVBORw0KGgo=';
let state;
mock.module('@supabase/supabase-js', { namedExports: {
  createClient(_url, _key, options) {
    state.clients.push(options);
    return {
      auth: { async getUser(token) { state.tokens.push(token); return state.auth; } },
      storage: { from(bucket) { assert.equal(bucket,'user_photos'); return {
        async createSignedUrl(path, duration) { state.paths.push({path,duration}); return state.storage; },
      }; } },
    };
  },
} });
mock.module('@google/genai', { namedExports: { GoogleGenAI: class {
  constructor(options) { state.providers.push(options); }
  models = { generateContent: async request => {
    state.generations.push(request);
    if (state.generateError) throw state.generateError;
    return state.response;
  } };
} } });
mock.module('../lib/ai/images.js', { namedExports: {
  imageURL: value => new URL(value),
  resolveImageURL: async url => { state.imageURLs.push(url); return {}; },
  fetchImage: async url => { state.imageURLs.push(url); return {mimeType:'image/png',data:'iVBORw0KGgo='}; },
} });
const { default: recommend } = await import('../api/ai/recommend.js');
const { default: validate } = await import('../api/ai/validate-photo.js');
const { default: visualize } = await import('../api/ai/visualize.js');
const { default: job } = await import('../api/ai/visualize/[jobId].js');
const { createBudget } = await import('../lib/ai/request.js');
const { generate } = await import('../lib/ai/generate.js');
const { parseGoogleCredentials } = await import('../api/ai/utils/auth.js');
beforeEach(() => {
  state = { clients:[],tokens:[],paths:[],providers:[],generations:[],imageURLs:[],
    auth:{data:{user:{id:userId}}}, storage:{data:{signedUrl:'https://photo.example.invalid/reference'}},
    response:{text:JSON.stringify({recommendedItemId:'item-1',reasoning:'Matches well.'})},
  };
  process.env.SUPABASE_URL='https://auth.example.invalid';
  process.env.SUPABASE_SERVICE_KEY='fixture-server-key';
  process.env.GEMINI_API_KEY='fixture-ai-key';
  for (const key of ['SUPABASE_PUBLISHABLE_KEY','SUPABASE_ANON_KEY','GOOGLE_APPLICATION_CREDENTIALS','GOOGLE_CLOUD_PROJECT_ID','TRYON_API_URL','TRYON_API_KEY']) delete process.env[key];
  globalThis.fetch = async () => { throw new Error('Unexpected network request in fixture'); };
});
function response() { return {headers:{},setHeader(k,v){this.headers[k]=v},status(code){this.code=code;return this},json(body){this.body=body;return this},end(){return this}}; }
async function call(handler, body, overrides={}) {
  const res=response();
  await handler({method:'POST',headers:{authorization:'Bearer fixture-token','content-type':'application/json'},body,...overrides},res);
  return res;
}
const recommendation = () => ({currentItem:{title:'Top'},historyItems:[{id:'item-1',meta:{title:'Skirt'}}],userId});
test('all AI routes reject missing credentials before Auth, Storage or providers', async () => {
  for (const handler of [recommend,validate,visualize]) assert.equal((await call(handler,null,{headers:{}})).code,401);
  assert.equal((await call(job,null,{method:'GET',headers:{},query:{jobId:'invented'}})).code,401);
  assert.equal(state.clients.length,0); assert.equal(state.generations.length,0); assert.equal(state.paths.length,0);
});
test('preflight and unsupported methods do no service work', async () => {
  const preflight=await call(recommend,null,{method:'OPTIONS'});
  assert.equal(preflight.code,200); assert.match(preflight.headers['Access-Control-Allow-Headers'],/Authorization/);
  assert.equal((await call(recommend,null,{method:'GET'})).code,405);
  assert.equal(state.clients.length,0);
});
test('malformed bodies and item fields are rejected before Auth', async () => {
  for (const body of [null,[],{}, {currentItem:{title:{}},historyItems:[]}, {currentItem:{},historyItems:Array(41).fill({})}]) assert.equal((await call(recommend,body)).code,400);
  assert.equal((await call(recommend,{...recommendation(),padding:'x'.repeat(128*1024)})).code,413);
  assert.equal((await call(recommend,recommendation(),{headers:{authorization:'Bearer fixture','content-type':'text/plain'}})).code,415);
  assert.equal(state.clients.length,0);
});
test('invalid, anonymous and unavailable Auth never reach providers', async () => {
  for (const auth of [{error:{status:401}}, {data:{user:null}}, {data:{user:{id:userId,is_anonymous:true}}}]) {
    state.auth=auth; assert.equal((await call(recommend,recommendation())).code,401);
  }
  state.auth={error:{status:503}}; assert.equal((await call(recommend,recommendation())).code,503);
  assert.equal(state.generations.length,0);
});
test('forged owner never reaches Storage', async () => {
  const result=await call(visualize,{userId:otherId,items:[{title:'Top'}]});
  assert.equal(result.code,403); assert.equal(state.paths.length,0); assert.equal(state.generations.length,0);
});
test('valid recommendation verifies the JWT and returns only a history match', async () => {
  const result=await call(recommend,recommendation());
  assert.equal(result.code,200); assert.equal(result.body.matchedItemId,'item-1');
  assert.deepEqual(state.tokens,['fixture-token']);
  assert.equal(state.clients[0].global.headers.Authorization,'Bearer fixture-token');
  assert.equal(state.clients[0].auth.persistSession,false);
  assert.equal(result.headers['Cache-Control'],'private, no-store');
  assert.equal(state.generations[0].config.httpOptions.retryOptions.attempts,1);
  assert.ok(state.generations[0].config.httpOptions.timeout <= 25000);
  assert.equal(state.generations[0].config.abortSignal.aborted,true);
  state.response={text:'{"recommendedItemId":"invented","reasoning":"wrong"}'};
  assert.equal((await call(recommend,recommendation())).body.recommendation,null);
});
test('provider errors do not leak sensitive error details or multiply quota failures', async () => {
  state.generateError=Object.assign(new Error('DO_NOT_EXPOSE'),{status:429});
  const result=await call(recommend,recommendation());
  assert.equal(result.code,502); assert.doesNotMatch(JSON.stringify(result.body),/DO_NOT_EXPOSE/);
  assert.equal(state.generations.length,1);
});
test('a missing model permits only the bounded alias fallback', async () => {
  state.generateError=Object.assign(new Error('missing'),{status:404});
  const result=await call(recommend,recommendation());
  assert.equal(result.code,502);
  assert.deepEqual(state.generations.map(x=>x.model),['gemini-2.5-flash','gemini-flash-latest']);
});
test('photo validation keeps PNG MIME and requires a genuine assessment shape', async () => {
  state.response={text:'{"valid":true,"reasoning":"Full body visible","missingParts":[]}'};
  const result=await call(validate,{image:photo});
  assert.equal(result.code,200); assert.equal(result.body.valid,true);
  assert.equal(state.generations[0].contents[1].inlineData.mimeType,'image/png');
  state.response={text:'{"valid":"false","reasoning":"bad","missingParts":[]}'};
  assert.equal((await call(validate,{image:photo})).code,502);
  state.generateError=Object.assign(new Error('capacity'),{status:503});
  assert.equal((await call(validate,{image:photo})).code,502);
});
test('invalid photo encodings and oversized arrays fail before generation', async () => {
  for(const image of [null,{},'bogus','data:image/jpeg;base64,iVBORw0KGgo=']) assert.equal((await call(validate,{image})).code,400);
  assert.equal((await call(validate,{image:'A'.repeat(3*1024*1024)})).code,413);
  assert.equal((await call(visualize,{items:Array(5).fill({})})).code,400);
  assert.equal(state.generations.length,0);
});
test('try-on signs only the verified owner and reports explicit simulation', async () => {
  delete process.env.GEMINI_API_KEY;
  const result=await call(visualize,{items:[{title:'Top'}]});
  assert.equal(result.code,200); assert.match(result.body.message,/Simulation mode/);
  assert.deepEqual(state.paths,[{path:`${userId}/reference.jpg`,duration:3600}]);
  assert.ok(result.body.expiresAt > Date.now());
  assert.equal(state.clients[0].global.headers.Authorization,'Bearer fixture-token');
});
test('missing reference photo fails before generation', async () => {
  state.storage={error:{message:'not found'}};
  assert.equal((await call(visualize,{items:[{image:'https://garment.example.invalid/a.png'}]})).code,404);
  assert.equal(state.generations.length,0);
});
test('external try-on sends verified identity once and has an abort signal', async () => {
  state.auth={data:{user:{id:'00000000-0000-4000-8000-000000000099'}}};
  process.env.TRYON_API_URL='https://provider.example.invalid/generate'; process.env.TRYON_API_KEY='fixture-provider';
  let requests=0;
  globalThis.fetch=async (_url,options)=>{
    requests++; assert.equal(JSON.parse(options.body).userId,state.auth.data.user.id);
    assert.ok(options.signal); assert.equal(options.redirect,'error');
    return new Response(JSON.stringify({poses:[{imageUrl:'https://result.example.invalid/one.png'}]}));
  };
  const result=await call(visualize,{items:[{image:'https://garment.example.invalid/a.png'}]});
  assert.equal(result.code,200); assert.equal(requests,1); assert.equal(state.generations.length,0);
});
test('image generation uses bounded downloads and one output candidate', async () => {
  state.auth={data:{user:{id:'00000000-0000-4000-8000-000000000098'}}};
  state.response={candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:'iVBORw0KGgo='}}]}}]};
  const result=await call(visualize,{items:[{image:'https://garment.example.invalid/a.png'}]});
  assert.equal(result.code,200); assert.equal(state.imageURLs.length,2);
  assert.equal(state.generations[0].config.candidateCount,1); assert.equal(result.body.poses.length,1);
});
test('unknown asynchronous jobs cannot fabricate successful completion', async () => {
  assert.equal((await call(job,null,{method:'GET',query:{jobId:'job_0'}})).code,404);
});
test('budget expiration aborts the operation and disallows subsequent work', async () => {
  const budget=createBudget(15); let aborted=false;
  await assert.rejects(budget.run(()=>new Promise(resolve=>budget.signal.addEventListener('abort',()=>{aborted=true;resolve()}))),{status:504});
  assert.equal(aborted,true); assert.throws(()=>budget.remaining(),{status:504}); budget.dispose();
});
test('invalid credential JSON never leaks, and valid strings retain whitespace', () => {
  const logs=[]; const original=console.warn; console.warn=(...args)=>logs.push(args.join(' '));
  try {
    process.env.GOOGLE_APPLICATION_CREDENTIALS='{"marker":"DO_NOT_LOG",broken}';
    assert.equal(parseGoogleCredentials(),null); assert.doesNotMatch(logs.join(),/DO_NOT_LOG/);
    const credentials={type:'service_account',project_id:'fixture',client_email:'fixture@example.invalid',private_key:'two  spaces\nnext'};
    for(const value of [JSON.stringify(credentials,null,2),JSON.stringify(JSON.stringify(credentials)),`'${JSON.stringify(credentials)}'`]) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS=value;
      assert.deepEqual(parseGoogleCredentials(),credentials);
    }
  } finally {console.warn=original;}
});
test('burst tracking keys come from verified users, with independent endpoints', async () => {
  state.auth={data:{user:{id:'00000000-0000-4000-8000-000000000097'}}};
  const body={currentItem:{title:'Top'},historyItems:[]};
  for(let i=0;i<10;i++) assert.equal((await call(recommend,body)).code,200);
  const result=await call(recommend,body);
  assert.equal(result.code,429); assert.ok(Number(result.headers['Retry-After']) > 0);
  state.response={text:'{"valid":true,"reasoning":"OK","missingParts":[]}'};
  assert.equal((await call(validate,{image:photo})).code,200);
});
test('Vertex credential configuration uses the bounded shared SDK', async () => {
  delete process.env.GEMINI_API_KEY;
  process.env.GOOGLE_CLOUD_PROJECT_ID='fixture-project';
  process.env.GOOGLE_APPLICATION_CREDENTIALS=JSON.stringify({type:'service_account',project_id:'fixture-project',client_email:'fixture@example.invalid',private_key:'synthetic'});
  const budget=createBudget(1000);
  try {await generate({budget,contents:'synthetic prompt'}); assert.equal(state.providers[0].vertexai,true); assert.equal(state.generations.length,1);}
  finally {budget.dispose();}
});
