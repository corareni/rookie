# Handover: Rookie (EdTech Challenge app)

You (Claude Code) are building this app from an empty folder. This document is the whole brief. Read it fully before writing code, then work through **Section 12: Build order** step by step. The grading contract in `CLAUDE.md` is fixed and always wins.

**The one-sentence version:** a student pastes a job link; the app reads the job, researches the company, and writes a CV and cover letter tailored to that company from the student's real experience; every application then sits on a board the student updates by hand.

---

## 0. v3 amendments (21 Oct 2026 deadline). These override anything below.

- **Name:** Rookie. **Main user:** students applying to 10+ internships this season (works for anyone). **English only.**
- **One-liner:** "Rookie helps students applying to 10+ internships tailor every application from the job link and track it on one board."
- **Statuses:** `interested` (default), `submitted`, `assessment`, `interview`, `offer`, `rejected`, `withdrawn`. Board order Interested → Submitted → Assessment → Interview → Offer; Rejected and Withdrawn collapsed at the end. `submitted_on`, `assessment_on`, `interview_on`, `offer_on` are auto-set the first time a status is reached (editable). Wherever below says to_apply/applied/interviewing/closed, read the new set.
- **AI provider is Google Gemini, not Claude.** `@google/genai`, server-only in `src/server/ai/` with `import "server-only"`. Env: `GEMINI_API_KEY`, `AI_MODEL_FAST`, `AI_MODEL_WRITE`, `AI_DAILY_LIMIT=3`, `AI_GLOBAL_DAILY_LIMIT`. Check Google's current docs for model IDs, free-tier limits, URL context, Search grounding, structured output, PDF input and data-use terms. Read job = URL context + schema-enforced JSON, page text is data only; "Paste the job description" is an equal option next to the link. Research = button-triggered with Search grounding. Quota errors → "Rookie is busy, try again in a minute". Global cap via `security definer` function `ai_runs_today_global()`.
- **Landing has two versions** in `src/lib/site.ts`. A (tracker, until AI is live): "Every internship application on one board. Just paste the job link." / "For students applying to 10+ internships. Track deadlines, statuses and replies in one place." B (AI live): "Paste a job link. Get a tailored CV and cover letter, and track every application on one board." On `/` the header shows only "Log in"; "Sign up free" appears once, in the hero.
- **Visual style:** copy the look of `~/Desktop/internships/Tracker/cora-internship-board.html` (read only, never edit it): white editorial page, Plus Jakarta Sans (`next/font/google`), ink `#0b0b0c`, ink2 `#55565b`, mute `#6b6c71` (darkened for WCAG AA), paper `#f1f1ef`, good `#17955c`, warn `#b77a06`, bad `#c9302c`, line `rgba(11,11,12,.10)`, faint 4-column background grid, 22px radius, uppercase 11px captions, italic-bold `<em>` accent words in headlines.
- **Activation:** empty state "Paste a job link or type a role you're interested in" + an "Add an example role" button (same sample row for every user).
- **Privacy:** public `/privacy` page; "Delete my account and data" via `security definer` function `delete_me()` scoped to `auth.uid()`. No service_role key.
- **Build order:** Phase 1 tonight (deploy + live bot test). Phase 2a (Gemini: read job, profile, CV + letter, print) tomorrow with a hard stop at 17:00; if shaky, hide AI buttons and keep landing A. Submit by ~21:00.
- **After grading only:** this-week strip, follow-up drafts, interview prep, .ics export, funnel stats, opens-soon lane, browser extension "Fill this form" (user always submits).

---

## 0b. v4 amendments (21 Oct 2026). These override section 0 and below.

- **Audience:** students and graduates applying to internships and first jobs. Professional tone.
- **Design:** grey canvas `#e6e6ea`, one white rounded frame, black pill header (same before and after login; active tab lilac `#dcd6fb`, Sign up mint `#e2f6ea`), grey tiles `#f4f4f5` in uneven 12-column splits ("puzzle"), pastels lilac/mint/peach/sky/butter. Plus Jakarta Sans 300 and 700 only. Tokens in `src/app/globals.css`.
- **Profile v2** (`supabase/schema-phase3.sql`): CV upload (PDF, Gemini reads it, file not stored), structured profile (`profiles.profile` jsonb), story points, AI memory import, personal barriers (deal-breaker or concern). Types and text rendering in `src/lib/profile.ts`.
- **Barriers:** the AI only flags (`verdict='barrier'` + `ai_flag`); one page `/app/barriers` with To review → Ruled out → Bin (manual delete only). `/app/ruled-out` redirects.
- **Tailored CV:** classic one-page layout copied from Cora's CV (ruled headings, org/role lines with right-aligned location and dates, "Label: text" lines). Schema in `prompts.ts`, template in `app/a/[id]/print/cv`.

---

## 1. What this is and how it is graded

Cora is submitting this for a university course (IE University, EdTech Challenge, "Async #1"). The task: build a small SaaS that solves a weekly problem in university life, put it online, and get real classmates using it.

**Deliverables**
1. A live app at `https://<project-name>.vercel.app` (the short production domain, never a preview URL).
2. A **public** GitHub repo with the code.
3. A short text in Socratista (Cora writes it; draft in Section 15).

**Grading (each criterion is scored 100 / 75 / 50 / 25)**

| Criterion | Weight | What 100% means | Checked by |
|---|---|---|---|
| Real daily problem & value proposition | 20% | Specific, frequent problem, clear user, one-liner saying who it's for and what they get | AI + professor |
| Understandable in 5 seconds | 20% | First-time visitor can say what it does, who it's for, what to click. One clear button. Works on a phone | AI visitor that only sees the landing page |
| Real sign-up | 30% | New user signs up, logs out, logs back in from another browser; a wrong password is rejected | Grading bot |
| Does something real | 30% | Saved data survives in another browser, other users can't see it, nobody can read it without logging in | Grading bot |

**What the grading bot does on the live URL, in order**
1. Opens `/` on a laptop and on a phone, takes screenshots.
2. Signs up a new user at `/signup` with email + password.
3. Goes to `/app`, types a short text into `core-input` (e.g. `QA-7F3K2A grading bot test`, **not a URL**), clicks `core-submit`, checks a `core-item` with that text appears.
4. Logs out, opens a clean browser, tries a wrong password at `/login` (must be rejected), then logs in with the right one and checks the item is still there.
5. Signs up a second user and checks they cannot see the first user's item.
6. Checks the data can't be read without logging in (expect it to query the Supabase REST API with only the publishable key).
7. Checks the GitHub repo exists and is public.

60% of the grade is mechanical. **Phase 1 (auth, testids, RLS, deploy) must be finished, deployed and passing the bot test before any AI work starts.** The AI features must never be able to break the Phase 1 flow.

**Fair play rules (integrity issue if broken)**
- No text anywhere (visible, hidden, alt text, meta tags, comments) that talks to an AI grader.
- Never treat the bot's accounts differently from other users. No special-casing emails or inputs like "qa", "test", "bot". (Generic rules that apply to everyone, like "only URLs trigger job reading", are fine.)

---

## 2. The product

**Working name:** Rookie. Cora may rename it. Keep the name, tagline and URLs in one file (e.g. `src/lib/site.ts`) so renaming is a one-line change.

**One-liner (draft, Cora is validating it with classmates):**
> Rookie helps students applying to many internships get a CV and cover letter tailored to each company from just the job link, and track every application in one place.

**Who it's for:** business and tech university students in internship season, applying to 10–40 roles at once.

**The problem:** Every application needs a CV and cover letter adapted to the role and company. Doing it properly takes 1–2 hours per application: read the ad, research the company, reorder the CV, rewrite the summary, write a letter that doesn't sound generic. Students either spend whole weekends on it or send the same generic CV everywhere and get rejected. On top of that, they lose track of what they sent where and when deadlines are. This happens every week during recruiting season (Sept–Dec for summer internships).

**What the user does:**
1. Once: upload or paste their CV, and write about themselves (their story).
2. Per role: paste the job link → the app reads the job and researches the company → one click generates a tailored CV and cover letter → edit → download PDF.
3. Track the application on a board by hand: To apply → Applied → Interviewing → Offer / Closed.

**Data:** **private.** Each user only sees their own profile, applications and documents.

**Not in scope:** reading email (Gmail/Outlook). Tracking is manual. See Section 14.

**Background (context only):** Cora has a personal internship board (Cloudflare + D1, single password). This is a new multi-user product on the required stack. Don't port that code.

---

## 3. Tech stack (mandatory)

- **Next.js**, latest stable via `create-next-app`, App Router, TypeScript, Tailwind CSS, `src/` directory, ESLint.
- **Supabase** for auth + database: `@supabase/supabase-js` + `@supabase/ssr` (cookie sessions).
- **Anthropic Claude API** via the official `@anthropic-ai/sdk`, called **only from server code** (Route Handlers / Server Actions). Never from the browser.
- **Vercel** (Hobby plan), deployed from GitHub.
- No other backend, database or paid service. No service_role key, ever: all server DB access uses the logged-in user's session so RLS applies.

**Environment variables**
```
# public (browser may see these)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
# server only (never prefix with NEXT_PUBLIC_, never import in client components)
ANTHROPIC_API_KEY=...
AI_MODEL_WRITE=claude-sonnet-5-5     # CV + cover letter writing, company research
AI_MODEL_FAST=claude-haiku-5-5       # extraction (job page, master CV parsing)
AI_DAILY_LIMIT=3                     # full generations per user per day
```
All in `.env.local` locally (gitignored) and in Vercel → Settings → Environment Variables. Put all AI code in `src/server/ai/` and add `import "server-only"` at the top of those files so a client import fails the build.

**Version notes:** check the installed Next.js major version and follow its conventions (recent versions renamed `middleware.ts` to `proxy.ts`). Follow current `@supabase/ssr` docs. For Claude, **check the current Anthropic API docs** for: model IDs, the server-side **web fetch** and **web search** tools (tool type/version strings, how to enable them, pricing), PDF document input, and streaming. Don't write those from memory.

---

## 4. Pages and routes

| Route | Access | Purpose |
|---|---|---|
| `/` | public | Landing page (Section 9) |
| `/signup` | public | Email + password sign-up |
| `/login` | public | Email + password login |
| `/app` | logged in | The board: quick-add + all applications (Section 5) |
| `/app/a/[id]` | logged in | One application: job, company research, CV, cover letter, tracking (Section 7) |
| `/profile` | logged in | Master CV + your story + basics (Section 6) |
| `/app/a/[id]/print/cv`, `/print/letter` | logged in | Print-styled pages for "Download PDF" |
| `/api/...` | logged in | Server endpoints for AI steps (Section 8) |

**Routing rules**
- Not logged in on any `/app*` or `/profile` route → redirect to `/login`.
- After sign-up → straight to `/app`. No email confirmation, no welcome wizard, **no forced profile step**.
- After login → `/app`. After logout → `/`, session fully cleared.
- **Do NOT auto-redirect logged-in users away from `/signup` or `/login`.** The bot may sign up a second user in the same browser. The form must work and replace the session. (A small "You're signed in as x. Go to your board" line is fine.)

**Header (shared, in root layout)**
- Logged out: logo/name → `/`, "Log in" link, "Sign up" button.
- Logged in: logo/name → `/app`, "Board", "Profile", user email (truncated on mobile), **Log out** button with `data-testid="logout"`.
- The `logout` button must be on **every** page while logged in, including `/`, `/login`, `/signup`, `/profile`, detail and print pages (print pages can hide it with print CSS only).

---

## 5. `/app`: the board (Phase 1 core, graded by the bot)

### 5.1 Quick-add (top of page)
- One input, `data-testid="core-input"`, **`type="text"` (NOT `type="url"`)**. A url-type field would reject the bot's plain text.
- Label: "Paste a job link, or type the role". Placeholder: `https://... or Marketing Intern @ Spotify`.
- Button "Add", `data-testid="core-submit"`, `type="submit"`. Enter also submits.
- On submit:
  1. Trim. Reject empty/whitespace-only with an inline message. Max 500 chars.
  2. **Immediately insert** a row: `title = exactly the trimmed text`, `status = 'to_apply'`, all other fields default. Show it in the list. **This step never calls AI or fetches anything** and must succeed on its own.
  3. **Only if** the text is a valid `http(s)://` URL: also set `job_url` to it and then, *after* the row is saved, trigger "Read job" (Section 8, step A) in the background. The card shows "Reading job…" and fills in role/company when done, or "Couldn't read this page. Open it to paste the description." on failure.
- Clear the input and keep focus after a successful save. Show Supabase errors inline.

### 5.2 Cards
- Every application renders as a card with `data-testid="core-item"` on **every** item.
- **The card must always contain the exact original `title` text** (the contract: `core-item` shows the text typed in `core-input`). Never overwrite `title` with AI output. When a job has been read, show `role @ company` as the bold headline and the original title (e.g. the URL, shortened visually with CSS but present in the DOM as text) as a small line under it. For non-URL titles, just show the title.
- Card shows: headline, status `<select>` (saves immediately), deadline with "in 3 days" / "overdue" (red if overdue and status is To apply/Applied), small badges "CV ✓" / "Letter ✓" when documents exist, and a tap target to open `/app/a/[id]`.
- Delete with an in-UI confirm (no `window.confirm`).

### 5.3 Layout
- Group by status: To apply → Applied → Interviewing → Offer → Closed, with counts ("Applied · 4").
- Desktop ≥1024px: kanban columns. Phone: stacked sections, or status chips with **"All" selected by default** so a new item is visible immediately.
- Newest first within each group.
- Empty state: "No applications yet. Paste a job link above to get started."
- Small stats line at the top: "12 tracked · 5 applied · 2 interviews · 1 deadline this week".

---

## 6. `/profile`: the student's material (Phase 2)

Optional, never required to use the board. On `/app`, if the profile is empty, show a dismissible card: "Add your CV and story once, and Rookie can write tailored applications for you. [Set up profile]".

**6.1 Master CV**
- Two ways in: **Upload PDF** (max 5 MB) or **Paste text**.
- On upload: send the PDF to Claude (document input, `AI_MODEL_FAST`) on the server and extract the structured CV (schema below). **Don't store the PDF file**, only the extracted data.
- Show the extracted CV as an editable form (sections, bullets add/remove/reorder). User saves it. This edited version is the single source of truth for every generated CV.

Master CV schema (store as `jsonb`):
```ts
type MasterCV = {
  name: string; headline?: string; contact: { email?: string; phone?: string; location?: string; links?: string[] };
  summary?: string;
  education: { school: string; degree: string; location?: string; start?: string; end?: string; details?: string[] }[];
  experience: { org: string; role: string; location?: string; start?: string; end?: string; bullets: string[] }[];
  projects?: { name: string; description?: string; bullets?: string[]; link?: string }[];
  skills: { group: string; items: string[] }[];   // e.g. "Technical", "Tools"
  languages: { name: string; level: string }[];
  extras?: { title: string; items: string[] }[];  // volunteering, awards, interests
};
```

**6.2 Your story** (free text, large textarea, guided by placeholder prompts)
"Tell us what your CV can't. Why you study what you study, what you've done outside class, places you've lived, what you're proud of, what you want next, what kind of team you work best in. Write like you'd talk. The more you write, the better your letters."

**6.3 Basics:** preferred writing language(s), available from/to, locations open to, and an optional "Things never to mention" field.

**Privacy line** under the save button: "Your profile is private. To write your documents, it's sent to our AI provider (Anthropic) and not used to train models."

---

## 7. `/app/a/[id]`: one application (Phase 2 + manual tracking)

Sections, top to bottom (tabs on mobile are fine):

1. **Header:** role @ company (or title), status select, deadline date, link to the job, "Applied on" date (auto-set to today when status first changes to Applied, editable).
2. **The job:** extracted job details (role, company, location, deadline if found, key requirements as a list) and the full description in a collapsible box. **Editable**, plus a "Paste description instead" box if reading failed or was wrong. "Re-read link" button.
3. **The company:** research brief (what they do, products/clients, values, recent news, the team/division, tone of voice) with source links. Optional field "Company website" (pre-filled by research, editable). "Re-research" button.
4. **Generate:** one primary button "Write my CV and cover letter". Disabled with a hint if the master CV is missing ("Add your CV in Profile first") or if no job description exists. Shows remaining generations today ("2 of 3 left today").
5. **Tailored CV:** rendered as a clean one-page CV, editable inline (same schema as master CV). Below: **"What changed"** (bullets) and **"Please check"** flags. Buttons: Download PDF, Regenerate.
6. **Cover letter:** rendered as a letter, editable textarea. Below: **"What I used"** (facts from the company + facts from the profile) and **"Please check"** flags. Buttons: Download PDF, Copy text, Regenerate.
7. **Notes** (free text) and **Delete application**.

Versions: keep only the latest generated CV and letter per application (overwrite on regenerate, but keep the user's manual edits until they regenerate; warn before overwriting edits).

---

## 8. The AI pipeline (Phase 2)

All steps run server-side in Route Handlers under `/api/...`, authenticated with the user's Supabase session (reject if no user), writing results to the DB with that session. Use streaming or progress states so the UI never looks frozen. Set the route segment `maxDuration` as high as the Vercel plan allows (check current Vercel Hobby limits) and keep each step a **separate request** so no single call gets near the timeout.

### Step A: Read job (triggered automatically when a URL is added; also "Re-read")
- Input: `job_url`.
- Use Claude with the **web fetch tool** (`AI_MODEL_FAST`) to load the page and return JSON: `{ company, role, location, deadline (ISO or null), employment_type, description (full text), requirements[], nice_to_haves[], company_website (if visible) , language ("en"|"de"|...) }`.
- If fetch fails or the content is clearly not a job ad (login wall, empty, JS shell): set `job_status = 'failed'` and show the paste fallback. **LinkedIn and Workday pages often fail. That's expected, the fallback handles it.**
- Cost control: Step A doesn't count against the daily limit, but cap it at 20 reads per user per day.

### Step B: Research company (runs right after A succeeds, or on "Re-research")
- Input: company name, role, company_website if known.
- Use Claude (`AI_MODEL_WRITE`) with **web search** (limit to ~3–5 searches) and **web fetch** on the company site.
- Output JSON: `{ website, one_liner, what_they_do, products_or_clients[], values_culture[], recent_news[{headline, date, url}], team_or_division, tone_of_voice, hooks_for_letter[] , sources[] }`. Only include facts found in sources. No guessing.
- Save to `company_brief` (jsonb).

### Step C: Tailor CV (part of "Write my CV and cover letter")
- Input: master CV, job JSON, company brief, profile basics.
- Output: a `MasterCV`-shaped JSON (tailored) + `changes[]` + `flags[]`.
- **Rules (put these in the system prompt, verbatim in spirit):**
  - Use only facts present in the master CV. Never invent employers, roles, dates, numbers, tools, skills, grades or achievements.
  - Allowed: rewrite the summary for this role; reorder sections and bullets; rephrase bullets to use the job's vocabulary **where it truthfully applies**; drop less relevant bullets; reorder skills.
  - If the job asks for something the student doesn't have, don't add it. Mention it in `flags` ("The role asks for SQL; not in your CV. Add it to your master CV if you have it.").
  - Must fit one A4 page (roughly: ≤ 4 roles, ≤ 4 bullets each, ≤ 20 words per bullet).
  - Write in the job ad's language (if German: German CV conventions, e.g. "Berufserfahrung", "Ausbildung").
- Count this as 1 generation against `AI_DAILY_LIMIT`.

### Step D: Write cover letter (same click, after C)
- Input: master CV, story, basics, job JSON, company brief, tailored CV.
- Output JSON: `{ greeting, paragraphs[], closing, sign_off_name, used_company_facts[], used_profile_facts[], flags[] }`.
- **Rules:**
  - 250–350 words, 3–4 paragraphs: why this company (2+ concrete facts from the brief), why this role, proof from experience (1–2 specific stories from CV/story), short close.
  - Every claim about the student must come from the master CV or story. Every claim about the company must come from the brief.
  - Plain, human, direct language. Banned phrases: "I am excited to apply", "I am writing to express my interest", "passionate", "dynamic", "fast-paced environment", "leverage", "synergy", "I believe I would be a great fit". No em dashes (—). No generic flattery.
  - Same language as the job ad. German letters follow Anschreiben conventions (Sehr geehrte Damen und Herren / named contact if found, Mit freundlichen Grüßen).
  - If no contact name is known, use a neutral greeting; never invent a name.

### Limits, errors, cost
- Track runs in an `ai_runs` table; enforce limits server-side by counting the user's rows for today (UTC). Show "You've used today's 3 generations. Back tomorrow." when reached.
- Any AI failure: show a friendly error with "Try again"; never lose user data; never leave the UI stuck in "generating".
- Log token usage per run in `ai_runs` (input/output tokens) so Cora can see cost.
- Cora sets a monthly spend limit in the Anthropic Console. Mention this when she adds the key.

### Download PDF
- Print-styled routes (`/app/a/[id]/print/cv`, `/print/letter`): A4, clean typography, no header/buttons in print. "Download PDF" opens it and calls `window.print()` (user picks "Save as PDF"). Make sure the CV fits one page in Chrome and Safari print.
- (Phase 3 option: real PDF/DOCX files via a library.)

---

## 9. Landing page `/`

Goal: in 5 seconds a stranger knows **what it is, who it's for, what to click**.

1. **Header** (Section 4).
2. **Hero**
   - Headline: **"A tailored CV and cover letter for every internship. Just paste the job link."**
   - Subheadline: "For students applying to 15+ internships. Rookie reads the job, researches the company and writes both from your real experience. Then track every application on one board."
   - **One** primary button: **"Sign up free"** → `/signup`, above the fold on a 375×667 screen.
   - Under it, small: "Already have an account? Log in".
3. **How it works** (3 steps, with simple icons): Paste the job link → We research the company → Get your CV and cover letter, ready to edit.
4. **Product preview:** a static HTML/CSS mock: a pasted link, a small "company brief" card, a CV snippet and a letter snippet side by side, clearly example data ("Analyst Intern @ Example Bank"). Not a screenshot.
5. **Three benefits:**
   - "Hours of tailoring, done in a minute"
   - "Only your real experience. Nothing made up."
   - "Every application tracked in one place"
6. Footer: "Built by Cora Affeld, IE University", GitHub link, privacy line ("Your CV stays private. AI by Anthropic.").

Rules: no lorem ipsum, no fake testimonials or user counts, no hidden text. `<title>` and meta description state the one-liner. Simple favicon.

---

## 10. Sign-up and login forms (Phase 1)

**`/signup`:** email (`type="email"`, `data-testid="signup-email"`), password (`type="password"`, `data-testid="signup-password"`), button "Create account" (`data-testid="signup-submit"`). `supabase.auth.signUp`. Session returned → `/app` (full navigation or `router.push` + `router.refresh()`). User but no session → show "Sign-up needs email confirmation turned off in Supabase" and tell Cora. **Password rules: Supabase default only (min 6). No extra rules.** No name field, no checkbox, no CAPTCHA. Link to login.

**`/login`:** email (`login-email`), password (`login-password`), button "Log in" (`login-submit`). `supabase.auth.signInWithPassword`. Wrong password → stay on `/login`, visible error "Wrong email or password" with `role="alert"`. Success → `/app`. Link to sign-up.

Both: loading state, labels, `autocomplete` (`email`, `new-password`, `current-password`), Enter submits.

---

## 11. Database (Supabase SQL)

**Phase 1 SQL** (give to Cora at Step 3; she pastes it in SQL Editor → New query → Run):

```sql
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 500),
  status text not null default 'interested'
    check (status in ('interested','submitted','assessment','interview','offer','rejected','withdrawn')),
  deadline date,
  submitted_on date,
  assessment_on date,
  interview_on date,
  offer_on date,
  notes text not null default '',
  -- filled by Phase 2 (nullable, safe to have from the start)
  job_url text,
  job_status text not null default 'none' check (job_status in ('none','reading','ready','failed')),
  company text,
  role text,
  location text,
  job jsonb,
  company_brief jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists applications_user_idx on public.applications (user_id, created_at desc);
alter table public.applications enable row level security;

create policy "own applications select" on public.applications for select to authenticated using ((select auth.uid()) = user_id);
create policy "own applications insert" on public.applications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own applications update" on public.applications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own applications delete" on public.applications for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists applications_updated_at on public.applications;
create trigger applications_updated_at before update on public.applications for each row execute function public.set_updated_at();
```

**Phase 2 SQL** (give to Cora when starting Phase 2):

```sql
create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  master_cv jsonb,
  story text not null default '',
  basics jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "own profile insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own profile update" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own profile delete" on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  kind text not null check (kind in ('cv','cover_letter')),
  content jsonb not null,
  meta jsonb not null default '{}'::jsonb,   -- changes, flags, used facts
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, kind)
);
alter table public.documents enable row level security;
create policy "own documents select" on public.documents for select to authenticated using ((select auth.uid()) = user_id);
create policy "own documents insert" on public.documents for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own documents update" on public.documents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own documents delete" on public.documents for delete to authenticated using ((select auth.uid()) = user_id);
drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at before update on public.documents for each row execute function public.set_updated_at();

-- usage log for daily limits; users can read and add their own rows but never edit or delete them
create table if not exists public.ai_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('read_job','research','generate','parse_cv')),
  application_id uuid references public.applications(id) on delete set null,
  input_tokens int, output_tokens int,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists ai_runs_user_day on public.ai_runs (user_id, created_at);
alter table public.ai_runs enable row level security;
create policy "own runs select" on public.ai_runs for select to authenticated using ((select auth.uid()) = user_id);
create policy "own runs insert" on public.ai_runs for insert to authenticated with check ((select auth.uid()) = user_id);
```

Also save both blocks as `supabase/schema-phase1.sql` and `supabase/schema-phase2.sql` in the repo. No policies for `anon` anywhere, so anonymous REST reads return `[]`.

---

## 12. Build order (stop at every ✋)

After each step, give Cora a 1–3 line status: done, next, anything she must do.

### Phase 1: graded core (must be live and passing before Phase 2)
0. **Check the folder:** `CLAUDE.md`, `HANDOVER.md`, `.env.local` with the two Supabase values. If missing, stop and ask. Never print key values in chat.
1. **Scaffold** Next.js into this folder (scaffold to a temp dir and move in if needed; never delete CLAUDE.md, HANDOVER.md, .env.local, *.bak). Install Supabase packages. `.gitignore` covers `.env*.local`, `.env`, `node_modules`, `.next`, `.vercel`, `*.bak`. `git init`, first commit.
2. **Supabase clients + route protection** (browser client, server client, middleware/proxy).
3. ✋ **Phase 1 SQL:** give it to Cora with the click path, wait for "done".
4. **Auth pages + header** with logout.
5. **`/app` board** (Section 5) incl. a basic `/app/a/[id]` page with status, deadline, applied-on, notes, delete (the AI sections come in Phase 2). URL detection can set `job_url` now; the "Read job" trigger is wired in Phase 2.
6. **Landing page** (Section 9). Phase 2 isn't live yet, so it's fine; Cora wants the final pitch from day one.
7. **Local test:** `npm run build` passes; `npm run test:bot` (Section 13) passes on localhost.
8. ✋ **GitHub:** public repo (`gh` if available, otherwise click steps). Verify Public and `git ls-files | grep -i env` shows nothing.
9. ✋ **Vercel:** import repo, add the env vars, deploy, find the short `*.vercel.app` domain in Settings → Domains.
10. ✋ **Supabase URL config:** Authentication → URL Configuration → Site URL + Redirect URLs = the Vercel URL.
11. **Live bot test** against the Vercel URL, then hand Cora the manual checklist (13.2). **Phase 1 is done only when this passes.** Commit and push.

### Phase 2: tailoring
12. ✋ **Anthropic key:** Cora creates one at console.anthropic.com (Settings → API keys), adds credit, **sets a monthly spend limit**. She adds `ANTHROPIC_API_KEY` + the AI_* vars to `.env.local` and to Vercel (then Redeploy).
13. ✋ **Phase 2 SQL.**
14. **Profile page** + master CV extraction (PDF and paste) + story + basics.
15. **Step A: Read job** from link, with paste fallback. Test with 5 real links from different sites (company career page, Greenhouse, Lever, Workday, LinkedIn) and report which work.
16. **Step B: Company research.**
17. **Steps C + D: Generate** CV and cover letter, with limits, flags, editing.
18. **Print/PDF** pages; check one-page fit.
19. **Re-run the bot test** on live. Phase 2 must not have broken anything. Commit and push.

### Phase 3: only if time allows, ask Cora first
- Real PDF/DOCX file export.
- Keep previous versions of documents.
- "Deadlines this week" strip, search.

---

## 13. Testing

### 13.1 Automated bot test (`npm run test:bot`)
Playwright, reads `BASE_URL` (default `http://localhost:3000`) + Supabase env vars. Mirrors the grader:
1. `/` at 1280×800 and 390×844: screenshots to `test-results/`; no horizontal scroll (`scrollWidth <= innerWidth`); visible link/button to `/signup`.
2. Random user (`bot-<rand>@example.com`, `Test-<rand>`): sign up via testids → URL ends `/app`.
3. Type `QA-<rand> grading bot test` in `core-input`, click `core-submit` → a `core-item` with that exact text is visible. Assert **no AI request was made** (no call to `/api/` AI routes).
4. Click `logout`. New browser context → `/login` → wrong password → still on `/login`, alert visible → right password → `/app`, item visible.
5. New context, sign up user 2 → no `core-item` contains user 1's text.
6. No session: `GET ${SUPABASE_URL}/rest/v1/<table>?select=*` with only the publishable key for **every** table (`applications`, `profiles`, `documents`, `ai_runs`) → `[]` or an error, never rows.
7. No session on `/app`, `/profile` → redirected to `/login`.
8. `logout` visible on `/`, `/app`, `/profile`, `/login`, `/signup` while logged in.
9. Paste a URL into `core-input` → item appears immediately with the URL text in it (AI may still be running).

Mention to Cora that test users accumulate in Supabase → Authentication → Users; she can delete them before inviting classmates.

### 13.2 Manual checklist for Cora (live URL)
- [ ] Incognito: no Vercel login; in 5 seconds it's clear what it is, who it's for, what to click.
- [ ] `/signup` with a new email → lands on `/app` immediately.
- [ ] Type only "test 1" → it appears.
- [ ] Log out. Different browser → wrong password refused → right password → "test 1" still there.
- [ ] Second account can't see "test 1".
- [ ] Phone: readable, nothing scrolls sideways.
- [ ] (Phase 2) Paste a real job link → role and company appear → research shows real facts with sources → generate → CV has nothing invented, letter mentions real company facts → PDF is one page.

Before declaring each phase done: go through every rule in `CLAUDE.md` and confirm it in the code, as a checklist.

---

## 14. Out of scope (don't build)
- Reading Gmail/Outlook or any email integration. Tracking is manual.
- Google/GitHub/magic-link login.
- Sharing between users, public profiles, admin pages, analytics/tracking scripts.
- Storing uploaded files (PDF CVs are parsed and discarded).
- Auto-applying to jobs or submitting anything on the user's behalf.
- Importing Cora's old board data.

---

## 15. After launch (for Cora)

**Real users:** send the link to 5+ classmates in recruiting season (and the DACH Society), watch 2 use it cold, fix what confuses them, landing headline first. Commit and push after each fix. Watch AI spend in the Anthropic Console.

**After the deadline:** don't push, don't delete the Vercel project, open the app every few days so Supabase doesn't pause.

**Socratista summary draft:**
```
Name: Rookie
One-liner (max 20 words): Rookie turns a job link into a CV and cover letter tailored to that company, and tracks every application.
Who it's for: Business and tech students in internship season applying to 15+ roles at once.
The problem and how often it happens: Tailoring a CV and cover letter properly takes 1–2 hours per application, so students either lose weekends or send generic applications, then lose track of what they sent where. [Interview result: e.g. "5 of 5 classmates tailored or skipped tailoring an application in the last week; average annoyance 4.4/5"]. In recruiting season this happens every week.
Main feature (what a user does in 30 seconds): Paste a job link; Rookie reads the job and researches the company, then writes a tailored CV and cover letter from your real experience. Track the application on your board.
Data shared between users: no
Real users so far (how many, and how you got them): [number] — [how]
```

---

## 16. Done means
- Phase 1: `npm run build` passes; `npm run test:bot` passes on the **live** URL; repo public with no secrets; short `*.vercel.app` URL opens in incognito; Cora ticked 13.2.
- Phase 2: the same bot test still passes; a real job link produces a CV with nothing invented and a letter with real company facts; limits work; no AI key or AI call reachable from the browser (`grep -r ANTHROPIC src/app src/components` finds nothing outside server files).
