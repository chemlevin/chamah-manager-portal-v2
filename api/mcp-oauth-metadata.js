'use strict';
const {assertRuntimeConsistency,configuredOrigin}=require('./runtime-consistency');
module.exports=(req,res)=>{if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}const runtime=assertRuntimeConsistency();const resource=`${configuredOrigin()}/api/mcp`;res.setHeader('Cache-Control','public, max-age=300');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');return res.status(200).json({resource,authorization_servers:[runtime.issuer],bearer_methods_supported:['header']});};
