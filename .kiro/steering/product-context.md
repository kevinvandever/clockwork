---
inclusion: always
---

# Product Context — Clockwork (AgentFolio build)

Standing context for every spec written for this product. Pax inherits this on every run. Don't contradict it without flagging the conflict.

> Note on naming: the project folder is `agentfolio`, but the product it contains is the full **Clockwork §8 build**. AgentFolio is one piece of it (the buyer-facing web app). When this file says "the product," it means Clockwork as a whole.

## What it is

Clockwork is a **done-for-you setup, not software we host.** A real-estate agent brings and pays for their own Claude/Cowork, their CRM, and their data access (MLS, records); we configure Claude to run a roster of "robots" in the client's own environment — skills (logic), scheduled tasks (cadence), and connectors (CRM/MLS/data). Claude drafts; the client's CRM sends, inheriting its compliant delivery. Sold as a **one-time install + community for upkeep** — anti-hype, floor-not-ceiling. **The moat is Joe's credibility + curation + the install + community — not the software.** Anything that drifts toward "become a hosted software platform" is off-model.

The full roster is **eight robots** (names are Joe's defaults; every client can rename them):

1. **Pipeline (Josh 2)** — instant new-lead response, qualify, route, book, reactivation. *In §8 first build.*
2. **Buyer's (Ben)** — known-buyer matches + cadences. *Deferred: MLS-gated.*
3. **Marketing (Dave)** — newsletter, content, listing assets. *In §8; largely Joe's existing skills.*
4. **Social Media (Josh)** — per-platform posts, scheduling. *Deferred.*
5. **Client Care (Stephanie)** — sphere rotation, anniversaries, Sal Method; home value report. *Curation in §8; report deferred (records-gated).*
6. **Transaction (Trush)** — deadline watch, doc checklist, coordination. *Deferred: privacy-gated.*
7. **Referral Partner (Larry)** — nurture referral partners. *Deferred: RESPA-gated.*
8. **Chief of Staff (Linda)** — runs the others; daily synthesis brief + oversight dashboard. *In §8.*

**AgentFolio** is the client-facing web app within this system, **sold separately but connectable** into the activity log and Chief of Staff. It has two designed sides: the **buyer side** (shared agent↔client board, public-records pull, stages, tours, client-view vs agent-private view — built at prototype level) and the **seller/owner side** (watch the market around a home you own: comparable properties' lifecycle, contract/sale prices, days-between; ties to the home value report — designed but deferred behind data gates). Spec buyer-side decisions knowing the seller side is coming, not a maybe.

This is a per-client install product: the deliverable is a repeatable setup, not a hosted SaaS. **We don't host the runtime; the client does** — the two exceptions are the always-on email watcher and (per the settled hosting recommendation) AgentFolio.

## Where it is right now — READ THIS

**Everything is built at prototype level. The job is prototype → live.** The §8 first build (connector core, mock adapter, activity log, email watcher, all four robots' wiring, AgentFolio core + Next.js UI, ACRIS records pull, transaction-room handoff, a first real CRM adapter, and install packaging) exists and passes its prototype tests. The mission now is to harden it into a **live version Joe can actually test** as the first dogfooding install — working out the kinks before it's offered to other clients.

So Pax operates in **productionizing mode** (see the persona). The question on the table is not "what features should Clockwork have" — it's "what stands between this prototype and something Joe can run on his real practice without it breaking or embarrassing him." Net-new features are Phase 2 and wait.

Known prototype seams to interrogate when a feature touches them: the **Rechat CRM adapter** is built against the documented API and fake-fetch tested but **not yet live-validated** (pending Joe's credentials); the **transaction room itself is stubbed** (only the handoff exists); install packaging runs on **stand-ins**; and several stores may be in-memory pending Postgres.

## The user model — the silent tiebreaker

Clockwork has a layered user model. Get this right and most decisions resolve.

- **The paying customer: the real-estate agent** (Joe first, other agents later). They buy and run the install. Clockwork's job is to make them look responsive, organized, and present without adding work.
- **The centered end-user: the agent, operating their robots and AgentFolio.** Every "is this good / is this ready" question bends toward: *would this hold up for Joe using it on real clients this week?* Joe is simultaneously the first customer AND the test pilot — his failure is the thing to prevent.
- **The constrained view: the agent's client (the home buyer).** They see the client side of the AgentFolio board — properties, stages, tours, comments — and **never** agent-private fields. This is a hard boundary, not a preference.

We are not building for brokerages-at-scale, not for buyers-as-primary-users, and not for a self-serve SaaS signup. It's an agent-installed, agent-run tool.

## Load-bearing constraints (don't quietly violate these)

- **CRM-agnostic core + thin adapters.** No specific CRM is locked in. The normalized interface (create/lookup contact, send via CRM, fetch leads, log activity) is the spine; adapters stay thin and swappable. Never spec against one CRM's specifics as if they're the contract.
- **Drafts-in / CRM-sends-out.** Claude drafts; the client's CRM sends. Delivery compliance is inherited from the CRM. Still honor disclosed-AI + consent structurally — it's not optional and not bolt-on.
- **Agent-private vs client views in AgentFolio.** Access control is a first-class requirement from the start. A client view must provably never expose agent-private fields. Treat this as security, not UI.
- **Persona names are client-renamable.** Joe's roster (Josh 2, Dave, Stephanie, Linda) are *defaults*. Every client can override them, and the configured name flows through drafted-message voice/signature, the activity log, and the Chief of Staff dashboard. **No persona name is ever hardcoded** — names resolve from one config registry.
- **Joe is the brain; Kevin is the engineer.** Joe owns robot logic/skills, cadences, scripts, the Sal Method curation, home-value-report and seller-watch logic, AgentFolio's agent-intelligence, and brand voice — all treated as black boxes. Kevin owns the connectors, the AgentFolio app, scheduled-task + skill wiring, the email-lead trigger, and the Transaction privacy architecture. Pax specs Kevin's surface; it specs *around* Joe's, never into it.
- **One-time-setup economics.** The offer is a one-time install + community, not a subscription. Be suspicious of any spec that creates ongoing operational load on Kevin/Joe beyond the two accepted exceptions (the hosted watcher, AgentFolio hosting) — recurring burden erodes the model. If a feature genuinely requires ongoing operation, flag it as a business-model question, not just a technical one.
- **Real auth from day one where PII lives.** The email watcher needs least-privilege inbox OAuth; AgentFolio holds PII and the agent-private view. Both need real auth/access control, never deferred.
- **Lead source is an abstraction.** A new lead may arrive by email (Gmail push / Graph / IMAP fallback) or a CRM webhook. Spec to the abstraction, not one source.

## Architecture in one breath

Hosted-by-us email watcher detects a lead → emits a normalized lead event → Pipeline robot (in the client's Cowork) drafts an instant reply → routed through the connector core → sent by the client's CRM → logged to a shared activity log. Marketing and Client Care run on cadences through the same connector, also logging. The Chief of Staff reads the log to produce a daily brief + oversight dashboard. AgentFolio runs as its own web app (TS/Next.js + Postgres + a records-source abstraction, ACRIS adapter first) and emits connectable events into the same activity log.

## The gates — never spec into these casually

Certain areas are gated. If a request touches one, **name the gate explicitly and confirm before specifying** — don't design around it silently.

- **Transaction privacy (Trush):** privacy-sensitive by nature. Minimize data (dates/parties/stage, not financials), human-in-the-loop before anything reaches a third party, and counsel review. Data stays in the client's environment — we don't hold it.
- **RESPA (Larry / Referral Partner):** no paid referral mechanic without counsel. Unchanged and non-negotiable.
- **MLS / listing / records access:** client-granted, per-client, per-market. Gates Buyer's (Ben), the home value report, and the AgentFolio seller-watch. The AgentFolio listing feed pulls from the broker's own system, ideally via API.
- **Compliance baseline everywhere:** disclosed-AI + consent are honored structurally even though the client's CRM handles delivery.

## Explicitly NOT now (deferred / Phase 2)

Deliberately deferred until after the first live install works. If a request lands here, name it and confirm before specifying.

- **The deferred robots:** Buyer's (Ben, MLS-gated), Social Media (Josh), Transaction (Trush, privacy-gated), Referral Partner (Larry, RESPA-gated).
- **AgentFolio seller/owner side + home value report** — designed, wanted by Joe, but records-gated; follow-on install territory. Macro market stats/trends are even later.
- **Self-improving skills + voice** (P2-A) — per-tenant, per-robot voice profiles synthesized from client samples, continuously refined with human-in-the-loop approval (the client agent approves; Joe approves only when dogfooding). The "killer feature," but not for first-live.
- **AgentFolio cleanup + agent todo list** (P2-B) — AgentFolio as "the agent's home," a todo list derived from existing feeds, plus a styling/UX polish pass (Tailwind in place — polish, not rewrite).
- **Phone speed-to-lead** — email decided first; phone deferred.
- **Parked decisions (don't invent answers):** the daily-brief name, home value report name, Sal Method specifics, cadences, pricing, guarantee terms, product name, community platform. If a spec needs one, flag it as an open decision for Joe/Kevin rather than choosing.

## Platform / stack note

Greenfield-built but already implemented in TypeScript: connector core, watcher service, and AgentFolio app as separate packages; AgentFolio on Next.js/React + Postgres + Tailwind (already in place — polish, not rewrite). CI and a test harness exist. The build target is a **repeatable per-client install**, and a hosting/maintenance recommendation (deploy-into-client-hosting vs. we-host) is a settled §5 deliverable that sets infra direction — honor that decision when specs touch deployment. Because Clockwork trades a managed platform for owned infrastructure, hosting, secrets, and the always-on watcher are ours to run and must be specced as real operational concerns, not assumptions.
