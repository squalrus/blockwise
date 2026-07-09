import packageJson from "../../package.json";

// BACKLOG.md "Add version number to footer": helps support staff and users
// debug by immediately seeing which version they're running.
export function Footer() {
  return (
    <footer className="mt-auto px-6 py-3 text-center text-xs text-muted">
      Spored v{packageJson.version}
    </footer>
  );
}
