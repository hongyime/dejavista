import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
mock.module('../src/sidepanel/utils/env.js',{namedExports:{VERCEL_API_URL:'https://api.example.invalid'}});
const { requestAI }=await import('../src/sidepanel/utils/ai.js');
const client={auth:{getSession:async()=>({data:{session:{access_token:'fixture-session'}}})}};
test('each extension AI action attaches its current session and cancels redirects', async () => {
  for(const endpoint of ['recommend','visualize','validate-photo']) {
    let signal;
    const result=await requestAI(client,endpoint,{fixture:true},{fetcher:async(url,options)=>{
      assert.equal(url,`https://api.example.invalid/api/ai/${endpoint}`);
      assert.equal(options.headers.Authorization,'Bearer fixture-session');
      assert.equal(options.redirect,'error'); signal=options.signal;
      return new Response('{"ok":true}');
    }});
    assert.equal(result.ok,true); assert.equal(signal.aborted,true);
  }
});
test('a signed-out extension never calls the AI API', async () => {
  await assert.rejects(requestAI({auth:{getSession:async()=>({data:{session:null}})}},'recommend',{}, {fetcher:()=>{throw Error('API must not be called')}}),/Sign in again/);
});
test('rate errors provide the retry delay', async () => {
  await assert.rejects(requestAI(client,'recommend',{}, {fetcher:async()=>new Response('{"retryAfter":17}',{status:429})}),/17 seconds/);
});
test('deadline covers session lookup and the response body', async () => {
  await assert.rejects(requestAI({auth:{getSession:()=>new Promise(()=>{})}},'recommend',{}, {timeout:15}),/timed out/);
  let signal;
  await assert.rejects(requestAI(client,'recommend',{}, {timeout:15,fetcher:async(_url,options)=>{
    signal=options.signal; return {ok:true,status:200,json:()=>new Promise(()=>{})};
  }}),/timed out/);
  assert.equal(signal.aborted,true);
});
