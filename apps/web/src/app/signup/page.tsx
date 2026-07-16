"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleIcon, MushroomLoader } from "@blockwise/ui";
import { getCurrentUser, signInWithGoogle, signUp } from "@/lib/auth";

type Status = { state: "idle" | "submitting" | "error"; message?: string };

// Every signup creates a consumer account -- a business owner claims their
// venue afterward (BACKLOG.md), which promotes the account to "business"
// (apps/api/src/auth/auth.ts's promoteToBusiness) rather than picking a
// type up front here.
export default function SignupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ state: "idle" });
  // Already-signed-in visitors who land here get bounced straight to
  // /account instead of seeing a signup form for an account they already
  // have (mirrors /login's own check).
  const [authCheck, setAuthCheck] = useState<"checking" | "signed_out" | "redirecting">("checking");

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((user) => {
      if (cancelled) return;
      if (user) {
        setAuthCheck("redirecting");
        router.replace("/account");
      } else {
        setAuthCheck("signed_out");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "submitting" });

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const user = await signUp(email, password, "consumer");
      router.push(user.account_type === "business" ? "/admin" : "/");
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Signup failed" });
    }
  }

  async function handleGoogleSignIn() {
    setStatus({ state: "submitting" });
    try {
      await signInWithGoogle("consumer");
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Google sign-in failed" });
    }
  }

  if (authCheck !== "signed_out") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <MushroomLoader size={72} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 font-sans sm:p-16">
      <h1 className="font-heading text-xl font-extrabold text-foreground">Sign up</h1>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={status.state === "submitting"}
        className="flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-bold text-foreground disabled:opacity-50 hover:bg-card-alt"
      >
        <GoogleIcon />
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
