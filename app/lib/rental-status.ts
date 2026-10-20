import type { Application } from "./marketplace-types";
export function rentalStatusLabel(application: Application) {
  if(application.status==="approved") {
    if(application.payment)return "Lunas";
    return application.listingStatus==="rented" ? "Sedang disewa" : "Disetujui · Menunggu pembayaran";
  }
  return {pending:"Menunggu persetujuan pemilik",rejected:"Ditolak pemilik",withdrawn:"Dibatalkan"}[application.status];
}
