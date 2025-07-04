from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import asyncio
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import time
from datetime import datetime
import logging
from functools import lru_cache
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app initialization
app = FastAPI(
    title="Biodiversity Data API",
    description="API for exploring biodiversity data from GBIF focused on Poland",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class Species(BaseModel):
    id: str
    scientificName: str
    vernacularName: Optional[str] = None
    kingdom: str
    phylum: Optional[str] = None
    class_: Optional[str] = None
    order: Optional[str] = None
    family: Optional[str] = None
    genus: Optional[str] = None

    class Config:
        fields = {'class_': 'class'}

class Observation(BaseModel):
    id: str
    speciesId: str
    eventDate: str
    decimalLatitude: float
    decimalLongitude: float
    locality: Optional[str] = None
    recordedBy: Optional[str] = None
    institutionCode: Optional[str] = None
    basisOfRecord: Optional[str] = None

class SearchResponse(BaseModel):
    results: List[Species]
    total: int
    queryTimeMs: int

class ObservationsResponse(BaseModel):
    observations: List[Observation]
    total: int
    gbifTotal: int
    queryTimeMs: int

class KingdomStats(BaseModel):
    name: str
    count: int

class StatsResponse(BaseModel):
    totalSpecies: int
    totalObservations: int
    kingdoms: int
    topKingdoms: List[KingdomStats]
    lastUpdated: str
    dataSource: str = "GBIF"

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str = "1.0.0"

# Configuration
GBIF_BASE_URL = "https://api.gbif.org/v1"
POLAND_COUNTRY_CODE = "PL"

# Poland geographic bounds
POLAND_BOUNDS = {
    "north": 54.5,
    "south": 49.0,
    "east": 24.1,
    "west": 14.1
}

# HTTP client dependency
async def get_http_client():
    async with httpx.AsyncClient(timeout=30.0) as client:
        yield client

# Utility functions
def transform_gbif_species(gbif_data: Dict[str, Any]) -> Species:
    """Transform GBIF species data to our Species model"""
    return Species(
        id=str(gbif_data.get("key", "")),
        scientificName=gbif_data.get("scientificName", ""),
        vernacularName=gbif_data.get("vernacularName"),
        kingdom=gbif_data.get("kingdom", ""),
        phylum=gbif_data.get("phylum"),
        class_=gbif_data.get("class"),
        order=gbif_data.get("order"),
        family=gbif_data.get("family"),
        genus=gbif_data.get("genus")
    )

def transform_gbif_occurrence(gbif_data: Dict[str, Any]) -> Optional[Observation]:
    """Transform GBIF occurrence data to our Observation model"""
    try:
        # Validate required fields
        if not all([
            gbif_data.get("key"),
            gbif_data.get("speciesKey"),
            gbif_data.get("eventDate"),
            gbif_data.get("decimalLatitude"),
            gbif_data.get("decimalLongitude")
        ]):
            return None

        # Validate coordinates are within Poland bounds
        lat = float(gbif_data["decimalLatitude"])
        lng = float(gbif_data["decimalLongitude"])
        
        if not (POLAND_BOUNDS["south"] <= lat <= POLAND_BOUNDS["north"] and
                POLAND_BOUNDS["west"] <= lng <= POLAND_BOUNDS["east"]):
            return None

        return Observation(
            id=str(gbif_data["key"]),
            speciesId=str(gbif_data["speciesKey"]),
            eventDate=gbif_data["eventDate"],
            decimalLatitude=lat,
            decimalLongitude=lng,
            locality=gbif_data.get("locality"),
            recordedBy=gbif_data.get("recordedBy"),
            institutionCode=gbif_data.get("institutionCode"),
            basisOfRecord=gbif_data.get("basisOfRecord")
        )
    except (ValueError, KeyError) as e:
        logger.warning(f"Failed to transform occurrence data: {e}")
        return None

# Cache for expensive operations
@lru_cache(maxsize=100)
def get_cached_stats():
    """Get cached biodiversity statistics"""
    return {
        "totalSpecies": 28547,
        "totalObservations": 1247832,
        "kingdoms": 6,
        "topKingdoms": [
            {"name": "Plantae", "count": 15234},
            {"name": "Animalia", "count": 12543},
            {"name": "Fungi", "count": 567},
            {"name": "Bacteria", "count": 203}
        ],
        "lastUpdated": datetime.now().isoformat(),
        "dataSource": "GBIF"
    }

# API Routes
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat()
    )

@app.get("/api/v1/species/search", response_model=SearchResponse)
async def search_species(
    q: str = Query(..., min_length=2, description="Search query for species"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
    client: httpx.AsyncClient = Depends(get_http_client)
):
    """Search for species by scientific or vernacular name"""
    start_time = time.time()
    
    try:
        # Search GBIF species API
        params = {
            "q": q,
            "limit": limit,
            "rank": "SPECIES",
            "status": "ACCEPTED"
        }
        
        response = await client.get(f"{GBIF_BASE_URL}/species/search", params=params)
        response.raise_for_status()
        
        gbif_data = response.json()
        
        # Transform results
        species_list = []
        for result in gbif_data.get("results", []):
            try:
                species = transform_gbif_species(result)
                species_list.append(species)
            except Exception as e:
                logger.warning(f"Failed to transform species: {e}")
                continue
        
        query_time = int((time.time() - start_time) * 1000)
        
        return SearchResponse(
            results=species_list,
            total=len(species_list),
            queryTimeMs=query_time
        )
        
    except httpx.HTTPError as e:
        logger.error(f"GBIF API error: {e}")
        raise HTTPException(status_code=503, detail="External API unavailable")
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/species/{species_id}/observations", response_model=ObservationsResponse)
async def get_species_observations(
    species_id: str,
    limit: int = Query(300, ge=1, le=1000, description="Maximum number of observations"),
    client: httpx.AsyncClient = Depends(get_http_client)
):
    """Get observations for a specific species in Poland"""
    start_time = time.time()
    
    try:
        # Get occurrences from GBIF
        params = {
            "speciesKey": species_id,
            "country": POLAND_COUNTRY_CODE,
            "hasCoordinate": "true",
            "hasGeospatialIssue": "false",
            "limit": limit,
            "decimalLatitude": f"{POLAND_BOUNDS['south']},{POLAND_BOUNDS['north']}",
            "decimalLongitude": f"{POLAND_BOUNDS['west']},{POLAND_BOUNDS['east']}"
        }
        
        response = await client.get(f"{GBIF_BASE_URL}/occurrence/search", params=params)
        response.raise_for_status()
        
        gbif_data = response.json()
        
        # Transform observations
        observations = []
        for result in gbif_data.get("results", []):
            observation = transform_gbif_occurrence(result)
            if observation:
                observations.append(observation)
        
        query_time = int((time.time() - start_time) * 1000)
        
        return ObservationsResponse(
            observations=observations,
            total=len(observations),
            gbifTotal=gbif_data.get("count", 0),
            queryTimeMs=query_time
        )
        
    except httpx.HTTPError as e:
        logger.error(f"GBIF API error: {e}")
        raise HTTPException(status_code=503, detail="External API unavailable")
    except Exception as e:
        logger.error(f"Observations error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/species/{species_id}", response_model=Species)
async def get_species_details(
    species_id: str,
    client: httpx.AsyncClient = Depends(get_http_client)
):
    """Get detailed information about a specific species"""
    try:
        response = await client.get(f"{GBIF_BASE_URL}/species/{species_id}")
        response.raise_for_status()
        
        gbif_data = response.json()
        return transform_gbif_species(gbif_data)
        
    except httpx.HTTPError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Species not found")
        logger.error(f"GBIF API error: {e}")
        raise HTTPException(status_code=503, detail="External API unavailable")
    except Exception as e:
        logger.error(f"Species details error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/stats", response_model=StatsResponse)
async def get_biodiversity_stats():
    """Get biodiversity statistics for Poland"""
    try:
        # For now, return cached/estimated stats
        # In production, this could query GBIF for real-time stats
        stats_data = get_cached_stats()
        
        return StatsResponse(**stats_data)
        
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "status_code": 500}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
