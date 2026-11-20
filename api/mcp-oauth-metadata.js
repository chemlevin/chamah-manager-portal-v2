'use strict';
const {ACTIVE_OAUTH_ISSUER,configuredOrigin,assertRuntimeConsistency}=require('./runtime-consistency');
assertRuntimeConsistency();
module.exports=(req,res)=>{if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}const resource=`${configuredOrigin()}/api/mcp`;res.setHeader('Cache-Control','public, max-age=300');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');return res.status(200).json({resource,authorization_servers:[ACTIVE_OAUTH_ISSUER],bearer_methods_supported:['header']});};
