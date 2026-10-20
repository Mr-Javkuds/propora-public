import { redirect } from "next/navigation";

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ listingId?: string }> }) {
  const { listingId } = await searchParams;
  redirect(listingId && /^\d+$/.test(listingId) ? `/pencari/chat?listingId=${encodeURIComponent(listingId)}` : "/pencari/chat");
}
