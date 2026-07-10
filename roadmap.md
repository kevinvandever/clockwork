# Roadmap — Clockwork (AgentFolio build)

> The cross-feature map individual specs don't have. Maintained by Pax: persistent across sessions, updated rather than regenerated. It's a map, not a contract — direction and order, not promised dates. Read it at the start of a session to see the whole board.

**North-star:** Joe runs Clockwork on his real practice and *trusts its output* — he ships what the robots draft with only light edits, and it makes him look responsive and present without adding work. (First proof: the dogfood install.)

**Last updated:** 2026-07-03 · **Currently building:** Newsletter Draft (live)

---

## Now
*Building, or the very next thing up.*

### Newsletter Draft (live, on-demand) — `next up`
- **What:** Joe pastes one story → gets a publish-ready 400–700 word draft in his voice (his `newsletter-draft` skill + his Anthropic key), reviews/copies/publishes himself.
- **Depends on:** Joe's Anthropic API key (his surface). Skill text already in `skills/`.
- **Unblocks:** the reusable "robot live via Joe's real skill + his Claude key + a review surface" pattern for every other skill; disposition capture starts the P2-A voice corpus.
- **Spec:** `.kiro/specs/newsletter-draft/` (requirements + design ready for Kiro's task workflow).

---

## Next
*Committed and sequenced. Order is dependency order, not wish order.*

### townhouse-stories (live)
- **What:** the daily story pull that feeds the newsletter — curated digest from the web on a schedule.
- **Depends on:** the Newsletter engine/surface pattern proven; web search/fetch tooling; a scheduled-run mechanism.
- **Unblocks:** Joe's full morning pipeline (stories → newsletter), and the first "scheduled robot," not just on-demand.
- **Why it matters:** it's Joe's actual daily ritual and the front of his content funnel.

### Speed-to-Lead (Pipeline / Josh 2) — live
- **What:** new lead email → instant draft reply in Joe's voice, waiting for him to send.
- **Depends on:** a **Pipeline lead-response skill authored by Joe** (does not exist yet); Microsoft Entra app registration (Graph, least-privilege); an always-on hosted watcher + durable dedup/activity store (Railway + Postgres).
- **Unblocks:** the marquee automation — responsiveness — and the always-on watcher pattern.
- **Why it matters:** highest daily value; the thing that visibly makes Joe look fast.

### sal-method (Client Care / Stephanie) — live
- **What:** match a story to sphere/warm contacts, then draft 1:1 personal sends Joe reviews.
- **Depends on:** a contacts source (interim contacts file or a connected CRM — his skill runs "manual mode" today); the engine/surface pattern.
- **Unblocks:** sphere reactivation, Joe's highest-relationship-value ritual.

---

## Later
*Intended, not yet sequenced. Directionally committed; details loose.*

- **Rechat CRM adapter — live validation** — built + fake-fetch tested; confirm endpoints/outbound-send with Joe's credentials. Depends on: Joe's CRM choice + creds.
- **agentfolio auth hardening + hosting** — replace the demo unsigned cookie with real auth; deploy on Railway + Postgres. Depends on: hosting decision (settled §5). Needed once real client PII is on the buyer board.
- **Dedicated "agent console" surface** — split Joe's internal tools (newsletter, etc.) out of the sold-separately agentfolio app to clean the product boundary. Depends on: Newsletter (live) shipping in agentfolio first.
- **acris-property-pull — productionize** — deepen the records provider (ACRIS deeds/mortgage, address→BBL) using Joe's working script as the blueprint. Depends on: records-source seam (built).

---

## Someday / Won't
*Explicitly parked — the discipline that keeps the roadmap honest.*

- **Deferred robots** — Buyer's (Ben) *MLS-gated*, Social Media (Josh), Transaction (Trush) *privacy-gated + counsel*, Referral Partner (Larry) *RESPA-gated*. *Parked because:* gated or post-first-live.
- **agentfolio seller/owner side + home value report** — designed, wanted. *Parked because:* records-gated; follow-on install territory.
- **P2-A — self-improving skills + voice** — per-tenant voice profiles refined from Joe's edits, human-in-the-loop (agent approves; Joe approves when dogfooding). *Parked because:* the "killer feature," but not for first-live. Corpus starts accruing via Newsletter disposition capture.
- **P2-B — agentfolio as the agent's home + todo list + styling polish.** *Parked because:* post-first-live UX.
- **Phone speed-to-lead.** *Parked because:* email decided first.
- **Parked decisions (Joe/Kevin, don't invent):** daily-brief name, home-value-report name, Sal Method specifics, cadences, pricing, guarantee terms, product name, community platform.

---

## Dependency view

```
Joe's Anthropic API key
   └─ unblocks → Newsletter Draft (live)  ◄── engine + review-surface pattern
                    ├─ unblocks → townhouse-stories (live)  ── feeds ──┐
                    │                                                  └─► full morning pipeline
                    ├─ unblocks → sal-method (live)   (also needs: contacts source)
                    └─ unblocks → Speed-to-Lead (live)
                                     (also needs: Joe writes a Pipeline skill,
                                      Entra app reg, hosted watcher + Postgres)

agentfolio (built) ─ needs → auth hardening + hosting ─ before → real client PII on the board
Joe's CRM creds ─ unblocks → Rechat adapter live validation
```
