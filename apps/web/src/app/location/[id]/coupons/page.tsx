import type { Metadata } from "next";
import { CouponsSection } from "../CouponsSection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { alternates: { canonical: `/location/${id}/coupons` } };
}

// Coupons tab (BACKLOG.md Ref 101 redesign), business-kind only -- fully
// client-fetched by CouponsSection since claim/eligibility state is
// per-viewer and this server component has no auth context.
export default async function LocationCouponsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CouponsSection venueId={id} emptyMessage="No coupons available." />;
}
