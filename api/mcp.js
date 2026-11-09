'use strict';

// Read-only MCP Streamable HTTP endpoint. Each call uses the caller's Supabase
// access token; no service_role key and no cross-user cache.
const SUPABASE_URL = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const API_KEY = process.env.CHAMAH_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_4MKSdjf7O1oVS4SWhQ36Qw_QUKW8dyW';
const TOOLS = [
  {name:'list_policies',description:'List published organizational policies visible to the authenticated user',inputSchema:{type:'object',properties:{search:{type:'string',maxLength:120}},additionalProperties:false}},
  {name:'read_policy',description:'Read the published version of an authorized policy (never drafts)',inputSchema:{type:'object',properties:{document_id:{type:'string',format:'uuid'}},required:['document_id'],additionalProperties:false}},
  {name:'list_daycares',description:'List daycares visible to the authenticated user',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'staff_by_daycare',description:'List employees assigned to an authorized daycare',inputSchema:{type:'object',properties:{daycare_id:{type:'string',format:'uuid'}},required:['daycare_id'],additionalProperties:false}}
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
module.exports=async function handler(req,res){
 res.setHeader('Allow','POST, OPTIONS');
 if(req.method==='OPTIONS')return send(res,204,{});
 if(req.method!=='POST')return send(res,405,{error:'method_not_allowed'});
 const auth=req.headers.authorization||'';
 if(!/^Bearer [A-Za-z0-9._~-]+$/.test(auth))return send(res,401,{error:'authentication_required'});
 const token=auth.slice(7);
 try{
  const user=await api('/auth/v1/user',token);
  if(!user?.id)return send(res,401,{error:'authentication_required'});
 }catch{return send(res,401,{error:'invalid_or_expired_token'});}
 let m=req.body;
 if(typeof m==='string'){try{m=JSON.parse(m)}catch{return send(res,400,error(null,-32700,'Parse error'));}}
 if(!m||Array.isArray(m)||typeof m!=='object'||m.jsonrpc!=='2.0'||typeof m.method!=='string')return send(res,400,error(m?.id??null,-32600,'Invalid request'));
 if(JSON.stringify(m).length>12000)return send(res,413,error(m.id??null,-32600,'Request too large'));
 const id=m.id??null;
 if(m.method==='notifications/initialized')return res.status(202).end();
 if(m.method==='initialize')return send(res,200,{jsonrpc:'2.0',id,result:{protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'chamah-portal-readonly',version:'0.1.0'}}});
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
 }
 try{
  const result=await api('/rest/v1/rpc/'+rpc,token,params);
  return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}],isError:false}});
 }catch(e){
  return send(res,200,{jsonrpc:'2.0',id,result:{content:[{type:'text',text:e.status===401?'Session expired or invalid':e.status===403?'Permission denied':'Unable to retrieve data'}],isError:true}});
 }
};
