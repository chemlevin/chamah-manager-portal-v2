'use strict';
const PRODUCTION_ORIGIN='https://chamah-portal.vercel.app';
const AUTH_SERVER='https://vyyfuaqmbxvfqgbfqooc.supabase.co/auth/v1';
function requestOrigin(req){const raw=String(req.headers['x-forwarded-host']||req.headers.host||'').trim().toLowerCase();const host=raw.split(',')[0].trim();return /^(?:[a-z0-9-]+\.)*vercel\.app$/.test(host)?`https://${host}`:PRODUCTION_ORIGIN;}
module.exports=(req,res)=>{if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}const resource=`${requestOrigin(req)}/api/mcp`;res.setHeader('Cache-Control','public, max-age=300');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');return res.status(200).json({resource,authorization_servers:[AUTH_SERVER],bearer_methods_supported:['header']});};
