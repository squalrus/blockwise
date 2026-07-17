"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { completeSignInRedirect } from "@/lib/auth";

type Status = { state: "loading" | "error"; message?: string };

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    completeSignInRedirect()
      .then(() => {
        router.replace("/account");
      })
      .catch((err) => {
        setStatus({ state: "error", message: err instanceof Error ? err.message : "Sign-in failed" });
      });
  }, [router]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 font-sans sm:p-16">
      {status.state === "loading" ? (
        <p className="text-sm text-muted">Signing you in…</p>
      ) : (
        <>
          <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
          <a href="/login" className="text-sm font-bold text-brand-purple hover:text-brand-orange">
            Back to log in
          </a>
        </>
      )}
    </div>
  );
}
