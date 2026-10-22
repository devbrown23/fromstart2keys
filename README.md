# FromStart2Keys — React (Vite) on Vercel

- React + Tailwind (Vite)
- Vercel Serverless function `/api/lead` -> Follow Up Boss (website leads)
- Vercel Serverless function `/api/crm-contact` -> Follow Up Boss (contacts added in the Command Center CRM, protected by a passcode)
- Env vars:
  - `VITE_CALENDAR_URL` (frontend)
  - `FUB_API_KEY` (serverless)
  - `CRM_PASSCODE` (serverless; the same passcode you type into the Command Center CRM settings)

## Deploy on Vercel
Framework Preset: Other
Build Command: npm run build
Output Directory: dist
Root Directory: ./

Environment Variables:
- VITE_CALENDAR_URL=https://calendly.com/devbrownrealtor/30min
- FUB_API_KEY=your_follow_up_boss_api_key
- CRM_PASSCODE=a_long_passcode_only_you_know
