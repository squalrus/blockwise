"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Marketing content lives at tryspored.com (apps/marketing) now -- this app
// is app.tryspored.com only, so "/" just routes to somewhere actionable.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    getCurrentUser().then((user) => {
      router.replace(user ? "/account" : "/login");
    });
  }, [router]);

  return null;
}
