# Product — Clockwork

Clockwork is a done-for-you setup (sold as a one-time install + community), not
hosted software. Claude runs in the client's own Cowork as the engine for a team of
"robots" (Claude skills + scheduled tasks + connectors) wired to the client's own
CRM/MLS/data. Sending goes through the client's CRM, inheriting its compliance.
**agentfolio** is a separately-sold buyer/seller web app that can connect into the
robots.

The moat is Joe's credibility + curation + the install + community — not the code.

## This repo's scope

We are building the §8 "first build" (see `docs/CLOCKWORK-FIRST-BUILD-PLAN.md`): the
lightest path to something sellable + dogfoodable. We build the **wrappers and
wiring** (connectors, the email speed-to-lead watcher, shared config, the activity
log, agentfolio). Joe owns the **robot logic/voice** (his Claude skills), which we
treat as black-box.

## Prototype vs. real install

What we build here is a working, tested prototype that leans toward the real product.
Deliberately stubbed until real-install time: in-memory stores (not Postgres), the
mock CRM (not a real one), shared-secret auth (not provider-native verification), and
a stubbed/optional Claude drafter (not Joe's Cowork skills running live).

See `docs/EXTERNAL-ACCESS-NEEDED.md` for exactly what real-world access is needed and
when (Claude API key, Joe's Cowork skills, real CRM sandbox, real inbox, Railway).

## The robot roster (persona defaults, client-renamable)

Pipeline=Josh 2, Buyer's=Ben, Marketing=Dave, Social Media=Josh, Client Care=Stephanie,
Transaction=Trush, Referral Partner=Larry, Chief of Staff=Linda. Names are defaults in
`@clockwork/config` and can be overridden per client.

## Key references

- `docs/CLOCKWORK-FIRST-BUILD-PLAN.md` — the task plan (source of truth for sequencing)
- `docs/DECISIONS.md` — running decision log with revisit triggers
- `docs/TASK-01-AGENTFOLIO-HOSTING-RECOMMENDATION.md` — hosting decision
- `docs/EXTERNAL-ACCESS-NEEDED.md` — real-access checklist
