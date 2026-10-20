import { NextRequest } from "next/server";
import { marketplaceApi } from "../../../lib/marketplace-api";
type Context = { params: Promise<{ resource: string }> };
export async function GET(request: NextRequest, context: Context) { return marketplaceApi(request, "pencari", (await context.params).resource); }
export async function POST(request: NextRequest, context: Context) { return marketplaceApi(request, "pencari", (await context.params).resource); }
export async function PUT(request: NextRequest, context: Context) { return marketplaceApi(request, "pencari", (await context.params).resource); }
