import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy · Rookie" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[680px] pt-6">
      <p className="cap">Privacy</p>
      <h1 className="mt-2 text-[36px] font-semibold leading-tight tracking-tight">Your data stays yours.</h1>
      <div className="mt-6 grid gap-5 text-[16px] leading-relaxed text-[var(--ink2)]">
        <p>
          {site.name} is a student project. It stores only what you
          need to track your applications.
        </p>
        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">What we store</h2>
          <ul className="mt-2 list-disc pl-5">
            <li>Your email address and a securely hashed password (handled by Supabase Auth).</li>
            <li>
              If you sign in with Google: your name, email address and profile picture from your Google account. Rookie
              never sees your Google password.
            </li>
            <li>The applications you add: title, job link, company, role, location, dates, status and notes.</li>
            <li>Your profile, if you add one: your experience, education, skills and other details, your story points, your barriers, any AI memory you paste in, and contact details. An uploaded CV file is read once and never stored; only the text you keep is saved.</li>
            <li>The AI analyses, comparisons, CVs and cover letters Rookie writes for you.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">AI (Google Gemini)</h2>
          <p className="mt-2">
            When you add a job link, compare roles or ask for a CV and cover letter, Rookie sends the job link or text and
            your profile to Google&apos;s Gemini API to do the work. This only happens when you use those features. Under
            Google&apos;s Gemini API terms, for users in the EU, EEA, Switzerland and the UK, Google doesn&apos;t use this
            content to improve its products. The AI key stays on our server and never reaches your browser.
          </p>
          <p className="mt-2">
            If you paste an email from a company, Rookie sends that email text to Gemini once to read what changed. The email
            itself is not saved; only the update you choose to apply is.
          </p>
          <p className="mt-2">
            If you connect Gmail, Rookie gets read-only access: it can&apos;t send, change or delete anything. When you press
            &quot;Check emails&quot;, it searches only for recent emails mentioning companies you applied to and sends those to
            Gemini to read what changed. The emails aren&apos;t stored; Rookie keeps only the suggested update until you
            apply or delete it. Disconnect any time on your Profile, or in your Google account under Security.
          </p>
          <p className="mt-2">
            When you ask Rookie a question in the chat, your question, the conversation so far and a summary of your
            board and profile go to Gemini to answer it. Chats aren&apos;t saved: they stay in your browser tab until you
            close it or press Clear.
          </p>
          <p className="mt-2">
            AI can be wrong. Rookie only uses facts from your CV, but always read your documents before you send them.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">Who can see it</h2>
          <p className="mt-2">
            Only you. Every row in the database is locked to your account, so other users and visitors who aren&apos;t
            logged in can&apos;t read it. Data is stored with Supabase in the EU.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">What we don&apos;t do</h2>
          <p className="mt-2">No ads, no tracking scripts, no selling or sharing your data. Please don&apos;t store ID, passport or bank details in your notes.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">Deleting your data</h2>
          <p className="mt-2">
            You can delete your account and everything in it at any time from your Profile page. It&apos;s removed
            immediately.
          </p>
        </section>
      </div>
    </main>
  );
}
