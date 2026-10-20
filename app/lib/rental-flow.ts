import type { Application } from "./marketplace-types";

export function activeApplication(items: Application[], listingId: number) {
  return items.find(item => item.listingId === listingId && (item.status === "pending" || item.status === "approved")) ?? null;
}
