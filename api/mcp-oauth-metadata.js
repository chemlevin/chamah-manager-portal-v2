'use strict';
const PRODUCTION_ORIGIN='https://chamah-portal.vercel.app';
const {ACTIVE_OAUTH_ISSUER,assertRuntimeConsistency}=require('./runtime-consistency');
assertRuntimeConsistency();
const requestOrigin=()=>PRODUCTION_ORIGIN;
module.exports=(req,res)=>{if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}const resource=`${requestOrigin()}/api/mcp`;res.setHeader('Cache-Control','public, max-age=300');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');return res.status(200).json({resource,authorization_servers:[ACTIVE_OAUTH_ISSUER],bearer_methods_supported:['header']});};
