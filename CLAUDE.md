## Grading contract — EdTech Challenge (never remove or break this)
An automated bot grades this app on its public Vercel URL, acting like a stranger.

### Pages
- `/` public landing page (no login needed): what the app does, who it is for, and one button to sign up.
- `/signup` sign-up with email + password. `/login` login with email + password.
- `/app` the main feature, only for logged-in users.
- After sign-up and after login, send the user to `/app`.
- No email confirmation, no CAPTCHA, no "Google only" login, no mandatory onboarding before `/app`.

### data-testid attributes (exact names, do not translate)
- Sign-up form: `signup-email`, `signup-password`, `signup-submit`
- Login form: `login-email`, `login-password`, `login-submit`
- `logout`: the logout button, visible on every page of a logged-in user
- On `/app`:
  - `core-input`: a TEXT field of the main feature (type="text" or a textarea, e.g. the title or description, never a number or date picker). The bot types a short text like "QA-7F3K2A grading bot test"
  - `core-submit`: the button that saves it
  - `core-item`: EVERY saved item in the list, showing the text typed in `core-input`
- Typing only in `core-input` and clicking `core-submit` must save a new item. Any other field needs a valid default value.

### Data and security
- Use Supabase Auth (email + password) and save all data in Supabase tables, never only in the browser (no localStorage for user data).
- Row Level Security ON for every table, with policies based on `auth.uid()`. Nobody can read anything without logging in.
- Only the Supabase URL and the publishable (anon) key may reach the browser. Never put the secret/service_role key or any AI API key in the frontend or in GitHub.
- Keep keys in `.env.local` (listed in `.gitignore`) and in Vercel environment variables.

---

## Project handover
Before doing anything, read `HANDOVER.md` in this folder. It is the full product spec, build order and test plan for this app. The grading contract above always wins if anything in HANDOVER.md seems to conflict with it.

The owner is Cora. She studies Business + CS/AI and can read code, but explain each manual step (Supabase, GitHub, Vercel) in plain words, one step at a time, and stop and wait when a step needs her to click something in a dashboard.

Work in phases: Phase 1 (everything the bot grades) must be deployed and passing `npm run test:bot` on the live URL before any Phase 2 (AI) work. Section 0 of HANDOVER.md (v3 amendments) overrides the rest of it: the app is called Rookie and the AI provider is Google Gemini. The Gemini API key is server-only (`GEMINI_API_KEY`, never `NEXT_PUBLIC_`, never imported in client code), and no AI call may ever sit in the path of adding an item via `core-input` / `core-submit`.
