# agentfolio

The buyer/seller web app (Next.js + Postgres), built in Tasks 10–12. Scaffolded here
as a placeholder so the workspace layout is fixed; the app package is added in Task 10.

- Buyer side: shared agent↔client board, auto public-records pull (ACRIS first),
  stages, tours, notes, comments, agent-private vs client views.
- Multi-tenant with per-tenant data isolation.
- Connectable: emits events into the shared activity log for the Chief of Staff.
