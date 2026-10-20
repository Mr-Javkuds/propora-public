import { redirect } from "next/navigation";
import { currentAccount } from "../../lib/auth-server";

export default async function BookingLayout({ children }: { children: React.ReactNode }) {
  const user = await currentAccount();
  if (!user) redirect("/login?returnTo=%2Fpencari%2Fbooking");
  if (user.role !== "pencari") redirect("/owner");
  return children;
}
