import test from 'node:test'
import assert from 'node:assert/strict'
import {createRevalidationHandler} from '../app/lib/revalidation.server.js'
const secret='a'.repeat(48),event={schema:'public',table:'videos',type:'UPDATE'}
function setup(options={}) {const calls=[];const handler=createRevalidationHandler({secret,invalidate:async tag=>calls.push(tag),...options});return{calls,send:(body=event,headers={},method='POST')=>handler(new Request('https://example.invalid/api/revalidate',{method,headers:{authorization:`Bearer ${secret}`,'content-type':'application/json',...headers},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}))}}
test('valid publish/edit event invalidates the shared public tag',async()=>{const f=setup();const r=await f.send();assert.equal(r.status,200);assert.deepEqual(f.calls,['tnn-content']);assert.equal(r.headers.get('cache-control'),'no-store')})
test('missing and wrong secrets do not invalidate',async()=>{for(const authorization of ['',`Bearer ${'b'.repeat(48)}`]){const f=setup();assert.equal((await f.send(event,{authorization})).status,401);assert.equal(f.calls.length,0)}})
test('missing server configuration fails closed',async()=>{const f=setup({secret:''});assert.equal((await f.send()).status,503);assert.equal(f.calls.length,0)})
test('wrong method or body type is rejected',async()=>{const f=setup();assert.equal((await f.send(null,{},'GET')).status,405);assert.equal((await f.send(event,{'content-type':'text/plain'})).status,415)})
test('malformed and excessive bodies are rejected',async()=>{const f=setup();assert.equal((await f.send('{')).status,400);assert.equal((await f.send('a'.repeat(65537))).status,413);assert.equal(f.calls.length,0)})
test('unrelated tables and event types cannot trigger invalidation',async()=>{for(const body of [{...event,table:'messages'},{...event,type:'SELECT'},{...event,schema:'auth'}]){const f=setup();assert.equal((await f.send(body)).status,400);assert.equal(f.calls.length,0)}})
test('provider errors are sanitized',async()=>{const f=setup({invalidate:async()=>{throw Error('secret internal details')}});const r=await f.send();assert.equal(r.status,503);assert(!((await r.text()).includes('secret internal')))})
