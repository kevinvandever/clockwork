# Demo Runbook (Kevin — for presenting live)

Drive this yourself, narrating. Prototype runs on stand-ins (mock CRM, in-memory
data, stub drafting) — that's the point: everything real is a config swap later.

## Pre-flight (once, before the meeting)

```bash
# from the repo root
pnpm install
pnpm build
```

Optional — real Claude drafting (uses Joe's skills/*.md as the voice):
```bash
export ANTHROPIC_API_KEY=sk-...
```
No key = deterministic stub. Still a complete demo.

---

## Demo 1 — the robot team (terminal, ~60 sec)

```bash
pnpm --filter @clockwork/install demo
```

Narrate the printed sections top to bottom:
1. **A lead emails in → Josh 2 (Pipeline) replies instantly.** "Speed-to-lead — the
   thing agents always lose."
2. **Dave (Marketing) sends the sphere newsletter.**
3. **Stephanie (Client Care) reaches out to who's due** — a birthday + someone gone quiet.
4. **agentfolio — the agent works a buyer board**, adds a property (public records auto-fill),
   moves it to offer, hands it off to transaction.
5. **Linda (Chief of Staff) rolls up the whole day** — all four robots *and* agentfolio in one brief.

**Punchline:** "Four robots, one shared feed, and the web app plugs into the same
brief. Running on stand-ins today — no live CRM or inbox needed to see it work."

---

## Demo 2 — agentfolio web app (the thing Joe can see)

```bash
pnpm --filter @clockwork/agentfolio dev
```
Open **http://localhost:3000**.

1. **Log in as Joe (agent)** → click **Cal's Home Search** → point out:
   - the property, its **public records** (owner + assessed value, auto-pulled),
   - the **agent-private strategy** note (amber),
   - **stage controls** and the **Hand off to transaction** button.
2. **Log out → Log in as Cal (client)** → same board, but:
   - **agent-private strategy is gone**, no stage controls.
3. "Same data, two views. The client never sees the agent's private strategy — that's
   enforced and tested, not just hidden in the UI."

Stop the server with **Ctrl-C** when done.

---

## The closing story (the pitch)

"Today: stub drafting, mock CRM, in-memory data. When you hand me your **CRM creds**
and **Outlook creds**, I flip the install config — same code — and it's drafting in
**your real voice** (your skills are already loaded) against **your real system**.
Then Phase 2: the robots get better over time from your actual work, with you approving
the changes."

---

## If something misbehaves

- Errors on a command → run `pnpm install` then `pnpm build` again (only real ordering rule).
- Port 3000 busy → `pnpm --filter @clockwork/agentfolio dev -- -p 3001`, open :3001.
- Always run from the **repo root**, not a package folder.
- The terminal demo is one-shot (prints and exits); the web app runs until Ctrl-C.

## What to have ready to ask Joe

- CRM choice + API credentials (unblocks the real Rechat/CRM adapter).
- Microsoft Outlook credentials (real inbox for speed-to-lead).
- More voice samples if he wants the drafting sharper (feeds Phase 2).
