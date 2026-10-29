# FromStart2Keys — React (Vite) on Vercel

- React + Tailwind (Vite)
- Vercel Serverless function `/api/lead` -> Follow Up Boss (website leads)
- Vercel Serverless function `/api/deal` -> Deal of the Week. Public page `/deal` (one permanent link for posts and bio), private update page `/deal/edit` (CRM_PASSCODE). Counts visits and MLS-link clicks by source; the form sends leads to Follow Up Boss tagged `Deal of the Week`. Uses the same Upstash Redis database.
- Vercel Serverless function `/api/lender-pool` -> shared Client Pool for Devin and his lender (page: `/pool`). Devin signs in with `CRM_PASSCODE`, the lender with `LENDER_PASSCODE`. The lender can only update loan fields (status, pre-approval, down payment assistance, note). Stored in the same Upstash Redis database as `/api/cc-sync`.
- Vercel Serverless function `/api/crm-contact` -> Follow Up Boss (contacts added in the Command Center CRM, protected by a passcode)
- Env vars:
  - `VITE_CALENDAR_URL` (frontend)
  - `FUB_API_KEY` (serverless)
  - `CRM_PASSCODE` (serverless; the same passcode you type into the Command Center CRM settings)
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
