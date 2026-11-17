# Future Chamah work template

```yaml
track: TRACK###
evidence: PROPOSED
business_goal: ""
source_files: []
source_systems: []
canonical_entities: []
identity_keys: []
fields: []
daycare_relationship: "none|optional|required"
employee_child_relationship: "none|optional|required"
month_or_effective_date: ""
normalization: ""
reconciliation_rules: []
discrepancy_rules: []
approval_requirements: "Director approval bound to exact digest and row versions"
tests: []
readback_evidence: []
archive_delete_behavior: "Director-only soft archive; exact id and expected version"
mcp_compatibility: "INTERNAL|BACKWARD_COMPATIBLE|BREAKING"
connector_refresh_required: false
production_authorization: "REQUIRED|NOT_AUTHORIZED"
```

Human acceptance questions:

- What is the source and how is provenance retained?
- What stable key prevents duplicates and what mismatch becomes a conflict?
- Which existing operational tool/payload can carry this without a connector refresh?
- What proves Preview, approval, atomic commit, and read-back?
- Which rows are protected by dependencies and how is archive audited?
- What is synthetic-only, what is isolated Preview, and what is explicitly not verified?
