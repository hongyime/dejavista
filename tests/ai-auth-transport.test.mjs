import { test } from 'node:test';
import assert from 'node:assert/strict';
import { protectAI } from '../lib/ai/request.js';

test('real Supabase SDK verifies JWT against Auth with bounded fetch and user headers', async () => {
  process.env.SUPABASE_URL='https://transport.example.invalid';
  process.env.SUPABASE_SERVICE_KEY='fixture-service-key';
  delete process.env.SUPABASE_PUBLISHABLE_KEY; delete process.env.SUPABASE_ANON_KEY;
  const userId='00000000-0000-4000-8000-000000000001'; const calls=[];
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    assert.ok([`https://transport.example.invalid/auth/v1/user`,`https://transport.example.invalid/storage/v1/object/sign/user_photos/${userId}/reference.jpg`].includes(url));
    const headers=new Headers(options.headers);
    assert.equal(headers.get('authorization'),'Bearer fixture-access');
    assert.equal(headers.get('apikey'),'fixture-service-key');
    assert.ok(options.signal); calls.push(options);
    const body=url.includes('/storage/') ? {signedURL:'/object/sign/fixture?token=synthetic'} : {id:userId,aud:'authenticated',role:'authenticated'};
    return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
  };
  try {
    const handler=protectAI(async(_req,res,{user,supabase,budget})=>{
      const {data,error}=await budget.run(()=>supabase.storage.from('user_photos').createSignedUrl(`${user.id}/reference.jpg`,300));
      assert.equal(error,null); assert.ok(data.signedUrl);
      return res.status(200).json({id:user.id});
    },{endpoint:'transport'});
    const res={setHeader(){},status(code){this.code=code;return this},json(body){this.body=body;return this}};
    await handler({method:'POST',body:{},headers:{authorization:'Bearer fixture-access','content-type':'application/json'}},res);
    assert.equal(res.code,200);assert.equal(res.body.id,userId);assert.equal(calls.length,2);assert.ok(calls.every(call=>call.signal.aborted));
  } finally {globalThis.fetch=originalFetch;}
});
