import { marketplaceRecommendations } from "../../lib/marketplace-store";
import { apiError, json } from "../../lib/marketplace-api";
import { currentAccount } from "../../lib/auth-server";
export async function GET() {
  try {
  const account = await currentAccount();
  return json({ listings: await marketplaceRecommendations({}, account?.role === "pencari" ? account.id : undefined) });
  } catch(error) { return apiError(error); }
}
