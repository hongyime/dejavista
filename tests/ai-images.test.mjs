import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { fetchImage, imageURL, isPublicAddress, resolveImageURL } from '../lib/ai/images.js';
import { createBudget } from '../lib/ai/request.js';
import { checkRateLimit } from '../api/ai/utils/rate-limit.js';

const publicIP='93.184.215.14';
test('private, metadata, mapped and special-use addresses are rejected', () => {
  for(const value of ['0.0.0.0','10.1.1.1','127.0.0.1','169.254.169.254','172.31.0.1','192.168.1.1','100.100.1.1','198.18.0.1','224.0.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1','2002:7f00:1::1','not-an-ip']) assert.equal(isPublicAddress(value),false,value);
  assert.equal(isPublicAddress(publicIP),true); assert.equal(isPublicAddress('2606:4700:4700::1111'),true);
  for(const url of ['http://example.invalid','https://user:pass@example.invalid','https://example.invalid:8443/','file:///photo']) assert.throws(()=>imageURL(url),{status:400});
});
test('mixed DNS results and private literal targets fail closed', async () => {
  const budget=createBudget(500);
  try {
    await assert.rejects(resolveImageURL('https://example.invalid/a',budget,async()=>[{address:publicIP,family:4},{address:'127.0.0.1',family:4}]),{status:400});
    await assert.rejects(resolveImageURL('https://[::1]/a',budget,async()=>{throw Error('Must not resolve literal')}),{status:400});
  } finally {budget.dispose();}
});
function fakeRequest(sequence, seen) {
  return (url, options, receive) => {
    const req=new EventEmitter();
    const reply=sequence.shift();
    seen.push({url,options});
    req.end=()=>queueMicrotask(()=>{
      const res=new EventEmitter(); res.statusCode=reply.status || 200; res.headers=reply.headers || {};
      res.destroy=()=>{res.destroyed=true};
      receive(res);
      for(const chunk of reply.chunks || []) if(!res.destroyed) res.emit('data',chunk);
      if (!res.destroyed) res.emit('end');
    });
    return req;
  };
}
test('download pins checked DNS and recognizes image bytes', async () => {
  const budget=createBudget(500); const seen=[];
  try {
    const result=await fetchImage('https://example.invalid/a',budget,{resolve:async()=>[{address:publicIP,family:4}],request:fakeRequest([{chunks:[Buffer.from('iVBORw0KGgo=','base64')]}],seen)});
    assert.equal(result.mimeType,'image/png'); assert.equal(seen.length,1);
    seen[0].options.lookup('ignored',{all:true},(error,records)=>{assert.equal(error,null);assert.deepEqual(records,[{address:publicIP,family:4}])});
    assert.equal(seen[0].options.signal,budget.signal);
  } finally {budget.dispose();}
});
test('redirect cannot reach a private destination', async () => {
  const budget=createBudget(500); const seen=[];
  try {
    await assert.rejects(fetchImage('https://example.invalid/a',budget,{resolve:async()=>[{address:publicIP,family:4}],request:fakeRequest([{status:302,headers:{location:'https://127.0.0.1/private'}}],seen)}),{status:400});
    assert.equal(seen.length,1);
  } finally {budget.dispose();}
});
test('streaming downloads enforce size even without Content-Length', async () => {
  const budget=createBudget(500);
  try {
    await assert.rejects(fetchImage('https://example.invalid/a',budget,{resolve:async()=>[{address:publicIP,family:4}],request:fakeRequest([{chunks:[Buffer.alloc(2*1024*1024),Buffer.alloc(1)]}],[])}),{status:502});
  } finally {budget.dispose();}
});
test('unlimited new identities cannot grow the burst store without bound', () => {
  for(let i=0;i<5000;i++) assert.equal(checkRateLimit(`fixture-${i}`).allowed,true);
  assert.equal(checkRateLimit('overflow').allowed,false);
  assert.equal(checkRateLimit('fixture-0').allowed,true);
});
