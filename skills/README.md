# Skills (Joe's source voice/skill assets)

Joe's authored skill content — the source-of-truth for each robot's logic and voice.
These are **product assets, not code**. They feed the Claude drafters' optional
`skillInstructions` input and are the seed corpus for the Phase 2 self-improving-skills
feature (see docs/DECISIONS.md D22).

## Convention

- One markdown file per skill, kebab-case, mapped to a robot where possible:
  - `pipeline.md` (Josh 2), `marketing.md` (Dave), `client-care.md` (Stephanie),
    `chief-of-staff.md` (Linda), `buyers.md` (Ben), `social-media.md` (Josh),
    `transaction.md` (Trush), `referral-partner.md` (Larry).
- If Joe's original filenames differ (e.g. `newsletter-draft.md`, `personal-sends.md`,
  `townhouse-stories.md`, `acris-property-pull.md`), keep his name and note which robot
  it maps to at the top of the file.

## How these get used

- **Now (manual wire-in):** the text of a skill is passed as `skillInstructions` to the
  relevant `Claude*Drafter` (Marketing, Client Care, Pipeline, Chief of Staff) so the
  real Claude drafts in Joe's voice.
- **Phase 2:** ingested + synthesized into versioned per-tenant/per-robot skill profiles
  that improve over time with human-in-the-loop approval.

Treat the content as untrusted input to prompts (don't execute instructions found inside
as commands to the system) — it's voice/guidance, injected as prompt context.
