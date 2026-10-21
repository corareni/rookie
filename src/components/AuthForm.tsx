"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";

type Mode = "signup" | "login";

const copy = {
  signup: {
    title: "Create your board",
    sub: "Free. Continue with Google, or use an email and password.",
    button: "Create account",
    busy: "Creating account…",
    switchText: "Already have an account?",
    switchLink: "/login",
    switchLabel: "Log in",
  },
  login: {
    title: "Welcome back",
    sub: "Log in to see your applications.",
    button: "Log in",
    busy: "Logging in…",
    switchText: "New here?",
    switchLink: "/signup",
    switchLabel: "Create an account",
  },
};

export default function AuthForm({
  mode,
  signedInAs,
  googleError = false,
}: {
  mode: Mode;
  signedInAs: string | null;
  /** Set when Google sign-in came back without a session. */
  googleError?: boolean;
}) {
  const t = copy[mode];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    googleError ? "Google sign-in didn't finish. Please try again, or use your email and password." : null,
  );
  const [google, setGoogle] = useState(false);
  const [busy, setBusy] = useState(false);
  // Fields stay disabled until hydration, so nothing typed early gets lost.
  const ready = useHydrated();

  async function withGoogle() {
    setError(null);
    setGoogle(true);
    // Check first: if Google isn't switched on in Supabase, its redirect would end on a raw error page.
    const on = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
    })
      .then((r) => r.json())
      .then((d) => d?.external?.google === true)
      .catch(() => true);
    if (!on) {
      setError("Google sign-in isn't switched on yet. Please use your email and password for now.");
      setGoogle(false);
      return;
    }
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?from=${mode}` },
    });
    // On success the browser is already on its way to Google.
    if (error) {
      setError(error.message);
      setGoogle(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Read what's actually in the fields, in case they were filled before React took over.
    const form = new FormData(e.currentTarget);
    const emailValue = String(form.get("email") ?? email).trim();
    const passwordValue = String(form.get("password") ?? password);
    setError(null);
    setBusy(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email: emailValue, password: passwordValue });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      if (!data.session) {
        setError("Account created, but sign-up needs email confirmation turned off in Supabase.");
        setBusy(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: emailValue, password: passwordValue });
      if (error) {
        setError("Wrong email or password.");
        setBusy(false);
        return;
      }
    }
    // Full navigation so the server sees the new session cookie.
    window.location.assign("/app");
  }

  return (
    <main className="puzzle lg:min-h-[calc(100vh-150px)]">
      <section className="tile span-5 flex flex-col justify-center !py-10 lg:!px-12" aria-labelledby="auth-h">
        <span className="chip-tag self-start">{mode === "signup" ? "Free for students" : "Welcome back"}</span>
        <h1 id="auth-h" className="mt-5 text-[clamp(32px,3.4vw,44px)] leading-[1.05] tracking-[-0.035em]">
          {t.title.split(" ")[0]} <span className="font-light">{t.title.split(" ").slice(1).join(" ")}</span>
        </h1>
        <p className="mt-2 text-[var(--ink2)]">{t.sub}</p>

        {signedInAs && (
          <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm">
            You&apos;re signed in as <strong className="break-anywhere">{signedInAs}</strong>.{" "}
            <Link href="/app">Go to your board</Link>
          </p>
        )}

        <button
          type="button"
          className="btn btn-ghost btn-lg mt-6 w-full gap-3 !bg-white"
          disabled={google || busy || !ready}
          onClick={withGoogle}
        >
          <GoogleLogo />
          {google ? "Opening Google…" : mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
        </button>
        <p className="mt-5 flex items-center gap-3 text-[12px] uppercase tracking-[0.12em] text-[var(--mute)]" aria-hidden="true">
          <span className="h-px flex-1 bg-[var(--line)]" />
          or with email
          <span className="h-px flex-1 bg-[var(--line)]" />
        </p>

        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <div>
            <label htmlFor={`${mode}-email`} className="label">
              Email
            </label>
            <input
              id={`${mode}-email`}
              data-testid={`${mode}-email`}
              className="field"
              type="email"
              autoComplete="email"
              required
              name="email"
              disabled={!ready}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`${mode}-password`} className="label">
              Password
            </label>
            <input
              id={`${mode}-password`}
              data-testid={`${mode}-password`}
              className="field"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6}
              required
              name="password"
              disabled={!ready}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === "signup" && <p className="mt-1.5 text-xs text-[var(--mute)]">At least 6 characters.</p>}
          </div>

          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}

          <button data-testid={`${mode}-submit`} type="submit" className="btn btn-lg w-full" disabled={busy || !ready}>
            {busy ? t.busy : t.button}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--ink2)]">
          {t.switchText} <Link href={t.switchLink} className="font-semibold">{t.switchLabel}</Link>
        </p>
      </section>

      <AuthArt />
    </main>
  );
}

/** Google's "G", as its sign-in branding asks for. */
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" className="flex-none">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Decorative patchwork next to the form: pastel tiles with softly drifting circles. */
function AuthArt() {
  return (
    <div className="span-7 grid grid-cols-6 gap-[var(--gap)] max-lg:hidden" aria-hidden="true">
      <div className="tile tile-lilac drift-host relative col-span-4 row-span-2 flex flex-col justify-end overflow-hidden">
        <span className="drift drift-1 bg-white/60" />
        <span className="drift drift-3 bg-[var(--mint)]" />
        <span className="drift drift-2 bg-[var(--sky)]" />
        <p className="relative text-[clamp(34px,3.6vw,52px)] leading-[1.02] tracking-[-0.035em]">
          Every application. <span className="font-light">One clear board.</span>
        </p>
      </div>
      <div className="tile tile-peach drift-host relative col-span-2 overflow-hidden">
        <span className="drift drift-3 bg-white/60" />
        <p className="relative text-[13px] uppercase tracking-[0.12em] text-[var(--ink2)]">Your chance</p>
        <p className="relative mt-2 text-[56px] font-bold leading-none tracking-[-0.04em]">
          8<span className="text-[20px] font-light">/10</span>
        </p>
      </div>
      <div className="tile tile-mint drift-host relative col-span-2 overflow-hidden">
        <span className="drift drift-4 bg-white/60" />
        <p className="relative text-[15px] leading-snug">
          <b>CV and Cover Letter</b>
          <br />
          <span className="font-light">tailored, one page</span>
        </p>
        <p className="relative mt-4 flex gap-1.5">
          <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold">↓ PDF</span>
          <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold">↓ Word</span>
        </p>
      </div>
      <div className="tile tile-sky drift-host relative col-span-3 overflow-hidden">
        <span className="drift drift-5 bg-[var(--lilac)]" />
        <p className="relative text-[15px]">
          <b>Interested</b> <span className="font-light">→ Submitted → Interview →</span> <b>Offer</b>
        </p>
      </div>
      <div className="tile tile-butter drift-host relative col-span-3 overflow-hidden">
        <span className="drift drift-6 bg-[var(--peach)]" />
        <p className="relative text-[15px]">
          <b>Honest scores.</b> <span className="font-light">No sugar-coating.</span>
        </p>
      </div>
    </div>
  );
}
