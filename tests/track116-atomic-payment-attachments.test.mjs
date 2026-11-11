import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const handler=require('../api/mcp.js');
const userId='11111111-1111-4111-8111-111111111111';
const paymentId='22222222-2222-4222-8222-222222222222';
const operationId='33333333-3333-4333-8333-333333333333';
const documentId='44444444-4444-4444-8444-444444444444';

function response(status,data){return new Response(data===undefined?null:JSON.stringify(data),{status,headers:{'content-type':'application/json'}});}
function request(idempotencyKey='track116-retry'){
 return {method:'POST',url:'/api/mcp',headers:{authorization:'Bearer test.token.value'},body:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'upload_payment_document',arguments:{payment_request_id:paymentId,document_type:'INVOICE',filename:'invoice.pdf',content_type:'application/pdf',base64:Buffer.from('%PDF-test').toString('base64'),idempotency_key:idempotencyKey}}}};
}
function invoke(req){
 return new Promise(resolve=>{const headers={};const res={statusCode:200,setHeader(k,v){headers[k]=v;return this;},status(v){this.statusCode=v;return this;},end(body=''){resolve({status:this.statusCode,headers,body:body?JSON.parse(body):null});}};handler(req,res);});
}
function fakeBackend({finalizeResponseLoss=false,finalizeFailure=false}={}){
 const state={object:false,document:false,status:null,deletes:0,calls:[]};
 const fetch=async(url,options={})=>{
  const path=new URL(url).pathname;state.calls.push(`${options.method||'GET'} ${path}`);
  if(path==='/auth/v1/user')return response(200,{id:userId});
  if(path.endsWith('/portal_my_access'))return response(200,{profile:{is_active:true}});
  if(path.endsWith('/portal_my_authorization'))return response(200,{active:true,roles:['DIRECTOR']});
  if(path.endsWith('/portal_mcp_prepare_payment_attachment')){state.status??='PENDING';return response(200,{status:state.status,operation_id:operationId,object_path:`${userId}/${paymentId}/${operationId}-invoice.pdf`,payment_request_document_id:state.document?documentId:null});}
  if(path.includes('/storage/v1/object/payment-request-attachments/')&&options.method==='POST'){if(state.object)return response(400,{message:'Asset Already Exists'});state.object=true;return response(200,{Key:'ok'});}
  if(path.endsWith('/portal_mcp_finalize_payment_attachment')){
   if(finalizeFailure)return response(500,{message:'injected record failure'});
   state.document=true;state.status='FINALIZED';
   if(finalizeResponseLoss)return response(500,{message:'injected response loss'});
   return response(200,{status:'FINALIZED',payment_request_document_id:documentId,object_path:`${userId}/${paymentId}/${operationId}-invoice.pdf`,verified:true});
  }
  if(path.endsWith('/portal_mcp_begin_payment_attachment_cleanup'))return response(200,state.status==='FINALIZED'?{status:'FINALIZED',payment_request_document_id:documentId,object_path:'valid'}:(state.status='CLEANUP_PENDING',{status:'CLEANUP_PENDING',object_path:`${userId}/${paymentId}/${operationId}-invoice.pdf`}));
  if(path==='/storage/v1/object/payment-request-attachments'&&options.method==='DELETE'){state.deletes++;state.object=false;return response(200,[]);}
  if(path.endsWith('/portal_mcp_complete_payment_attachment_cleanup')){state.status='CLEANED';return response(200,{status:'CLEANED'});}
  throw new Error(`Unexpected request ${options.method||'GET'} ${path}`);
 };
 return {state,fetch};
}

test('recording failure compensates the uploaded object and leaves no metadata',async()=>{
 const original=globalThis.fetch;const backend=fakeBackend({finalizeFailure:true});globalThis.fetch=backend.fetch;
 try{const result=await invoke(request());assert.equal(result.body.result.isError,true);assert.equal(backend.state.object,false);assert.equal(backend.state.document,false);assert.equal(backend.state.status,'CLEANED');assert.equal(backend.state.deletes,1);}finally{globalThis.fetch=original;}
});

test('concurrent retries converge on one object and one metadata record',async()=>{
 const original=globalThis.fetch;const backend=fakeBackend();globalThis.fetch=backend.fetch;
 try{const [a,b]=await Promise.all([invoke(request('same-key')),invoke(request('same-key'))]);assert.equal(a.body.result.isError,false);assert.equal(b.body.result.isError,false);assert.equal(backend.state.object,true);assert.equal(backend.state.document,true);assert.equal(backend.state.deletes,0);}finally{globalThis.fetch=original;}
});

test('lost finalize response cannot compensate a valid finalized file',async()=>{
 const original=globalThis.fetch;const backend=fakeBackend({finalizeResponseLoss:true});globalThis.fetch=backend.fetch;
 try{const result=await invoke(request('response-loss'));assert.equal(result.body.result.isError,false);assert.equal(result.body.result.structuredContent.payment_request_document_id,documentId);assert.equal(backend.state.object,true);assert.equal(backend.state.document,true);assert.equal(backend.state.deletes,0);}finally{globalThis.fetch=original;}
});
