# BioDiversity Explorer API Documentation

## Overview

FastAPI-based backend service for the BioDiversity Explorer application, providing access to GBIF (Global Biodiversity Information Facility) data with a focus on Poland's biodiversity.

## Features

- **High Performance**: Async/await architecture with connection pooling
- **Intelligent Caching**: Redis-backed caching with memory fallback
- **Data Validation**: Pydantic models for request/response validation
- **Geographic Filtering**: Optimized for Polish territory bounds
- **Error Handling**: Comprehensive error handling and logging
- **Unit Testing**: Extensive test coverage with performance tests

## API Endpoints

### Base URL
\`\`\`
http://localhost:8000
\`\`\`

### Authentication
No authentication required - GBIF provides open access to biodiversity data.

## Endpoints

### 1. Species Search
\`\`\`http
GET /api/v1/species/search
\`\`\`

Search for species by scientific or vernacular names.

**Parameters:**
- \`q\` (required): Search query (minimum 2 characters)
- \`limit\` (optional): Maximum results (1-50, default: 10)

**Example:**
\`\`\`bash
curl "http://localhost:8000/api/v1/species/search?q=Pinus&limit=5"
\`\`\`

**Response:**
\`\`\`json
{
  "results": [
    {
      "id": "2684876",
      "scientificName": "Pinus sylvestris",
      "vernacularName": "Scots Pine",
      "kingdom": "Plantae",
      "family": "Pinaceae",
      "genus": "Pinus",
      "rank": "SPECIES"
    }
  ],
  "total": 1,
  "queryTimeMs": 245.5
}
\`\`\`

### 2. Species Observations
\`\`\`http
GET /api/v1/species/{species_id}/observations
\`\`\`

Get observation records for a specific species in Poland.

**Parameters:**
- \`species_id\` (required): GBIF species key
- \`limit\` (optional): Maximum observations (1-1000, default: 300)

**Example:**
\`\`\`bash
curl "http://localhost:8000/api/v1/species/2684876/observations?limit=100"
\`\`\`

**Response:**
\`\`\`json
{
  "observations": [
    {
      "id": "1234567890",
      "speciesId": "2684876",
      "eventDate": "2023-06-15",
      "decimalLatitude": 52.2297,
      "decimalLongitude": 21.0122,
      "locality": "Warsaw, Mazowieckie, Poland",
      "recordedBy": "John Doe",
      "institutionCode": "iNaturalist",
      "basisOfRecord": "HUMAN_OBSERVATION"
    }
  ],
  "total": 1,
  "gbifTotal": 15420,
  "queryTimeMs": 892.3
}
\`\`\`

### 3. Species Details
\`\`\`http
GET /api/v1/species/{species_id}
\`\`\`

Get detailed information for a specific species.

**Parameters:**
- \`species_id\` (required): GBIF species key

**Example:**
\`\`\`bash
curl "http://localhost:8000/api/v1/species/2684876"
\`\`\`

**Response:**
\`\`\`json
{
  "id": "2684876",
  "scientificName": "Pinus sylvestris",
  "vernacularName": "Scots Pine",
  "kingdom": "Plantae",
  "phylum": "Tracheophyta",
  "class": "Pinopsida",
  "order": "Pinales",
  "family": "Pinaceae",
  "genus": "Pinus",
  "rank": "SPECIES",
  "taxonomicStatus": "ACCEPTED"
}
\`\`\`

### 4. Biodiversity Statistics
\`\`\`http
GET /api/v1/stats
\`\`\`

Get biodiversity statistics for Poland.

**Example:**
\`\`\`bash
curl "http://localhost:8000/api/v1/stats"
\`\`\`

**Response:**
\`\`\`json
{
  "totalSpecies": 28547,
  "totalObservations": 1247832,
  "kingdoms": 6,
  "topKingdoms": [
    {"name": "Plantae", "count": 15234},
    {"name": "Animalia", "count": 12543},
    {"name": "Fungi", "count": 567},
    {"name": "Bacteria", "count": 203}
  ],
  "lastUpdated": "2024-01-15T10:30:00Z",
  "dataSource": "GBIF - Global Biodiversity Information Facility"
}
\`\`\`

### 5. Health Check
\`\`\`http
GET /health
\`\`\`

Check API health status.

**Response:**
\`\`\`json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "redis_available": true
}
\`\`\`

## Performance Optimizations

### Caching Strategy
- **Search Results**: 5 minutes (frequent user interactions)
- **Observations**: 10 minutes (balance between freshness and performance)
- **Species Details**: 15 minutes (relatively stable taxonomic data)
- **Statistics**: 30 minutes (aggregate data changes slowly)

### Geographic Optimization
- Pre-filtered for Polish territory bounds (49-54.5°N, 14.1-24.1°E)
- Coordinate validation to exclude invalid locations
- Optimized for European coordinate systems

### Data Quality Measures
- Only georeferenced records included
- Geospatial issues filtered out
- Species-level taxa only (no subspecies/varieties)
- Accepted taxonomic status only

## Error Handling

### HTTP Status Codes
- \`200\`: Success
- \`400\`: Bad Request (invalid parameters)
- \`404\`: Not Found (species not found)
- \`422\`: Validation Error (invalid input format)
- \`500\`: Internal Server Error
- \`503\`: Service Unavailable (GBIF API down)

### Error Response Format
\`\`\`json
{
  "detail": "Error description",
  "error_code": "GBIF_API_ERROR",
  "timestamp": "2024-01-15T10:30:00Z"
}
\`\`\`

## Rate Limiting

The API implements respectful rate limiting for GBIF API calls:
- Maximum 10 requests per second per client
- Intelligent caching to minimize external API calls
- Automatic retry with exponential backoff

## Development Setup

### Prerequisites
- Python 3.11+
- Redis (optional, falls back to memory cache)
- Docker (optional)

### Installation
\`\`\`bash
# Clone repository
git clone <repository-url>
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
\`\`\`

### Docker Setup
\`\`\`bash
# Build and run with Docker Compose
docker-compose up --build

# API available at http://localhost:8000
# Redis available at localhost:6379
\`\`\`

### Running Tests
\`\`\`bash
# Run all tests
./run_tests.sh

# Run specific test categories
pytest tests/test_api.py -v                    # Unit tests
pytest tests/test_performance.py -v           # Performance tests
pytest tests/ --cov=main --cov-report=html    # Coverage report
\`\`\`

## Production Deployment

### Environment Variables
\`\`\`bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# CORS Configuration
CORS_ORIGINS=https://biodiversity-explorer.com,https://app.biodiversity.org

# Logging
LOG_LEVEL=INFO
\`\`\`

### Performance Tuning
\`\`\`bash
# Run with multiple workers
uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000

# With Gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
\`\`\`

### Monitoring
- Health check endpoint: \`/health\`
- Metrics available via FastAPI's built-in monitoring
- Redis monitoring via Redis CLI or monitoring tools

## API Client Examples

### Python
\`\`\`python
import httpx

async def search_species(query: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "http://localhost:8000/api/v1/species/search",
            params={"q": query, "limit": 10}
        )
        return response.json()

# Usage
results = await search_species("Pinus sylvestris")
\`\`\`

### JavaScript/TypeScript
\`\`\`javascript
async function searchSpecies(query) {
    const response = await fetch(
        \`http://localhost:8000/api/v1/species/search?q=\${encodeURIComponent(query)}&limit=10\`
    );
    return await response.json();
}

// Usage
const results = await searchSpecies("Pinus sylvestris");
\`\`\`

### cURL
\`\`\`bash
# Search species
curl -X GET "http://localhost:8000/api/v1/species/search?q=Pinus&limit=5" \
     -H "Accept: application/json"

# Get observations
curl -X GET "http://localhost:8000/api/v1/species/2684876/observations?limit=100" \
     -H "Accept: application/json"
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
