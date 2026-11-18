# FromStart2Keys — React (Vite) on Vercel

- React + Tailwind (Vite)
- Vercel Serverless function `/api/lead` -> Follow Up Boss (website leads). CMA requests from the Sell section go in as a **Seller Inquiry** with the full property (address, beds, baths, sqft, condition, notes), tagged `Seller` and `CMA Request`, plus the county parcel and assessed value when it can be found. Every lead is also backed up in the site database (`leads:log`). With `RESEND_API_KEY` and `LETTER_FROM` set, Devin gets an instant alert email (to `LEAD_ALERT_EMAIL`, or the reply-to address in Letter Desk settings) and the homeowner gets a confirmation email.
- Vercel Serverless function `/api/deal` -> Deal of the Week. Public page `/deal` (one permanent link for posts and bio), private update page `/deal/edit` (CRM_PASSCODE). Counts visits and MLS-link clicks by source; the form sends leads to Follow Up Boss tagged `Deal of the Week`. Uses the same Upstash Redis database.
- Vercel Serverless function `/api/letter` -> **The Keys Letter**, a weekly (or monthly) letter of homes Devin thinks are worth a look. Public page `/letter` (latest issue, past letters, sign-up form; new readers go to Follow Up Boss tagged `Keys Letter`). Private Letter Desk at `/letter/edit` (CRM_PASSCODE): write the note, add 3–5 homes (photo, price, was-price, label, listing link, "why I like it"), pull in the Deal of the Week with one tap, preview the email, publish, send a test, then send to readers. **Results** shows views, clicks per home and **who clicked** (with Call buttons) for Friday calls. Every email has a one-click unsubscribe link. Sending from the page needs a free [Resend](https://resend.com) account: set `RESEND_API_KEY` and `LETTER_FROM` (e.g. `Devin Brown <letter@fromstart2keys.com>`, on a domain verified in Resend). Without them, use **Copy email HTML** and paste into Gmail, BCC'ing your readers. Add your brokerage's mailing address in Letter Desk settings (CAN-SPAM requires it in the footer).
- Vercel Serverless function `/api/lender-pool` -> shared Client Pool for Devin and his lender (page: `/pool`). Devin signs in with `CRM_PASSCODE`, the lender with `LENDER_PASSCODE`. The lender can only update loan fields (status, pre-approval, down payment assistance, note). Stored in the same Upstash Redis database as `/api/cc-sync`. Follow Up Boss: anyone tagged `Lender Pool` (change with `FUB_POOL_TAG`) joins the pool automatically when the page opens or on Refresh, and linked clients keep their name, phone, email and stage in sync. The agent can also bulk-import with **Import from Follow Up Boss**. Loan fields and notes are never overwritten.
- Vercel Serverless function `/api/agent-game` -> Call Closer, the free negotiation game for agents (page: `/negotiate`, also linked from the FS2K Studio "Call Closer" tab and the home page). Agents create free accounts (email + password, hashed) and their progress and the leaderboard are stored in the same Upstash Redis database. New sign-ups go to Follow Up Boss tagged `Call Closer`. Private roster of every agent and their stats at `/negotiate/admin` (CRM_PASSCODE).
- `/api/reel` (code in `api/_reel.js`, served through the Spar function by a rewrite, since Vercel Hobby allows 12 functions) -> **Reel Director** (page: `/reels`, also linked from FS2K Studio → Content Studio → Reels). Investing reels with a script, shot list, director's notes and a teleprompter. Sign in with `CRM_PASSCODE` to have Claude write new reels (uses `ANTHROPIC_API_KEY`, same as Spar; optional `REEL_MODEL`) and to sync your reels and shot checkmarks between devices (Upstash Redis).
- `/api/sig-photo` (code in `api/_sigphoto.js`, served through the Spar function by a rewrite) -> headshot for the **email signature builder** at `/signature`. The page has three styles (Editorial, Classic, Minimal), a crop-and-zoom photo tool (saving needs `CRM_PASSCODE`; the photo itself is public so email apps can load it) and a Copy signature button for Gmail.
- `/api/card` and `/go/<link>` (code in `api/_card.js`, served through the Spar function by rewrites) -> **digital card + signature tracking**. The **Card** style on `/signature` (WiseStamp-style: photo, contact column, link column, *Save my contact* button) sends every link through `/go/<link>?s=sig`, which counts the click and redirects. `/go/save` downloads your contact card (.vcf, with your signature photo). Public page `/card` is the digital business card: Save my contact, Call/Text/Email, and a quick form that goes to Follow Up Boss through `/api/lead` with source **Email Signature** (from the signature) or **Digital Card** (QR, text, Instagram), tagged `Digital Card` and `Interest: ...`. Add `?s=qr`, `?s=text`, `?s=ig` or `?s=linktree` to the /card link to track where people came from; open `/card?me=1` once on your own phone and laptop so your taps aren't counted. Email security scanners aren't counted either. **Command Center:** `GET /api/card` with header `X-CRM-Passcode` returns totals, last 30 days by day, clicks per link, numbers per source and a feed of the last 50 taps. Needs `CARD_EMAIL` (the email on your contact card); optional `CARD_PHONE` (defaults to +18036581509).
- Vercel Serverless function `/api/dialer-token` -> gives the Command Center Dialer a 24-hour Telnyx login token so it can call from the browser on the business line. Protected by `CRM_PASSCODE`. Needs `TELNYX_API_KEY`, `TELNYX_CREDENTIAL_ID` and (optional) `TELNYX_CALLER_ID`.
- Vercel Serverless function `/api/crm-contact` -> Follow Up Boss (contacts added in the Command Center CRM, protected by a passcode)
- Env vars:
  - `VITE_CALENDAR_URL` (frontend)
  - `FUB_API_KEY` (serverless)
  - `CRM_PASSCODE` (serverless; the same passcode you type into the Command Center CRM settings)
  - `TELNYX_API_KEY`, `TELNYX_CREDENTIAL_ID`, `TELNYX_CALLER_ID` (serverless; Command Center Dialer business line)
  - `RESEND_API_KEY`, `LETTER_FROM` (serverless; optional, lets `/letter/edit` send The Keys Letter)
  - `CARD_EMAIL`, optional `CARD_PHONE` (serverless; what /card and the downloaded contact card show)
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

## Vercel function limit
The Hobby plan allows **12 serverless functions** per deployment, and every file in `api/` counts as one. `api/` is at 12. To add a new endpoint, put the code in a file starting with `_` (for example `api/_reel.js`, which doesn't count) and route to it from an existing function plus a `vercel.json` rewrite.
