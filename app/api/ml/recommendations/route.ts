import { NextRequest, NextResponse } from "next/server";
import {
  type MlRecommendationRequest,
} from "../../../lib/propora-ml-demo";
import { accountMlContext, marketplaceRecommendations } from "../../../lib/marketplace-store";
import { modelVersion } from "../../../lib/ml/inference.mjs";
import { currentAccount } from "../../../lib/auth-server";
import { apiError, readInput } from "../../../lib/marketplace-api";

const buildResponse = async (body: MlRecommendationRequest = {}) => {
  const account = await currentAccount();
  const filters = { ...await accountMlContext(account), ...body };
  const recommendations = await marketplaceRecommendations(filters, account?.role === "pencari" ? account.id : undefined);

  return NextResponse.json({
    model: modelVersion,
    target: "propora_score",
    claim_status: "business_recommendation_decision_support",
    revoked_features: [
      "kelayakan investasi",
      "risiko arus kas",
      "perbandingan pembiayaan",
    ],
    center: filters.center ?? null,
    radiusMeters: filters.radiusMeters ?? null,
    source: "database",
    signalSource: "stored_model_reference_proxy",
    recommendations,
  }, { headers: { "Cache-Control": "no-store" } });
};

export async function GET() {
  try { return await buildResponse(); } catch(error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try { return await buildResponse(await readInput(request) as MlRecommendationRequest); }
  catch (error) { return apiError(error); }
}
