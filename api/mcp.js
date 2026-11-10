'use strict';

// Director-only MCP Streamable HTTP endpoint. Every operation uses the caller's
// Supabase token; no privileged key, generic table access, or cross-user cache.
const SUPABASE_URL = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const API_KEY = process.env.CHAMAH_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_4MKSdjf7O1oVS4SWhQ36Qw_QUKW8dyW';
const PORTAL_ORIGIN = 'https://chamah-portal.vercel.app';
const RESOURCE = `${PORTAL_ORIGIN}/api/mcp`;
const RESOURCE_METADATA = `${PORTAL_ORIGIN}/.well-known/oauth-protected-resource`;
const AUTH_SERVER = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co/auth/v1';
const PROTOCOL_VERSION = '2025-03-26';
const TOOLS = [
  {name:'list_policies',description:'List published organizational policies visible to the authenticated user',inputSchema:{type:'object',properties:{search:{type:'string',maxLength:120}},additionalProperties:false}},
  {name:'read_policy',description:'Read the published version of an authorized policy (never drafts)',inputSchema:{type:'object',properties:{document_id:{type:'string',format:'uuid'}},required:['document_id'],additionalProperties:false}},
  {name:'list_daycares',description:'List daycares visible to the authenticated user',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'staff_by_daycare',description:'List employees assigned to an authorized daycare',inputSchema:{type:'object',properties:{daycare_id:{type:'string',format:'uuid'}},required:['daycare_id'],additionalProperties:false}},
  {name:'create_policy',description:'Create an organizational policy draft',inputSchema:{type:'object',properties:{title:{type:'string',minLength:1,maxLength:200},category:{type:'string',maxLength:120},body:{type:'string',maxLength:100000}},required:['title'],additionalProperties:false}},
  {name:'update_policy',description:'Update a policy draft with optimistic concurrency',inputSchema:{type:'object',properties:{document_id:{type:'string',format:'uuid'},title:{type:'string',minLength:1,maxLength:200},category:{type:'string',maxLength:120},body:{type:'string',maxLength:100000},expected_updated_at:{type:'string',format:'date-time'}},required:['document_id','title','category','body','expected_updated_at'],additionalProperties:false}},
  {name:'request_policy_archive_approval',description:'Create a short-lived approval bound to one policy archive request',inputSchema:{type:'object',properties:{document_id:{type:'string',format:'uuid'},reason:{type:'string',minLength:3,maxLength:500}},required:['document_id','reason'],additionalProperties:false}},
  {name:'archive_policy',description:'Soft-delete a policy with an exact unconsumed approval',inputSchema:{type:'object',properties:{document_id:{type:'string',format:'uuid'},approval_id:{type:'string',format:'uuid'},reason:{type:'string',minLength:3,maxLength:500}},required:['document_id','approval_id','reason'],additionalProperties:false}},
  {name:'request_bulk_policy_archive_approval',description:'Create a short-lived approval for an exact bulk archive set',inputSchema:{type:'object',properties:{document_ids:{type:'array',minItems:1,maxItems:50,uniqueItems:true,items:{type:'string',format:'uuid'}},reason:{type:'string',minLength:3,maxLength:500}},required:['document_ids','reason'],additionalProperties:false}},
  {name:'bulk_archive_policies',description:'Atomically soft-delete an approved set of policies',inputSchema:{type:'object',properties:{document_ids:{type:'array',minItems:1,maxItems:50,uniqueItems:true,items:{type:'string',format:'uuid'}},approval_id:{type:'string',format:'uuid'},reason:{type:'string',minLength:3,maxLength:500}},required:['document_ids','approval_id','reason'],additionalProperties:false}},
  {name:'upload_policy_file',description:'Upload a validated attachment (PDF, PNG, JPEG or text; up to 3 MiB)',inputSchema:{type:'object',properties:{document_id:{type:'string',format:'uuid'},filename:{type:'string',minLength:1,maxLength:120},content_type:{type:'string',enum:['application/pdf','image/png','image/jpeg','text/plain']},base64:{type:'string',minLength:1,maxLength:4194304}},required:['document_id','filename','content_type','base64'],additionalProperties:false}}
];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
module.exports=async function handler(req,res){
 res.setHeader('Allow','POST, OPTIONS');
 if(req.url?.includes('.well-known/oauth-protected-resource'))return send(res,200,{resource:RESOURCE,authorization_servers:[AUTH_SERVER],bearer_methods_supported:['header']});
 res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${RESOURCE_METADATA}"`);
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
 try{
  const authorization=await api('/rest/v1/rpc/portal_my_authorization',token,{});
  if(!authorization?.active||!authorization?.roles?.includes('DIRECTOR'))return send(res,403,{error:'director_access_required'});
 }catch(e){return send(res,e.status===401?401:403,{error:e.status===401?'invalid_or_expired_token':'director_access_required'});}
 let m=req.body;
 if(typeof m==='string'){try{m=JSON.parse(m)}catch{return send(res,400,error(null,-32700,'Parse error'));}}
 if(!m||Array.isArray(m)||typeof m!=='object'||m.jsonrpc!=='2.0'||typeof m.method!=='string')return send(res,400,error(m?.id??null,-32600,'Invalid request'));
 const requestSize=JSON.stringify(m).length;
 if(requestSize>(m?.params?.name==='upload_policy_file'?4300000:12000))return send(res,413,error(m.id??null,-32600,'Request too large'));
 if(m.id===undefined)return res.status(202).end();
 const id=m.id;
 if(m.method==='initialize')return send(res,200,{jsonrpc:'2.0',id,result:{protocolVersion:PROTOCOL_VERSION,capabilities:{tools:{listChanged:false}},serverInfo:{name:'chamah-portal-director',version:'1.0.0'}}});
 if(m.method==='ping')return send(res,200,{jsonrpc:'2.0',id,result:{}});
 if(m.method==='tools/list')return send(res,200,{jsonrpc:'2.0',id,result:{tools:TOOLS}});
 if(m.method!=='tools/call')return send(res,200,error(id,-32601,'Method not found'));
 const name=m.params?.name,args=m.params?.arguments||{};
 if(!TOOLS.some(t=>t.name===name)||!args||typeof args!=='object'||Array.isArray(args))return send(res,200,error(id,-32602,'Invalid tool'));
 let rpc,params;
 switch(name){
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
 }
 try{
  const result=await api('/rest/v1/rpc/'+rpc,token,params);
  return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,isError:false}});
 }catch(e){
  return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:e.status===401?'Session expired or invalid':e.status===403?'Permission denied':'Unable to retrieve data'}],isError:true}});
 }
};
