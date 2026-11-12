'use strict';

const crypto=require('node:crypto');

// Director-only MCP Streamable HTTP endpoint. Every operation uses the caller's
// Supabase token; no privileged key, generic table access, or cross-user cache.
const PRODUCTION_SUPABASE_URL = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const SUPABASE_URL = String(process.env.CHAMAH_SUPABASE_URL || PRODUCTION_SUPABASE_URL).replace(/\/$/, '');
const API_KEY = process.env.CHAMAH_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_4MKSdjf7O1oVS4SWhQ36Qw_QUKW8dyW';
const PRODUCTION_ORIGIN = 'https://chamah-portal.vercel.app';
const AUTH_SERVER = `${SUPABASE_URL}/auth/v1`;
const PROTOCOL_VERSION = '2025-03-26';
const BASE_TOOLS = [
  {name:'get_profile',description:'Return the authenticated Director profile represented by this connection',inputSchema:{type:'object',properties:{},additionalProperties:false},outputSchema:{type:'object',properties:{id:{type:'string'},name:{type:'string'},email:{type:'string'},nickname:{type:'string'}},required:['id'],additionalProperties:false},_meta:{'openai/profile':true}},
  {name:'propose_supplier_bank_detail',description:'Propose an idempotent supplier bank-account change',inputSchema:{type:'object',properties:{supplier_id:{type:'string'},bank_detail:{type:'object'},idempotency_key:{type:'string'}},required:['supplier_id','bank_detail','idempotency_key'],additionalProperties:false}},
  {name:'request_supplier_bank_verification_approval',description:'Approve an exact supplier bank verification decision',inputSchema:{type:'object',properties:{supplier_bank_detail_id:{type:'string'},decision:{type:'string',enum:['VERIFIED','REJECTED']},expected_row_version:{type:'integer'},note:{type:'string'},reason:{type:'string'}},required:['supplier_bank_detail_id','decision','expected_row_version','note','reason'],additionalProperties:false}},
  {name:'verify_supplier_bank_detail',description:'Execute an approved supplier bank verification decision',inputSchema:{type:'object',properties:{supplier_bank_detail_id:{type:'string'},decision:{type:'string',enum:['VERIFIED','REJECTED']},expected_row_version:{type:'integer'},approval_id:{type:'string'},note:{type:'string'}},required:['supplier_bank_detail_id','decision','expected_row_version','approval_id','note'],additionalProperties:false}},
  {name:'record_payment_execution',description:'Record immutable execution evidence separately from payment approval',inputSchema:{type:'object',properties:{execution:{type:'object'}},required:['execution'],additionalProperties:false}},
  {name:'search_bank_reconciliation',description:'Search payment execution and bank reconciliation balances',inputSchema:{type:'object',properties:{status:{type:'string'},limit:{type:'integer'},offset:{type:'integer'}},additionalProperties:false}},
  {name:'confirm_bank_reconciliation',description:'Confirm one or many partial bank reconciliation allocations atomically',inputSchema:{type:'object',properties:{matches:{type:'array',minItems:1,maxItems:100,items:{type:'object'}},idempotency_key:{type:'string'},note:{type:'string'}},required:['matches','idempotency_key'],additionalProperties:false}},
  {name:'enqueue_bank_statement_import',description:'Queue a periodic bank statement import for asynchronous processing',inputSchema:{type:'object',properties:{statement:{type:'object'},idempotency_key:{type:'string'}},required:['statement','idempotency_key'],additionalProperties:false}},
  {name:'enqueue_reconciliation_suggestions',description:'Queue suggestion-only automatic matching',inputSchema:{type:'object',properties:{criteria:{type:'object'},idempotency_key:{type:'string'}},required:['criteria','idempotency_key'],additionalProperties:false}},
  {name:'get_financial_job',description:'Read asynchronous financial job status and result',inputSchema:{type:'object',properties:{job_id:{type:'string'}},required:['job_id'],additionalProperties:false}},
  {name:'search_suppliers',description:'Search canonical suppliers',inputSchema:{type:'object',properties:{search:{type:'string'},limit:{type:'integer'},offset:{type:'integer'}},additionalProperties:false}},
  {name:'find_supplier_duplicates',description:'Detect supplier duplicates',inputSchema:{type:'object',properties:{supplier:{type:'object'}},required:['supplier'],additionalProperties:false}},
  {name:'create_supplier',description:'Create a canonical supplier',inputSchema:{type:'object',properties:{supplier:{type:'object'}},required:['supplier'],additionalProperties:false}},
  {name:'update_supplier',description:'Update a supplier with optimistic concurrency',inputSchema:{type:'object',properties:{supplier_id:{type:'string'},expected_row_version:{type:'integer'},patch:{type:'object'}},required:['supplier_id','expected_row_version','patch'],additionalProperties:false}},
  {name:'import_suppliers',description:'Import up to 100 suppliers',inputSchema:{type:'object',properties:{rows:{type:'array',minItems:1,maxItems:100,items:{type:'object'}},source_name:{type:'string'}},required:['rows'],additionalProperties:false}},
  {name:'search_payment_requests',description:'Search canonical payment requests',inputSchema:{type:'object',properties:{search:{type:'string'},status:{type:'string'},limit:{type:'integer'},offset:{type:'integer'}},additionalProperties:false}},
  {name:'create_payment_request',description:'Create an idempotent draft payment request',inputSchema:{type:'object',properties:{request:{type:'object'}},required:['request'],additionalProperties:false}},
  {name:'update_payment_request',description:'Update an editable draft',inputSchema:{type:'object',properties:{payment_request_id:{type:'string'},expected_row_version:{type:'integer'},patch:{type:'object'}},required:['payment_request_id','expected_row_version','patch'],additionalProperties:false}},
  {name:'import_payment_requests',description:'Import up to 100 payment drafts',inputSchema:{type:'object',properties:{rows:{type:'array',minItems:1,maxItems:100,items:{type:'object'}},source_name:{type:'string'}},required:['rows'],additionalProperties:false}},
  {name:'upload_payment_document',description:'Idempotently upload a private invoice or payment attachment',inputSchema:{type:'object',properties:{payment_request_id:{type:'string'},document_type:{type:'string'},filename:{type:'string'},content_type:{type:'string'},base64:{type:'string'},idempotency_key:{type:'string'}},required:['payment_request_id','document_type','filename','content_type','base64','idempotency_key'],additionalProperties:false}},
  {name:'request_payment_transition_approval',description:'Approve an exact sensitive payment transition',inputSchema:{type:'object',properties:{payment_request_id:{type:'string'},target_status:{type:'string'},expected_row_version:{type:'integer'},detail:{type:'object'},reason:{type:'string'}},required:['payment_request_id','target_status','expected_row_version','detail','reason'],additionalProperties:false}},
  {name:'transition_payment_request',description:'Execute a payment lifecycle transition',inputSchema:{type:'object',properties:{payment_request_id:{type:'string'},target_status:{type:'string'},expected_row_version:{type:'integer'},approval_id:{type:['string','null']},detail:{type:'object'}},required:['payment_request_id','target_status','expected_row_version','detail'],additionalProperties:false}},
  {name:'analyze_suppliers_payments',description:'Analyze supplier and payment quality',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'list_policies',description:'List published organizational policies visible to the authenticated user',inputSchema:{type:'object',properties:{search:{type:'string',maxLength:120}},additionalProperties:false}},
  {name:'read_policy',description:'Read the published version of an authorized policy (never drafts)',inputSchema:{type:'object',properties:{document_id:{type:'string',format:'uuid'}},required:['document_id'],additionalProperties:false}},
  {name:'list_daycares',description:'List daycares visible to the authenticated user',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'staff_by_daycare',description:'List employees assigned to an authorized daycare',inputSchema:{type:'object',properties:{daycare_id:{type:'string',format:'uuid'}},required:['daycare_id'],additionalProperties:false}},
  {name:'search_daycares',description:'Search canonical daycare records with versions for conflict-safe updates',inputSchema:{type:'object',properties:{search:{type:'string',maxLength:120},limit:{type:'integer',minimum:1,maximum:100},offset:{type:'integer',minimum:0}},additionalProperties:false}},
  {name:'preview_daycare_import',description:'Validate 1-100 daycare rows, detect duplicates and conflicts, and stage without writing daycare records',inputSchema:{type:'object',properties:{rows:{type:'array',minItems:1,maxItems:100,items:{type:'object'}},source_name:{type:'string',maxLength:120},idempotency_key:{type:'string',minLength:8,maxLength:160}},required:['rows','idempotency_key'],additionalProperties:false}},
  {name:'request_daycare_import_approval',description:'Record Director approval for the exact staged daycare batch',inputSchema:{type:'object',properties:{batch_id:{type:'string',format:'uuid'},reason:{type:'string',minLength:3,maxLength:500}},required:['batch_id','reason'],additionalProperties:false}},
  {name:'commit_daycare_import',description:'Commit an unchanged daycare batch using its exact unconsumed Director approval',inputSchema:{type:'object',properties:{batch_id:{type:'string',format:'uuid'},approval_id:{type:'string',format:'uuid'}},required:['batch_id','approval_id'],additionalProperties:false}},
  {name:'data_capabilities',description:'Report operational domains, record counts, relationships, supported actions and known gaps',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'search_operational_data',description:'Search an existing operational domain with bounded pagination',inputSchema:{type:'object',properties:{domain:{type:'string',enum:['employees','banking','payments','payroll']},search:{type:'string',maxLength:120},limit:{type:'integer',minimum:1,maximum:100},offset:{type:'integer',minimum:0,maximum:10000}},required:['domain'],additionalProperties:false}},
  {name:'analyze_operational_data',description:'Return verified aggregate quality and operational metrics for an existing domain',inputSchema:{type:'object',properties:{domain:{type:'string',enum:['employees','banking','payments','payroll']}},required:['domain'],additionalProperties:false}},
  {name:'find_employee_duplicates',description:'Detect employee matches by code, national ID, email or normalized phone before writing',inputSchema:{type:'object',properties:{employee:{type:'object',properties:{employee_code:{type:'string',maxLength:50},national_id:{type:'string',maxLength:30},email:{type:'string',maxLength:254},phone:{type:'string',maxLength:30}},additionalProperties:false}},required:['employee'],additionalProperties:false}},
  {name:'create_employee',description:'Create one validated employee and verify the persisted result',inputSchema:{type:'object',properties:{employee:{type:'object',properties:{employee_code:{type:'string',minLength:1,maxLength:50},national_id:{type:'string',maxLength:30},first_name:{type:'string',minLength:1,maxLength:100},last_name:{type:'string',minLength:1,maxLength:100},phone:{type:'string',maxLength:30},email:{type:'string',maxLength:254},birth_date:{type:'string',format:'date'},notes:{type:'string',maxLength:2000}},required:['employee_code','first_name','last_name'],additionalProperties:false}},required:['employee'],additionalProperties:false}},
  {name:'update_employee',description:'Update allowlisted employee fields with optimistic concurrency and persisted-result verification',inputSchema:{type:'object',properties:{employee_id:{type:'string',format:'uuid'},expected_row_version:{type:'integer',minimum:1},patch:{type:'object',properties:{first_name:{type:'string',minLength:1,maxLength:100},last_name:{type:'string',minLength:1,maxLength:100},phone:{type:['string','null'],maxLength:30},email:{type:['string','null'],maxLength:254},birth_date:{type:['string','null'],format:'date'},notes:{type:['string','null'],maxLength:2000},lifecycle_status:{type:'string',enum:['ACTIVE','INACTIVE','ARCHIVED']}},minProperties:1,additionalProperties:false}},required:['employee_id','expected_row_version','patch'],additionalProperties:false}},
  {name:'import_employees',description:'Validate and import up to 100 employees synchronously; larger imports require a durable job',inputSchema:{type:'object',properties:{source_name:{type:'string',maxLength:120},rows:{type:'array',minItems:1,maxItems:100,items:{type:'object',properties:{employee_code:{type:'string',minLength:1,maxLength:50},national_id:{type:'string',maxLength:30},first_name:{type:'string',minLength:1,maxLength:100},last_name:{type:'string',minLength:1,maxLength:100},phone:{type:'string',maxLength:30},email:{type:'string',maxLength:254},birth_date:{type:'string',format:'date'},notes:{type:'string',maxLength:2000}},required:['employee_code','first_name','last_name'],additionalProperties:false}}},required:['rows'],additionalProperties:false}},
  {name:'operational_catalog',description:'Return the canonical mixed-domain import contract, stable keys and writable fields',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'employee_profile',description:'Read one complete canonical employee profile and all workforce relationships',inputSchema:{type:'object',properties:{employee_id:{type:'string',format:'uuid'}},required:['employee_id'],additionalProperties:false}},
  {name:'preview_operational_changes',description:'Match and validate 1-100 mixed-domain canonical records without committing business data',inputSchema:{type:'object',properties:{rows:{type:'array',minItems:1,maxItems:100,items:{type:'object'}},source_name:{type:'string',maxLength:120},idempotency_key:{type:'string',minLength:8,maxLength:160}},required:['rows','idempotency_key'],additionalProperties:false}},
  {name:'request_operational_approval',description:'Record explicit Director approval for the exact unchanged mixed-domain preview',inputSchema:{type:'object',properties:{batch_id:{type:'string',format:'uuid'},reason:{type:'string',minLength:3,maxLength:500}},required:['batch_id','reason'],additionalProperties:false}},
  {name:'commit_operational_changes',description:'Atomically commit an approved mixed-domain change set with concurrency checks and audit evidence',inputSchema:{type:'object',properties:{batch_id:{type:'string',format:'uuid'},approval_id:{type:'string',format:'uuid'}},required:['batch_id','approval_id'],additionalProperties:false}},
  {name:'get_operational_batch',description:'Read preview, approval, commit and verification evidence for one change set',inputSchema:{type:'object',properties:{batch_id:{type:'string',format:'uuid'}},required:['batch_id'],additionalProperties:false}},
  {name:'search_operational_records',description:'Search any allowlisted canonical operational entity with bounded pagination',inputSchema:{type:'object',properties:{entity:{type:'string',minLength:1,maxLength:80},search:{type:'string',maxLength:120},limit:{type:'integer',minimum:1,maximum:100},offset:{type:'integer',minimum:0,maximum:10000}},required:['entity'],additionalProperties:false}},
  {name:'get_operational_record',description:'Read one canonical operational record by entity and UUID',inputSchema:{type:'object',properties:{entity:{type:'string',minLength:1,maxLength:80},record_id:{type:'string',format:'uuid'}},required:['entity','record_id'],additionalProperties:false}},
  {name:'operational_report',description:'Return canonical record counts and explicitly unsupported operational domains',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'create_policy',description:'Create an organizational policy draft',inputSchema:{type:'object',properties:{title:{type:'string',minLength:1,maxLength:200},category:{type:'string',maxLength:120},body:{type:'string',maxLength:100000}},required:['title'],additionalProperties:false}},
  {name:'update_policy',description:'Update a policy draft with optimistic concurrency',inputSchema:{type:'object',properties:{document_id:{type:'string',format:'uuid'},title:{type:'string',minLength:1,maxLength:200},category:{type:'string',maxLength:120},body:{type:'string',maxLength:100000},expected_updated_at:{type:'string',format:'date-time'}},required:['document_id','title','category','body','expected_updated_at'],additionalProperties:false}},
  {name:'request_policy_archive_approval',description:'Create a short-lived approval bound to one policy archive request',inputSchema:{type:'object',properties:{document_id:{type:'string',format:'uuid'},reason:{type:'string',minLength:3,maxLength:500}},required:['document_id','reason'],additionalProperties:false}},
  {name:'archive_policy',description:'Soft-delete a policy with an exact unconsumed approval',inputSchema:{type:'object',properties:{document_id:{type:'string',format:'uuid'},approval_id:{type:'string',format:'uuid'},reason:{type:'string',minLength:3,maxLength:500}},required:['document_id','approval_id','reason'],additionalProperties:false}},
  {name:'request_bulk_policy_archive_approval',description:'Create a short-lived approval for an exact bulk archive set',inputSchema:{type:'object',properties:{document_ids:{type:'array',minItems:1,maxItems:50,uniqueItems:true,items:{type:'string',format:'uuid'}},reason:{type:'string',minLength:3,maxLength:500}},required:['document_ids','reason'],additionalProperties:false}},
  {name:'bulk_archive_policies',description:'Atomically soft-delete an approved set of policies',inputSchema:{type:'object',properties:{document_ids:{type:'array',minItems:1,maxItems:50,uniqueItems:true,items:{type:'string',format:'uuid'}},approval_id:{type:'string',format:'uuid'},reason:{type:'string',minLength:3,maxLength:500}},required:['document_ids','approval_id','reason'],additionalProperties:false}},
  {name:'upload_policy_file',description:'Upload a validated attachment (PDF, PNG, JPEG or text; up to 3 MiB)',inputSchema:{type:'object',properties:{document_id:{type:'string',format:'uuid'},filename:{type:'string',minLength:1,maxLength:120},content_type:{type:'string',enum:['application/pdf','image/png','image/jpeg','text/plain']},base64:{type:'string',minLength:1,maxLength:4194304}},required:['document_id','filename','content_type','base64'],additionalProperties:false}},
  {name:'download_policy_file',description:'Download a private policy attachment returned by upload_policy_file',inputSchema:{type:'object',properties:{object_path:{type:'string',minLength:1,maxLength:500}},required:['object_path'],additionalProperties:false}}
];
const READ_ONLY_TOOLS = new Set([
  'get_profile',
  'search_bank_reconciliation','get_financial_job','search_suppliers','find_supplier_duplicates',
  'search_payment_requests','analyze_suppliers_payments','list_policies','read_policy','list_daycares',
  'staff_by_daycare','search_daycares','data_capabilities','search_operational_data','analyze_operational_data',
  'find_employee_duplicates','download_policy_file','operational_catalog','employee_profile','get_operational_batch',
  'search_operational_records','get_operational_record','operational_report'
]);
const INSTITUTION_READ_TOOLS = new Set(['get_profile','list_daycares','staff_by_daycare','list_policies','read_policy']);
const UNSAFE_LEGACY_WRITE_TOOLS = new Set([
 'create_employee','update_employee','import_employees','create_supplier','update_supplier','import_suppliers',
 'create_payment_request','update_payment_request','import_payment_requests','record_payment_execution',
 'confirm_bank_reconciliation','enqueue_bank_statement_import'
]);
const DESTRUCTIVE_TOOLS = new Set(['archive_policy','bulk_archive_policies']);
const TOOLS = BASE_TOOLS.map(tool=>({
 ...tool,
 securitySchemes:[{type:'oauth2',scopes:[]}],
 annotations:{
  readOnlyHint:READ_ONLY_TOOLS.has(tool.name),
  destructiveHint:DESTRUCTIVE_TOOLS.has(tool.name),
  openWorldHint:false
 },
 _meta:{...(tool._meta||{}),securitySchemes:[{type:'oauth2',scopes:[]}]}
}));
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function requestOrigin(req){
 const raw=String(req.headers['x-forwarded-host']||req.headers.host||'').trim().toLowerCase();
 const host=raw.split(',')[0].trim();
 return /^(?:[a-z0-9-]+\.)*vercel\.app$/.test(host)?`https://${host}`:PRODUCTION_ORIGIN;
}
function send(res,status,body){res.status(status).setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');return res.end(JSON.stringify(body));}
function error(id,code,message){return {jsonrpc:'2.0',id,error:{code,message}};}
async function api(path,token,body){
 const r=await fetch(SUPABASE_URL+path,{method:body===undefined?'GET':'POST',headers:{apikey:API_KEY,Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
 const data=await r.json().catch(()=>null);
 if(!r.ok)throw Object.assign(new Error('Upstream request rejected'),{status:r.status});
 return data;
}
async function upload(path,token,contentType,bytes){
 const r=await fetch(SUPABASE_URL+'/storage/v1/object/'+path,{method:'POST',headers:{apikey:API_KEY,Authorization:'Bearer '+token,'Content-Type':contentType,'x-upsert':'false'},body:bytes,signal:AbortSignal.timeout(15000)});
 const data=await r.json().catch(()=>null);
 if(!r.ok)throw Object.assign(new Error('Upload rejected'),{status:r.status,detail:data});
 return data;
}
async function removeStorageObject(bucket,path,token){
 const r=await fetch(SUPABASE_URL+'/storage/v1/object/'+bucket,{method:'DELETE',headers:{apikey:API_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]}),signal:AbortSignal.timeout(15000)});
 const data=await r.json().catch(()=>null);
 if(!r.ok)throw Object.assign(new Error('Storage cleanup rejected'),{status:r.status});
 return data;
}
async function compensatePaymentAttachment(operationId,token){
 const cleanup=await api('/rest/v1/rpc/portal_mcp_begin_payment_attachment_cleanup',token,{p_operation_id:operationId});
 if(cleanup.status==='FINALIZED')return cleanup;
 if(cleanup.status==='CLEANUP_PENDING'){
  await removeStorageObject('payment-request-attachments',cleanup.object_path,token);
  await api('/rest/v1/rpc/portal_mcp_complete_payment_attachment_cleanup',token,{p_operation_id:operationId});
 }
 return cleanup;
}
async function download(path,token){
 const r=await fetch(SUPABASE_URL+'/storage/v1/object/authenticated/policy-attachments/'+path,{headers:{apikey:API_KEY,Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Object.assign(new Error('Download rejected'),{status:r.status});
 const bytes=Buffer.from(await r.arrayBuffer());
 if(bytes.length>3*1024*1024)throw Object.assign(new Error('Download exceeds MCP limit'),{status:413});
 return {base64:bytes.toString('base64'),content_type:r.headers.get('content-type')||'application/octet-stream',size:bytes.length};
}
module.exports=async function handler(req,res){
 const origin=requestOrigin(req);
 const resource=`${origin}/api/mcp`;
 const resourceMetadata=`${origin}/.well-known/oauth-protected-resource`;
 res.setHeader('Allow','POST, OPTIONS');
 if(req.url?.includes('.well-known/oauth-protected-resource'))return send(res,200,{resource,authorization_servers:[AUTH_SERVER],bearer_methods_supported:['header']});
 const challenge=`Bearer resource_metadata="${resourceMetadata}", error="invalid_token", error_description="Active portal sign-in is required"`;
 res.setHeader('WWW-Authenticate',challenge);
 if(req.method==='OPTIONS')return send(res,204,{});
 if(req.method!=='POST')return send(res,405,{error:'method_not_allowed'});
 const auth=req.headers.authorization||'';
 if(!/^Bearer [A-Za-z0-9._~-]+$/.test(auth))return send(res,401,{error:'authentication_required'});
 const token=auth.slice(7);
 let user;
 try{
  user=await api('/auth/v1/user',token);
  if(!user?.id)return send(res,401,{error:'authentication_required'});
 }catch{return send(res,401,{error:'invalid_or_expired_token'});}
 try{
  const access=await api('/rest/v1/rpc/portal_my_access',token,{});
  if(!access?.profile?.is_active)return send(res,403,{error:'portal_access_denied'});
 }catch(e){return send(res,e.status===401?401:403,{error:e.status===401?'invalid_or_expired_token':'portal_access_denied'});}
 let authorization,isDirector=false;
 try{
  authorization=await api('/rest/v1/rpc/portal_my_authorization',token,{});
  if(!authorization?.active)return send(res,403,{error:'portal_access_denied'});
  isDirector=authorization.roles?.includes('DIRECTOR')===true;
 }catch(e){return send(res,e.status===401?401:403,{error:e.status===401?'invalid_or_expired_token':'portal_access_denied'});}
 const availableTools=isDirector?TOOLS.filter(t=>!UNSAFE_LEGACY_WRITE_TOOLS.has(t.name)):TOOLS.filter(t=>INSTITUTION_READ_TOOLS.has(t.name));
 let m=req.body;
 if(typeof m==='string'){try{m=JSON.parse(m)}catch{return send(res,400,error(null,-32700,'Parse error'));}}
 if(!m||Array.isArray(m)||typeof m!=='object'||m.jsonrpc!=='2.0'||typeof m.method!=='string')return send(res,400,error(m?.id??null,-32600,'Invalid request'));
 const requestSize=JSON.stringify(m).length;
 if(requestSize>(['upload_policy_file','upload_payment_document','enqueue_bank_statement_import'].includes(m?.params?.name)?4300000:12000))return send(res,413,error(m.id??null,-32600,'Request too large'));
 if(m.id===undefined)return res.status(202).end();
 const id=m.id;
 if(m.method==='initialize')return send(res,200,{jsonrpc:'2.0',id,result:{protocolVersion:PROTOCOL_VERSION,capabilities:{tools:{listChanged:true}},serverInfo:{name:isDirector?'chamah-portal-director':'chamah-portal-institution-readonly',version:'1.2.0'}}});
 if(m.method==='ping')return send(res,200,{jsonrpc:'2.0',id,result:{}});
 if(m.method==='tools/list')return send(res,200,{jsonrpc:'2.0',id,result:{tools:availableTools}});
 if(m.method!=='tools/call')return send(res,200,error(id,-32601,'Method not found'));
 const name=m.params?.name,args=m.params?.arguments||{};
 if(!availableTools.some(t=>t.name===name)||!args||typeof args!=='object'||Array.isArray(args))return send(res,200,error(id,-32602,'Invalid or unauthorized tool'));
 if(name==='get_profile'){
  if(Object.keys(args).length)return send(res,200,error(id,-32602,'Unexpected arguments'));
  const profile={id:user.id,name:String(user.user_metadata?.full_name||user.email||'Director'),email:String(user.email||''),nickname:String(user.user_metadata?.full_name||user.email||'Director')};
  return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(profile)}],structuredContent:profile,isError:false}});
 }
 let rpc,params;
 switch(name){
 case 'propose_supplier_bank_detail':
  if(Object.keys(args).length!==3||!UUID.test(args.supplier_id||'')||!args.bank_detail||typeof args.bank_detail!=='object'||Array.isArray(args.bank_detail)||typeof args.idempotency_key!=='string'||!args.idempotency_key.trim()||args.idempotency_key.length>160)return send(res,200,error(id,-32602,'Invalid supplier bank proposal'));
  rpc='portal_mcp_propose_supplier_bank_detail';params={p_supplier_id:args.supplier_id,p_bank_detail:args.bank_detail,p_idempotency_key:args.idempotency_key};break;
 case 'request_supplier_bank_verification_approval': {
  if(Object.keys(args).length!==5||!UUID.test(args.supplier_bank_detail_id||'')||!['VERIFIED','REJECTED'].includes(args.decision)||!Number.isInteger(args.expected_row_version)||args.expected_row_version<1||typeof args.note!=='string'||!args.note.trim()||args.note.length>500||typeof args.reason!=='string'||args.reason.trim().length<3||args.reason.length>500)return send(res,200,error(id,-32602,'Invalid supplier bank verification approval'));
  const payload={supplier_bank_detail_id:args.supplier_bank_detail_id,decision:args.decision,expected_row_version:args.expected_row_version,note:args.note.trim()};
  rpc='portal_request_approval';params={p_action_code:'SUPPLIER_BANK.VERIFY',p_resource_type:'SUPPLIER_BANK_DETAIL',p_resource_id:args.supplier_bank_detail_id,p_payload:payload,p_reason:args.reason};break;
 }
 case 'verify_supplier_bank_detail':
  if(Object.keys(args).length!==5||!UUID.test(args.supplier_bank_detail_id||'')||!['VERIFIED','REJECTED'].includes(args.decision)||!Number.isInteger(args.expected_row_version)||args.expected_row_version<1||!UUID.test(args.approval_id||'')||typeof args.note!=='string'||!args.note.trim()||args.note.length>500)return send(res,200,error(id,-32602,'Invalid supplier bank verification'));
  rpc='portal_mcp_verify_supplier_bank_detail';params={p_supplier_bank_detail_id:args.supplier_bank_detail_id,p_decision:args.decision,p_expected_row_version:args.expected_row_version,p_approval_id:args.approval_id,p_note:args.note.trim()};break;
 case 'record_payment_execution':
  if(Object.keys(args).length!==1||!args.execution||typeof args.execution!=='object'||Array.isArray(args.execution)||!Array.isArray(args.execution.allocations)||args.execution.allocations.length<1||args.execution.allocations.length>100)return send(res,200,error(id,-32602,'Invalid payment execution'));
  rpc='portal_mcp_record_payment_execution';params={p_execution:args.execution};break;
 case 'search_bank_reconciliation':
  if(Object.keys(args).some(k=>!['status','limit','offset'].includes(k))||(args.limit!==undefined&&(!Number.isInteger(args.limit)||args.limit<1||args.limit>100))||(args.offset!==undefined&&(!Number.isInteger(args.offset)||args.offset<0)))return send(res,200,error(id,-32602,'Invalid reconciliation search'));
  rpc='portal_mcp_search_reconciliation';params={p_status:args.status||null,p_limit:args.limit||25,p_offset:args.offset||0};break;
 case 'confirm_bank_reconciliation':
  if(Object.keys(args).some(k=>!['matches','idempotency_key','note'].includes(k))||!Array.isArray(args.matches)||args.matches.length<1||args.matches.length>100||typeof args.idempotency_key!=='string'||!args.idempotency_key.trim()||args.idempotency_key.length>160||args.matches.some(v=>!v||typeof v!=='object'||!UUID.test(v.payment_request_id||'')||!UUID.test(v.bank_transaction_id||'')||(v.payment_execution_id!==undefined&&v.payment_execution_id!==null&&!UUID.test(v.payment_execution_id))||typeof v.amount!=='number'||v.amount<=0))return send(res,200,error(id,-32602,'Invalid reconciliation confirmation'));
  rpc='portal_mcp_confirm_bank_reconciliation';params={p_matches:args.matches,p_idempotency_key:args.idempotency_key,p_note:args.note||null};break;
 case 'enqueue_bank_statement_import':
  if(Object.keys(args).length!==2||!args.statement||typeof args.statement!=='object'||Array.isArray(args.statement)||!UUID.test(args.statement.bank_account_id||'')||!Array.isArray(args.statement.rows)||args.statement.rows.length<1||args.statement.rows.length>5000||typeof args.idempotency_key!=='string'||!args.idempotency_key.trim()||args.idempotency_key.length>160)return send(res,200,error(id,-32602,'Invalid bank statement import'));
  rpc='portal_mcp_enqueue_financial_job';params={p_job_type:'STATEMENT_IMPORT',p_payload:args.statement,p_idempotency_key:args.idempotency_key};break;
 case 'enqueue_reconciliation_suggestions':
  if(Object.keys(args).length!==2||!args.criteria||typeof args.criteria!=='object'||Array.isArray(args.criteria)||typeof args.idempotency_key!=='string'||!args.idempotency_key.trim()||args.idempotency_key.length>160)return send(res,200,error(id,-32602,'Invalid reconciliation suggestion job'));
  rpc='portal_mcp_enqueue_financial_job';params={p_job_type:'MATCH_SUGGESTIONS',p_payload:args.criteria,p_idempotency_key:args.idempotency_key};break;
 case 'get_financial_job': if(Object.keys(args).length!==1||!UUID.test(args.job_id||''))return send(res,200,error(id,-32602,'Invalid financial job'));rpc='portal_mcp_get_financial_job';params={p_job_id:args.job_id};break;
 case 'search_suppliers': rpc='portal_mcp_search_suppliers';params={p_search:args.search||null,p_limit:args.limit||25,p_offset:args.offset||0};break;
 case 'find_supplier_duplicates': if(!args.supplier||typeof args.supplier!=='object')return send(res,200,error(id,-32602,'Invalid supplier'));rpc='portal_mcp_find_supplier_duplicates';params={p_supplier:args.supplier};break;
 case 'create_supplier': if(!args.supplier||typeof args.supplier!=='object')return send(res,200,error(id,-32602,'Invalid supplier'));rpc='portal_mcp_create_supplier';params={p_supplier:args.supplier};break;
 case 'update_supplier': if(!UUID.test(args.supplier_id||'')||!Number.isInteger(args.expected_row_version)||typeof args.patch!=='object')return send(res,200,error(id,-32602,'Invalid supplier update'));rpc='portal_mcp_update_supplier';params={p_supplier_id:args.supplier_id,p_patch:args.patch,p_expected_row_version:args.expected_row_version};break;
 case 'import_suppliers': if(!Array.isArray(args.rows)||args.rows.length<1||args.rows.length>100)return send(res,200,error(id,-32602,'Supplier import requires 1-100 rows'));rpc='portal_mcp_import_suppliers';params={p_rows:args.rows,p_source_name:args.source_name||'MCP'};break;
 case 'search_payment_requests': rpc='portal_mcp_search_payment_requests';params={p_search:args.search||null,p_status:args.status||null,p_limit:args.limit||25,p_offset:args.offset||0};break;
 case 'create_payment_request': if(!args.request||typeof args.request!=='object')return send(res,200,error(id,-32602,'Invalid payment request'));rpc='portal_mcp_create_payment_request';params={p_request:args.request};break;
 case 'update_payment_request': if(!UUID.test(args.payment_request_id||'')||!Number.isInteger(args.expected_row_version)||typeof args.patch!=='object')return send(res,200,error(id,-32602,'Invalid payment update'));rpc='portal_mcp_update_payment_request';params={p_payment_request_id:args.payment_request_id,p_patch:args.patch,p_expected_row_version:args.expected_row_version};break;
 case 'import_payment_requests': if(!Array.isArray(args.rows)||args.rows.length<1||args.rows.length>100)return send(res,200,error(id,-32602,'Payment import requires 1-100 rows'));rpc='portal_mcp_import_payment_requests';params={p_rows:args.rows,p_source_name:args.source_name||'MCP'};break;
 case 'upload_payment_document': {
  if(Object.keys(args).length!==6||!UUID.test(args.payment_request_id||'')||!['INVOICE','RECEIPT','BANK_CONFIRMATION','OTHER'].includes(args.document_type)||!['application/pdf','image/png','image/jpeg'].includes(args.content_type)||typeof args.base64!=='string'||typeof args.idempotency_key!=='string'||!args.idempotency_key.trim()||args.idempotency_key.length>160)return send(res,200,error(id,-32602,'Invalid payment document'));
  const bytes=Buffer.from(args.base64,'base64'); if(!bytes.length||bytes.length>3*1024*1024)return send(res,200,error(id,-32602,'File exceeds 3 MiB'));
  const digest=crypto.createHash('sha256').update(bytes).digest('hex'); let prepared;
  try{
   prepared=await api('/rest/v1/rpc/portal_mcp_prepare_payment_attachment',token,{p_payment_request_id:args.payment_request_id,p_document_type:args.document_type,p_filename:args.filename,p_content_type:args.content_type,p_size:bytes.length,p_sha256:digest,p_idempotency_key:args.idempotency_key});
   if(prepared.status==='FINALIZED'){const result={status:'IDEMPOTENT_REPLAY',payment_request_document_id:prepared.payment_request_document_id,object_path:prepared.object_path,verified:true};return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,isError:false}});}
   if(prepared.status==='CLEANUP_PENDING'){await compensatePaymentAttachment(prepared.operation_id,token);return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:'Previous failed upload was cleaned; retry safely'}],isError:true}});}
   try{await upload('payment-request-attachments/'+prepared.object_path,token,args.content_type,bytes);}catch(e){if(e.status!==400)throw e;}
   const result=await api('/rest/v1/rpc/portal_mcp_finalize_payment_attachment',token,{p_operation_id:prepared.operation_id});
   return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,isError:false}});
  }catch(e){
   if(prepared?.operation_id){try{const cleanup=await compensatePaymentAttachment(prepared.operation_id,token);if(cleanup.status==='FINALIZED'){const result={status:'IDEMPOTENT_REPLAY',payment_request_document_id:cleanup.payment_request_document_id,object_path:cleanup.object_path,verified:true};return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,isError:false}});}}catch{}}
   return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:'Upload failed safely; retry with the same idempotency key'}],isError:true}});
  }
 }
 case 'request_payment_transition_approval': {
  const action={APPROVED:'PAYMENT_REQUEST.APPROVE',PAID:'PAYMENT_REQUEST.PAY',VERIFIED:'PAYMENT_REQUEST.VERIFY',CANCELLED:'PAYMENT_REQUEST.CANCEL'}[args.target_status];
  if(!action||!UUID.test(args.payment_request_id||'')||!Number.isInteger(args.expected_row_version)||typeof args.detail!=='object'||typeof args.reason!=='string'||args.reason.trim().length<3)return send(res,200,error(id,-32602,'Invalid payment approval'));
  rpc='portal_request_approval';params={p_action_code:action,p_resource_type:'PAYMENT_REQUEST',p_resource_id:args.payment_request_id,p_payload:{payment_request_id:args.payment_request_id,target_status:args.target_status,expected_row_version:args.expected_row_version,detail:args.detail},p_reason:args.reason};break;
 }
 case 'transition_payment_request': if(!UUID.test(args.payment_request_id||'')||!Number.isInteger(args.expected_row_version)||!['PENDING','APPROVED','PAID','VERIFIED','CANCELLED'].includes(args.target_status)||typeof args.detail!=='object'||(args.target_status!=='PENDING'&&!UUID.test(args.approval_id||'')))return send(res,200,error(id,-32602,'Invalid payment transition'));rpc='portal_mcp_transition_payment_request';params={p_payment_request_id:args.payment_request_id,p_target_status:args.target_status,p_expected_row_version:args.expected_row_version,p_approval_id:args.approval_id||null,p_detail:args.detail};break;
 case 'analyze_suppliers_payments': if(Object.keys(args).length)return send(res,200,error(id,-32602,'Unexpected arguments'));rpc='portal_mcp_analyze_suppliers_payments';params={};break;
 case 'list_policies':
  if(Object.keys(args).some(k=>k!=='search')||(args.search!==undefined&&(typeof args.search!=='string'||args.search.length>120)))return send(res,200,error(id,-32602,'Invalid search'));
  rpc='portal_mcp_list_policies';params={p_search:args.search||null};break;
 case 'read_policy':
  if(Object.keys(args).length!==1||!UUID.test(args.document_id||''))return send(res,200,error(id,-32602,'Invalid document ID'));
  rpc='portal_mcp_read_policy';params={p_document_id:args.document_id};break;
 case 'list_daycares':
  if(Object.keys(args).length)return send(res,200,error(id,-32602,'Unexpected arguments'));
  rpc='portal_mcp_list_daycares';params={};break;
 case 'staff_by_daycare':
  if(Object.keys(args).length!==1||!UUID.test(args.daycare_id||''))return send(res,200,error(id,-32602,'Invalid daycare ID'));
  rpc='portal_mcp_staff_by_daycare';params={requested_daycare_id:args.daycare_id};break;
 case 'search_daycares':
  if(Object.keys(args).some(k=>!['search','limit','offset'].includes(k))||(args.search!==undefined&&(typeof args.search!=='string'||args.search.length>120))||(args.limit!==undefined&&(!Number.isInteger(args.limit)||args.limit<1||args.limit>100))||(args.offset!==undefined&&(!Number.isInteger(args.offset)||args.offset<0)))return send(res,200,error(id,-32602,'Invalid daycare search'));
  rpc='portal_mcp_search_daycares';params={p_search:args.search||null,p_limit:args.limit||25,p_offset:args.offset||0};break;
 case 'preview_daycare_import':
  if(Object.keys(args).some(k=>!['rows','source_name','idempotency_key'].includes(k))||!Array.isArray(args.rows)||args.rows.length<1||args.rows.length>100||typeof args.idempotency_key!=='string'||args.idempotency_key.trim().length<8||args.idempotency_key.length>160)return send(res,200,error(id,-32602,'Daycare preview requires 1-100 rows and an idempotency key'));
  rpc='portal_mcp_preview_daycare_import';params={p_rows:args.rows,p_source_name:args.source_name||'ChatGPT',p_idempotency_key:args.idempotency_key.trim()};break;
 case 'request_daycare_import_approval':
  if(Object.keys(args).length!==2||!UUID.test(args.batch_id||'')||typeof args.reason!=='string'||args.reason.trim().length<3||args.reason.length>500)return send(res,200,error(id,-32602,'Invalid daycare approval request'));
  rpc='portal_mcp_request_daycare_import_approval';params={p_batch_id:args.batch_id,p_reason:args.reason.trim()};break;
 case 'commit_daycare_import':
  if(Object.keys(args).length!==2||!UUID.test(args.batch_id||'')||!UUID.test(args.approval_id||''))return send(res,200,error(id,-32602,'Invalid daycare commit'));
  rpc='portal_mcp_commit_daycare_import';params={p_batch_id:args.batch_id,p_approval_id:args.approval_id};break;
 case 'data_capabilities':
  if(Object.keys(args).length)return send(res,200,error(id,-32602,'Unexpected arguments'));
  rpc='portal_mcp_data_capabilities';params={};break;
 case 'search_operational_data':
  if(!['employees','banking','payments','payroll'].includes(args.domain)||Object.keys(args).some(k=>!['domain','search','limit','offset'].includes(k))||(args.search!==undefined&&(typeof args.search!=='string'||args.search.length>120))||(args.limit!==undefined&&(!Number.isInteger(args.limit)||args.limit<1||args.limit>100))||(args.offset!==undefined&&(!Number.isInteger(args.offset)||args.offset<0||args.offset>10000)))return send(res,200,error(id,-32602,'Invalid operational search'));
  rpc='portal_mcp_search_operational_data';params={p_domain:args.domain,p_search:args.search||null,p_limit:args.limit||25,p_offset:args.offset||0};break;
 case 'analyze_operational_data':
  if(Object.keys(args).length!==1||!['employees','banking','payments','payroll'].includes(args.domain))return send(res,200,error(id,-32602,'Invalid analysis domain'));
  rpc='portal_mcp_analyze_operational_data';params={p_domain:args.domain};break;
 case 'find_employee_duplicates':
  if(Object.keys(args).length!==1||!args.employee||typeof args.employee!=='object'||Array.isArray(args.employee)||Object.keys(args.employee).some(k=>!['employee_code','national_id','email','phone'].includes(k)))return send(res,200,error(id,-32602,'Invalid employee duplicate request'));
  rpc='portal_mcp_find_employee_duplicates';params={p_employee:args.employee};break;
 case 'create_employee':
  if(Object.keys(args).length!==1||!args.employee||typeof args.employee!=='object'||Array.isArray(args.employee))return send(res,200,error(id,-32602,'Invalid employee'));
  rpc='portal_mcp_create_employee';params={p_employee:args.employee};break;
 case 'update_employee':
  if(Object.keys(args).length!==3||!UUID.test(args.employee_id||'')||!Number.isInteger(args.expected_row_version)||args.expected_row_version<1||!args.patch||typeof args.patch!=='object'||Array.isArray(args.patch)||!Object.keys(args.patch).length)return send(res,200,error(id,-32602,'Invalid employee update'));
  rpc='portal_mcp_update_employee';params={p_employee_id:args.employee_id,p_patch:args.patch,p_expected_row_version:args.expected_row_version};break;
 case 'import_employees':
  if(Object.keys(args).some(k=>!['rows','source_name'].includes(k))||!Array.isArray(args.rows)||args.rows.length<1||args.rows.length>100||(args.source_name!==undefined&&(typeof args.source_name!=='string'||args.source_name.length>120)))return send(res,200,error(id,-32602,'Employee import requires 1-100 rows'));
  rpc='portal_mcp_import_employees';params={p_rows:args.rows,p_source_name:args.source_name||'MCP'};break;
 case 'operational_catalog':
  if(Object.keys(args).length)return send(res,200,error(id,-32602,'Unexpected arguments'));
  rpc='portal_mcp_operational_catalog';params={};break;
 case 'employee_profile':
  if(Object.keys(args).length!==1||!UUID.test(args.employee_id||''))return send(res,200,error(id,-32602,'Invalid employee ID'));
  rpc='portal_mcp_employee_profile';params={p_employee_id:args.employee_id};break;
 case 'preview_operational_changes':
  if(Object.keys(args).some(k=>!['rows','source_name','idempotency_key'].includes(k))||!Array.isArray(args.rows)||args.rows.length<1||args.rows.length>100||typeof args.idempotency_key!=='string'||args.idempotency_key.trim().length<8||args.idempotency_key.length>160)return send(res,200,error(id,-32602,'Operational preview requires 1-100 rows and an idempotency key'));
  rpc='portal_mcp_preview_operational_changes';params={p_rows:args.rows,p_source_name:args.source_name||'ChatGPT',p_idempotency_key:args.idempotency_key.trim()};break;
 case 'request_operational_approval':
  if(Object.keys(args).length!==2||!UUID.test(args.batch_id||'')||typeof args.reason!=='string'||args.reason.trim().length<3||args.reason.length>500)return send(res,200,error(id,-32602,'Invalid operational approval request'));
  rpc='portal_mcp_request_operational_approval';params={p_batch_id:args.batch_id,p_reason:args.reason.trim()};break;
 case 'commit_operational_changes':
  if(Object.keys(args).length!==2||!UUID.test(args.batch_id||'')||!UUID.test(args.approval_id||''))return send(res,200,error(id,-32602,'Invalid operational commit'));
  rpc='portal_mcp_commit_operational_changes';params={p_batch_id:args.batch_id,p_approval_id:args.approval_id};break;
 case 'get_operational_batch':
  if(Object.keys(args).length!==1||!UUID.test(args.batch_id||''))return send(res,200,error(id,-32602,'Invalid operational batch'));
  rpc='portal_mcp_get_operational_batch';params={p_batch_id:args.batch_id};break;
 case 'search_operational_records':
  if(Object.keys(args).some(k=>!['entity','search','limit','offset'].includes(k))||typeof args.entity!=='string'||!/^[a-z_]{1,80}$/.test(args.entity)||(args.search!==undefined&&(typeof args.search!=='string'||args.search.length>120))||(args.limit!==undefined&&(!Number.isInteger(args.limit)||args.limit<1||args.limit>100))||(args.offset!==undefined&&(!Number.isInteger(args.offset)||args.offset<0||args.offset>10000)))return send(res,200,error(id,-32602,'Invalid operational record search'));
  rpc='portal_mcp_search_records';params={p_entity:args.entity,p_search:args.search||null,p_limit:args.limit||25,p_offset:args.offset||0};break;
 case 'get_operational_record':
  if(Object.keys(args).length!==2||typeof args.entity!=='string'||!/^[a-z_]{1,80}$/.test(args.entity)||!UUID.test(args.record_id||''))return send(res,200,error(id,-32602,'Invalid operational record request'));
  rpc='portal_mcp_get_record';params={p_entity:args.entity,p_record_id:args.record_id};break;
 case 'operational_report':
  if(Object.keys(args).length)return send(res,200,error(id,-32602,'Unexpected arguments'));
  rpc='portal_mcp_operational_report';params={};break;
 case 'create_policy':
  if(Object.keys(args).some(k=>!['title','category','body'].includes(k))||typeof args.title!=='string'||!args.title.trim()||args.title.length>200||(args.category!==undefined&&(typeof args.category!=='string'||args.category.length>120))||(args.body!==undefined&&(typeof args.body!=='string'||args.body.length>100000)))return send(res,200,error(id,-32602,'Invalid policy'));
  rpc='portal_mcp_create_policy';params={p_title:args.title,p_category:args.category||'כללי',p_body:args.body||''};break;
 case 'update_policy':
  if(Object.keys(args).length!==5||!UUID.test(args.document_id||'')||typeof args.title!=='string'||!args.title.trim()||args.title.length>200||typeof args.category!=='string'||args.category.length>120||typeof args.body!=='string'||args.body.length>100000||typeof args.expected_updated_at!=='string'||Number.isNaN(Date.parse(args.expected_updated_at)))return send(res,200,error(id,-32602,'Invalid policy update'));
  rpc='portal_mcp_update_policy';params={p_document_id:args.document_id,p_title:args.title,p_category:args.category,p_body:args.body,p_expected_updated_at:args.expected_updated_at};break;
 case 'request_policy_archive_approval':
  if(Object.keys(args).length!==2||!UUID.test(args.document_id||'')||typeof args.reason!=='string'||args.reason.trim().length<3||args.reason.length>500)return send(res,200,error(id,-32602,'Invalid approval request'));
  rpc='portal_request_approval';params={p_action_code:'POLICY.DELETE',p_resource_type:'POLICY',p_resource_id:args.document_id,p_payload:{document_id:args.document_id,reason:args.reason.trim()},p_reason:args.reason};break;
 case 'archive_policy':
  if(Object.keys(args).length!==3||!UUID.test(args.document_id||'')||!UUID.test(args.approval_id||'')||typeof args.reason!=='string'||args.reason.trim().length<3||args.reason.length>500)return send(res,200,error(id,-32602,'Invalid archive request'));
  rpc='portal_mcp_archive_policy';params={p_document_id:args.document_id,p_approval_id:args.approval_id,p_reason:args.reason};break;
 case 'request_bulk_policy_archive_approval':
  if(Object.keys(args).length!==2||!Array.isArray(args.document_ids)||args.document_ids.length<1||args.document_ids.length>50||new Set(args.document_ids).size!==args.document_ids.length||args.document_ids.some(v=>!UUID.test(v))||typeof args.reason!=='string'||args.reason.trim().length<3||args.reason.length>500)return send(res,200,error(id,-32602,'Invalid bulk approval request'));
  rpc='portal_request_approval';params={p_action_code:'POLICY.BULK',p_resource_type:'POLICY',p_resource_id:null,p_payload:{document_ids:args.document_ids,reason:args.reason.trim()},p_reason:args.reason};break;
 case 'bulk_archive_policies':
  if(Object.keys(args).length!==3||!Array.isArray(args.document_ids)||args.document_ids.length<1||args.document_ids.length>50||new Set(args.document_ids).size!==args.document_ids.length||args.document_ids.some(v=>!UUID.test(v))||!UUID.test(args.approval_id||'')||typeof args.reason!=='string'||args.reason.trim().length<3||args.reason.length>500)return send(res,200,error(id,-32602,'Invalid bulk request'));
  rpc='portal_mcp_bulk_archive_policies';params={p_document_ids:args.document_ids,p_approval_id:args.approval_id,p_reason:args.reason};break;
 case 'upload_policy_file': {
  if(Object.keys(args).length!==4||!UUID.test(args.document_id||'')||typeof args.filename!=='string'||!args.filename.trim()||args.filename.length>120||!['application/pdf','image/png','image/jpeg','text/plain'].includes(args.content_type)||typeof args.base64!=='string'||args.base64.length>4194304||!/^[A-Za-z0-9+/]+={0,2}$/.test(args.base64))return send(res,200,error(id,-32602,'Invalid file'));
  const bytes=Buffer.from(args.base64,'base64');
  if(!bytes.length||bytes.length>3*1024*1024)return send(res,200,error(id,-32602,'File exceeds 3 MiB'));
  const safeName=args.filename.trim().replace(/[^A-Za-z0-9._-]+/g,'_').slice(0,120)||'attachment';
  const objectPath=`policy-attachments/${user.id}/${args.document_id}/${crypto.randomUUID()}-${safeName}`;
  try{
   await upload(objectPath,token,args.content_type,bytes);
   const result=await api('/rest/v1/rpc/portal_mcp_record_file',token,{p_document_id:args.document_id,p_object_path:objectPath.replace('policy-attachments/',''),p_size:bytes.length,p_content_type:args.content_type});
   return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,isError:false}});
  }catch(e){return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:e.status===403?'Permission denied':'Upload failed'}],isError:true}});}
 }
 case 'download_policy_file': {
  if(Object.keys(args).length!==1||typeof args.object_path!=='string'||args.object_path.length>500||args.object_path.startsWith('/')||args.object_path.includes('..')||!new RegExp('^'+user.id+'/[0-9a-f-]{36}/[0-9a-f-]{36}-[A-Za-z0-9._-]+$','i').test(args.object_path))return send(res,200,error(id,-32602,'Invalid object path'));
  try{
   const result=await download(args.object_path,token);
   return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,isError:false}});
  }catch(e){return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:e.status===403?'Permission denied':'Download failed'}],isError:true}});}
 }
 }
 try{
  const result=await api('/rest/v1/rpc/'+rpc,token,params);
  return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,isError:false}});
 }catch(e){
  return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:e.status===401?'Session expired or invalid':e.status===403?'Permission denied':'Unable to retrieve data'}],isError:true}});
 }
};
