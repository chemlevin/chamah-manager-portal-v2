'use strict';
const {validateRuntimeConsistency,CANONICAL_MCP_RESOURCE,ACTIVE_OAUTH_ISSUER}=require('./runtime-consistency');
module.exports=async (req,res)=>{
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}
  const consistency=validateRuntimeConsistency();
  const checks={environment:consistency.ok,canonical_resource:CANONICAL_MCP_RESOURCE,oauth_issuer:ACTIVE_OAUTH_ISSUER};
  if(!consistency.ok)return res.status(503).json({ok:false,checks,errors:consistency.errors});
  return res.status(200).json({ok:true,checks});
};
