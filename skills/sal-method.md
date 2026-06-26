
name: sal-method description: Joe's relationship engine for 1:1 article sends. Two phases. (1) Given a story (usually from the daily townhouse-stories pull), scan Joe's CRM and surface a short, ranked list of sphere and warm/active contacts the story genuinely fits — weighted toward people he hasn't spoken to in a while — for Joe to approve. (2) For each approved contact, draft a single hand-crafted email that reads like Joe wrote it just for them. Invoke whenever Joe says "who should I send this to", "run the Sal Method", "draft a send for [name] about [story]", "who would [story] fit", "share this with [contact]", or asks for sphere reactivation or warm/active nurture off a story. Sphere and warm/active only — cold townhouse-owner outbound lives in the outbound-townhouse skill, not here. Drafts and suggestions only; never sends.
The Sal Method
Named for Sal, a mentor of Joe's who, every morning on the rowing machine, clipped articles out of the paper and mailed them to people in his database — one at a time, the right piece to the right person, no ask attached. This skill is the modern version of that ritual: it finds who today's story is for, and it writes the note.

It runs in two phases:

	•	Find the targets. Take a story and scan Joe's CRM for the people it genuinely fits — by what they care about, not by where they sit in a pipeline. Weight the list toward relationships that have gone quiet. Hand Joe a short, ranked shortlist with the why for each. Joe approves who's in.
	•	Write the send. For each approved contact, draft one hand-crafted email anchored to that story and that person. The standard never changes: would they believe Joe wrote this just for them?

This is Joe's most relationship-sensitive skill. Anything templated, generic, or formulaic burns trust faster than no send at all — and that bar applies to the matching as much as the writing. A send to the wrong person, or for a forced reason, is worse than silence.
Who this is for (scope)
Two audiences only:

	•	Sphere (currently cold / dormant). Past clients, friends-of-friends, professional network gone quiet. The relationship exists but has lapsed. This is the engine's primary job: a steady, low-pressure way to rebuild contact, one genuinely relevant article at a time.
	•	Warm / Active prospects. People mid-relationship — met once or twice, expressed interest, an apparent fit. The goal is staying useful while they decide.

Out of scope: cold prospects. Cold townhouse-owner outreach (never met, personalization from public record) is a different game with a different sequence and lives in the outbound-townhouse skill (the Monroe Place / PLUTO→ACRIS pipeline). If a story-and-stranger pairing comes up, route it there — do not draft it here.
Phase 1 — Finding who to send to
This is the new heart of the skill. Relevance is the gate; recency is the weight.
The CRM dependency (read this first)
This phase reads from Joe's CRM. That CRM is not built yet. Until it is, the skill operates in one of two modes:

	•	Connected mode (target state): a CRM (Elliman's, an MCP-connected tool, or an interim local contacts file) exposes the contract below, and the skill matches against it automatically.
	•	Manual mode (today's fallback): no CRM is connected. Joe names a person or pastes a short brief, and the skill skips straight to Phase 2. This is exactly how the prior personal-sends skill worked — it still works. Do not pretend to query a database that isn't there.

Interim bridge: before Elliman's CRM is live, a simple local file — crm/contacts.csv or crm/contacts.md — maintained by Joe satisfies the contract and lets the matching engine run now. Offer to stand one up if Joe wants the daily flow before the real CRM exists.

CRM data contract. For matching to work, each contact record must expose:

Field
Purpose
name
who
tier
sphere or warm (cold records are ignored by this skill)
tags
themes/interests for matching — e.g. restoration, Cobble Hill, Greek Revival, garden, architecture, landmarks
notes
free text — how Joe knows them, their craft/work, family, what they care about, non-transactional hooks
last_contact_date
for recency weighting and the cooldown
last_contact_summary
one line on the last touch, so the opener can reference it
do_not_contact / cooldown_until
optional suppression flags

If a connected CRM uses different field names, map onto this contract — the field names don't matter, the facts do.
Matching logic
	•	Extract the story's hooks. From the story, pull the anchorable elements: neighborhood, architectural style and era, the design/restoration angle, any deal mechanic worth explaining, and the property's biography (architect, prior owner, history). These are what a contact can be matched to.
	•	Match on the authentic self, never the transaction. A contact fits when a story hook lines up with who they are or what they care about — their craft, their block, their interests, something they once told Joe that wasn't about real estate. A contact does not fit because they "might buy or sell someday." The value-first rule (below) governs matching, not just drafting.
	•	Relevance is the gate. No genuine, non-transactional anchor → not a match, no matter how overdue the touch. A thin or forced fit is worse than no send.
Recency weighting (default — confirm with Joe)
Among the contacts a story genuinely fits:

	•	Weight toward people Joe hasn't spoken to in a while. This engine exists to rebuild a dormant sphere; the Sal ritual was steady, broad touch. A relevant story is the reason to re-open a relationship that's gone quiet.
	•	Cooldown floor: don't surface anyone contacted in the last ~21 days, and don't surface the same person for more than one story in a ~30-day window. The goal is steady presence, not a flood.
	•	Cap the shortlist at ~3–5 names per run. The output standard is still 1–3 hand-crafted sends a week — quality over volume. Matching runs daily; only the best fits graduate to actual sends.

(Direction and thresholds above are the proposed default. If Joe wants the opposite — favor recently-engaged contacts — or different windows, adjust here.)
Phase 1 output — the shortlist
Present a short, scannable list for Joe to approve. Do not draft anything yet.

## Sal Method — suggestions for "[story headline]"

[Link to story]

| # | Contact | Tier | Last spoke | Why this fits (non-transactional) |

|---|---------|------|------------|-----------------------------------|

| 1 | Name | Sphere | 14 mo ago | [the authentic anchor — their craft / block / interest] |

| 2 | Name | Warm | 5 wk ago | [anchor] |

**Recommend:** [1, 2]  ·  **Stretch / your call:** [3]  ·  **Skipped on cooldown:** [names]

Joe replies with who's in. Only approved names go to Phase 2. Never auto-draft the whole list.
Scheduling — runs with the daily stories pull
The Sal Method is designed to run daily, alongside the townhouse-stories pull. Each morning: stories come in → matching runs against the CRM → Joe gets a single short "today's suggestions" list → he approves → drafting follows. That cadence is what makes it the modern rowing-machine ritual: a small, steady, relevant touch every day.

Status: the live scheduled task is a follow-up, gated on the CRM (or interim contacts file) being connected and on Joe confirming a run time. Until then the skill runs on demand. When ready, wire it with the schedule skill so it fires concurrently with the stories pull.
The value-first rule (the iron law)
Every send Joe makes is giving value with no expectation of return. Not "no explicit ask" — no expectation of return. That difference is the whole skill, and it governs both who gets matched and what gets written.

A send (or a match) fails this rule the moment any of the following are true:

	•	The framing references the recipient as a future buyer, seller, or client — "when you're ready to upgrade", "for your search", "if you're thinking of moving", "once the time is right".
	•	The story is presented as a comp, a market signal, or intel for a transaction the recipient might one day do.
	•	The bridge — or the reason they were matched — anchors on something the recipient said about their intent to transact, even years ago and friendly. That tells them Joe is tracking them like a pipeline.
	•	The send leaves the recipient feeling like Joe is keeping score or soft-pitching.

The test: would this still be worth sending in a world where Joe was contractually barred from ever representing this person? If yes, ship. If it loses its reason to exist in that world, the framing is broken — kill it and start over.

Anchor instead on the recipient's authentic, non-transactional self:

	•	Their work or craft (architect → architecture story; restorer → a restoration piece).
	•	Their neighborhood (where they live → its narrative, not "their block as a comp").
	•	Their interests, hobbies, family, opinions.
	•	Something they're known for, or something they once told Joe that wasn't about real estate.
	•	The history or biography of the property in the story.

If there's no non-transactional anchor, it's the wrong recipient for this story — say so and propose a different match.
Audience tiers — the two bars
Sphere (currently cold / dormant)
Highest stakes — the relationship exists but is dormant, and a wrong note reads as transactional and pushes it further away. Lighter touch. The story is the pretext for getting back in touch; the email is mostly about them and the connection, with the story as the bridge. Target: ~60% person and relationship, ~40% story.
Warm / Active
People mid-relationship who want Joe's expert read. More story-led than sphere, but the personalization still anchors in something specific — their stated criteria, a question they asked, something concrete about them. Roughly 50/50 person and story.

Tier comes from the CRM record. In manual mode, if Joe hasn't said which tier, ask — don't guess.
The four-part shape of a send
Every send follows the same internal logic. If a draft is missing one of these, it isn't done.

	•	Specific opener that proves Joe thought about THEM. Not "hope you're well." Something concrete — their last conversation, their kid's college, the project they were deep in, the article they sent Joe last fall. One or two sentences, impossible to copy-paste to anyone else.

	•	The bridge — why this story made Joe think of them. The heart of the send. "I saw this and thought of you" alone is too worn to count — it needs the because, and per the value-first rule the because is about who they are, never a future transaction.

	•	Authentic bridge: "…you spent two years bringing your own parlor floor back, so this plaster story is going to land with you more than it would with most people I know." One real anchor, stated plainly.
	•	Try-hard bridge (avoid): "…because you've spent fifteen years restoring brownstones and the Stanford White detail in this Span Architecture piece is exactly the kind of thing I knew you'd want to look at." Stacked specifics plus a performative tag — it reads like Joe is working from a file, not remembering a person. One genuine anchor beats three name-drops.
	•	Transactional bridge (banned): "…because you mentioned at closing you'd want to upgrade someday and this is the comp."

	•	The story itself, in one or two sentences with a link. Don't recap, don't quote at length. Hand it over with a little insider framing that sounds like Joe — not the journalist, not Wikipedia.

	•	Sign-off. Default: no ask, nothing that makes the recipient do work for Joe. Best sign-offs are warm, brief, about their actual life — "tell Marie hello", "hope the kitchen reno's finally done", "good luck in Lisbon". Acceptable: a light personal question ("how was the move?"). Banned by default: anything that asks for market opinions, transaction intent, or free consulting. "How's the Brooklyn search going?" is borderline — avoid unless they invited it. Include a soft CTA only if Joe explicitly asks.
Subject line
Short, specific, lowercase if it matches the relationship (it usually does for sphere). Never the publication's headline. Never "thinking of you" or "checking in" — both signal templated outreach. Good patterns:

	•	The story's hook: "the bank street $70m"
	•	A reference to their situation: "your cobble hill question"
	•	Something only they'd recognize: "the strong place comp you wanted"

If the subject line could be copy-pasted to anyone else, the personalization isn't strong enough — go back to the bridge.
Length
Tight. The whole body fits on one phone screen — hard caps:

	•	Sphere: 80–140 words. Over 140 = cut. Over is worse than thin.
	•	Warm / Active: 100–160 words.

Hard pass/fail. A draft over the cap isn't done.
Voice
Inherit from brain.md and the email-writer skill:

	•	Professional but warm. Not stiff, not bro-y.
	•	Contractions fine. Em dashes fine.
	•	No "utilize", "at this time", "kindly", "please be advised", "hope this email finds you well", "I'd love to", "circle back", "touch base", "synergy".
	•	First line earns the reply. Concrete over abstract.

Two rules specific to this skill:

	•	No mirroring the journalist. If the source article is breathless or PR-y, don't absorb it. Joe's voice is calm-expert.
	•	No flattery. Don't tell the recipient they're brilliant, busy, or important. Show attention by being specific, not by complimenting.
Output structure (Phase 2 — the draft)
For each approved contact, return one Markdown block in this exact shape:

## Why this person for this story

[2–3 sentences, anchored to specific facts about them. If the match is a stretch, say so plainly and propose a different story or angle. Better to flag a weak match than force a send.]

## Send

**To:** [name + email if known, else just name]

**Subject:** [subject line]

[Body. Plain prose. No headers, no bullets.]

[Closing line — warm, specific, about them.]

— Joe

The skill produces text only. Creating a Gmail draft, or sending, is a separate step Joe does manually.
Quality bar
A good send:

	•	Passes the value-first test (still worth sending if Joe could never represent them).
	•	Reads like Joe wrote it for that one person.
	•	Has all four parts (specific opener, bridge, story + framing, warm close).
	•	Links to the source story.
	•	Subject line couldn't be copy-pasted to anyone else.
	•	No CTA unless Joe asked.
	•	Closing line is warm and about their life — never a market question.
	•	Hits the length cap for the tier.
	•	Matches brain.md voice.

A bad send:

	•	Frames the story as a comp / market intel / transaction signal.
	•	Anchors on the recipient's stated intent to buy or sell.
	•	Could go to multiple people with the name swapped.
	•	Uses "thinking of you", "checking in", "hope you're well", "for your search", "when you're ready".
	•	Recaps the article instead of framing it.
	•	Pushes an unrequested CTA.
	•	Closes with "what's your sense of the market" or anything that makes the recipient think for Joe.
	•	Flatters, mirrors the article's tone, omits the link, or busts the cap.
Edge cases
	•	No CRM connected. Run in manual mode — Joe names the person or pastes a brief, skip to Phase 2. Don't fabricate a contact database.
	•	CRM connected but matches nobody. Say so plainly. A story that fits no one in the sphere / warm list is fine — not every story has a home. Don't force a match to fill the list.
	•	Match is thin. Flag it as a stretch in the shortlist ("your call"), don't bury it among strong fits.
	•	Everyone good is on cooldown. Say the well's dry for that story rather than re-pinging someone Joe just contacted.
	•	Joe names a person directly. Honor it — skip matching, go to Phase 2. A manual name always overrides the engine.
	•	Same story, several approved contacts. Draft each separately. Never reuse openers or bridges; each send is one-of-one.
	•	Story is paywalled. Note the paywall in the bridge ("paywalled but here's the gist…") and frame so the recipient gets value even without opening it.
When closing out
	•	If Joe rewrites a draft before sending and the change is structural or voice-related, append the original, the rewrite, and what changed to examples/bad-examples.md (create if needed).
	•	If Joe sends without edits and it lands (a reply, a meeting, a repaired relationship), add it to examples/good-examples.md.
	•	If a match was wrong — right story, wrong person, or a reason that read as transactional — note it, so the matching logic sharpens over time.
What this skill does NOT do
	•	Does not send anything. Drafts and suggestions only; Joe sends from Gmail manually.
	•	Does not do cold outbound — that's outbound-townhouse.
	•	Does not auto-draft the whole shortlist — Joe approves targets first.
	•	Does not draft handwritten notes — different format, different program (initiatives/handwritten-notes/).

