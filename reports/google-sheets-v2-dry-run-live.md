# Google Sheets v2 Live Dry Run

The connected workbook and live Supabase project were read directly. No Sheet or database write was performed.

## Result

- Ready to insert: **191 configuration rows**
- Ready to update: **0**
- Skipped placeholders: **7**
- Blocking errors: **0**
- Operational data rows: **0**
- Database rows before and after: **0**

The configuration layer is structurally ready for a controlled first import. The operational tabs `EMPLOYEES`, `EMPLOYEE_PAY_TERMS`, `PAYROLL`, and `BANK_TRANSACTIONS` contain headers and formulas but no business rows. `MONTHLY_OCCUPANCY` contains four note-only placeholders, which are correctly skipped.

## Non-blocking warnings

- `SY-2027-2028` exists as a future school year, but its 12 `MONTHS` records have not yet been created.
- `CLASSROOM_CAPACITY_BREAKDOWN` rows 87, 90 and 91 have an automatically generated id but an empty capacity. They are placeholders and are skipped instead of imported.

## Safety conclusion

The first real write should be limited to the 191 configuration rows. Operational tabs should remain out of scope until real employee, occupancy, payroll and bank rows are entered and a new Dry Run returns without blocking errors.

## Reproducible command

```bash
npm run dry-run:sheets-v2 -- reports/google-sheets-v2-dry-run
```

The command requires the existing Google service-account environment variables and writes JSON and Markdown reports only. It has no Supabase write path.
