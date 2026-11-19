'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {classifyRows,partition,recognizeMapping,formatSignature,approvalDigest}=require('../api/operational-intake-core');
test('identity never follows row position',()=>{
 const canonical=[{id:'A',employee_code:'100',name:'One'},{id:'B',employee_code:'200',name:'Two'}];
 const rows=[{employee_code:'200',name:'Two changed'},{employee_code:'100',name:'One'}];
 const result=classifyRows({rows,canonical,sourceFile:'oct.xlsx',period:'2026-10'});
 assert.equal(result[0].target_record_id,'B');
 assert.equal(result[0].classification,'UPDATE');
 assert.equal(result[1].classification,'SKIP');
});
test('conflicting stable identifiers are never approved',()=>{
 const result=classifyRows({rows:[{employee_code:'100',national_id:'999'}],canonical:[{id:'A',employee_code:'100',national_id:'111'},{id:'B',employee_code:'200',national_id:'999'}]});
 assert.equal(result[0].classification,'CONFLICT');
});
test('duplicate source keys are conflicts',()=>{
 const result=classifyRows({rows:[{employee_code:'1'},{employee_code:'1'}],canonical:[]});
 assert.equal(result[1].classification,'CONFLICT');
});
test('missing identifiers remain unresolved',()=>assert.equal(classifyRows({rows:[{name:'unknown'}],canonical:[]})[0].classification,'UNRESOLVED'));
test('no invented employer cost',()=>{
 const result=classifyRows({rows:[{employee_code:'6071',net:500}],canonical:[{id:'A',employee_code:'6071',net:400}]});
 assert.equal(Object.hasOwn(result[0].proposed_values,'employer_cost'),false);
});
test('mapping signature rejects structural changes',()=>{
 const mapping={signature:formatSignature(['code','salary']),fields:{code:'employee_code'}};
 assert.equal(recognizeMapping(['code','salary'],[mapping]).status,'MATCHED');
 assert.equal(recognizeMapping(['salary','code'],[mapping]).status,'UNRECOGNIZED');
});
test('pagination bounded and complete',()=>{
 const chunks=partition(Array.from({length:234},(_,i)=>i));
 assert.deepEqual(chunks.map(x=>x.length),[100,100,34]);
 assert.throws(()=>partition([1],101),RangeError);
});
test('approval digest binds exact values',()=>{
 const a=[{classification:'UPDATE',target_record_id:'A',proposed_values:{net:1},changed_fields:['net'],source_row:1}];
 const b=[{...a[0],proposed_values:{net:2}}];
 assert.notEqual(approvalDigest(a),approvalDigest(b));
});
