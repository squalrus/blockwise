import type { Metadata } from "next";
import { ChallengesView } from "../ChallengesView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { alternates: { canonical: `/neighborhoods/${slug}/challenges` } };
}

export default async function NeighborhoodChallengesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <ChallengesView neighborhoodSlug={slug} />;
}
