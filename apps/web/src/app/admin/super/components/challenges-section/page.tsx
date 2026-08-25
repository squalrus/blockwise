import { ChallengesSection } from "../../../../profile/[username]/ChallengesSection";
import { USER_CHALLENGES } from "../demoData";

export default function ChallengesSectionDemoPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Challenges section</h1>
        <p className="mt-1 text-sm text-muted">ChallengesSection states, as rendered on /profile/[username].</p>
      </div>

      {USER_CHALLENGES.map(({ label, challenges }) => (
        <div key={label} className="flex flex-col gap-2">
          <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</p>
          <ChallengesSection challenges={challenges} />
        </div>
      ))}
    </section>
  );
}
