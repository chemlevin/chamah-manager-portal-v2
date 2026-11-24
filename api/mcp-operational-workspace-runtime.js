'use strict';

const {assertRuntimeConsistency,configuredOrigin}=require('./runtime-consistency');
const RUNTIME=assertRuntimeConsistency();
const API_KEY=process.env.CHAMAH_SUPABASE_PUBLISHABLE_KEY;
const EXPECTED={
  production:{project:'vyyfuaqmbxvfqgbfqooc',issuer:'https://vyyfuaqmbxvfqgbfqooc.supabase.co/auth/v1',origin:'https://chamah-portal.vercel.app'},
  preview:{project:'iwsbjudahtjyigecymzd',issuer:'https://iwsbjudahtjyigecymzd.supabase.co/auth/v1',origin:'https://chamah-director-preview.vercel.app'}
};
const ENV=EXPECTED[RUNTIME.environment];
if(!ENV||RUNTIME.supabaseProjectId!==ENV.project||RUNTIME.issuer!==ENV.issuer||configuredOrigin()!==ENV.origin)throw new Error('Operational Workspace runtime mismatch');
const PRODUCTION=RUNTIME.environment==='production';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCAN={name:'production_inventory_scan',description:'Director-only read-only Production inventory scan; no canonical business-data writes',inputSchema:{type:'object',properties:{project_id:{type:'string',const:'vyyfuaqmbxvfqgbfqooc'}},required:['project_id'],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false},_meta:{classification:'READ_ONLY',authorization:'DIRECTOR_ONLY'}};
const CATALOG={name:'operational_catalog',description:'Read the environment-pinned operational catalog',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false}};
const CHILD={name:'child_reconciliation',description:'Read-only bounded child/daycare/month reconciliation',inputSchema:{type:'object',properties:{month:{type:'string'},daycare_id:{type:'string'},child_id:{type:'string'}},required:['month'],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false}};
const PROFILE={name:'get_profile',description:'Read authenticated profile and server-resolved role',inputSchema:{type:'object',properties:{},additionalProperties:false}};
const PREVIEW_TOOLS=[PROFILE,CATALOG,CHILD];
const PRODUCTION_TOOLS=[PROFILE,CATALOG,CHILD,SCAN];
function send(res,status,body,headers={}){res.status(status).setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');for(const [k,v] of Object.entries(headers))if(v)res.setHeader(k,v);return res.end(JSON.stringify(body));}
function error(id,code,message){return {jsonrpc:'2.0',id,error:{code,message}};}
async function api(path,token,body){const r=await fetch(RUNTIME.supabaseUrl+path,{method:body===undefined?'GET':'POST',headers:{apikey:API_KEY,Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});let d;try{d=await r.json();}catch{d=null;}if(!r.ok){const e=new Error('upstream');e.status=r.status;throw e;}return d;}
function authorizedTools(auth){return PRODUCTION&&auth.roles?.includes('DIRECTOR')?PRODUCTION_TOOLS:PREVIEW_TOOLS;}
function validate(name,args,auth){if(name==='production_inventory_scan'){if(!PRODUCTION||!auth.roles?.includes('DIRECTOR'))return {status:403,message:'Director authorization required'};if(Object.keys(args).length!==1||args.project_id!==EXPECTED.production.project)return {status:400,message:'Production project mismatch'};}if(name==='child_reconciliation'&&(typeof args.month!=='string'||Number.isNaN(Date.parse(args.month))))return {status:400,message:'Invalid reconciliation month'};return null;}
function dispatch(name,args){if(name==='operational_catalog')return ['portal_mcp_operational_contract_catalog',{}];if(name==='child_reconciliation')return ['portal_mcp_child_reconciliation',{p_month:args.month,p_daycare_id:args.daycare_id||null,p_child_id:args.child_id||null}];if(name==='production_inventory_scan')return ['portal_director_production_inventory_scan',{p_project_id:EXPECTED.production.project}];return null;}
module.exports=async function handler(req,res){
  const metadata=`${configuredOrigin()}/api/mcp-operational-workspace-metadata`; const challenge=`Bearer resource_metadata="${metadata}", error="invalid_token"`;
  if(req.method==='OPTIONS')return res.status(204).end(); if(req.method!=='POST')return send(res,405,{error:'method_not_allowed'});
  const raw=String(req.headers.authorization||''); if(!/^Bearer [A-Za-z0-9._~-]+$/.test(raw))return send(res,401,{error:'authentication_required'},{'WWW-Authenticate':challenge});
  const token=raw.slice(7); let user,auth; try{user=await api('/auth/v1/user',token);auth=await api('/rest/v1/rpc/portal_my_authorization',token,{});if(!user?.id||!auth?.active)return send(res,403,{error:'portal_access_denied'});}catch(e){return send(res,e.status===401?401:403,{error:'portal_access_denied'},{'WWW-Authenticate':challenge});}
  let m=req.body; if(typeof m==='string')try{m=JSON.parse(m);}catch{return send(res,400,{error:'parse_error'});} if(!m||m.jsonrpc!=='2.0')return send(res,400,{error:'invalid_request'}); const id=m.id;
  if(m.method==='initialize')return send(res,200,{jsonrpc:'2.0',id,result:{protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'chamah-operational-workspace',version:'2.0.0'}}});
  if(m.method==='ping')return send(res,200,{jsonrpc:'2.0',id,result:{}});
  const tools=authorizedTools(auth); if(m.method==='tools/list')return send(res,200,{jsonrpc:'2.0',id,result:{tools}}); if(m.method!=='tools/call')return send(res,200,error(id,-32601,'Method not found'));
  const name=m.params?.name,args=m.params?.arguments||{}; if(!tools.some(t=>t.name===name)){if(name==='production_inventory_scan'&&!PRODUCTION)return send(res,200,error(id,-32003,'Production scan unavailable in Preview'));return send(res,200,error(id,-32602,'Invalid or unauthorized tool'));}
  const invalid=validate(name,args,auth); if(invalid)return send(res,invalid.status,error(id,invalid.status===403?-32003:-32602,invalid.message)); if(name==='get_profile'){const out={id:user.id,email:String(user.email||''),role_classification:auth.roles?.includes('DIRECTOR')?'DIRECTOR':'MANAGER'};return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(out)}],structuredContent:out,isError:false}});}
  const call=dispatch(name,args); if(!call)return send(res,200,error(id,-32602,'Unsupported tool')); try{const out=await api('/rest/v1/rpc/'+call[0],token,call[1]);return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(out)}],structuredContent:out,isError:false}});}catch(e){return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify({status:e.status||500,error:'READ_FAILED'})}],isError:true}});}
};
