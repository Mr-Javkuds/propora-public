import { notFound } from "next/navigation";
import PropertyAnalysis from "../../../../components/property-analysis";

export default async function ResultsAnalysisPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  if (!/^\d+$/.test(listingId) || !Number.isSafeInteger(Number(listingId)) || Number(listingId) < 1) notFound();
  return <PropertyAnalysis key={listingId} listingId={listingId} />;
}
