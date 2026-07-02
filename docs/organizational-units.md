# Organizational Units

Organizational units are the allocation targets used when bank movements are assigned to the business.

## Unit types

- `daycare`: an operating daycare or care location.
- `overhead`: shared administration or central cost/revenue area.
- `project`: a project, program, or temporary allocation target.

## Current known examples

The current examples are:

- מחנה
- נאות
- אשקלון
- מרכזי
- סניף
- גנון
- משרד
- פיתוח

These values are examples only. Parsers must treat unit names as spreadsheet data and must not hardcode this list into parsing logic.

## BANKS as an allocation ledger

BANKS is treated as an allocation ledger, not only a raw bank transaction list.

One bank transaction may be split across multiple allocation rows. The same אסמכתא may appear more than once and must not be deduplicated.

Important fields:

- תאריך: actual cash or bank date, used for cashflow and audit.
- עבור חודש: business allocation month, used for reporting.
- עבור מחלקה: organizational unit allocation target.
- חובה: debit / money out.
- זכות: credit / money in.
- הגדרה: movement definition, currently הוצאה / הכנסה / שכר.
- הנה"ח: accounting workflow status, not calculation logic yet.
- הערות: free text.

Current aggregation grain:

`organizational unit + business month`

The shared key helper is `unitMonthKey(unit, month)` and returns `unit|month`.
