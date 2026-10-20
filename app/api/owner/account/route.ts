import { NextResponse } from "next/server";
import { authorize } from "../../../lib/auth-server";

export async function GET() {
  const { account, error } = await authorize("pemilik");
  if (error) return error;
  return NextResponse.json({ user: account }, { headers: { "Cache-Control": "no-store" } });
}
