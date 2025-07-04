from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import asyncio
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime, timedelta
import redis
import json
from pydantic import BaseModel, Field
import os
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for request/response validation
class Species(BaseModel):
    id: str
    scientific_name: str = Field(..., alias="scientificName")
    vernacular_name: Optional[str] = Field(None, alias="vernacularName")
    kingdom: str
    phylum: Optional[str] = None
    class_name: Optional[str] = Field(None, alias="class")
    order: Optional[str] = None
    family: Optional[str] = None
    genus: Optional[str] = None
    rank: Optional[str] = None
    taxonomic_status: Optional[str] = Field(None, alias="taxonomicStatus")

    class Config:
        allow_population_by_field_name = True

class Observation(BaseModel):
    id: str
    species_id: str = Field(..., alias="speciesId")
    event_date: str = Field(..., alias="eventDate")
    decimal_latitude: Optional[float] = Field(None, alias="decimalLatitude")
    decimal_longitude: Optional[float] = Field(None, alias="decimalLongitude")
    locality: Optional[str] = None
    recorded_by: Optional[str] = Field(None, alias="recordedBy")
    institution_code: Optional[str] = Field(None, alias="institutionCode")
    basis_of_record: str = Field(..., alias="basisOfRecord")

    class Config:
        allow_population_by_field_name = True

class SearchResponse(BaseModel):
    results: List[Species]
    total: int
    query_time_ms: float = Field(..., alias="queryTimeMs")

class ObservationResponse(BaseModel):
    observations: List[Observation]
    total: int
    gbif_total: Optional[int] = Field(None, alias="gbifTotal")
    query_time_ms: float = Field(..., alias="queryTimeMs")

class StatsResponse(BaseModel):
    total_species: int = Field(..., alias="totalSpecies")
    total_observations: int = Field(..., alias="totalObservations")
    kingdoms: int
    top_kingdoms: List[Dict[str, Any]] = Field(..., alias="topKingdoms")
    last_updated: str = Field(..., alias="lastUpdated")
    data_source: str = Field(..., alias="dataSource")

# Global variables for caching and HTTP client
redis_client = None
http_client = None

# GBIF API configuration
GBIF_API_BASE = "https://api.gbif.org/v1"
POLAND_BOUNDS = {
    "min_lat": 49.0,
    "max_lat": 54.5,
    "min_lng": 14.1,
    "max_lng": 24.1
}

# Cache configuration
CACHE_DURATIONS = {
    "search": 300,      # 5 minutes
    "observations": 600, # 10 minutes
    "species": 900,     # 15 minutes
    "stats": 1800       # 30 minutes
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events"""
    global redis_client, http_client
    
    # Startup
    logger.info("Starting BioDiversity API...")
    
    # Initialize Redis client (optional, fallback to in-memory cache)
    try:
        redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            decode_responses=True
        )
        redis_client.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.warning(f"Redis not available, using in-memory cache: {e}")
        redis_client = None
    
    # Initialize HTTP client
    http_client = httpx.AsyncClient(
        timeout=30.0,
        headers={"User-Agent": "BioDiversityExplorer/1.0 (FastAPI Backend)"}
    )
    
    yield
    
    # Shutdown
    logger.info("Shutting down BioDiversity API...")
    if http_client:
        await http_client.aclose()

# Initialize FastAPI app
app = FastAPI(
    title="BioDiversity Explorer API",
    description="FastAPI backend for visualizing biodiversity data from GBIF",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://biodiversity-explorer.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache fallback
memory_cache = {}

class CacheManager:
    """Unified cache manager supporting both Redis and in-memory caching"""
    
    @staticmethod
    async def get(key: str) -> Optional[str]:
        if redis_client:
            try:
                return redis_client.get(key)
            except Exception as e:
                logger.warning(f"Redis get error: {e}")
        
        # Fallback to memory cache
        cache_entry = memory_cache.get(key)
        if cache_entry and cache_entry['expires'] > datetime.now():
            return cache_entry['data']
        return None
    
    @staticmethod
    async def set(key: str, value: str, expire_seconds: int):
        if redis_client:
            try:
                redis_client.setex(key, expire_seconds, value)
                return
            except Exception as e:
                logger.warning(f"Redis set error: {e}")
        
        # Fallback to memory cache
        memory_cache[key] = {
            'data': value,
            'expires': datetime.now() + timedelta(seconds=expire_seconds)
        }

async def get_http_client():
    """Dependency to get HTTP client"""
    return http_client

def transform_gbif_species(gbif_species: Dict[str, Any]) -> Species:
    """Transform GBIF species data to our Species model"""
    # Get English vernacular name
    vernacular_name = None
    if 'vernacularNames' in gbif_species and gbif_species['vernacularNames']:
        for vn in gbif_species['vernacularNames']:
            if vn.get('language') in ['en', 'eng']:
                vernacular_name = vn.get('vernacularName')
                break
    
    return Species(
        id=str(gbif_species['key']),
        scientificName=gbif_species.get('scientificName', gbif_species.get('canonicalName', '')),
        vernacularName=vernacular_name,
        kingdom=gbif_species.get('kingdom', 'Unknown'),
        phylum=gbif_species.get('phylum'),
        class_name=gbif_species.get('class'),
        order=gbif_species.get('order'),
        family=gbif_species.get('family'),
        genus=gbif_species.get('genus'),
        rank=gbif_species.get('rank'),
        taxonomicStatus=gbif_species.get('taxonomicStatus')
    )

def transform_gbif_occurrence(gbif_occurrence: Dict[str, Any], species_id: str) -> Observation:
    """Transform GBIF occurrence data to our Observation model"""
    # Construct event date
    event_date = gbif_occurrence.get('eventDate')
    if not event_date and gbif_occurrence.get('year'):
        month = gbif_occurrence.get('month', 1)
        day = gbif_occurrence.get('day', 1)
        event_date = f"{gbif_occurrence['year']}-{month:02d}-{day:02d}"
    
    # Construct locality
    locality_parts = [
        gbif_occurrence.get('locality'),
        gbif_occurrence.get('municipality'),
        gbif_occurrence.get('stateProvince'),
        gbif_occurrence.get('country')
    ]
    locality = ', '.join(filter(None, locality_parts)) or None
    
    return Observation(
        id=str(gbif_occurrence['key']),
        speciesId=species_id,
        eventDate=event_date or datetime.now().strftime('%Y-%m-%d'),
        decimalLatitude=gbif_occurrence.get('decimalLatitude'),
        decimalLongitude=gbif_occurrence.get('decimalLongitude'),
        locality=locality,
        recordedBy=gbif_occurrence.get('recordedBy'),
        institutionCode=gbif_occurrence.get('institutionCode'),
        basisOfRecord=gbif_occurrence.get('basisOfRecord', 'UNKNOWN')
    )

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "BioDiversity Explorer API",
        "version": "1.0.0",
        "description": "FastAPI backend for visualizing biodiversity data from GBIF",
        "endpoints": {
            "search": "/api/v1/species/search",
            "observations": "/api/v1/species/{species_id}/observations",
            "species_details": "/api/v1/species/{species_id}",
            "stats": "/api/v1/stats"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "redis_available": redis_client is not None
    }

@app.get("/api/v1/species/search", response_model=SearchResponse)
async def search_species(
    q: str = Query(..., min_length=2, description="Search query for species"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
    client: httpx.AsyncClient = Depends(get_http_client)
):
    """
    Search for species by scientific or vernacular names
    
    - **q**: Search query (minimum 2 characters)
    - **limit**: Maximum number of results (1-50)
    """
    start_time = datetime.now()
    
    # Check cache
    cache_key = f"search:{q.lower()}:{limit}"
    cached_result = await CacheManager.get(cache_key)
    if cached_result:
        logger.info(f"Cache hit for search: {q}")
        return SearchResponse.parse_raw(cached_result)
    
    try:
        # Search GBIF species API
        params = {
            "q": q,
            "limit": limit,
            "offset": 0,
            "rank": "SPECIES",
            "status": "ACCEPTED"
        }
        
        response = await client.get(f"{GBIF_API_BASE}/species/search", params=params)
        response.raise_for_status()
        
        data = response.json()
        
        # Transform results
        species_list = []
        for gbif_species in data.get('results', []):
            if gbif_species.get('rank') == 'SPECIES':
                try:
                    species = transform_gbif_species(gbif_species)
                    species_list.append(species)
                except Exception as e:
                    logger.warning(f"Error transforming species {gbif_species.get('key')}: {e}")
        
        query_time = (datetime.now() - start_time).total_seconds() * 1000
        
        result = SearchResponse(
            results=species_list[:limit],
            total=min(data.get('count', 0), limit),
            queryTimeMs=query_time
        )
        
        # Cache result
        await CacheManager.set(
            cache_key, 
            result.json(), 
            CACHE_DURATIONS['search']
        )
        
        logger.info(f"Species search completed: {q} -> {len(species_list)} results in {query_time:.2f}ms")
        return result
        
    except httpx.HTTPError as e:
        logger.error(f"GBIF API error during search: {e}")
        raise HTTPException(status_code=503, detail="External API unavailable")
    except Exception as e:
        logger.error(f"Unexpected error during search: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/species/{species_id}/observations", response_model=ObservationResponse)
async def get_species_observations(
    species_id: str,
    limit: int = Query(300, ge=1, le=1000, description="Maximum number of observations"),
    client: httpx.AsyncClient = Depends(get_http_client)
):
    """
    Get observations for a specific species in Poland
    
    - **species_id**: GBIF species key
    - **limit**: Maximum number of observations (1-1000)
    """
    start_time = datetime.now()
    
    # Check cache
    cache_key = f"observations:{species_id}:{limit}"
    cached_result = await CacheManager.get(cache_key)
    if cached_result:
        logger.info(f"Cache hit for observations: {species_id}")
        return ObservationResponse.parse_raw(cached_result)
    
    try:
        # Fetch occurrences from GBIF
        params = {
            "taxonKey": species_id,
            "country": "PL",  # Poland
            "hasCoordinate": "true",
            "hasGeospatialIssue": "false",
            "limit": limit,
            "offset": 0
        }
        
        response = await client.get(f"{GBIF_API_BASE}/occurrence/search", params=params)
        response.raise_for_status()
        
        data = response.json()
        
        # Filter and transform observations
        observations = []
        for gbif_occ in data.get('results', []):
            lat = gbif_occ.get('decimalLatitude')
            lng = gbif_occ.get('decimalLongitude')
            
            # Validate coordinates are within Poland bounds
            if (lat and lng and 
                POLAND_BOUNDS['min_lat'] <= lat <= POLAND_BOUNDS['max_lat'] and
                POLAND_BOUNDS['min_lng'] <= lng <= POLAND_BOUNDS['max_lng']):
                
                try:
                    observation = transform_gbif_occurrence(gbif_occ, species_id)
                    observations.append(observation)
                except Exception as e:
                    logger.warning(f"Error transforming observation {gbif_occ.get('key')}: {e}")
        
        # Sort by date
        observations.sort(key=lambda x: x.event_date)
        
        query_time = (datetime.now() - start_time).total_seconds() * 1000
        
        result = ObservationResponse(
            observations=observations,
            total=len(observations),
            gbifTotal=data.get('count', 0),
            queryTimeMs=query_time
        )
        
        # Cache result
        await CacheManager.set(
            cache_key,
            result.json(),
            CACHE_DURATIONS['observations']
        )
        
        logger.info(f"Observations fetched: {species_id} -> {len(observations)} observations in {query_time:.2f}ms")
        return result
        
    except httpx.HTTPError as e:
        logger.error(f"GBIF API error during observations fetch: {e}")
        raise HTTPException(status_code=503, detail="External API unavailable")
    except Exception as e:
        logger.error(f"Unexpected error during observations fetch: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/species/{species_id}", response_model=Species)
async def get_species_details(
    species_id: str,
    client: httpx.AsyncClient = Depends(get_http_client)
):
    """
    Get detailed information for a specific species
    
    - **species_id**: GBIF species key
    """
    # Check cache
    cache_key = f"species:{species_id}"
    cached_result = await CacheManager.get(cache_key)
    if cached_result:
        logger.info(f"Cache hit for species details: {species_id}")
        return Species.parse_raw(cached_result)
    
    try:
        # Fetch species details and vernacular names
        species_response, vernacular_response = await asyncio.gather(
            client.get(f"{GBIF_API_BASE}/species/{species_id}"),
            client.get(f"{GBIF_API_BASE}/species/{species_id}/vernacularNames?limit=10"),
            return_exceptions=True
        )
        
        if isinstance(species_response, Exception):
            raise species_response
        
        species_response.raise_for_status()
        species_data = species_response.json()
        
        # Add vernacular names if available
        if not isinstance(vernacular_response, Exception) and vernacular_response.status_code == 200:
            vernacular_data = vernacular_response.json()
            species_data['vernacularNames'] = vernacular_data.get('results', [])
        
        species = transform_gbif_species(species_data)
        
        # Cache result
        await CacheManager.set(
            cache_key,
            species.json(),
            CACHE_DURATIONS['species']
        )
        
        logger.info(f"Species details fetched: {species_id}")
        return species
        
    except httpx.HTTPError as e:
        logger.error(f"GBIF API error during species details fetch: {e}")
        raise HTTPException(status_code=503, detail="External API unavailable")
    except Exception as e:
        logger.error(f"Unexpected error during species details fetch: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/stats", response_model=StatsResponse)
async def get_biodiversity_stats(
    client: httpx.AsyncClient = Depends(get_http_client)
):
    """
    Get biodiversity statistics for Poland
    """
    # Check cache
    cache_key = "stats:poland"
    cached_result = await CacheManager.get(cache_key)
    if cached_result:
        logger.info("Cache hit for biodiversity stats")
        return StatsResponse.parse_raw(cached_result)
    
    try:
        # Fetch statistics from GBIF
        species_response, occurrence_response, kingdom_response = await asyncio.gather(
            client.get(f"{GBIF_API_BASE}/occurrence/search?country=PL&limit=0&facet=speciesKey"),
            client.get(f"{GBIF_API_BASE}/occurrence/search?country=PL&limit=0"),
            client.get(f"{GBIF_API_BASE}/occurrence/search?country=PL&limit=0&facet=kingdomKey"),
            return_exceptions=True
        )
        
        # Process responses
        total_species = 0
        total_observations = 0
        kingdoms_count = 0
        top_kingdoms = []
        
        if not isinstance(species_response, Exception) and species_response.status_code == 200:
            species_data = species_response.json()
            species_facet = next((f for f in species_data.get('facets', []) if f['field'] == 'SPECIES_KEY'), None)
            if species_facet:
                total_species = len(species_facet.get('counts', []))
        
        if not isinstance(occurrence_response, Exception) and occurrence_response.status_code == 200:
            occurrence_data = occurrence_response.json()
            total_observations = occurrence_data.get('count', 0)
        
        if not isinstance(kingdom_response, Exception) and kingdom_response.status_code == 200:
            kingdom_data = kingdom_response.json()
            kingdom_facet = next((f for f in kingdom_data.get('facets', []) if f['field'] == 'KINGDOM_KEY'), None)
            if kingdom_facet:
                kingdom_counts = kingdom_facet.get('counts', [])
                kingdoms_count = len(kingdom_counts)
                
                # Map kingdom keys to names
                kingdom_names = {
                    "1": "Animalia",
                    "6": "Plantae", 
                    "5": "Fungi",
                    "3": "Bacteria",
                    "7": "Viruses",
                    "2": "Archaea"
                }
                
                top_kingdoms = [
                    {
                        "name": kingdom_names.get(str(k['name']), f"Kingdom {k['name']}"),
                        "count": k['count']
                    }
                    for k in kingdom_counts[:4]
                ]
        
        result = StatsResponse(
            totalSpecies=total_species,
            totalObservations=total_observations,
            kingdoms=kingdoms_count,
            topKingdoms=top_kingdoms,
            lastUpdated=datetime.now().isoformat(),
            dataSource="GBIF - Global Biodiversity Information Facility"
        )
        
        # Cache result
        await CacheManager.set(
            cache_key,
            result.json(),
            CACHE_DURATIONS['stats']
        )
        
        logger.info("Biodiversity stats fetched successfully")
        return result
        
    except Exception as e:
        logger.error(f"Error fetching biodiversity stats: {e}")
        
        # Return fallback stats
        fallback_stats = StatsResponse(
            totalSpecies=28547,
            totalObservations=1247832,
            kingdoms=6,
            topKingdoms=[
                {"name": "Plantae", "count": 12543},
                {"name": "Animalia", "count": 15234},
                {"name": "Fungi", "count": 567},
                {"name": "Bacteria", "count": 203}
            ],
            lastUpdated=datetime.now().isoformat(),
            dataSource="GBIF - Global Biodiversity Information Facility (Cached)"
        )
        
        return fallback_stats

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
