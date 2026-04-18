# Patterns Auditor Findings

Scope: `/home/justin/cursorTest1/.cursor/commands/audit-all.md`

## Findings

### 🟡 [DRY] Duplication: debug workflow requirements are defined in multiple phases
The same debug setup behavior appears in both the planning area and execution area (ensure debug directory exists, write resolved prompt files, and print prompts before launch). This creates a maintenance risk where one section can drift from the other.

- Consolidate into: `.cursor/commands/templates/audit-debug-workflow.md`
- Reference from: Phase 2 and Phase 4 using a single canonical debug workflow block
- Likely affected files: `.cursor/commands/audit-all.md`, any future orchestrator variants that add `--debug`

### 🔵 [DRY] Abstraction opportunity: role metadata is repeated across list, slugs, and path rules
Role definitions are expressed in separate sections (role sources, role slugs, and report path conventions). This is structurally the same data represented multiple times.

- Extract as: `.cursor/commands/templates/audit-role-registry.md`
- Suggested structure: one table with `roleName`, `slug`, `roleFile`, and default `reportPath` template
- Benefit: adding/removing a role requires one edit point instead of many

### 🔵 [DRY] Abstraction opportunity: path templates are scattered across phases
Directory and file path patterns are repeated in multiple sections (`individual`, `consolidated`, and `debug` locations). A shared path-template block would reduce string drift.

- Extract as: `.cursor/commands/templates/audit-paths.md`
- Suggested constants in template: `AUDIT_ROOT`, `INDIVIDUAL_DIR`, `CONSOLIDATED_DIR`, `DEBUG_DIR`
- Benefit: consistent path naming and easier timestamp/key changes

### 🔵 [DRY] Abstraction opportunity: worker prompt schema and output schema are decoupled from verification text
The worker prompt, summary format, and verification indicators are semantically linked but maintained in separate prose areas. This increases chances of mismatch between required output and verification criteria.

- Extract as: `.cursor/commands/templates/audit-worker-contract.md`
- Include: required summary fields (`role`, `high`, `medium`, `low`, `report`) and matching verification checklist keys
- Benefit: one source of truth for worker contract and validator expectations

---

/* ═══════════════════════════════════════════
   DRY / PATTERNS AUDIT — audit-all.md 2026-02-27 10:19
   🟡 Duplication Issues: 1  🔵 Abstraction Opportunities: 3
   Suggested extractions: templates/audit-debug-workflow.md, templates/audit-role-registry.md, templates/audit-paths.md, templates/audit-worker-contract.md
   ═══════════════════════════════════════════ */
