# FromStart2Keys — React (Vite) on Vercel

- React + Tailwind (Vite)
- Vercel Serverless function `/api/lead` -> Follow Up Boss (website leads)
- Vercel Serverless function `/api/deal` -> Deal of the Week. Public page `/deal` (one permanent link for posts and bio), private update page `/deal/edit` (CRM_PASSCODE). Counts visits and MLS-link clicks by source; the form sends leads to Follow Up Boss tagged `Deal of the Week`. Uses the same Upstash Redis database.
- Vercel Serverless function `/api/letter` -> **The Keys Letter**, a weekly (or monthly) letter of homes Devin thinks are worth a look. Public page `/letter` (latest issue, past letters, sign-up form; new readers go to Follow Up Boss tagged `Keys Letter`). Private Letter Desk at `/letter/edit` (CRM_PASSCODE): write the note, add 3–5 homes (photo, price, was-price, label, listing link, "why I like it"), pull in the Deal of the Week with one tap, preview the email, publish, send a test, then send to readers. **Results** shows views, clicks per home and **who clicked** (with Call buttons) for Friday calls. Every email has a one-click unsubscribe link. Sending from the page needs a free [Resend](https://resend.com) account: set `RESEND_API_KEY` and `LETTER_FROM` (e.g. `Devin Brown <letter@fromstart2keys.com>`, on a domain verified in Resend). Without them, use **Copy email HTML** and paste into Gmail, BCC'ing your readers. Add your brokerage's mailing address in Letter Desk settings (CAN-SPAM requires it in the footer).
- Vercel Serverless function `/api/lender-pool` -> shared Client Pool for Devin and his lender (page: `/pool`). Devin signs in with `CRM_PASSCODE`, the lender with `LENDER_PASSCODE`. The lender can only update loan fields (status, pre-approval, down payment assistance, note). Stored in the same Upstash Redis database as `/api/cc-sync`. Follow Up Boss: anyone tagged `Lender Pool` (change with `FUB_POOL_TAG`) joins the pool automatically when the page opens or on Refresh, and linked clients keep their name, phone, email and stage in sync. The agent can also bulk-import with **Import from Follow Up Boss**. Loan fields and notes are never overwritten.
- Vercel Serverless function `/api/agent-game` -> Call Closer, the free negotiation game for agents (page: `/negotiate`, also linked from the FS2K Studio "Call Closer" tab and the home page). Agents create free accounts (email + password, hashed) and their progress and the leaderboard are stored in the same Upstash Redis database. New sign-ups go to Follow Up Boss tagged `Call Closer`. Private roster of every agent and their stats at `/negotiate/admin` (CRM_PASSCODE).
- Vercel Serverless function `/api/dialer-token` -> gives the Command Center Dialer a 24-hour Telnyx login token so it can call from the browser on the business line. Protected by `CRM_PASSCODE`. Needs `TELNYX_API_KEY`, `TELNYX_CREDENTIAL_ID` and (optional) `TELNYX_CALLER_ID`.
- Vercel Serverless function `/api/crm-contact` -> Follow Up Boss (contacts added in the Command Center CRM, protected by a passcode)
- Env vars:
  - `VITE_CALENDAR_URL` (frontend)
  - `FUB_API_KEY` (serverless)
  - `CRM_PASSCODE` (serverless; the same passcode you type into the Command Center CRM settings)
  - `TELNYX_API_KEY`, `TELNYX_CREDENTIAL_ID`, `TELNYX_CALLER_ID` (serverless; Command Center Dialer business line)
  - `RESEND_API_KEY`, `LETTER_FROM` (serverless; optional, lets `/letter/edit` send The Keys Letter)
  - `LENDER_PASSCODE` (serverless; give this one to your lender for fromstart2keys.com/pool. Make it different from CRM_PASSCODE)

## Deploy on Vercel
Framework Preset: Other
Build Command: npm run build
Output Directory: dist
Root Directory: ./

Environment Variables:
- VITE_CALENDAR_URL=https://calendly.com/devbrownrealtor/30min
- FUB_API_KEY=your_follow_up_boss_api_key
- CRM_PASSCODE=a_long_passcode_only_you_know
- LENDER_PASSCODE=a_different_passcode_for_your_lender
