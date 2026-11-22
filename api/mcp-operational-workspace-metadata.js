'use strict';
const {assertRuntimeConsistency,configuredOrigin}=require('./runtime-consistency');
module.exports=(req,res)=>{if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}const r=assertRuntimeConsistency();res.setHeader('Cache-Control','public, max-age=300');return res.status(200).json({resource:`${configuredOrigin()}/api/mcp-operational-workspace`,authorization_servers:[r.issuer],bearer_methods_supported:['header']});};
