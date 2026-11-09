'use strict';
module.exports=(req,res)=>{if(req.method!=='GET')return res.status(405).end();res.setHeader('Cache-Control','public, max-age=300');res.setHeader('Content-Type','application/json');return res.status(200).json({resource:'https://chamah-portal-chamah.vercel.app/api/mcp',authorization_servers:['https://vyyfuaqmbxvfqgbfqooc.supabase.co/auth/v1'],bearer_methods_supported:['header']});};
