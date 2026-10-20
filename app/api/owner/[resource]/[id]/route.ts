import { NextRequest } from "next/server";
import { marketplaceApi } from "../../../../lib/marketplace-api";
export async function PATCH(request: NextRequest, context: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await context.params;
  return marketplaceApi(request, "pemilik", resource, id);
}
