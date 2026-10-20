import type { Application, PaymentReceipt } from "./marketplace-types";

export const paymentMethods: Record<PaymentReceipt["method"],string> = {va:"Virtual account",qris:"QRIS",wallet:"Dompet digital"};
export function paymentRecords(applications: Application[]) {
  return applications.filter((item): item is Application & {payment:PaymentReceipt}=>item.payment!==null)
    .toSorted((a,b)=>b.payment.time.localeCompare(a.payment.time));
}
// Derived anniversary only; a signed contract may use different end-date terms.
export function estimatedLeaseBoundary(startDate:string,duration:number) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isInteger(duration) || duration<1)return null;
  const [year,month,day]=startDate.split("-").map(Number);
  const start=new Date(Date.UTC(year,month-1,day));
  if(start.getUTCFullYear()!==year || start.getUTCMonth()!==month-1 || start.getUTCDate()!==day)return null;
  const lastDay=new Date(Date.UTC(year+duration,month,0)).getUTCDate();
  return `${year+duration}-${String(month).padStart(2,"0")}-${String(Math.min(day,lastDay)).padStart(2,"0")}`;
}
export function rentalDate(value:string, locale="id") {
  const date=new Date(value.length===10 ? `${value}T12:00:00+07:00` : value);
  const intlLocale=locale==="en" ? "en-US" : locale==="zh" ? "zh-CN" : "id-ID";
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(intlLocale,{dateStyle:"long",timeZone:"Asia/Jakarta",...(value.length===10 ? {} : {timeStyle:"short"})}).format(date)+(value.length===10 ? "" : " WIB") : "Belum tersedia";
}
export function rentalYears(value:number, locale="id") {
  return locale==="zh" ? `${value} 年` : locale==="en" ? `${value} ${value===1 ? "year" : "years"}` : `${value} tahun`;
}
