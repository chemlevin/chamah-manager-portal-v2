# TAMA Report Parsing Specification

## Status and scope

- Version: 1.0-learning
- Purpose: deterministic interpretation of Ministry of Labor/TAMA child-payment PDF reports.
- Scope: read, normalize, classify and reconcile only.
- Database writes: forbidden by this specification.
- Learned from: 16 PDF reports across multiple months, payment numbers, regions and report variants.

## Non-negotiable rules

1. Never create, update, delete or approve business records while parsing.
2. Preserve original file, page number, source row and raw extracted values.
3. Use child national ID as the primary identity key. Never match by row number.
4. Keep report month, entitlement month and retro source months separate.
5. Never merge reports only because their month is equal.
6. Never replace a prior payment with a later correction; preserve the correction as a movement.
7. Unresolved rows must be reported, not silently dropped.

## Report identity

Extract before reading child rows: `report_month`, `payment_number`, `organization_code`, `organization_name`, `daycare_code`, `daycare_name`, `locality`, `district`, `group`, `issue_date`, `page_count`, and `source_filename`.

`report_id` must distinguish at least payment number, daycare, organization, issue date and source file. The month alone is not a report ID.

## Logical table schema

Map the repeated child-table headings to: `family_name`, `given_name`, `child_birth_date`, `daycare_entry_date`, `mother_name`, `child_national_id`, `grade`, `tuition_amount`, `parent_payment_amount`, `ministry_support_without_refund`, `ministry_support_with_refund`, `additional_hours_support_without_refund`, `additional_hours_support_with_refund`, `total_support`.

PDF right-to-left extraction may reverse physical order. Map by heading and column group, never by fixed character position alone.

## Child identity

`PRIMARY_KEY = normalized child_national_id`.

Store the ID as a string, retain leading zeroes, remove only clear visual separators, preserve the raw value, and never silently repair a digit. Names, mother name and birth date are supporting evidence only. Missing or invalid ID produces `UNRESOLVED_CHILD_ID`. Repeated ID in one logical report produces `DUPLICATE_CHILD_ID` until analyzed.

## Row state machine

`OUTSIDE_TABLE -> CHILD_ROW` when a complete child identity row is detected. `CHILD_ROW -> CONTINUATION_ROW` when the next row has no child identity and has retro/detail markers. `CHILD_ROW -> CHILD_ROW` when a new complete child begins. `CONTINUATION_ROW -> CONTINUATION_ROW` while retro detail continues. Any table state becomes `LEGEND_OR_SUMMARY` at the table boundary or summary marker.

A continuation row belongs to the nearest preceding child only when structure and text support that relationship. A page break does not end it.

## Month fields

Maintain separately: `report_month` (month named in title), `entitlement_month` (month of the regular row), and `retro_months[]` (historical months listed in a retro continuation). Never turn a retro month into a regular payment for the report month.

## Movement classification

- `REGULAR`: complete child row with ordinary tuition/support fields and no retro marker controlling the amount.
- `RETRO`: continuation row with a retro marker and one or more historical month tokens. Store parent child ID, every listed month, grade-by-month details, signed amount, page and raw row.
- `RETRO_ADJUSTMENT_NEGATIVE`: retro movement with a negative amount. Preserve the sign; do not relabel as refund unless explicitly identified.
- `OFFSET_OR_DEDUCTION`: negative amount embedded in the current child/month calculation without a separate historical-month retro explanation. Sign alone is insufficient.
- `REFUND`: amount identified by refund columns or refund-inclusive summary. Preserve both views when available: `support_without_refund`, `support_with_refund`, and `refund_component = support_with_refund - support_without_refund`.
- `CANCELLATION`: entitlement/payment removed or neutralized in context, such as zero/blank payment combined with cancellation or corrective detail. Blank alone is insufficient.
- `NEGATIVE_UNCLASSIFIED`: negative amount whose context cannot distinguish the above categories. Preserve it and raise an exception.

Do not treat refund-inclusive organizational summaries as bank receipts.

## Grade and legend markers

`grade` on a child row is the grade used for that row. Retro detail may contain different grades for historical months. A grade change is a business movement only when grade/month detail changes; a changed PDF column position is not a grade change. Store effective month whenever shown.

The printed legend defines the markers: `*` indicates a child associated with infant-tariff grading or forced-grade attachment, according to marker position and legend wording. `#` is a daycare-transfer marker: without a grade it indicates a child moved to another daycare; beside a grade it indicates a child moved from another daycare. Store raw marker and position. Markers are metadata, not payment movements.

## Amount handling

Parse signed decimal values and preserve original display text. Keep tuition, parent payment, support without refund, support with refund, additional-hours support without refund, additional-hours support with refund, and total support separate. Do not infer zero from a blank without storing `raw_blank` and the interpretation reason.

Never conflate `child_row_amount`, `entitlement_month_amount`, and `report_or_daycare_total`. Validate totals only after deciding whether the summary includes retro, refunds or additional-hours support.

## Multiple reports for one month

Keep reports separate when payment number, daycare, locality, issue date, organization, report variant, source file, totals or child population differ. Compare before deduplication. Content-identical files remain separate sources but may be flagged `PROBABLE_DUPLICATE_SOURCE`.

## Reconciliation checklist

Count complete child rows, continuation rows, missing-ID rows and duplicate-ID rows. Sum regular amounts separately from retro movements, and positive and negative movements separately. Compare child totals with report summaries and compare refund-inclusive with refund-exclusive summaries. Ensure legend and summary lines were not parsed as children. Compare headings, column count, retro syntax and markers with prior reports. Produce exceptions before downstream ingestion.

## Format-change detector

Raise `FORMAT_CHANGE_SUSPECTED` if a heading disappears or changes meaning, amount columns change, child-ID format/location changes, retro rows no longer follow child rows, the legend changes/disappears, summaries stop reconciling, payment-number syntax changes, or PDF/RTL extraction changes row boundaries. Block automatic classification of affected fields.

## Parser output contract

```json
{
  "status": "PARSED_READ_ONLY",
  "report_header": {},
  "children": [],
  "movements": [],
  "summaries": [],
  "exceptions": [],
  "schema_comparison": {},
  "source_provenance": {"filename": "", "page": 0, "source_row": "", "extraction_method": ""},
  "database_action": "NONE"
}
```

Every child and movement must include source provenance, reason code and confidence (`HIGH`, `MEDIUM` or `LOW`).

## Hard stops

Stop automatic downstream processing for unresolved child identity, orphan continuation rows, ambiguous report identity, unclassified negative movements, unexplained reconciliation failure, identity/amount format change, or possible duplicate-versus-correction ambiguity.

## Learning conclusion

The additional reports confirm one reusable logical schema across different districts, months and populations. The main variation is historical retro detail, report/payment instances, grade changes, transfer markers, blanks/zero-like rows and negative corrections. The parser must therefore be context-aware and source-preserving, not a simple fixed-column importer.

