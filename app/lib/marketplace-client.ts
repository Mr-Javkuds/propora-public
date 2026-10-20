export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options, headers: { ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...options?.headers } });
  const raw = await response.text();
  let data: unknown;
  try { data = raw.trim() ? JSON.parse(raw) : undefined; }
  catch {
    // Proxies and failed server requests can return HTML or truncated JSON.
    // Never show the raw response, which may contain internal server details.
    throw new Error(response.status === 413
      ? "Ukuran unggahan terlalu besar. Pilih foto maksimal 5 MB."
      : "Respons server tidak valid. Silakan coba lagi.");
  }
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data ? (data as { error: unknown }).error : undefined;
    throw new Error(typeof message === "string" && message.trim() ? message : response.status === 413
      ? "Ukuran unggahan terlalu besar. Pilih foto maksimal 5 MB."
      : response.status === 401 ? "Sesi berakhir. Silakan masuk kembali."
      : "Permintaan gagal diproses. Silakan coba lagi.");
  }
  if (data === undefined || data === null) throw new Error("Server mengirim respons kosong. Silakan coba lagi.");
  return data as T;
}
export const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

// Keep saved analysis notes consistent with the current interface wording.
export function predictionNote(note: string | undefined) {
  return note
    ?.replace(/dataset referensi\/proxy/gi, "data pendukung")
    .replace(/model referensi\/proxy/gi, "prediksi AI");
}
