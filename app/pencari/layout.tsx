import { redirect } from "next/navigation";
import { currentAccount } from "../lib/auth-server";
import PencariDraftGate from "../components/pencari-draft-gate";
import "./seeker-navigation.css";

export default async function PencariLayout({ children }: { children: React.ReactNode }) {
  const user = await currentAccount();
  if (!user) redirect("/login?returnTo=/pencari");
  if (user?.role === "pemilik") redirect("/owner");
  return <PencariDraftGate>{children}</PencariDraftGate>;
}
