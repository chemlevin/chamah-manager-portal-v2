'use strict';
const RESOURCE='https://chamah-portal.vercel.app/api/mcp';
const AUTH_SERVER='https://vyyfuaqmbxvfqgbfqooc.supabase.co/auth/v1';
module.exports=(req,res)=>{if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}res.setHeader('Cache-Control','public, max-age=300');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');return res.status(200).json({resource:RESOURCE,authorization_servers:[AUTH_SERVER],bearer_methods_supported:['header']});};
