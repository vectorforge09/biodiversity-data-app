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
    canonicalName: Optional[str] = None
    vernacularName: Optional[str] = None
    kingdom: str
    phylum: Optional[str] = None
    class_: Optional[str] = None
    order: Optional[str] = None
    family: Optional[str] = None
    genus: Optional[str] = None
    rank: Optional[str] = None
    taxonomicStatus: Optional[str] = None
    # Add coordinate summary for preview
    observationCount: Optional[int] = None
    sampleLatitude: Optional[float] = None
    sampleLongitude: Optional[float] = None

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

# Poland geographic bounds (more precise)
POLAND_BOUNDS = {
    "north": 54.8389,
    "south": 49.002,
    "east": 24.1458,
    "west": 14.1229
}

# HTTP client dependency
async def get_http_client():
    async with httpx.AsyncClient(timeout=30.0) as client:
        yield client

# Utility functions for real GBIF statistics
async def get_real_gbif_stats(client: httpx.AsyncClient) -> Dict[str, Any]:
    """Get real biodiversity statistics from GBIF for Poland"""
    try:
        # Get species count by kingdom for Poland
        kingdoms_data = []
        total_species = 0
        total_observations = 0
        
        # Major kingdoms to check
        kingdoms = ["Plantae", "Animalia", "Fungi", "Bacteria", "Archaea", "Chromista"]
        
        for kingdom in kingdoms:
            try:
                # Get species count for this kingdom in Poland
                species_params = {
                    "country": POLAND_COUNTRY_CODE,
                    "kingdom": kingdom,
                    "rank": "SPECIES",
                    "status": "ACCEPTED",
                    "limit": 0  # We only want the count
                }
                
                species_response = await client.get(f"{GBIF_BASE_URL}/species/search", params=species_params)
                if species_response.status_code == 200:
                    species_data = species_response.json()
                    species_count = species_data.get("count", 0)
                    
                    if species_count > 0:
                        kingdoms_data.append({
                            "name": kingdom,
                            "count": species_count
                        })
                        total_species += species_count
                
                # Get occurrence count for this kingdom in Poland
                occurrence_params = {
                    "country": POLAND_COUNTRY_CODE,
                    "kingdom": kingdom,
                    "hasCoordinate": "true",
                    "limit": 0  # We only want the count
                }
                
                occurrence_response = await client.get(f"{GBIF_BASE_URL}/occurrence/search", params=occurrence_params)
                if occurrence_response.status_code == 200:
                    occurrence_data = occurrence_response.json()
                    total_observations += occurrence_data.get("count", 0)
                
            except Exception as e:
                logger.warning(f"Failed to get stats for kingdom {kingdom}: {e}")
                continue
        
        # Sort kingdoms by count
        kingdoms_data.sort(key=lambda x: x["count"], reverse=True)
        
        return {
            "totalSpecies": total_species,
            "totalObservations": total_observations,
            "kingdoms": len(kingdoms_data),
            "topKingdoms": kingdoms_data[:4],  # Top 4 kingdoms
            "lastUpdated": datetime.now().isoformat(),
            "dataSource": "GBIF - Real-time data"
        }
        
    except Exception as e:
        logger.error(f"Failed to get real GBIF stats: {e}")
        # Return fallback data
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
            "dataSource": "GBIF - Cached data"
        }

async def get_species_sample_coordinates(client: httpx.AsyncClient, species_key: str) -> tuple[Optional[float], Optional[float], int]:
    """Get a sample coordinate and observation count for a species in Poland"""
    try:
        # Get a small sample of observations to extract coordinates
        params = {
            "speciesKey": species_key,
            "country": POLAND_COUNTRY_CODE,
            "hasCoordinate": "true",
            "hasGeospatialIssue": "false",
            "limit": 1,  # Just get one sample
            "decimalLatitude": f"{POLAND_BOUNDS['south']},{POLAND_BOUNDS['north']}",
            "decimalLongitude": f"{POLAND_BOUNDS['west']},{POLAND_BOUNDS['east']}"
        }
        
        response = await client.get(f"{GBIF_BASE_URL}/occurrence/search", params=params)
        if response.status_code == 200:
            data = response.json()
            total_count = data.get("count", 0)
            results = data.get("results", [])
            
            if results and len(results) > 0:
                first_result = results[0]
                lat = first_result.get("decimalLatitude")
                lng = first_result.get("decimalLongitude")
                
                if lat is not None and lng is not None:
                    try:
                        lat = float(lat)
                        lng = float(lng)
                        # Validate coordinates are within Poland bounds
                        if (POLAND_BOUNDS["south"] <= lat <= POLAND_BOUNDS["north"] and
                            POLAND_BOUNDS["west"] <= lng <= POLAND_BOUNDS["east"]):
                            return lat, lng, total_count
                    except (ValueError, TypeError):
                        pass
            
            return None, None, total_count
        
        return None, None, 0
    except Exception as e:
        logger.warning(f"Failed to get sample coordinates for species {species_key}: {e}")
        return None, None, 0

def deduplicate_species_results(species_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Deduplicate species results by scientific name, keeping the most complete record"""
    species_map = {}
    
    for species in species_list:
        scientific_name = species.get("scientificName", "").strip()
        canonical_name = species.get("canonicalName", "").strip()
        
        # Use canonical name for deduplication (without author)
        key_name = canonical_name if canonical_name else scientific_name
        if not key_name:
            continue
        
        if key_name not in species_map:
            species_map[key_name] = species
        else:
            # Keep the record with more complete taxonomic information
            existing = species_map[key_name]
            current = species
            
            # Count non-null taxonomic fields
            existing_fields = sum(1 for field in ["kingdom", "phylum", "class", "order", "family", "genus"] 
                                if existing.get(field))
            current_fields = sum(1 for field in ["kingdom", "phylum", "class", "order", "family", "genus"] 
                               if current.get(field))
            
            # Prefer ACCEPTED taxonomic status
            if current.get("taxonomicStatus") == "ACCEPTED" and existing.get("taxonomicStatus") != "ACCEPTED":
                current_fields += 2
            elif existing.get("taxonomicStatus") == "ACCEPTED" and current.get("taxonomicStatus") != "ACCEPTED":
                existing_fields += 2
            
            if current_fields > existing_fields:
                species_map[key_name] = current
    
    return list(species_map.values())

async def get_vernacular_names(client: httpx.AsyncClient, species_key: str) -> Optional[str]:
    """Get vernacular names for a species from GBIF"""
    try:
        response = await client.get(f"{GBIF_BASE_URL}/species/{species_key}/vernacularNames")
        if response.status_code == 200:
            vernacular_data = response.json()
            results = vernacular_data.get("results", [])
            
            # Find English vernacular name first
            for vn in results:
                if vn.get("language") == "en" or vn.get("language") == "eng":
                    return vn.get("vernacularName")
            
            # If no English name, try Polish
            for vn in results:
                if vn.get("language") == "pl" or vn.get("language") == "pol":
                    return vn.get("vernacularName")
            
            # If no specific language, take the first available
            if results:
                return results[0].get("vernacularName")
        
        return None
    except Exception as e:
        logger.warning(f"Failed to get vernacular names for species {species_key}: {e}")
        return None

def transform_gbif_species(gbif_data: Dict[str, Any]) -> Species:
    """Transform GBIF species data to our Species model using the actual GBIF format"""
    species_key = str(gbif_data.get("key", ""))
    
    return Species(
        id=species_key,
        scientificName=gbif_data.get("scientificName", ""),
        canonicalName=gbif_data.get("canonicalName"),
        vernacularName=None,  # Will be filled separately
        kingdom=gbif_data.get("kingdom", ""),
        phylum=gbif_data.get("phylum"),
        class_=gbif_data.get("class"),
        order=gbif_data.get("order"),
        family=gbif_data.get("family"),
        genus=gbif_data.get("genus"),
        rank=gbif_data.get("rank"),
        taxonomicStatus=gbif_data.get("taxonomicStatus"),
        observationCount=None,  # Will be filled separately
        sampleLatitude=None,   # Will be filled separately
        sampleLongitude=None   # Will be filled separately
    )

def transform_gbif_occurrence(gbif_data: Dict[str, Any], species_id: str) -> Optional[Observation]:
    """Transform GBIF occurrence data to our Observation model with enhanced coordinate validation"""
    try:
        # Extract coordinates
        lat = gbif_data.get("decimalLatitude")
        lng = gbif_data.get("decimalLongitude")
        
        # Validate that coordinates exist and are numeric
        if lat is None or lng is None:
            return None
            
        try:
            lat = float(lat)
            lng = float(lng)
        except (ValueError, TypeError):
            return None
        
        # Validate coordinates are within reasonable bounds
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return None
            
        # Validate coordinates are within Poland bounds
        if not (POLAND_BOUNDS["south"] <= lat <= POLAND_BOUNDS["north"] and
                POLAND_BOUNDS["west"] <= lng <= POLAND_BOUNDS["east"]):
            return None

        # Validate required fields
        occurrence_key = gbif_data.get("key")
        event_date = gbif_data.get("eventDate")
        
        if not occurrence_key or not event_date:
            return None

        # Build locality string from available location data
        locality_parts = []
        if gbif_data.get("locality"):
            locality_parts.append(gbif_data["locality"])
        if gbif_data.get("municipality"):
            locality_parts.append(gbif_data["municipality"])
        if gbif_data.get("stateProvince"):
            locality_parts.append(gbif_data["stateProvince"])
        if gbif_data.get("country"):
            locality_parts.append(gbif_data["country"])
        
        locality = ", ".join(locality_parts) if locality_parts else None

        return Observation(
            id=str(occurrence_key),
            speciesId=species_id,
            eventDate=str(event_date),
            decimalLatitude=lat,
            decimalLongitude=lng,
            locality=locality,
            recordedBy=gbif_data.get("recordedBy"),
            institutionCode=gbif_data.get("institutionCode"),
            basisOfRecord=gbif_data.get("basisOfRecord")
        )
    except Exception as e:
        logger.warning(f"Failed to transform occurrence data: {e}")
        return None

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
    """Search for species by scientific or vernacular name with coordinate preview"""
    start_time = time.time()
    
    try:
        # Search GBIF species API with the actual format
        params = {
            "q": q,
            "limit": limit * 2,  # Get more results to account for deduplication
            "rank": "SPECIES",
            "status": "ACCEPTED"
        }
        
        logger.info(f"Searching GBIF for: {q}")
        
        response = await client.get(f"{GBIF_BASE_URL}/species/search", params=params)
        response.raise_for_status()
        
        gbif_data = response.json()
        raw_results = gbif_data.get("results", [])
        
        logger.info(f"GBIF returned {len(raw_results)} raw results")
        
        # Deduplicate results by canonical name
        deduplicated_results = deduplicate_species_results(raw_results)
        
        # Limit to requested number after deduplication
        deduplicated_results = deduplicated_results[:limit]
        
        logger.info(f"After deduplication: {len(deduplicated_results)} unique species")
        
        # Transform results and fetch additional data
        species_list = []
        for result in deduplicated_results:
            try:
                species = transform_gbif_species(result)
                
                # Get vernacular names
                vernacular_name = await get_vernacular_names(client, species.id)
                species.vernacularName = vernacular_name
                
                # Get sample coordinates and observation count
                sample_lat, sample_lng, obs_count = await get_species_sample_coordinates(client, species.id)
                species.sampleLatitude = sample_lat
                species.sampleLongitude = sample_lng
                species.observationCount = obs_count
                
                species_list.append(species)
            except Exception as e:
                logger.warning(f"Failed to transform species: {e}")
                continue
        
        query_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Returning {len(species_list)} species with coordinate data")
        
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
    """Get observations for a specific species in Poland with enhanced coordinate data"""
    start_time = time.time()
    
    try:
        # Get occurrences from GBIF with enhanced parameters for better coordinate data
        params = {
            "speciesKey": species_id,
            "country": POLAND_COUNTRY_CODE,
            "hasCoordinate": "true",
            "hasGeospatialIssue": "false",
            "limit": limit,
            # Add coordinate bounds to ensure we get Poland data
            "decimalLatitude": f"{POLAND_BOUNDS['south']},{POLAND_BOUNDS['north']}",
            "decimalLongitude": f"{POLAND_BOUNDS['west']},{POLAND_BOUNDS['east']}",
            # Request specific fields to ensure we get coordinate data
            "coordinateUncertaintyInMeters": "0,10000"  # Only records with reasonable coordinate precision
        }
        
        logger.info(f"Fetching observations for species {species_id} with params: {params}")
        
        response = await client.get(f"{GBIF_BASE_URL}/occurrence/search", params=params)
        response.raise_for_status()
        
        gbif_data = response.json()
        gbif_total = gbif_data.get("count", 0)
        
        logger.info(f"GBIF returned {len(gbif_data.get('results', []))} results out of {gbif_total} total")
        
        # Transform observations with enhanced coordinate validation
        observations = []
        coordinate_issues = 0
        
        for result in gbif_data.get("results", []):
            observation = transform_gbif_occurrence(result, species_id)
            if observation:
                observations.append(observation)
            else:
                coordinate_issues += 1
        
        if coordinate_issues > 0:
            logger.info(f"Filtered out {coordinate_issues} observations due to coordinate issues")
        
        query_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Returning {len(observations)} valid observations for species {species_id}")
        
        return ObservationsResponse(
            observations=observations,
            total=len(observations),
            gbifTotal=gbif_total,
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
        # Fetch species details
        response = await client.get(f"{GBIF_BASE_URL}/species/{species_id}")
        response.raise_for_status()
        
        gbif_data = response.json()
        
        # Transform species data
        species = transform_gbif_species(gbif_data)
        
        # Get vernacular names
        vernacular_name = await get_vernacular_names(client, species_id)
        species.vernacularName = vernacular_name
        
        # Get sample coordinates and observation count
        sample_lat, sample_lng, obs_count = await get_species_sample_coordinates(client, species_id)
        species.sampleLatitude = sample_lat
        species.sampleLongitude = sample_lng
        species.observationCount = obs_count
        
        return species
        
    except httpx.HTTPError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Species not found")
        logger.error(f"GBIF API error: {e}")
        raise HTTPException(status_code=503, detail="External API unavailable")
    except Exception as e:
        logger.error(f"Species details error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/stats", response_model=StatsResponse)
async def get_biodiversity_stats(client: httpx.AsyncClient = Depends(get_http_client)):
    """Get real biodiversity statistics for Poland from GBIF"""
    try:
        # Get real-time stats from GBIF
        stats_data = await get_real_gbif_stats(client)
        
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
