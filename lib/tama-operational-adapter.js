'use strict';

const crypto = require('node:crypto');
const CONTRACT_VERSION = '1.0.0';
const PARSER_VERSION = '1.1.0';
const ENTITY = 'government_funding_records';
const MOVEMENT_TYPES = new Set(['REGULAR','RETRO','RETRO_ADJUSTMENT_NEGATIVE','OFFSET_OR_DEDUCTION','REFUND','CANCELLATION','ADJUSTMENT','NEGATIVE_UNCLASSIFIED']);

function canonical(value){
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function digest(value){return crypto.createHash('sha256').update(canonical(value)).digest('hex');}
function idempotencyKey(sourceDigest){return `tama-preview-${sourceDigest}`;}
function lineage(movement,sourceFile){
  const source=movement.source_provenance||{};
  return {source_file:source.filename||sourceFile,filename:source.filename||sourceFile,page:source.page??null,source_row:source.source_row??null,raw_tokens:source.raw_tokens||[],raw_payload:movement.original_payload||null,extraction_method:source.extraction_method||null,coordinates:source.coordinates||null,report_month:movement.report_month||null,entitlement_month:movement.entitlement_month||null,retro_months:movement.retro_months||[],movement_type:movement.movement_type||null,reason_code:movement.reason_code||null,confidence:movement.confidence||null};
}
function movementRow(movement,sourceFile,reportIndex,movementIndex){
  if(!movement.national_id)return {status:'UNRESOLVED',reason:'MISSING_NATIONAL_ID',movement,report_index:reportIndex,movement_index:movementIndex};
  if(!MOVEMENT_TYPES.has(movement.movement_type))return {status:'UNRESOLVED',reason:'UNSUPPORTED_MOVEMENT_TYPE',movement,report_index:reportIndex,movement_index:movementIndex};
  const source=lineage(movement,sourceFile);
  const sourceRecordId=`${sourceFile}:${source.page??0}:${source.source_row??movementIndex}`;
  return {operation:'CREATE',entity:ENTITY,record_id:null,values:{national_id:String(movement.national_id),amount:Number(movement.amount??0),funding_month:movement.entitlement_month||movement.report_month||null,movement_type:movement.movement_type,source_system:'TAMA_GOVERNMENT_FUNDING',source_record_id:sourceRecordId,source_file:sourceFile,report_month:movement.report_month||null,entitlement_month:movement.entitlement_month||null,retro_months:movement.retro_months||[],grade:movement.grade||null,source_payload:source,original_values:movement.original_payload||null}};
}
function aggregateRows(rows){
  const groups=new Map();
  for(const row of rows){
    const v=row.values;
    const key=JSON.stringify([v.national_id,v.funding_month,v.movement_type,v.retro_months||[]]);
    let group=groups.get(key);
    if(!group){group={...row,values:{...v,amount:0,source_payload:{aggregation_key:key,contributing_source_rows:[],source_record_ids:[]},original_values:[]}};groups.set(key,group);}
    group.values.amount+=Number(v.amount||0);
    group.values.source_payload.contributing_source_rows.push(v.source_payload);
    group.values.source_payload.source_record_ids.push(v.source_record_id);
    group.values.original_values.push(v.original_values);
  }
  for(const row of groups.values()){
    const ids=row.values.source_payload.source_record_ids.slice().sort();
    row.values.source_payload.source_record_ids=ids;
    row.values.source_record_id=`aggregate:${digest(ids).slice(0,32)}`;
  }
  return [...groups.values()];
}
function buildOperationalPreviewRequest(reports,options={}){
  if(!Array.isArray(reports)||reports.length===0)throw new TypeError('At least one parsed TAMA report is required');
  const sourceRows=[];const unresolved=[];const reportProvenance=[];
  reports.forEach((report,reportIndex)=>{
    const sourceFile=report.source_provenance?.filename||report.report_header?.source_filename||options.sourceFile||`tama-report-${reportIndex+1}.pdf`;
    reportProvenance.push({source_file:sourceFile,report_header:report.report_header||{},parser_status:report.status});
    (report.movements||[]).forEach((movement,movementIndex)=>{const row=movementRow(movement,sourceFile,reportIndex,movementIndex);if(row.status==='UNRESOLVED')unresolved.push(row);else sourceRows.push(row);});
    (report.exceptions||[]).forEach(exception=>unresolved.push({status:'UNRESOLVED',reason:exception.code,exception}));
  });
  const rows=aggregateRows(sourceRows);
  const sourceProvenance={source_system:'TAMA_GOVERNMENT_FUNDING',parser:'tama-coordinate-aware',parser_version:PARSER_VERSION,contract_version:CONTRACT_VERSION,reports:reportProvenance,source_row_count:sourceRows.length,aggregated_row_count:rows.length,unresolved_count:unresolved.length,unresolved_rows:unresolved,canonical_writes:false};
  const payload={contract_version:CONTRACT_VERSION,rows,source_provenance:sourceProvenance};
  const previewDigest=digest(payload);
  return {contract_version:CONTRACT_VERSION,rows,source_name:options.sourceName||'TAMA 2026 reports parser-1.1.0',source_provenance:{...sourceProvenance,preview_digest:previewDigest},idempotency_key:options.idempotencyKey||idempotencyKey(previewDigest),preview_digest:previewDigest,unresolved,source_row_count:sourceRows.length,canonical_writes:false};
}
module.exports={CONTRACT_VERSION,PARSER_VERSION,buildOperationalPreviewRequest,digest,idempotencyKey};
