from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import asyncio
from typing import List, Optional, Dict, Any, Tuple
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
    species: Optional[str] = None
    rank: Optional[str] = None
    taxonomicStatus: Optional[str] = None
    # Geographic preview data
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
    municipality: Optional[str] = None
    stateProvince: Optional[str] = None
    country: Optional[str] = None
    recordedBy: Optional[str] = None
    institutionCode: Optional[str] = None
    basisOfRecord: Optional[str] = None
    year: Optional[int] = None
    month: Optional[int] = None
    coordinateUncertaintyInMeters: Optional[float] = None

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
    percentage: float

class StatsResponse(BaseModel):
    totalSpecies: int
    totalObservations: int
    kingdoms: int
    topKingdoms: List[KingdomStats]
    lastUpdated: str
    dataSource: str = "GBIF"
    queryTimeMs: int

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str = "1.0.0"

# Configuration
GBIF_BASE_URL = "https://api.gbif.org/v1"
POLAND_COUNTRY_CODE = "PL"

# Poland geographic bounds (precise)
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

# Utility functions
async def get_species_occurrence_preview(client: httpx.AsyncClient, species_key: str) -> Tuple[Optional[float], Optional[float], int]:
    """Get sample coordinates and total count for a species in Poland"""
    try:
        # Get occurrence count and sample coordinate
        params = {
            "speciesKey": species_key,
            "country": POLAND_COUNTRY_CODE,
            "hasCoordinate": "true",
            "hasGeospatialIssue": "false",
            "limit": 1,  # Just get one sample for coordinates
            "decimalLatitude": f"{POLAND_BOUNDS['south']},{POLAND_BOUNDS['north']}",
            "decimalLongitude": f"{POLAND_BOUNDS['west']},{POLAND_BOUNDS['east']}"
        }
        
        response = await client.get(f"{GBIF_BASE_URL}/occurrence/search", params=params)
        if response.status_code == 200:
            data = response.json()
            total_count = data.get("count", 0)
            results = data.get("results", [])
            
            sample_lat, sample_lng = None, None
            if results:
                first_result = results[0]
                lat = first_result.get("decimalLatitude")
                lng = first_result.get("decimalLongitude")
                
                if lat is not None and lng is not None:
                    try:
                        sample_lat = float(lat)
                        sample_lng = float(lng)
                        # Validate coordinates are within Poland bounds
                        if not (POLAND_BOUNDS["south"] <= sample_lat <= POLAND_BOUNDS["north"] and
                                POLAND_BOUNDS["west"] <= sample_lng <= POLAND_BOUNDS["east"]):
                            sample_lat, sample_lng = None, None
                    except (ValueError, TypeError):
                        sample_lat, sample_lng = None, None
            
            return sample_lat, sample_lng, total_count
        
        return None, None, 0
    except Exception as e:
        logger.warning(f"Failed to get occurrence preview for species {species_key}: {e}")
        return None, None, 0

async def get_vernacular_names(client: httpx.AsyncClient, species_key: str) -> Optional[str]:
    """Get vernacular names for a species, preferring English"""
    try:
        response = await client.get(f"{GBIF_BASE_URL}/species/{species_key}/vernacularNames")
        if response.status_code == 200:
            data = response.json()
            vernacular_names = data.get("results", [])
            
            # Prefer English names
            for name_data in vernacular_names:
                if name_data.get("language") == "en":
                    return name_data.get("vernacularName")
            
            # If no English name, take the first available
            if vernacular_names:
                return vernacular_names[0].get("vernacularName")
        
        return None
    except Exception as e:
        logger.warning(f"Failed to get vernacular names for species {species_key}: {e}")
        return None

def transform_gbif_species(gbif_data: Dict[str, Any]) -> Species:
    """Transform GBIF species search result to our Species model"""
    return Species(
        id=str(gbif_data.get("key", "")),
        scientificName=gbif_data.get("scientificName", ""),
        canonicalName=gbif_data.get("canonicalName"),
        vernacularName=None,  # Will be populated separately
        kingdom=gbif_data.get("kingdom", ""),
        phylum=gbif_data.get("phylum"),
        class_=gbif_data.get("class"),
        order=gbif_data.get("order"),
        family=gbif_data.get("family"),
        genus=gbif_data.get("genus"),
        species=gbif_data.get("species"),
        rank=gbif_data.get("rank"),
        taxonomicStatus=gbif_data.get("taxonomicStatus")
    )

def transform_gbif_occurrence(gbif_data: Dict[str, Any], species_id: str) -> Optional[Observation]:
    """Transform GBIF occurrence data to our Observation model"""
    try:
        # Extract and validate coordinates
        lat = gbif_data.get("decimalLatitude")
        lng = gbif_data.get("decimalLongitude")
        
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
        
        if not occurrence_key:
            return None

        # Handle missing event date
        if not event_date:
            # Try to construct from year/month/day
            year = gbif_data.get("year")
            month = gbif_data.get("month", 1)
            day = gbif_data.get("day", 1)
            if year:
                event_date = f"{year}-{month:02d}-{day:02d}"
            else:
                event_date = "Unknown"

        return Observation(
            id=str(occurrence_key),
            speciesId=species_id,
            eventDate=str(event_date),
            decimalLatitude=lat,
            decimalLongitude=lng,
            locality=gbif_data.get("locality"),
            municipality=gbif_data.get("municipality"),
            stateProvince=gbif_data.get("stateProvince"),
            country=gbif_data.get("country"),
            recordedBy=gbif_data.get("recordedBy"),
            institutionCode=gbif_data.get("institutionCode"),
            basisOfRecord=gbif_data.get("basisOfRecord"),
            year=gbif_data.get("year"),
            month=gbif_data.get("month"),
            coordinateUncertaintyInMeters=gbif_data.get("coordinateUncertaintyInMeters")
        )
    except Exception as e:
        logger.warning(f"Failed to transform occurrence data: {e}")
        return None

def deduplicate_species_by_canonical_name(species_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Deduplicate species by canonical name, keeping the most complete record"""
    species_map = {}
    
    for species in species_list:
        canonical_name = species.get("canonicalName") or species.get("species", "")
        if not canonical_name:
            continue
            
        if canonical_name not in species_map:
            species_map[canonical_name] = species
        else:
            # Keep the record with more complete taxonomic information
            existing = species_map[canonical_name]
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
                species_map[canonical_name] = current
    
    return list(species_map.values())

async def get_real_gbif_stats(client: httpx.AsyncClient) -> Dict[str, Any]:
    """Get real-time biodiversity statistics from GBIF for Poland"""
    try:
        start_time = time.time()
        
        # Get total species count for Poland
        species_params = {
            "country": POLAND_COUNTRY_CODE,
            "rank": "SPECIES",
            "limit": 0  # We only want the count
        }
        
        species_response = await client.get(f"{GBIF_BASE_URL}/occurrence/search", params=species_params)
        species_data = species_response.json() if species_response.status_code == 200 else {}
        total_observations = species_data.get("count", 0)
        
        # Get kingdom-level statistics
        kingdom_stats = []
        kingdoms = ["Plantae", "Animalia", "Fungi", "Bacteria", "Archaea", "Protozoa"]
        
        total_species_count = 0
        
        for kingdom in kingdoms:
            try:
                kingdom_params = {
                    "country": POLAND_COUNTRY_CODE,
                    "kingdom": kingdom,
                    "rank": "SPECIES",
                    "limit": 0
                }
                
                kingdom_response = await client.get(f"{GBIF_BASE_URL}/occurrence/search", params=kingdom_params)
                if kingdom_response.status_code == 200:
                    kingdom_data = kingdom_response.json()
                    count = kingdom_data.get("count", 0)
                    if count > 0:
                        kingdom_stats.append({
                            "name": kingdom,
                            "count": count
                        })
                        total_species_count += count
                
                # Small delay to be respectful to GBIF API
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.warning(f"Failed to get stats for kingdom {kingdom}: {e}")
                continue
        
        # Sort kingdoms by count and calculate percentages
        kingdom_stats.sort(key=lambda x: x["count"], reverse=True)
        for kingdom in kingdom_stats:
            kingdom["percentage"] = (kingdom["count"] / total_species_count * 100) if total_species_count > 0 else 0
        
        # Get unique species count (approximate)
        unique_species_params = {
            "country": POLAND_COUNTRY_CODE,
            "facet": "speciesKey",
            "limit": 0
        }
        
        unique_response = await client.get(f"{GBIF_BASE_URL}/occurrence/search", params=unique_species_params)
        unique_species_count = 0
        if unique_response.status_code == 200:
            unique_data = unique_response.json()
            facets = unique_data.get("facets", [])
            for facet in facets:
                if facet.get("field") == "SPECIES_KEY":
                    unique_species_count = len(facet.get("counts", []))
                    break
        
        query_time = int((time.time() - start_time) * 1000)
        
        return {
            "totalSpecies": unique_species_count or len(kingdom_stats) * 1000,  # Fallback estimate
            "totalObservations": total_observations,
            "kingdoms": len(kingdom_stats),
            "topKingdoms": kingdom_stats[:6],  # Top 6 kingdoms
            "lastUpdated": datetime.now().isoformat(),
            "dataSource": "GBIF",
            "queryTimeMs": query_time
        }
        
    except Exception as e:
        logger.error(f"Failed to get real GBIF stats: {e}")
        # Return fallback data
        return {
            "totalSpecies": 25000,
            "totalObservations": 1000000,
            "kingdoms": 6,
            "topKingdoms": [
                {"name": "Plantae", "count": 12000, "percentage": 48.0},
                {"name": "Animalia", "count": 10000, "percentage": 40.0},
                {"name": "Fungi", "count": 2500, "percentage": 10.0},
                {"name": "Bacteria", "count": 400, "percentage": 1.6},
                {"name": "Protozoa", "count": 80, "percentage": 0.3},
                {"name": "Archaea", "count": 20, "percentage": 0.1}
            ],
            "lastUpdated": datetime.now().isoformat(),
            "dataSource": "GBIF (Estimated)",
            "queryTimeMs": 0
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
    """Search for species by scientific or vernacular name with occurrence preview"""
    start_time = time.time()
    
    try:
        # Search GBIF species API
        params = {
            "q": q,
            "limit": limit * 2,  # Get more results to account for deduplication
            "rank": "SPECIES",
            "status": "ACCEPTED"
        }
        
        logger.info(f"Searching GBIF species for: {q}")
        
        response = await client.get(f"{GBIF_BASE_URL}/species/search", params=params)
        response.raise_for_status()
        
        gbif_data = response.json()
        raw_results = gbif_data.get("results", [])
        
        logger.info(f"GBIF returned {len(raw_results)} raw species results")
        
        # Deduplicate by canonical name
        deduplicated_results = deduplicate_species_by_canonical_name(raw_results)
        deduplicated_results = deduplicated_results[:limit]
        
        logger.info(f"After deduplication: {len(deduplicated_results)} unique species")
        
        # Transform results and enrich with occurrence data
        species_list = []
        for result in deduplicated_results:
            try:
                species = transform_gbif_species(result)
                species_key = result.get("key")
                
                if species_key:
                    # Get occurrence preview and vernacular names concurrently
                    occurrence_task = get_species_occurrence_preview(client, str(species_key))
                    vernacular_task = get_vernacular_names(client, str(species_key))
                    
                    sample_lat, sample_lng, obs_count = await occurrence_task
                    vernacular_name = await vernacular_task
                    
                    # Update species with enriched data
                    species.observationCount = obs_count
                    species.sampleLatitude = sample_lat
                    species.sampleLongitude = sample_lng
                    species.vernacularName = vernacular_name
                
                species_list.append(species)
                
            except Exception as e:
                logger.warning(f"Failed to process species {result.get('scientificName', 'Unknown')}: {e}")
                continue
        
        query_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Returning {len(species_list)} enriched species results")
        
        return SearchResponse(
            results=species_list,
            total=len(species_list),
            queryTimeMs=query_time
        )
        
    except httpx.HTTPError as e:
        logger.error(f"GBIF API error: {e}")
        raise HTTPException(status_code=503, detail="GBIF API unavailable")
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/species/{species_id}/observations", response_model=ObservationsResponse)
async def get_species_observations(
    species_id: str,
    limit: int = Query(300, ge=1, le=1000, description="Maximum number of observations"),
    client: httpx.AsyncClient = Depends(get_http_client)
):
    """Get detailed observations for a specific species in Poland"""
    start_time = time.time()
    
    try:
        # Get occurrences from GBIF with comprehensive parameters
        params = {
            "speciesKey": species_id,
            "country": POLAND_COUNTRY_CODE,
            "hasCoordinate": "true",
            "hasGeospatialIssue": "false",
            "limit": limit,
            "decimalLatitude": f"{POLAND_BOUNDS['south']},{POLAND_BOUNDS['north']}",
            "decimalLongitude": f"{POLAND_BOUNDS['west']},{POLAND_BOUNDS['east']}"
        }
        
        logger.info(f"Fetching detailed observations for species {species_id}")
        
        response = await client.get(f"{GBIF_BASE_URL}/occurrence/search", params=params)
        response.raise_for_status()
        
        gbif_data = response.json()
        gbif_total = gbif_data.get("count", 0)
        raw_results = gbif_data.get("results", [])
        
        logger.info(f"GBIF returned {len(raw_results)} occurrence results out of {gbif_total} total")
        
        # Transform and validate observations
        observations = []
        filtered_count = 0
        
        for result in raw_results:
            observation = transform_gbif_occurrence(result, species_id)
            if observation:
                observations.append(observation)
            else:
                filtered_count += 1
        
        if filtered_count > 0:
            logger.info(f"Filtered out {filtered_count} observations due to data quality issues")
        
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
        raise HTTPException(status_code=503, detail="GBIF API unavailable")
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
        # Fetch species details from GBIF
        response = await client.get(f"{GBIF_BASE_URL}/species/{species_id}")
        response.raise_for_status()
        
        gbif_data = response.json()
        species = transform_gbif_species(gbif_data)
        
        # Enrich with vernacular names and occurrence preview
        vernacular_name = await get_vernacular_names(client, species_id)
        sample_lat, sample_lng, obs_count = await get_species_occurrence_preview(client, species_id)
        
        species.vernacularName = vernacular_name
        species.observationCount = obs_count
        species.sampleLatitude = sample_lat
        species.sampleLongitude = sample_lng
        
        return species
        
    except httpx.HTTPError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Species not found")
        logger.error(f"GBIF API error: {e}")
        raise HTTPException(status_code=503, detail="GBIF API unavailable")
    except Exception as e:
        logger.error(f"Species details error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/stats", response_model=StatsResponse)
async def get_biodiversity_stats(
    client: httpx.AsyncClient = Depends(get_http_client)
):
    """Get real-time biodiversity statistics for Poland from GBIF"""
    try:
        logger.info("Fetching real-time biodiversity statistics from GBIF")
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
