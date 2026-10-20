export type MlSignalKey =
  | "demand_score"
  | "accessibility_score"
  | "property_cost_efficiency_score"
  | "growth_score"
  | "foot_traffic_score"
  | "flood_safety_score"
  | "sentiment_score"
  | "google_trends_score"
  | "competition_opportunity_score";

export type MlCandidate = Record<MlSignalKey, number> & {
  status?: "draft" | "available" | "reserved" | "rented";
  description?: string;
  ownerId?: string | null;
  ownerEmail?: string | null;
  demo?: boolean;
  mlStatus?: string;
  modelVersion?: string;
  analyzedAt?: string;
  dataQuality?: string;
  mlNote?: string;
  businessType?: string;
  trendKeyword?: string;
  id: number;
  ruko_id: string;
  name: string;
  shortName: string;
  address: string;
  kecamatan: string;
  latitude: number;
  longitude: number;
  price: number;
  building_area_m2: number;
  image: string;
  photos: number | null;
  distance: string;
  competitorCount: number | null;
  nearestCampusDistance: number | null;
  facilities: string[];
  pin: { top: string; left: string } | null;
};

export type MlRecommendation = Omit<MlCandidate, MlSignalKey> & Record<MlSignalKey, number | null> & {
  rank: number | null;
  propora_score: number | null;
  potential_label: "tinggi" | "sedang" | "rendah" | null;
  top_positive_drivers: MlSignalKey[];
  main_risk_drivers: MlSignalKey[];
  claim_status: "business_recommendation_decision_support";
};

export type MlRecommendationRequest = {
  businessType?: string;
  trendKeyword?: string;
  locationFilters?: string[];
  budgetMin?: number;
  budgetMax?: number;
  radiusMeters?: number;
  center?: {
    lat: number;
    lng: number;
    label: string;
  };
};

