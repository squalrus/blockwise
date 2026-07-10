"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountType } from "@blockwise/types";
import { signInWithGoogle, signUp } from "@/lib/auth";

type Status = { state: "idle" | "submitting" | "error"; message?: string };

export default function SignupPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("consumer");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "submitting" });

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const user = await signUp(email, password, accountType);
      router.push(user.account_type === "business" ? "/business" : "/");
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Signup failed" });
    }
  }

  async function handleGoogleSignIn() {
    setStatus({ state: "submitting" });
    try {
      await signInWithGoogle(accountType);
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Google sign-in failed" });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 font-sans sm:p-16">
      <h1 className="font-heading text-xl font-extrabold text-foreground">Sign up</h1>

      <div className="flex gap-2 text-sm">
        {(["consumer", "business"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setAccountType(type)}
            className={`rounded-full px-3 py-1 font-bold ${
              accountType === type
                ? "bg-brand-purple text-on-accent"
                : "border-2 border-foreground text-foreground"
            }`}
          >
            {type === "consumer" ? "I'm a customer" : "I own a business"}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={status.state === "submitting"}
        className="rounded-md border border-border px-3 py-2 text-sm font-bold text-foreground disabled:opacity-50 hover:bg-card-alt"
      >
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs text-muted">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Password"
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
        />

        <button
          type="submit"
          disabled={status.state === "submitting"}
          className="self-start rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent disabled:opacity-50"
        >
          {status.state === "submitting" ? "Signing up…" : "Sign up"}
        </button>

        {status.state === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
        )}
      </form>

      <p className="text-sm text-muted">
        Already have an account?{" "}
        <a href="/login" className="font-bold text-brand-purple hover:text-brand-orange">
          Log in
        </a>
      </p>
    </div>
  );
}
