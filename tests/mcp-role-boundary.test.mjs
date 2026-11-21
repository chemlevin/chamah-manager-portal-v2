import test from 'node:test';
import assert from 'node:assert/strict';

const handler = (await import('../api/mcp.js')).default;

function responseCollector(){
  const headers={};
  return {headers,statusCode:200,body:null,setHeader(k,v){headers[k]=v;},status(code){this.statusCode=code;return this;},end(body){this.body=body;}};
}
function upstream(value,status=200){return {ok:status>=200&&status<300,status,json:async()=>value};}
async function invoke(body,roles=[]){
  const originalFetch=globalThis.fetch; const calls=[];
  globalThis.fetch=async url=>{
    calls.push(String(url));
    if(String(url).endsWith('/auth/v1/user'))return upstream({id:'00000000-0000-4000-8000-000000000001',email:'manager@example.test',user_metadata:{}});
    if(String(url).includes('/rpc/portal_my_access'))return upstream({profile:{is_active:true}});
    if(String(url).includes('/rpc/portal_my_authorization'))return upstream({active:true,roles});
    return upstream({items:[],total:0});
  };
  try{const res=responseCollector();await handler({method:'POST',url:'/api/mcp',headers:{authorization:'Bearer test-token'},body},res);return {body:JSON.parse(res.body),calls};}
  finally{globalThis.fetch=originalFetch;}
}

test('manager tools/list is explicitly read-only and closed',async()=>{
  const {body}=await invoke({jsonrpc:'2.0',id:1,method:'tools/list'},['MANAGER']);
  const tools=body.result.tools;
  assert.deepEqual(tools.map(t=>t.name),['get_profile','list_policies','read_policy','list_daycares','staff_by_daycare']);
  assert.ok(tools.every(t=>t.classification==='READ_ONLY'&&t.authorization==='AUTHENTICATED_SCOPED_READ'));
});

test('get_profile exposes only the non-sensitive server-resolved role classification',async()=>{
  const {body}=await invoke({jsonrpc:'2.0',id:5,method:'tools/call',params:{name:'get_profile',arguments:{}}},['MANAGER']);
  assert.deepEqual(body.result.structuredContent.role_classification,'MANAGER');
  assert.equal('permissions' in body.result.structuredContent,false);
  assert.equal('access_token' in body.result.structuredContent,false);
});

test('manager mutation call is rejected before database access',async()=>{
  const {body,calls}=await invoke({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'create_employee',arguments:{employee:{}}}},['MANAGER']);
  assert.equal(body.error.code,-32602);
  assert.equal(body.error.message,'Invalid or unauthorized tool');
  assert.equal(calls.filter(url=>url.includes('/rpc/')).length,2);
  assert.equal(calls.some(url=>url.includes('portal_mcp_create_employee')),false);
});

test('director legacy mutation call fails closed before database dispatch',async()=>{
  const {body,calls}=await invoke({jsonrpc:'2.0',id:6,method:'tools/call',params:{name:'import_employees',arguments:{rows:[{employee_code:'E-1',first_name:'A',last_name:'B'}]}}},['DIRECTOR']);
  assert.equal(body.error.code,-32004);
  assert.equal(body.error.message,'LEGACY_MUTATION_BLOCKED');
  assert.equal(body.error.data.status,'LEGACY_MUTATION_BLOCKED');
  assert.equal(body.error.data.data_written,false);
  assert.equal(body.error.data.retry_safe,false);
  assert.equal(calls.some(url=>url.includes('portal_mcp_import_employees')),false);
});

test('supplier and payment direct-write paths fail closed before RPC dispatch',async()=>{
  for (const [index, name] of ['create_supplier','update_supplier','import_suppliers','create_payment_request','update_payment_request','import_payment_requests'].entries()) {
    const argumentsByTool = {
      create_supplier:{supplier:{}},
      update_supplier:{supplier_id:'00000000-0000-4000-8000-000000000001',expected_row_version:1,patch:{}},
      import_suppliers:{rows:[{}]},
      create_payment_request:{request:{}},
      update_payment_request:{payment_request_id:'00000000-0000-4000-8000-000000000001',expected_row_version:1,patch:{}},
      import_payment_requests:{rows:[{}]},
    };
    const {body,calls}=await invoke({jsonrpc:'2.0',id:20+index,method:'tools/call',params:{name,arguments:argumentsByTool[name]}},['DIRECTOR']);
    assert.equal(body.error.code,-32004,name);
    assert.equal(body.error.data.status,'LEGACY_MUTATION_BLOCKED',name);
    assert.equal(body.error.data.data_written,false,name);
    assert.equal(calls.some(url=>url.includes('/rpc/portal_mcp_')),false,name);
  }
});

test('payment transition remains approval-bound and is not a direct-write bypass',async()=>{
  const {body}=await invoke({jsonrpc:'2.0',id:30,method:'tools/list'},['DIRECTOR']);
  const tool=body.result.tools.find(item=>item.name==='transition_payment_request');
  assert.equal(tool.classification,'MUTATION');
  assert.equal(tool.authorization,'DIRECTOR_EXPLICIT_PERMISSION');
  assert.equal(tool.annotations.destructiveHint,false);
});

test('unauthenticated requests are rejected before authorization or data access',async()=>{
  const originalFetch=globalThis.fetch; let called=false;
  globalThis.fetch=async()=>{called=true;return upstream({});};
  try{const res=responseCollector();await handler({method:'POST',url:'/api/mcp',headers:{},body:{jsonrpc:'2.0',id:3,method:'tools/list'}},res);assert.equal(res.statusCode,401);assert.deepEqual(JSON.parse(res.body),{error:'authentication_required'});assert.equal(called,false);}
  finally{globalThis.fetch=originalFetch;}
});

test('director catalog retains explicit classifications without generic table writes',async()=>{
  const {body}=await invoke({jsonrpc:'2.0',id:4,method:'tools/list'},['DIRECTOR']);
  assert.ok(body.result.tools.length>0);
  assert.ok(body.result.tools.every(t=>t.classification==='READ_ONLY'||t.classification==='MUTATION'));
  assert.equal(body.result.tools.some(t=>t.name==='query_table'||t.name==='write_table'),false);
});
