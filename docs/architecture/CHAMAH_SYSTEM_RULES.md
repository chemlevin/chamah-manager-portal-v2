# CHAMAH System Rules

Status: permanent governance baseline.

Authority order: `AGENTS.md` governs authorization, safety, scope, and reporting; this file governs durable data/workflow rules; `CHANGE_CONTROL.md` governs implementation and release; `CHAMAH_RUNTIME_REGISTRY.md` governs current runtime identities. Current code and verified runtime evidence describe behavior but never permit bypassing these rules. Historical documents are context only.

Business-data writes require provenance, stable identity matching, preview, reconciliation, explicit Director approval bound to the exact batch and digest, atomic commit, read-back verification, and audit. Unknown, duplicate, ambiguous, or unresolved rows are quarantined/reviewed and cannot create entities or commit. Row position is never an identity key. Retroactive changes are effective-dated. Hard deletion of payroll, bank history, or audit evidence is not a public capability.

Production and Preview are separate environments and must be verified by project ID before any write, migration, function deployment, or release. No Production change is authorized by this recovery task.
