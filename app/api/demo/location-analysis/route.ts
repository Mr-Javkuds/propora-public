import { NextRequest } from "next/server";
import { accountMlContext, marketplaceRecommendations } from "../../../lib/marketplace-store";
import { currentAccount } from "../../../lib/auth-server";
import { apiError, json, readInput } from "../../../lib/marketplace-api";
import { modelVersion } from "../../../lib/ml/inference.mjs";
import type { MlRecommendationRequest } from "../../../lib/propora-ml-demo";
async function analyze(body: Record<string,unknown> = {}) {
  const account=await currentAccount();
  const filters: MlRecommendationRequest={...await accountMlContext(account)};
  for(const key of ["businessType","trendKeyword","budgetMin","budgetMax","radiusMeters"] as const) if(body[key]!==undefined) Object.assign(filters,{[key]:body[key]});
  if(body.lat!==undefined || body.lng!==undefined) filters.center={lat:body.lat as number,lng:body.lng as number,label:"Titik pencarian"};
  const recommendations=await marketplaceRecommendations(filters,account?.role==="pencari" ? account.id : undefined);
  const best=recommendations.find(item=>item.mlStatus==="ready");
  return json({source:"database",model:modelVersion,center:filters.center ?? null,radiusMeters:filters.radiusMeters ?? null,score:best?.propora_score ?? null,label:best?.potential_label ?? null,marketPotential:best?.demand_score ?? null,accessibility:best?.accessibility_score ?? null,estimatedFootfall:null,competitorCount:null,nearestCampusDistance:null,rentBenchmark:null,selectedListingRent:best ? best.price*1000000 : null,nearbyPlaces:[],recommendations,mlNote:"Indeks prediksi AI, bukan pengukuran pengunjung atau kompetitor langsung."});
}
export async function GET(){try{return await analyze();}catch(error){return apiError(error);}}
export async function POST(request:NextRequest){try{return await analyze(await readInput(request));}catch(error){return apiError(error);}}
