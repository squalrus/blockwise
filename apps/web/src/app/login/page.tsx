"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleIcon, MushroomLoader } from "@blockwise/ui";
import { getCurrentUser, logIn, signInWithGoogle } from "@/lib/auth";

type Status = { state: "idle" | "submitting" | "error"; message?: string };

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ state: "idle" });
  // Already-signed-in visitors who land here (a stale bookmark, the back
  // button) get bounced straight to /account instead of seeing a login form
  // for an account they're already in.
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
      await logIn(email, password);
      router.push("/account");
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Login failed" });
    }
  }

  async function handleGoogleSignIn() {
    setStatus({ state: "submitting" });
    try {
      await signInWithGoogle();
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
      <h1 className="font-heading text-xl font-extrabold text-foreground">Log in</h1>

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
          placeholder="Password"
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
        />

        <button
          type="submit"
          disabled={status.state === "submitting"}
          className="self-start rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent disabled:opacity-50"
        >
          {status.state === "submitting" ? "Logging in…" : "Log in"}
        </button>

        {status.state === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
        )}
      </form>

      <p className="text-sm text-muted">
        No account yet?{" "}
        <a href="/signup" className="font-bold text-brand-purple hover:text-brand-orange">
          Sign up
        </a>
      </p>
    </div>
  );
}
