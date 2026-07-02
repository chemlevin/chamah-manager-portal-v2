# Decision Log

## 2026-07-02 - Add centralized business rules foundation

Decision: create `config/business-rules.js` as the runtime source for shared business rules used by engines.

Reason:

- The `/rules` page is useful for visibility, but engines need a safe importable rules layer.
- Budget and Payroll need a shared daycare-month key contract for future comparison work.
- The average employee monthly hours default should not live only inside `api/budget-engine.js`.

Implemented now:

- Centralized `DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS = 160`.
- Centralized `daycareMonthKey(daycare, month)`.
- Updated Budget to import the average-hours default without changing behavior.
- Updated Payroll to import the key helper without changing response behavior.
- Added tests proving existing outputs remain stable.

Constraints:

- `api/budget-engine.js` behavior must remain stable.
- `/api/budget` and `/api/payroll` response contracts must not break.
- `/rules` remains read-only.

Future options:

- Generate `rules/rules.json` from `config/business-rules.js`.
- Add validation around editable rules before any UI editing is allowed.
- Centralize more aliases only when shared by multiple modules.


## 2026-07-02 - Add organizational units and allocations foundation

Decision: introduce organizational units and treat BANKS as an allocation ledger.

Reason:

- Bank rows may be split across multiple business allocation targets.
- The same ?????? can appear more than once and must not be deduplicated.
- Reporting needs business allocation month and organizational unit, not only raw cash date.

Implemented now:

- Added `config/organizational-units.js` with unit types and current examples.
- Added `unitMonthKey(unit, month)` to the shared business rules layer.
- Added `api/allocations-engine.js` and `api/allocations.js`.
- Added focused allocation tests.

Constraints:

- Unit examples are metadata only and are not used to restrict parser output.
- Budget and Payroll behavior remain unchanged.
- Final profit/loss is intentionally not calculated in this layer.
