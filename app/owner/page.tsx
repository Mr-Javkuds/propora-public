import OwnerWorkspace from "../components/owner-workspace";
export default async function OwnerPage({searchParams}:{searchParams:Promise<{view?:string;listingId?:string}>}) {
  const {view,listingId}=await searchParams;
  const id = listingId && /^[1-9]\d*$/.test(listingId) && Number.isSafeInteger(Number(listingId)) ? Number(listingId) : undefined;
  return <OwnerWorkspace initialListingId={id} initialView={view && ["listings","applications","surveys","messages","payments"].includes(view) ? view : "listings"} />;
}
