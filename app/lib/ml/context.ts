export function recommendationContext(input: unknown) {
  const draft = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const pencari = (draft.proporaWizardData ?? draft) as Record<string, unknown>;
  const source = String(pencari?.businessType ?? "").toLowerCase();
  const sub = String(pencari?.subCategory ?? "").toLowerCase();
  const businessType = source.includes("laundry") ? "laundry" : source.includes("barber") ? "barbershop" : source.includes("skincare") ? "retail-skincare" : source.includes("minimarket") || source.includes("retail") ? "minimarket" : !source || source.includes("cafe") || source.includes("kafe") || source.includes("kopi") ? "fnb-cafe" : "unsupported";
  const trendKeyword = sub.includes("matcha") ? "matcha" : sub.includes("taro") ? "taro" : sub.includes("boba") ? "boba" : sub.includes("kopi") || sub.includes("coffee") ? "kopi" : businessType === "laundry" ? "laundry-kiloan" : businessType === "barbershop" ? "haircut" : businessType === "minimarket" ? "snack-minuman" : "kopi";
  return { businessType, ...(businessType === "unsupported" || businessType === "retail-skincare" ? {} : { trendKeyword }) };
}
