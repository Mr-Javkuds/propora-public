import { NextRequest, NextResponse } from "next/server";
import { marketplaceProperty } from "../../../../lib/marketplace-store";
import { currentAccount } from "../../../../lib/auth-server";
import { apiError } from "../../../../lib/marketplace-api";
import { modelVersion } from "../../../../lib/ml/inference.mjs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
  const { id } = await context.params;
  const query = request.nextUrl.searchParams;
  const options = { ...(query.has("businessType") ? { businessType: query.get("businessType")! } : {}), ...(query.has("trendKeyword") ? { trendKeyword: query.get("trendKeyword")! } : {}) };
  const property = await marketplaceProperty(id, await currentAccount(), options);

  if (!property) {
    return NextResponse.json(
      { error: "Properti tidak ditemukan", id },
      { status: 404 }
    );
  }

  return NextResponse.json({
    model: modelVersion,
    target: "propora_score",
    source: "database",
    property,
  }, { headers: { "Cache-Control": "no-store" } });
  } catch(error) { return apiError(error); }
}
