import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const handler = (await import('../api/mcp.js')).default;

const api=fs.readFileSync(new URL('../api/mcp.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20261118120000_track138_collection_receipt_ingestion_metadata.sql',import.meta.url),'utf8');

function responseCollector(){ return {statusCode:200,body:null,setHeader(){},status(code){this.statusCode=code;return this;},end(body){this.body=body;}}; }
function upstream(value,status=200){ return {ok:status>=200&&status<300,status,json:async()=>value}; }
async function invoke(argumentsValue){
  const originalFetch=globalThis.fetch; const calls=[];
  globalThis.fetch=async url=>{
    calls.push(String(url));
    if(String(url).endsWith('/auth/v1/user')) return upstream({id:'00000000-0000-4000-8000-000000000001',email:'director@example.test',user_metadata:{}});
    if(String(url).includes('/rpc/portal_my_access')) return upstream({profile:{is_active:true}});
    if(String(url).includes('/rpc/portal_my_authorization')) return upstream({active:true,roles:['DIRECTOR']});
    return upstream({batch_id:'00000000-0000-4000-8000-000000000002',status:'READY'});
  };
  try { const res=responseCollector(); await handler({method:'POST',url:'/api/mcp',headers:{authorization:'Bearer test-token'},body:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'preview_operational_changes',arguments:argumentsValue}}},res); return {body:JSON.parse(res.body),calls}; }
  finally { globalThis.fetch=originalFetch; }
}

test('collection receipt ingestion provenance is not forced through correction metadata',()=>{
  assert.match(api,/const correctionRows=args\.rows\.some/);
  assert.match(api,/correctionRows&&\(/);
  assert.doesNotMatch(api,/required:\['reason','affected_records','historical_impact'\]/);
  assert.match(api,/anyOf:\[\{required:\['source_file','source_system'\]\}/);
});

test('correction metadata remains required for correction-shaped rows',()=>{
  assert.match(api,/Correction reason, affected records, and historical impact are required/);
  assert.match(api,/args\.source_provenance\.reason/);
  assert.match(api,/args\.source_provenance\.affected_records/);
  assert.match(api,/args\.source_provenance\.historical_impact/);
  assert.match(api,/args\.source_provenance\.correction_reason/);
});

test('collection receipt preview reaches the versioned RPC with source provenance only',async()=>{
  const {body,calls}=await invoke({contract_version:'1.0.0',idempotency_key:'collection-receipt-001',source_name:'parent-collections.xlsx',source_provenance:{source_file:'parent-collections.xlsx',source_system:'PARENT_COLLECTIONS'},rows:[{entity:'collection_receipts',values:{child_id:'00000000-0000-4000-8000-000000000003',daycare_id:'00000000-0000-4000-8000-000000000004',reporting_month:'2026-10-01',amount:100,exact_payment_date_available:false,source_file:'parent-collections.xlsx',source_row_number:7}}]});
  assert.equal(body.error,undefined);
  assert.ok(calls.some(url=>url.includes('/rpc/portal_mcp_preview_operational_changes')));
});

test('receipt metadata is additive and preserves month/date availability/source lineage',()=>{
  for(const column of ['reporting_month','exact_payment_date_available','collection_status','source_file','source_row_number','child_id','daycare_id']) assert.match(migration,new RegExp(`add column if not exists ${column}`));
  assert.match(migration,/alter column receipt_date drop not null/);
  assert.match(migration,/portal_mcp_entity_meta_base/);
  assert.match(migration,/source_row_number/);
});
