# Patterns & Principles

Conventions that keep the codebase coherent as it grows. Follow these unless there's a
documented reason not to (add a DECISIONS.md entry when you deviate).

## Agnostic core + thin adapters

External integrations (CRM, MLS/records, lead sources, Claude) are defined as a
**normalized interface** with **thin adapters** behind it. Code the rest of the system
against the interface, never a vendor. A reusable **contract test suite** holds every
adapter to the same behavior (see connector-core `./contract`). When a real vendor
forces a shape change, it changes in one place and the contract tests flag the fallout.

## Stub now, swap later — behind an interface

For anything needing infra or external accounts, ship an in-memory or deterministic
implementation now behind the interface, and defer the real one with a DECISIONS.md
"revisit when" trigger. Current stubs: in-memory activity log (D6), in-memory dedup
(D9), mock CRM, shared-secret intake auth (D10), and (Task 6) the Claude drafter.

## Tenant isolation is non-negotiable

`tenantId` is required on every append/query/record. A query without it throws. New
stores and the agentfolio data model must keep cross-tenant reads inexpressible.

## Compliance is structural

AI-disclosure/consent rides on the outbound message; the connector refuses to send
anything not marked disclosed (`send_blocked`). Don't bypass this — extend it.

## Two activity concepts (don't merge them)

`connector.logActivity` → writes to the CRM's own contact timeline (agent-facing).
`@clockwork/activity-log` → our internal cross-robot feed (powers the Chief of Staff).
Separate stores, separate audiences (DECISIONS.md D5).

## Testing & verification

- Write tests with the code (vitest). Cover happy path, validation/error codes, and
  tenant isolation.
- Always run build → lint → typecheck → test locally before committing.
- Keep CI green; never merge red.

## Decision-log habit

Whenever we make a real choice (especially "A now, B later"), add a `docs/DECISIONS.md`
entry: context, decision, why, and the revisit trigger. Keep entries short.
