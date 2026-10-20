import { api } from "./marketplace-client";
import { recommendationContext } from "./ml/context";
export function localMlContext() { return recommendationContext(JSON.parse(localStorage.getItem("proporaWizardData") || "{}")); }
export function mlContextQuery() { return new URLSearchParams(localMlContext()).toString(); }
export const pencariKeys = ["proporaWizardData", "proporaAreaSearch", "proporaCompareIds", "compareProperties"] as const;
export function pencariSnapshot() {
  return Object.fromEntries(pencariKeys.map(key => [key, JSON.parse(localStorage.getItem(key) || "null")]));
}
export async function persistPencariDraft() {
  const { user } = await api<{ user: { id: string; role: string } | null }>("/api/auth/session");
  if (user?.role === "pencari") {
    await api("/api/pencari/wizard", { method: "PUT", body: JSON.stringify(pencariSnapshot()) });
  } else sessionStorage.setItem("proporaGuestDraft", "true");
}
