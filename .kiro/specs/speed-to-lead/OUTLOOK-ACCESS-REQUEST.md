# Outlook Access Request — prerequisite for the Speed-to-Lead slice

> Attached to the Speed-to-Lead slice (roadmap **Next**). This is the mailbox access
> the always-on watcher needs to detect leads and drop a drafted reply into Joe's inbox
> for review. Get this moving early — it has the longest lead time of anything in the slice.

## Step 0 — the question that decides everything

**Who administers Joe's Microsoft 365 / email?**
- If it's a **brokerage (e.g. Douglas Elliman) IT department**, only *they* can create the
  app registration, grant admin consent, and scope mailbox access. Joe as a normal user
  usually cannot — this becomes an IT ticket, so start it now.
- If it's **Joe's own tenant**, he (or Kevin with his sign-in) can do it directly in minutes.

Confirm this before anything else.

## What to request (forward this to whoever admins the 365)

> Clockwork needs read + draft access to one mailbox, via a Microsoft **Entra ID app
> registration**. Please provide:
>
> 1. **Directory (tenant) ID**
> 2. **Application (client) ID**
> 3. **A client secret** (value + expiry date) — handled as a secret, never in code
> 4. **Microsoft Graph API permissions, admin-consented:**
>    - `Mail.Read` — detect incoming leads
>    - `Mail.ReadWrite` — create the drafted reply in the mailbox for review
>    - *(`Mail.Send` is NOT requested — Joe sends every reply himself)*
> 5. **Access model:** application permissions (unattended/always-on), **scoped to Joe's
>    mailbox only** via an Exchange **Application Access Policy** (least privilege). Delegated
>    (Joe signs in once) is acceptable if preferred.
> 6. **The mailbox address (UPN)** the watcher should monitor.

## Hard rules (state these plainly)

- **Do not send a username/password.** We authenticate only through the app registration
  and tokens — never Joe's password. (Microsoft has disabled password-based mail access
  anyway.) **Rotate any password already shared.**
- Scope is **one mailbox, read + draft only** — no send, no other mailboxes.

## Our side (not Joe's — noted so it isn't forgotten)

- New-mail detection is either **Graph change-notification webhooks** (needs our public
  HTTPS endpoint — arrives with hosting the watcher on Railway) or **polling** (simpler,
  no public endpoint). Decide when we spec this slice.
- Least-privilege inbox OAuth + secret storage are real operational concerns (per product
  context) — specced as such when the slice is picked up.

## Dependency status

- [ ] Confirm 365 admin ownership (Step 0)
- [ ] App registration created + admin-consented
- [ ] Credentials delivered (tenant ID, client ID, secret) and stored as secrets
- [ ] Mailbox UPN + access-policy scope confirmed
- [ ] Password Joe shared earlier is rotated
