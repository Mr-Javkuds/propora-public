"""Bundle the repository's trained model and base scenarios for Node inference."""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ML = ROOT / "ML"
model_path = ML / "07_modeling" / "propora_linear_decision_support_model.json"
properties_path = ML / "02_data_cleaning" / "propora_clean_property_dataset.csv"
scenarios_path = ML / "04_feature_engineering" / "propora_business_recommendation_scenarios.csv"
signals = ["demand_score", "accessibility_score", "property_cost_efficiency_score", "growth_score", "foot_traffic_score", "flood_safety_score", "sentiment_score", "google_trends_score", "competition_opportunity_score"]

with properties_path.open(encoding="utf-8-sig", newline="") as handle:
    properties = {row["property_id"]: row for row in csv.DictReader(handle)}
profiles = []
fixtures = []
model = json.loads(model_path.read_text(encoding="utf-8"))
fixture_businesses = set()
with scenarios_path.open(encoding="utf-8-sig", newline="") as handle:
    for row in csv.DictReader(handle):
        if row["market_scenario"] != "base":
            continue
        location = properties[row["property_id"]]
        profiles.append({
            "propertyId": row["property_id"], "kecamatan": row["kecamatan"],
            "businessType": row["business_type"], "trendKeyword": row["trend_keyword"],
            "latitude": float(location["latitude"]), "longitude": float(location["longitude"]),
            "pricePerM2Year": float(row["price_per_m2_year"]),
            "signals": {name: float(row[name]) for name in signals},
        })
        if row["business_type"] not in fixture_businesses:
            features = {name: 0.0 for name in model["feature_columns"]}
            for name in ["price_total", "building_area_m2", "price_per_m2_year", *signals]:
                features[name] = float(row[name])
            for prefix in ["kecamatan", "business_type", "trend_keyword", "market_scenario"]:
                features[f"{prefix}_{row[prefix]}"] = 1.0
            prediction = model["intercept"] + sum((features[name] - model["feature_means"][name]) / model["feature_stds"][name] * model["coefficients"][name] for name in model["feature_columns"])
            fixtures.append({"scenarioId": row["scenario_id"], "features": features, "expectedScore": round(max(0, min(100, prediction)), 2)})
            fixture_businesses.add(row["business_type"])
fingerprint = hashlib.sha256(model_path.read_bytes() + properties_path.read_bytes() + scenarios_path.read_bytes()).hexdigest()
bundle = {
    "version": "propora-linear-" + fingerprint[:12],
    "sourceHash": fingerprint,
    "sources": [str(path.relative_to(ROOT)).replace("\\", "/") for path in [model_path, properties_path, scenarios_path]],
    "model": model,
    "fixtures": fixtures,
    "profiles": profiles,
    "signals": signals,
}
output = Path(__file__).resolve().parents[1] / "app" / "lib" / "ml" / "artifacts.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(bundle, ensure_ascii=True, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"Exported {len(profiles)} reference profiles; model {bundle['version']}")
