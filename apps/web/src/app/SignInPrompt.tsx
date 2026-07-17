// Shared "you need an account for this" prompt (BACKLOG.md Ref 86:
// unauthenticated visitors can browse everything, but every interactive
// action needs a real signed-in account). Stays inline wherever the
// signed-out visitor already was, rather than redirecting them away from
// what they were browsing.
export function SignInPrompt({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted">
      <a href="/login" className="font-bold text-brand-purple hover:text-brand-orange">
        Log in
      </a>{" "}
      {message}
    </p>
  );
}
