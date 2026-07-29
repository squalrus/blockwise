import packageJson from "../../package.json";

// BACKLOG.md "Add version number to footer": helps support staff and users
// debug by immediately seeing which version they're running.
//
// BETA tag: remove this (and the matching ones in both admin sidebar
// layouts and MarketingNav.tsx) once v1.0.0 ships.
export function Footer() {
  return (
    <footer className="mt-auto px-6 py-3 text-center text-xs text-muted">
      Spored{" "}
      <a href="/changelog" className="hover:text-foreground">
        v{packageJson.version}
      </a>{" "}
      · BETA
    </footer>
  );
}
