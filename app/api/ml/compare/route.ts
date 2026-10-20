import { NextRequest } from "next/server";
import {
  type MlRecommendationRequest,
} from "../../../lib/propora-ml-demo";
import { accountMlContext, marketplaceRecommendations } from "../../../lib/marketplace-store";
import { modelVersion } from "../../../lib/ml/inference.mjs";
import { currentAccount } from "../../../lib/auth-server";
import { apiError, json, readInput } from "../../../lib/marketplace-api";

type CompareRequest = MlRecommendationRequest & {
  ids?: Array<string | number>;
};

export async function GET() {
  try {
  const account = await currentAccount();
  return json({
    model: modelVersion,
    target: "propora_score",
    properties: (await marketplaceRecommendations(await accountMlContext(account), account?.role === "pencari" ? account.id : undefined)),
  });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
  const body = await readInput(request) as CompareRequest;
  if (!Array.isArray(body.ids) || body.ids.length === 0 || body.ids.some(id => !/^\d+$/.test(String(id))) || new Set(body.ids.map(String)).size !== body.ids.length) return json({ error: "Pilih setidaknya satu properti. Setiap pilihan harus berbeda." }, 400);
  const account = await currentAccount();
  const candidates = await marketplaceRecommendations({ ...await accountMlContext(account), ...Object.fromEntries(Object.entries(body).filter(([key])=>key!=="ids")) }, account?.role === "pencari" ? account.id : undefined);
  const ids = body.ids.map(String);
  const properties = ids.map(id => candidates.find(item => String(item.id) === id)).filter(Boolean);
  if (ids.length && properties.length !== ids.length) return json({ error: "Salah satu properti tidak lagi tersedia. Pilih ulang dari hasil pencarian." }, 409);
  return json({
    model: modelVersion,
    target: "propora_score",
    properties,
  });
  } catch (error) { return apiError(error); }
}
