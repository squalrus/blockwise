"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logIn, signInWithGoogle } from "@/lib/auth";

type Status = { state: "idle" | "submitting" | "error"; message?: string };

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "submitting" });

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const user = await logIn(email, password);
      router.push(user.account_type === "business" ? "/business" : "/");
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

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-16 font-sans">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Log in</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
        />

        <button
          type="submit"
          disabled={status.state === "submitting"}
          className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {status.state === "submitting" ? "Logging in…" : "Log in"}
        </button>

        {status.state === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
        )}
      </form>

      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
        or
        <div className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={status.state === "submitting"}
        className="rounded-md border border-black/[.08] px-3 py-2 text-sm font-medium text-black disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50"
      >
        Continue with Google
      </button>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No account yet?{" "}
        <a href="/signup" className="underline">
          Sign up
        </a>
      </p>
    </div>
  );
}
