import Link from "next/link";
import { MushroomLogo } from "@blockwise/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 p-4 text-center font-sans sm:p-16">
      <MushroomLogo size={64} capColor="var(--brand-orange)" />
      <h1 className="font-heading text-2xl font-extrabold">Page not found</h1>
      <p className="text-sm text-muted">
        We looked around but couldn&apos;t find what you were after. It may have moved, or never existed.
      </p>
      <Link
        href="/"
        className="mt-1 rounded-full bg-brand-orange px-4 py-2 text-sm font-extrabold text-on-accent"
      >
        Back to home
      </Link>
    </div>
  );
}
