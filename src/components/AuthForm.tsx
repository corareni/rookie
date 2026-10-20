"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";

type Mode = "signup" | "login";

const copy = {
  signup: {
    title: "Create your board",
    sub: "Free. Email and password, nothing else.",
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

export default function AuthForm({ mode, signedInAs }: { mode: Mode; signedInAs: string | null }) {
  const t = copy[mode];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Fields stay disabled until hydration, so nothing typed early gets lost.
  const ready = useHydrated();

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
    <main className="mx-auto max-w-[420px] pt-10 sm:pt-16">
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">{t.title}</h1>
      <p className="mt-2 text-[var(--ink2)]">{t.sub}</p>

      {signedInAs && (
        <p className="mt-4 rounded-2xl bg-[var(--card2)] px-4 py-3 text-sm">
          You&apos;re signed in as <strong className="break-anywhere">{signedInAs}</strong>.{" "}
          <Link href="/app">Go to your board</Link>
        </p>
      )}

      <form onSubmit={onSubmit} className="card mt-6 grid gap-4">
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
    </main>
  );
}
