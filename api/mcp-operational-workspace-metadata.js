'use strict';
const {assertRuntimeConsistency,configuredOrigin}=require('./runtime-consistency');
module.exports=(req,res)=>{if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}const r=assertRuntimeConsistency();if(r.environment!=='preview'||r.supabaseProjectId!=='iwsbjudahtjyigecymzd')return res.status(500).json({error:'preview_operational_runtime_required'});res.setHeader('Cache-Control','public, max-age=300');return res.status(200).json({resource:`${configuredOrigin()}/api/mcp`,authorization_servers:[r.issuer],bearer_methods_supported:['header']});};
