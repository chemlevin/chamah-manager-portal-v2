import test from 'node:test';
import assert from 'node:assert/strict';

const handler = (await import('../api/mcp.js')).default;

function responseCollector(){
  const headers={};
  return {headers,statusCode:200,body:null,setHeader(k,v){headers[k]=v;},status(code){this.statusCode=code;return this;},end(body){this.body=body;}};
}

function upstream(value,status=200){
  return {ok:status>=200&&status<300,status,json:async()=>value};
}

async function invoke(body,rpcResult={ok:true}){
  const originalFetch=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async (url)=>{
    calls.push(String(url));
    if(String(url).endsWith('/auth/v1/user'))return upstream({id:'00000000-0000-4000-8000-000000000001',email:'director@example.test',user_metadata:{}});
    if(String(url).includes('/rpc/portal_my_access'))return upstream({profile:{is_active:true}});
    if(String(url).includes('/rpc/portal_my_authorization'))return upstream({active:true,roles:['DIRECTOR']});
    return upstream(rpcResult);
  };
  try{
    const res=responseCollector();
    await handler({method:'POST',url:'/api/mcp',headers:{authorization:'Bearer test-token'},body},res);
    return {body:JSON.parse(res.body),calls};
  } finally { globalThis.fetch=originalFetch; }
}

test('every exposed tool declares an object output schema',async()=>{
  const {body}=await invoke({jsonrpc:'2.0',id:1,method:'tools/list'});
  assert.equal(body.error,undefined);
  assert.ok(body.result.tools.length>0);
  for(const tool of body.result.tools){
    assert.equal(tool.outputSchema?.type,'object',`${tool.name} must declare object output`);
  }
});

test('array RPC results are MCP-compatible objects with item count',async()=>{
  const {body}=await invoke({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'list_daycares',arguments:{}}},[
    {daycare_id:'00000000-0000-4000-8000-000000000002',name:'Synthetic read fixture'}
  ]);
  assert.deepEqual(body.result.structuredContent,{items:[{daycare_id:'00000000-0000-4000-8000-000000000002',name:'Synthetic read fixture'}],total:1});
  assert.equal(Array.isArray(body.result.structuredContent),false);
});

test('empty, null, and scalar RPC results remain object-shaped',async()=>{
  for(const [rpcResult,expected] of [[[],{items:[],total:0}],[null,{value:null}],['ok',{value:'ok'}]]){
    const {body}=await invoke({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'list_daycares',arguments:{}}},rpcResult);
    assert.deepEqual(body.result.structuredContent,expected);
  }
});
