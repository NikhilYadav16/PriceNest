import pandas as pd
import numpy as np
import joblib
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import RedirectResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import io

from ml_engine import auto_detect_columns, train_model
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="PriceNest Landing Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LOAD STATIC GURGAON DEFAULTS ---
try:
    pipeline = joblib.load('../pipeline.pkl')
    df_static = joblib.load('../df.pkl')
    # Core fix: Restore prices natively using pipeline geometric extrapolation since df.pkl omitted them!
    df_static['price'] = np.expm1(pipeline.predict(df_static))
except Exception as e:
    pipeline = None
    df_static = None

# Recommendation Pickles
import pickle
try:
    location_df = pickle.load(open('../real-estate-app/datasets/location_distance.pkl', 'rb'))
    cosine_sim1 = pickle.load(open('../real-estate-app/datasets/cosine_sim1.pkl', 'rb'))
    cosine_sim2 = pickle.load(open('../real-estate-app/datasets/cosine_sim2.pkl', 'rb'))
    cosine_sim3 = pickle.load(open('../real-estate-app/datasets/cosine_sim3.pkl', 'rb'))
except Exception as e:
    location_df = None
    cosine_sim1 = None
    cosine_sim2 = None
    cosine_sim3 = None

try:
    viz_df = pd.read_csv('../real-estate-app/datasets/data_viz1.csv')
    num_cols = ["price", "price_per_sqft", "built_up_area", "latitude", "longitude"]
    viz_df[num_cols] = viz_df[num_cols].apply(pd.to_numeric, errors="coerce")
    viz_df.dropna(subset=["latitude", "longitude"], inplace=True)
except Exception:
    viz_df = None

# Global Dynamic State
STATE = {
    "df": None,
    "model": None,
    "clean_df": None,
    "target": None,
    "features": None,
    "metrics": None
}

# --- 1. GURGAON DEFAULT ENDPOINTS ---
@app.get("/api/gurgaon/options")
def get_gurgaon_options():
    if df_static is None:
        raise HTTPException(status_code=500, detail="Gurgaon model not found")
    return {
        "property_type": sorted(df_static['property_type'].dropna().unique().tolist()),
        "sector": sorted(df_static['sector'].dropna().unique().tolist()),
        "balcony": sorted(df_static['balcony'].dropna().unique().tolist()),
        "agePossession": sorted(df_static['agePossession'].dropna().unique().tolist()),
        "furnishing_type": sorted(df_static['furnishing_type'].dropna().unique().tolist()),
        "luxury_category": sorted(df_static['luxury_category'].dropna().unique().tolist()),
        "floor_category": sorted(df_static['floor_category'].dropna().unique().tolist())
    }

class GurgaonPredictRequest(BaseModel):
    property_type: str
    sector: str
    bedRoom: int
    bathroom: int
    balcony: str
    agePossession: str
    built_up_area: float
    servant_room: int
    store_room: int
    furnishing_type: str
    luxury_category: str
    floor_category: str

@app.post("/api/gurgaon/predict")
def predict_gurgaon(req: GurgaonPredictRequest):
    if pipeline is None:
        raise HTTPException(status_code=500, detail="Gurgaon model not loaded")
    input_df = pd.DataFrame([req.dict()])
    input_df.rename(columns={"servant_room": "servant room", "store_room": "store room"}, inplace=True)
    try:
        base_price = np.expm1(pipeline.predict(input_df)[0])
        low = base_price - 0.22
        high = base_price + 0.22
        return {"low": round(low, 2), "high": round(high, 2), "predicted": round(base_price, 2)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/interactive-options")
def get_interactive_opts():
    if viz_df is None: return {}
    sectors = sorted(viz_df["sector"].dropna().unique().tolist())
    types = sorted(viz_df["property_type"].dropna().unique().tolist())
    return {"sectors": ["All"] + sectors, "types": ["All"] + types}

class FilterReq(BaseModel):
    sector: str
    property_type: str

@app.post("/api/analytics/interactive-data")
def interactive_analytics_data(req: FilterReq):
    if viz_df is None: return {}
    df = viz_df.copy()
    if req.sector != "All":
        df = df[df["sector"] == req.sector]
    if req.property_type != "All":
        df = df[df["property_type"] == req.property_type]

    # Metrics
    avg_price = df['price'].mean()
    avg_sqft = df['price_per_sqft'].mean()
    avg_area = df['built_up_area'].mean()

    # Map Groupings
    group_df = df.groupby("sector")[["price", "price_per_sqft", "built_up_area", "latitude", "longitude"]].mean().reset_index()
    map_points = group_df.to_dict(orient="records")
    clean_map = []
    import math
    for m in map_points:
        clean_map.append({
            "sector": str(m["sector"]),
            "price": round(float(m["price"]), 2) if not math.isnan(m["price"]) else 0,
            "lat": float(m["latitude"]),
            "lng": float(m["longitude"]),
            "sqft_price": round(float(m["price_per_sqft"]), 2) if not math.isnan(m["price_per_sqft"]) else 0,
            "area": round(float(m["built_up_area"]), 2) if not math.isnan(m["built_up_area"]) else 0
        })

    # Scatter
    scatter_df = df[["built_up_area", "price", "bedRoom", "sector"]].dropna()
    if len(scatter_df) > 500: scatter_df = scatter_df.sample(500)
    clean_scatter = scatter_df.to_dict(orient="records")

    # Pie
    bhk_counts = df["bedRoom"].value_counts().reset_index()
    bhk_counts.columns = ["bhk", "count"]
    pie_data = [{"name": str(int(row["bhk"]))+" BHK", "value": int(row["count"])} for _, row in bhk_counts.iterrows()]

    # Bar
    bhk_price = df[df["bedRoom"] <= 4].groupby("bedRoom")["price"].mean().reset_index()
    bar_data = [{"bhk": str(int(row["bedRoom"]))+" BHK", "avg_price": round(float(row["price"]),2)} for _, row in bhk_price.iterrows()]

    return {
        "metrics": {
            "avg_price": round(float(avg_price),2) if pd.notnull(avg_price) else 0,
            "avg_sqft": round(float(avg_sqft),2) if pd.notnull(avg_sqft) else 0,
            "avg_area": round(float(avg_area),2) if pd.notnull(avg_area) else 0
        },
        "map_points": clean_map,
        "scatter": clean_scatter,
        "pie": pie_data,
        "bar": bar_data
    }

@app.get("/api/recommender/options")
def get_recommender_options():
    if location_df is None:
        raise HTTPException(status_code=500, detail="Recommendation datasets missing")
    return {
        "locations": sorted(location_df.columns.tolist()),
        "properties": sorted(location_df.index.tolist())
    }

class LocationSearchReq(BaseModel):
    location: str
    radius_km: float

@app.post("/api/recommender/location")
def recommend_location(req: LocationSearchReq):
    if location_df is None:
        raise HTTPException(status_code=500, detail="Recommender models missing")
    if req.location not in location_df.columns:
        raise HTTPException(status_code=400, detail="Invalid location")
    
    filtered = location_df[location_df[req.location] < req.radius_km * 1000][req.location].sort_values()
    if filtered.empty:
        return {"results": []}
    
    results = [{"property": str(prop), "distance_km": round(float(dist) / 1000, 2)} for prop, dist in filtered.items()]
    return {"results": results}

class SimilarityReq(BaseModel):
    property_name: str
    w_location: float
    w_amenities: float
    w_features: float
    top_n: int

@app.post("/api/recommender/similarity")
def recommend_similarity(req: SimilarityReq):
    if location_df is None:
        raise HTTPException(status_code=500, detail="Recommender datasets missing")
    if req.property_name not in location_df.index:
        raise HTTPException(status_code=400, detail="Invalid property")

    # Combine matrices
    combined = (req.w_location * cosine_sim1) + (req.w_amenities * cosine_sim2) + (req.w_features * cosine_sim3)
    idx = location_df.index.get_loc(req.property_name)
    
    # Extract row combinations
    scores = list(enumerate(combined[idx]))
    scores = sorted(scores, key=lambda x: x[1], reverse=True)
    
    top_indices = [i[0] for i in scores[1:req.top_n+1]]
    top_scores = [i[1] for i in scores[1:req.top_n+1]]
    
    results = [{"property": str(location_df.index[i]), "score": round(float(s), 4)} for i, s in zip(top_indices, top_scores)]
    return {"results": results}

@app.get("/api/datasets/download/gurgaon")
def download_dataset():
    if df_static is None:
        raise HTTPException(status_code=500, detail="Data not available")
    
    csv_data = df_static.to_csv(index=False)
    headers = {
        "Content-Disposition": "attachment; filename=\"PriceNest_Gurgaon_Analytics_Cleaned.csv\""
    }
    return PlainTextResponse(csv_data, headers=headers, media_type="text/csv")


# --- 2. DYNAMIC ML ENDPOINTS ---
@app.post("/api/dynamic/upload")
async def handle_upload(file: UploadFile = File(...)):
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        STATE["df"] = df
        STATE["model"] = None 
        
        mapping = auto_detect_columns(df)
        return {"columns": df.columns.tolist(), "mapping": mapping, "rows": len(df)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class TrainConfig(BaseModel):
    target: str
    features: List[str]

@app.post("/api/dynamic/train")
def handle_train(config: TrainConfig):
    if STATE["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded")
    try:
        model, clean_df, r2, mae, feat_imp = train_model(STATE["df"], config.target, config.features)
        STATE["model"] = model
        STATE["clean_df"] = clean_df
        STATE["target"] = config.target
        STATE["features"] = config.features
        STATE["metrics"] = {"r2": r2, "mae": mae, "feat_imp": feat_imp}
        
        avg_price = float(clean_df[config.target].mean()) if pd.api.types.is_numeric_dtype(clean_df[config.target]) else None
        return {"r2": r2, "mae": mae, "average_target": avg_price, "feat_imp": feat_imp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dynamic/options")
def get_prediction_options():
    if STATE["model"] is None:
        raise HTTPException(status_code=400, detail="Model not trained yet")
        
    df = STATE["clean_df"]
    features = STATE["features"]
    options = {}
    
    for feat in features:
        dtype = df[feat].dtype
        if pd.api.types.is_numeric_dtype(dtype):
            options[feat] = {
                "type": "numeric",
                "min": float(df[feat].min()),
                "max": float(df[feat].max()),
                "median": float(df[feat].median())
            }
        else:
            options[feat] = {
                "type": "categorical",
                "values": [str(x) for x in df[feat].dropna().unique().tolist()]
            }
            
    return {"options": options, "target": STATE["target"]}

class PredictRequest(BaseModel):
    payload: Dict[str, Any]

@app.post("/api/dynamic/predict")
def handle_predict(req: PredictRequest):
    if STATE["model"] is None:
        raise HTTPException(status_code=400, detail="Model not trained")
    try:
        input_df = pd.DataFrame([req.payload])
        input_df = input_df[STATE["features"]]
        pred = float(STATE["model"].predict(input_df)[0])
        return {"prediction": pred}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import os
if os.path.exists("../frontend/dist"):
    app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="frontend")
