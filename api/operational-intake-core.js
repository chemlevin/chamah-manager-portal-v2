'use strict';
// Additive, pure intake reconciliation primitives. No database writes or implicit approvals.
const crypto = require('node:crypto');
const CLASSES = Object.freeze(['CREATE','UPDATE','SKIP','CONFLICT','UNRESOLVED','SOURCE_MISSING']);
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function normalizeKey(value) { return value == null ? '' : String(value).normalize('NFKC').trim(); }
function formatSignature(headers) { return digest(headers.map(h=>normalizeKey(h).toLowerCase())); }
function recognizeMapping(headers, knownMappings) {
  const signature=formatSignature(headers);
  const matches=knownMappings.filter(m=>m.signature===signature);
  return matches.length===1 ? {status:'MATCHED',mapping:matches[0],signature}
    : {status:matches.length?'AMBIGUOUS':'UNRECOGNIZED',signature,mapping:null};
}
function indexCanonical(records, keyFields) {
  const index=new Map(), duplicates=new Set();
  for(const record of records) for(const field of keyFields) {
    const key=normalizeKey(record[field]);
    if(!key) continue;
    const token=field+':'+key;
    if(index.has(token) && index.get(token)!==record) duplicates.add(token);
    else index.set(token,record);
  }
  return {index,duplicates};
}
function classifyRows({rows,canonical,keyFields=['employee_code','national_id'],sourceFile,period}) {
  if(!Array.isArray(rows)||!Array.isArray(canonical)||!keyFields.length) throw new TypeError('Invalid reconciliation input');
  const {index,duplicates}=indexCanonical(canonical,keyFields);
  const seen=new Map();
  return rows.map((source,i)=>{
    const sourceRow=source.source_row??i+1;
    const keys=Object.fromEntries(keyFields.map(k=>[k,normalizeKey(source[k])]).filter(([,v])=>v));
    const tokens=Object.entries(keys).map(([k,v])=>k+':'+v);
    const targets=new Set(tokens.filter(t=>index.has(t)).map(t=>index.get(t)));
    const repeated=tokens.filter(t=>seen.has(t));
    tokens.forEach(t=>seen.set(t,sourceRow));
    const evidence={source_file:sourceFile,source_row:sourceRow,period,stable_source_keys:keys};
    let classification,reason,target=null,changed_fields=[],current_values=null,proposed_values={...source};
    if(!tokens.length){classification='UNRESOLVED';reason='NO_STABLE_SOURCE_KEY';}
    else if(repeated.length){classification='CONFLICT';reason='DUPLICATE_SOURCE_KEY';}
    else if(tokens.some(t=>duplicates.has(t))){classification='CONFLICT';reason='DUPLICATE_CANONICAL_KEY';}
    else if(targets.size>1){classification='CONFLICT';reason='IDENTIFIERS_RESOLVE_TO_DIFFERENT_RECORDS';}
    else if(!targets.size){classification='CREATE';reason='NO_CANONICAL_MATCH';}
    else {
      target=[...targets][0];
      current_values={...target};
      // A source identifier that contradicts the canonical identifier cannot be redirected.
      const mismatch=Object.entries(keys).some(([k,v])=>normalizeKey(target[k]) && normalizeKey(target[k])!==v);
      if(mismatch){classification='CONFLICT';reason='STABLE_IDENTIFIER_MISMATCH';}
      else {
        changed_fields=Object.keys(source).filter(k=>k!=='source_row' && source[k]!==undefined && stableString(source[k])!==stableString(target[k]));
        classification=changed_fields.length?'UPDATE':'SKIP';
        reason=changed_fields.length?'VERIFIED_STABLE_KEY_CHANGE':'NO_CHANGED_FIELDS';
      }
    }
    return {classification,reason,...evidence,target_record_id:target?.id??null,current_values,proposed_values,changed_fields,evidence:{matched_keys:tokens,source_hash:digest(source)}};
  });
}
function stableString(value){return JSON.stringify(stable(value));}
function partition(rows,maxRows=100){
  if(!Number.isInteger(maxRows)||maxRows<1||maxRows>100) throw new RangeError('Batch size must be 1..100');
  return Array.from({length:Math.ceil(rows.length/maxRows)},(_,i)=>rows.slice(i*maxRows,(i+1)*maxRows));
}
function approvalDigest(rows,context={}){return digest({context,rows:rows.map(r=>({classification:r.classification,target_record_id:r.target_record_id,proposed_values:r.proposed_values,changed_fields:r.changed_fields,source_row:r.source_row}))});}
module.exports={CLASSES,digest,normalizeKey,formatSignature,recognizeMapping,classifyRows,partition,approvalDigest};
