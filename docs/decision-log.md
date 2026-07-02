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
