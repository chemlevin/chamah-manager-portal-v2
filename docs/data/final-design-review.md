# Final Database Blueprint Design Review

Status: Completed architecture review for Database Blueprint v1.0.

Last updated: 2026-07-13

## Review Goal

Verify that the Database Blueprint is internally consistent, operationally simple, historically safe, and specific enough for Codex to implement without redesigning business rules.

## Review Scope

Reviewed:

- Constitution and architecture principles
- Decision Log
- Domain Model
- Data Dictionary
- ERD
- Relationship Matrix
- Source Map
- Google Sheets workspace and mapping
- Daycare, employee, payroll, banking, and budget domain documents
- Migration Strategy
- Database Roadmap
- Codex Implementation Package
- Open Questions

## Final Architecture Findings

### 1. User-Facing Complexity

Finding: Database normalization must not be exposed to daily users.

Final decision:

- Use one primary operational spreadsheet by default.
- Keep visible tabs to the smallest practical set.
- Allow one visible tab to manage multiple internal database concepts.
- Hide or protect lookup, identity, version, import, audit, and error-support areas.

Result: No database table requires a matching user-facing tab.

### 2. Legal Entity Complexity

Finding: Earlier designs risked overemphasizing multi-entity architecture.

Final decision:

- Keep Legal Entity lightweight.
- Support the current nonprofit and a possible additional company/entity without building a corporate hierarchy.
- Treat "all entities" as management reporting scope, not a legal entity.
- Add ownership history only when actual historical transfer data or a planned transfer requires it.

Result: The model supports realistic growth without enterprise overhead.

### 3. Organization Units

Finding: A generic organization-unit hierarchy is not required for the current daycare-focused operation.

Final decision:

- Do not make a generic `organization_units` hierarchy a required core dependency.
- Model Daycares directly as the primary operational unit.
- Represent office/development reporting through approved classification/allocation fields unless a future business requirement justifies a separate hierarchy.

Result: Removes an unnecessary abstraction from the initial implementation.

### 4. Daycare And Classroom History

Finding: Daycare identity is stable, while classroom composition changes by School Year and sometimes inside the year.

Final decision:

- Daycare equals one license.
- Classroom configuration is period-bound.
- Classroom opening/closure uses effective dates.
- Monthly enrollment is separate from classroom identity.
- Mixed-classroom counts are stored by Age Group.

Result: Historical classroom structure and budget child counts remain reproducible.

### 5. Children Scope

Finding: The system currently needs monthly budget child quantities, not a full attendance or child-CRM platform.

Final decision:

- Keep monthly enrollment as the budget source.
- Do not require individual child identity in the first implementation unless another approved module needs it.
- A child counted by the office for the month generates expected tuition for that month.

Result: Avoids building a larger child-management system than required.

### 6. Employees

Finding: Employee identity, employment, assignment, seniority, and certificates have different lifecycles.

Final decision:

- Separate person/employee identity from employment periods.
- Store recognized prior seniority explicitly.
- Use effective-dated assignment for daycare/role changes.
- Keep one user-facing Employees tab.
- Do not build a general HR workflow engine.

Result: Supports the approved business rules without becoming a full HR product.

### 7. Payroll

Finding: Source payroll records and management allocations must not overwrite each other.

Final decision:

- Preserve source payroll records.
- Store allocations separately only where splitting or historical allocation is required.
- Keep monthly context.
- Avoid provider-specific schema assumptions.

Result: Future payroll-provider changes do not require a core redesign.

### 8. Banking And Accounting

Finding: A bank transaction is a dated source event, while department/daycare/month classification is manual operational work.

Final decision:

- Preserve source transaction identity and raw values.
- Keep manual allocation/classification separate.
- Allow one transaction to be split when needed.
- Preserve manual work across source refreshes.

Result: Reliable reconciliation and no loss of user classification.

### 9. Budget

Finding: Budget is primarily calculated output based on children, tuition, payroll, bank allocations, and configuration.

Final decision:

- Keep budget categories and rules configurable.
- Store calculation runs/results only where reproducibility or performance requires it.
- Do not expose a visible Budget tab unless recurring manual values must be entered.
- Do not duplicate calculated values as editable source data.

Result: Budget remains explainable and avoids conflicting sources.

### 10. Reference Data

Finding: Creating a database table for every status/dropdown would inflate the schema.

Final decision:

- Use dedicated reference tables only for meaningful, editable business lists with identity or lifecycle.
- Use constrained codes/enums/check constraints for small stable technical statuses where appropriate.
- Consolidate user-facing configuration lists inside the `הגדרות` tab.

Result: Keeps the schema and workspace compact.

### 11. Audit, Import, And Data Quality

Finding: Technical traceability is required but must not burden users.

Final decision:

- Use a small shared technical support model for import batches, row results, audit events, and Data Quality issues.
- Do not create table-specific audit tables for every business entity.
- Return actionable validation status to Sheets.
- Keep technical logs hidden from normal work.

Result: Strong traceability with limited technical-table growth.

### 12. New Portal Strategy

Finding: Replacing the data layer inside the live portal carries unnecessary risk.

Final decision:

- Build the database-backed portal in a parallel environment.
- Reuse proven UI patterns and response contracts where useful.
- Do not copy legacy direct-Sheets dependencies.
- Keep the current portal for parity comparison and rollback until cutover approval.

Result: Safer migration and cleaner implementation.

## Consistency Review

The following concepts are aligned across the final documents:

- Google Sheets = operational editing interface
- Database = accepted-data Source of Truth
- Handbook = business-rule Source of Truth
- School Year and Calendar Year remain separate
- Domain-specific time models are used
- Business Codes are stable ASCII/English codes
- Display names remain user-facing and editable
- Physical deletion is prohibited after business use
- Historical data is preserved
- Imported and manual data are separated
- Visible Sheets do not mirror database normalization
- New portal is built in parallel

## Simplification Decisions

The review explicitly rejects these as required v1 architecture:

- enterprise organization hierarchy
- multi-tenant model
- multi-country design
- workflow engine
- microservices/event bus
- one spreadsheet per domain
- one tab per database table
- a table for every status/dropdown
- full child attendance/CRM system
- full HR management platform
- direct database editing by users
- immediate automated two-way synchronization

## Open Risks

Remaining risks are implementation risks, not core-schema blockers:

- poor-quality legacy data may require manual migration review
- final Sheet column order must be user-tested
- reconciliation tolerances must be approved
- backup and access ownership depend on the selected hosting plan
- parallel-run duration must be selected before cutover

These are tracked in `open-questions.md` and the Roadmap.

## Final Verdict

The Database Blueprint v1.0 is architecturally ready for staged implementation.

Codex may begin only from the approved implementation package and must:

- preserve the compact Google Sheets workflow
- avoid speculative tables and abstractions
- surface unanswered implementation choices
- create changes in small reviewable phases
- prove parity before any production cutover

This review does not claim that the database or replacement portal is implemented. It confirms that the architecture documentation is ready to guide implementation.
