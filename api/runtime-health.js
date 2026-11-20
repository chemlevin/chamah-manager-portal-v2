'use strict';
const {validateRuntimeConsistency}=require('./runtime-consistency');
module.exports=async (req,res)=>{
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}
  const consistency=validateRuntimeConsistency();
  const checks={environment:consistency.ok,canonical_resource:consistency.resource,oauth_issuer:consistency.issuer,build_commit:consistency.buildCommit,deployment_id:consistency.deploymentId||null};
  if(!consistency.ok)return res.status(503).json({ok:false,checks,errors:consistency.errors});
  return res.status(200).json({ok:true,checks});
};
