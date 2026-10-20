export type ListingStatus = "draft" | "available" | "reserved" | "rented";
export type SurveyStatus = "pending" | "confirmed" | "rejected" | "cancelled";
export type ApplicationStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type Listing = {
  id: number; ownerId: string | null; ownerEmail: string | null;
  name: string; address: string; price: number; latitude: number; longitude: number;
  area: number; image: string; facilities: string[]; description: string;
  status: ListingStatus; createdAt: string; updatedAt: string; demo: boolean;
  mlStatus: "ready" | "pending";
  analysis: { modelVersion: string; analyzedAt: string; score: number; potentialLabel: string; dataQuality: string } | null;
};
export type Survey = {
  listingDemo: boolean;
  id: string; listingId: number; seekerId: string; seekerEmail: string;
  listingName: string; date: string; time: string; visitors: number; note: string;
  status: SurveyStatus; ownerNote: string; createdAt: string; updatedAt: string;
};
export type PaymentReceipt = { id: string; time: string; method: "va" | "qris" | "wallet"; amount: number };
export type Application = {
  listingDemo: boolean;
  payment: PaymentReceipt | null;
  id: string; listingId: number; seekerId: string; seekerEmail: string;
  listingName: string; address: string; image: string; ownerEmail: string;
  listingStatus: ListingStatus; listingPrice: number; offer: number; startDate: string; duration: number;
  tenant: { fullName: string; phone: string; email: string; businessName: string; businessType: string };
  proposal: string; status: ApplicationStatus; ownerNote: string; createdAt: string; updatedAt: string;
};
export type Message = { id: number; listingId: number; seekerId: string; senderId: string; senderRole: "pencari" | "pemilik"; text: string; createdAt: string };
export const listingLabels = { draft: "Draft", available: "Tersedia", reserved: "Dipesan", rented: "Disewa" };
export const surveyLabels = { pending: "Menunggu konfirmasi", confirmed: "Dikonfirmasi", rejected: "Ditolak", cancelled: "Dibatalkan" };
export const applicationLabels = { pending: "Menunggu persetujuan", approved: "Disetujui pemilik", rejected: "Ditolak", withdrawn: "Dibatalkan" };
