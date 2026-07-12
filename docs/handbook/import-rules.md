# Import Rules

## Purpose

## Business Rules

BR-0152 | Manual Import Scope

Rule: Current imports are manual periodic uploads.

Rule: Import automation, queues, and continuous synchronization are not required for the initial implementation.

Notes:
- Typical usage is a small number of bank, payroll, attendance, or employee files each month.

---

BR-0153 | Import Duplicate Review

Rule: When a possible duplicate import is detected, the system must warn the user and present the detected duplicate for review.

Rule: Possible duplicates must not be imported silently.

Rule: Duplicate detection must not rely only on the file name.

---

BR-0154 | Incremental Import

Rule: A later import for an existing Month adds only new source records.

Rule: Existing valid records must not be deleted or recreated merely because an additional file was imported.

Rule: New source records may be added without individual approval.

---

BR-0155 | Bank Transaction Match Key

Rule: A possible matching bank transaction is identified using:
- Bank Account.
- Transaction Date.
- Reference.
- Amount.

Rule: A matching key supports duplicate detection and import comparison.

Notes:
- A stable internal Transaction ID remains the system identity after import.

---

BR-0156 | Source Update and Manual Data Preservation

Rule: When imported Source Data is updated, existing manual allocation and workflow data must be preserved.

Manual data may include:
- Target Department.
- Target DC.
- Budget Month.
- Budget Category.
- Accounting Status.
- Notes.

Rule: Source updates must not erase completed user work.

---

BR-0157 | Import Row Errors

Rule: An invalid source row must not prevent valid rows in the same file from being imported.

Rule: Invalid rows must be reported clearly after import.

Rule: Imported data must not be deleted without a warning and an explicit user action.

---

BR-0158 | Import Summary

Rule: Every import must return a summary.

The summary may include:
- File name.
- Import date and time.
- New records.
- Updated records.
- Possible duplicates.
- Invalid rows.
- Records not imported.

Rule: Bank, Payroll, Attendance, and Employee imports follow the same general import principles.

## Reference Data

## Related Decisions

## Open Questions

## Notes
