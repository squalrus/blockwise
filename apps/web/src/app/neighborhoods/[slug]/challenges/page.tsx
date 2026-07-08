import { ChallengesView } from "../ChallengesView";

// BACKLOG.md Ref 44: Challenges tab.
export default async function NeighborhoodChallengesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ChallengesView neighborhoodSlug={slug} />;
}
