import test from 'node:test';
import assert from 'node:assert/strict';

process.env.CHAMAH_ENVIRONMENT='preview';
process.env.CHAMAH_SUPABASE_PROJECT_ID='iwsbjudahtjyigecymzd';
process.env.CHAMAH_SUPABASE_URL='https://iwsbjudahtjyigecymzd.supabase.co';
process.env.CHAMAH_OAUTH_ISSUER='https://iwsbjudahtjyigecymzd.supabase.co/auth/v1';
process.env.CHAMAH_PORTAL_ORIGIN='https://chamah-director-preview.vercel.app';
process.env.CHAMAH_MCP_ORIGIN='https://chamah-director-preview.vercel.app';
process.env.CHAMAH_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
process.env.CHAMAH_BUILD_COMMIT='4833ad5d1725e1442d9f69304cf51744885a46b2';
const handler=(await import('../api/mcp.js')).default;

function responseCollector(){const headers={};return {headers,statusCode:200,body:null,setHeader(k,v){headers[k]=v;},status(code){this.statusCode=code;return this;},end(body){this.body=body;}};}
function upstream(value,status=200){return {ok:status>=200&&status<300,status,json:async()=>value};}
async function invoke(body,fetchImpl){const originalFetch=globalThis.fetch;globalThis.fetch=fetchImpl;try{const res=responseCollector();await handler({method:'POST',url:'/api/mcp',headers:{authorization:'Bearer test-token'},body},res);return {res,body:JSON.parse(res.body)};}finally{globalThis.fetch=originalFetch;}}

test('internal errors receive opaque diagnostic IDs and redact sensitive values',async()=>{
 const {body}=await invoke({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'list_daycares',arguments:{}}},async url=>{
  if(String(url).endsWith('/auth/v1/user'))return upstream({id:'00000000-0000-4000-8000-000000000001',email:'person@example.test'});
  if(String(url).includes('/rpc/portal_my_access'))return upstream({profile:{is_active:true}});
  if(String(url).includes('/rpc/portal_my_authorization'))return upstream({active:true,roles:['DIRECTOR']});
  return upstream({code:'PGRST202',message:'secret-token person@example.test 00000000-0000-4000-8000-000000000002'},500);
 });
 const correlationId=body.result.structuredContent.correlation_id;
 assert.match(correlationId,/^[0-9a-f-]{36}$/);
 assert.equal(body.result.structuredContent.error_code,'PGRST202');
 assert.doesNotMatch(JSON.stringify(body),/secret-token|person@example\.test|00000000-0000-4000-8000-000000000002/);
});

test('successful read envelope remains unchanged',async()=>{
 const {body}=await invoke({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'list_daycares',arguments:{}}},async url=>{
  if(String(url).endsWith('/auth/v1/user'))return upstream({id:'00000000-0000-4000-8000-000000000001',email:'person@example.test'});
  if(String(url).includes('/rpc/portal_my_access'))return upstream({profile:{is_active:true}});
  if(String(url).includes('/rpc/portal_my_authorization'))return upstream({active:true,roles:[]});
  return upstream([{daycare_id:'00000000-0000-4000-8000-000000000002'}]);
 });
 assert.deepEqual(body.result.structuredContent,{items:[{daycare_id:'00000000-0000-4000-8000-000000000002'}],total:1});
 assert.equal(body.result.isError,false);
});
