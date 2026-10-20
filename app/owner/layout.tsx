import { redirect } from "next/navigation";
import { currentAccount } from "../lib/auth-server";
import { roleHome } from "../lib/auth-policy";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await currentAccount();
  if (!user) redirect("/login?returnTo=%2Fowner");
  if (user.role !== "pemilik") redirect(roleHome(user.role));
  return children;
}
