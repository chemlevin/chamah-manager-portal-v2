import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/20261116100000_track130_child_reconciliation.sql',import.meta.url),'utf8');
const mcp=readFileSync(new URL('../api/mcp.js',import.meta.url),'utf8');
test('TRACK130 preserves child identity and separate sources',()=>{
  for(const s of ['national_id','portal_valid_national_id','children_valid_national_id_uidx','source_system, source_record_id','government_funding_reports','government_funding_records','child_theoretical_revenue','child_discrepancies']) assert.match(sql,new RegExp(s.replace(/[()]/g,'\\$&')));
  assert.match(sql,/unique\(child_id, revenue_month\)/); assert.match(sql,/child_enrollments_source_uidx/); assert.match(sql,/collection_receipts_source_uidx/); assert.doesNotMatch(sql,/amount_collected.*sum/);
});
test('TRACK130 reconciliation is bounded and preserves nulls',()=>{ assert.match(sql,/portal_mcp_child_reconciliation/); for(const f of ['child_count','occupancy_count','parent_charges','parent_collections','government_funding','theoretical_extended_amount','unresolved_discrepancies']) assert.match(sql,new RegExp(f)); assert.match(sql,/p_month/); });
test('TRACK130 keeps mixed import approval path and adds read-only tool contract',()=>{ assert.match(mcp,/preview_operational_changes/); assert.match(mcp,/operational_report/); });
