# Task 1 — agentfolio Hosting & Maintenance Recommendation

*Engineering read for Joe, per §5 of the v4 build spec. This is the decision memo
that sets the infra direction for the hosted email watcher (Task 5) and agentfolio
(Tasks 10–12).*

## The question (restated)

agentfolio is a real web app, so it can't be "just Claude," and that tensions with
the model's "we don't run the client's runtime" principle. Joe asked for two
specific reads: **how much operational upkeep does it actually take**, and **which
way to host**:

- **(a) Deploy-to-client** — install an instance into the client's own hosting as
  part of the setup and hand it over. Keeps "the client runs their stuff," but a
  web app is more than a non-technical agent wants to babysit.
- **(b) We host** — run it as the one ongoing piece we operate. Breaks "we don't
  run it," but realistic, and could be a small recurring line item.

## What agentfolio actually is, operationally

Unlike the robots (Claude logic that lives in the client's Cowork), agentfolio is a
standard web application with parts that need continuous care:

- A web frontend + an API/backend.
- A database (boards, properties, stages, tours, notes, comments, users).
- Auth and access control (agent-private vs client views — a security requirement,
  not a nicety).
- External data integrations (the public-records pull — ACRIS first — and later
  per-market listing APIs), which break when upstream sources change.
- The usual web-app operational surface: TLS certificates, dependency and security
  patching, database backups, uptime monitoring, and incident response.

None of that is optional for a real app, and none of it is something a non-technical
real estate agent can or should manage.

## The key reframe: we're already hosting something

Two facts change the "we don't run it" calculus:

1. **The email speed-to-lead watcher already requires an always-on service we
   host** (decided in the v4 spec). So we are operating hosted infrastructure
   regardless of the agentfolio decision.
2. **The "runtime we don't host" is the Claude engine + the client's CRM/MLS/data
   access** — and those genuinely stay client-side under either option. agentfolio
   is explicitly carved out in the spec as "sold separately" and "the one open
   exception." It was never part of the client-runs-it principle.

So choosing to host agentfolio is consistent with the model, not a violation of it.

## Why (a) deploy-to-client is the worst of both worlds

Handing a client their own instance sounds like it honors "client runs their stuff,"
but in practice:

- **You still own breakage.** When ACRIS changes its API or a dependency needs a
  security patch, the fix is yours — but now you're applying it across N different
  client-owned environments you don't control, each potentially configured
  differently. That is *more* maintenance, not less.
- **Heterogeneous environments multiply support cost.** Every client's hosting
  account, credentials, and quirks become a bespoke support surface.
- **The alternative — truly hand it over and walk away — means it rots.** Certs
  expire, patches lapse, the records feed silently breaks, and the agent has no way
  to fix it. That damages the product and Joe's credibility (the actual moat).

Option (a) gives you ongoing responsibility *without* operational control. That's the
expensive combination.

## Why (b) we host is the lower-maintenance, lower-risk choice

A single, centrally operated app is the standard SaaS model and the lighter one:

- **One codebase, one deploy pipeline, one place to patch and monitor.** Fixes ship
  once for everyone.
- **Undifferentiated ops can be pushed to a managed platform** (TLS, backups,
  scaling, DB management), which keeps our actual hands-on load small.
- **It co-locates with the watcher we're already hosting** — one operational
  footprint instead of two.

### Important data-scope guardrail

Keep agentfolio's hosted footprint deliberately narrow: it stores **board data and
public records** (owner/deeds/tax/building — already public). The **sensitive CRM and
MLS data stays in the client's environment** and is accessed by the robots there, not
copied into agentfolio. This keeps what we host low-sensitivity and shrinks our
security/compliance exposure. Use strong per-tenant isolation (row-level or
per-tenant schema) so one client's board data can never leak to another.

## Maintenance-load estimate (the number Joe wanted)

Honest answer: **modest but nonzero and ongoing — it cannot be zero for a real web
app.** Roughly:

- **Routine upkeep:** dependency/security updates, with TLS/backups/scaling handled
  by the managed platform. On the order of a few hours per month, largely
  predictable.
- **Reactive upkeep:** the variable cost. The biggest driver is **external data-feed
  breakage** (ACRIS / future MLS adapters changing), plus client support. This scales
  with client count and with how many market adapters exist — not with hosting choice.
- **Net:** a managed-platform, single-app setup keeps routine load low; the reactive
  load exists under *any* option and is actually cheapest to absorb when you control
  one environment.

## Cost shape

- **Low fixed base** (managed app hosting + a managed Postgres instance) plus a small
  marginal cost per tenant.
- This comfortably supports a **small recurring per-client line item** that covers
  hosting + maintenance and turns the one operational exception into a modest
  ongoing revenue stream rather than a cost center.

## Recommendation

**Go with (b): we host agentfolio as a single multi-tenant app, sold separately, with
a small recurring hosting/maintenance line.** Specifically:

1. **Multi-tenant single app** with strong per-tenant data isolation — not per-client
   instances.
2. **Use a managed platform + managed Postgres** (e.g., Vercel/Railway/Fly-class
   hosting with a managed database) to offload TLS, backups, and scaling and minimize
   hands-on ops.
3. **Co-locate the email watcher** in the same hosted footprint — one thing to operate.
4. **Keep hosted data low-sensitivity** — board + public records only; CRM/MLS data
   stays client-side with the robots.
5. **Price a small recurring line** to cover upkeep and make the exception sustainable.

This is the realistic reading: a real web app needs an operator, deploy-to-client
gives us responsibility without control, and we're already hosting the watcher — so a
single managed multi-tenant app is the lowest-maintenance, lowest-risk path and stays
consistent with "the client runs their Claude + CRM + data."

## Decision criteria (for a quick gut-check)

| Criterion | (a) Deploy-to-client | (b) We host (recommended) |
| --- | --- | --- |
| Who applies security patches | Us, across N varied envs | Us, once, centrally |
| Records-feed breakage fix | Per client, bespoke | One fix, all clients |
| Non-technical agent burden | High (babysits a web app) | None |
| Operational control | Low | High |
| Total maintenance load | Higher | Lower |
| Consistency with "client runs runtime" | Superficially yes | Yes (agentfolio is the carved-out exception) |
| Recurring revenue opportunity | No | Yes (small line item) |

## Open follow-ons this unblocks

- Confirms the **cloud/hosting target** decision for Task 2 (managed platform +
  managed Postgres).
- Sets the **watcher** to co-locate in the same footprint (Task 5).
- Feeds the **per-client install + pricing** work (Task 14) with a recurring-line
  assumption.
