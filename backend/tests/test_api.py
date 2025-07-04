import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from httpx import AsyncClient
import json
from datetime import datetime

from main import app, get_http_client, transform_gbif_species, transform_gbif_occurrence


class TestSpeciesSearch:
    """Test species search functionality with both sync and async approaches"""

    @pytest.fixture
    def mock_http_client(self):
        """Create a mock HTTP client for testing"""
        mock_client = AsyncMock()
        
        # Mock successful GBIF species search response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "results": [
                {
                    "key": 2684876,
                    "scientificName": "Pinus sylvestris",
                    "canonicalName": "Pinus sylvestris",
                    "kingdom": "Plantae",
                    "phylum": "Tracheophyta",
                    "class": "Pinopsida",
                    "order": "Pinales",
                    "family": "Pinaceae",
                    "genus": "Pinus",
                    "rank": "SPECIES",
                    "taxonomicStatus": "ACCEPTED"
                }
            ],
            "count": 1
        }
        mock_response.raise_for_status.return_value = None
        mock_client.get.return_value = mock_response
        
        return mock_client

    @pytest.fixture
    def client_with_mock(self, mock_http_client):
        """Fixture combining TestClient with mocked dependencies"""
        app.dependency_overrides[get_http_client] = lambda: mock_http_client
        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()

    def test_search_species_success_sync(self, client_with_mock):
        """Test successful species search using sync TestClient"""
        response = client_with_mock.get("/api/v1/species/search?q=Pinus&limit=10")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        assert "total" in data
        assert "queryTimeMs" in data
        assert len(data["results"]) == 1
        assert data["results"][0]["scientificName"] == "Pinus sylvestris"
        assert data["results"][0]["kingdom"] == "Plantae"

    @pytest.mark.asyncio
    async def test_search_species_success_async(self, mock_http_client):
        """Test successful species search using async client"""
        app.dependency_overrides[get_http_client] = lambda: mock_http_client
        
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/api/v1/species/search?q=Pinus&limit=10")
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        assert len(data["results"]) == 1
        assert data["results"][0]["scientificName"] == "Pinus sylvestris"

    def test_search_species_validation_error(self, client_with_mock):
        """Test validation error for short query"""
        response = client_with_mock.get("/api/v1/species/search?q=P&limit=10")
        
        assert response.status_code == 422  # Validation error

    def test_search_species_limit_validation(self, client_with_mock):
        """Test limit parameter validation"""
        # Test limit too high
        response = client_with_mock.get("/api/v1/species/search?q=Pinus&limit=100")
        assert response.status_code == 422
        
        # Test limit too low
        response = client_with_mock.get("/api/v1/species/search?q=Pinus&limit=0")
        assert response.status_code == 422


class TestObservations:
    """Test species observations functionality"""

    @pytest.fixture
    def mock_observations_client(self):
        """Mock HTTP client for observations"""
        mock_client = AsyncMock()
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "results": [
                {
                    "key": 1234567890,
                    "eventDate": "2023-06-15",
                    "decimalLatitude": 52.2297,
                    "decimalLongitude": 21.0122,
                    "locality": "Warsaw",
                    "municipality": "Warsaw",
                    "stateProvince": "Mazowieckie",
                    "country": "Poland",
                    "recordedBy": "Test Observer",
                    "institutionCode": "GBIF",
                    "basisOfRecord": "HUMAN_OBSERVATION",
                    "year": 2023,
                    "month": 6,
                    "day": 15
                }
            ],
            "count": 1
        }
        mock_response.raise_for_status.return_value = None
        mock_client.get.return_value = mock_response
        
        return mock_client

    @pytest.fixture
    def observations_client(self, mock_observations_client):
        """Test client with observations mock"""
        app.dependency_overrides[get_http_client] = lambda: mock_observations_client
        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()

    def test_get_observations_success(self, observations_client):
        """Test successful observations retrieval"""
        response = observations_client.get("/api/v1/species/2684876/observations?limit=300")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "observations" in data
        assert "total" in data
        assert "queryTimeMs" in data
        assert len(data["observations"]) == 1
        
        obs = data["observations"][0]
        assert obs["eventDate"] == "2023-06-15"
        assert obs["decimalLatitude"] == 52.2297
        assert obs["decimalLongitude"] == 21.0122

    def test_observations_geographic_filtering(self, observations_client):
        """Test that observations are filtered to Poland bounds"""
        response = observations_client.get("/api/v1/species/2684876/observations")
        
        assert response.status_code == 200
        data = response.json()
        
        for obs in data["observations"]:
            lat = obs["decimalLatitude"]
            lng = obs["decimalLongitude"]
            
            # Check Poland bounds
            assert 49.0 <= lat <= 54.5
            assert 14.1 <= lng <= 24.1


class TestSpeciesDetails:
    """Test species details functionality"""

    @pytest.fixture
    def mock_species_client(self):
        """Mock HTTP client for species details"""
        mock_client = AsyncMock()
        
        # Mock species details response
        species_response = MagicMock()
        species_response.status_code = 200
        species_response.json.return_value = {
            "key": 2684876,
            "scientificName": "Pinus sylvestris",
            "kingdom": "Plantae",
            "family": "Pinaceae",
            "genus": "Pinus",
            "rank": "SPECIES"
        }
        species_response.raise_for_status.return_value = None
        
        # Mock vernacular names response
        vernacular_response = MagicMock()
        vernacular_response.status_code = 200
        vernacular_response.json.return_value = {
            "results": [
                {
                    "vernacularName": "Scots Pine",
                    "language": "en"
                }
            ]
        }
        
        mock_client.get.side_effect = [species_response, vernacular_response]
        return mock_client

    @pytest.fixture
    def species_client(self, mock_species_client):
        """Test client with species details mock"""
        app.dependency_overrides[get_http_client] = lambda: mock_species_client
        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()

    def test_get_species_details_success(self, species_client):
        """Test successful species details retrieval"""
        response = species_client.get("/api/v1/species/2684876")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == "2684876"
        assert data["scientificName"] == "Pinus sylvestris"
        assert data["kingdom"] == "Plantae"
        assert data["family"] == "Pinaceae"


class TestStats:
    """Test biodiversity statistics functionality"""

    @pytest.fixture
    def mock_stats_client(self):
        """Mock HTTP client for statistics"""
        mock_client = AsyncMock()
        
        # Mock multiple responses for different stats endpoints
        responses = []
        
        # Species count response
        species_response = MagicMock()
        species_response.status_code = 200
        species_response.json.return_value = {
            "facets": [
                {
                    "field": "SPECIES_KEY",
                    "counts": [{"name": str(i), "count": 100} for i in range(1000)]
                }
            ]
        }
        responses.append(species_response)
        
        # Occurrence count response
        occurrence_response = MagicMock()
        occurrence_response.status_code = 200
        occurrence_response.json.return_value = {"count": 50000}
        responses.append(occurrence_response)
        
        # Kingdom count response
        kingdom_response = MagicMock()
        kingdom_response.status_code = 200
        kingdom_response.json.return_value = {
            "facets": [
                {
                    "field": "KINGDOM_KEY",
                    "counts": [
                        {"name": "6", "count": 25000},  # Plantae
                        {"name": "1", "count": 20000},  # Animalia
                        {"name": "5", "count": 3000},   # Fungi
                        {"name": "3", "count": 2000}    # Bacteria
                    ]
                }
            ]
        }
        responses.append(kingdom_response)
        
        mock_client.get.side_effect = responses
        return mock_client

    @pytest.fixture
    def stats_client(self, mock_stats_client):
        """Test client with stats mock"""
        app.dependency_overrides[get_http_client] = lambda: mock_stats_client
        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()

    def test_get_stats_success(self, stats_client):
        """Test successful statistics retrieval"""
        response = stats_client.get("/api/v1/stats")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "totalSpecies" in data
        assert "totalObservations" in data
        assert "kingdoms" in data
        assert "topKingdoms" in data
        assert "lastUpdated" in data
        assert "dataSource" in data
        
        assert data["totalSpecies"] == 1000
        assert data["totalObservations"] == 50000
        assert len(data["topKingdoms"]) == 4


class TestDataTransformation:
    """Test data transformation functions"""

    def test_transform_gbif_species(self):
        """Test GBIF species data transformation"""
        gbif_data = {
            "key": 2684876,
            "scientificName": "Pinus sylvestris",
            "kingdom": "Plantae",
            "family": "Pinaceae",
            "genus": "Pinus",
            "rank": "SPECIES",
            "vernacularNames": [
                {"vernacularName": "Scots Pine", "language": "en"}
            ]
        }
        
        species = transform_gbif_species(gbif_data)
        
        assert species.id == "2684876"
        assert species.scientific_name == "Pinus sylvestris"
        assert species.vernacular_name == "Scots Pine"
        assert species.kingdom == "Plantae"
        assert species.family == "Pinaceae"

    def test_transform_gbif_occurrence(self):
        """Test GBIF occurrence data transformation"""
        gbif_data = {
            "key": 1234567890,
            "eventDate": "2023-06-15",
            "decimalLatitude": 52.2297,
            "decimalLongitude": 21.0122,
            "locality": "Warsaw",
            "recordedBy": "Test Observer",
            "institutionCode": "GBIF",
            "basisOfRecord": "HUMAN_OBSERVATION"
        }
        
        observation = transform_gbif_occurrence(gbif_data, "2684876")
        
        assert observation.id == "1234567890"
        assert observation.species_id == "2684876"
        assert observation.event_date == "2023-06-15"
        assert observation.decimal_latitude == 52.2297
        assert observation.decimal_longitude == 21.0122


class TestAsyncIntegration:
    """Test async integration and concurrent requests"""

    @pytest.mark.asyncio
    async def test_concurrent_requests(self):
        """Test handling multiple concurrent requests"""
        mock_client = AsyncMock()
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"results": [], "count": 0}
        mock_response.raise_for_status.return_value = None
        mock_client.get.return_value = mock_response
        
        app.dependency_overrides[get_http_client] = lambda: mock_client
        
        async with AsyncClient(app=app, base_url="http://test") as ac:
            # Make multiple concurrent requests
            tasks = [
                ac.get("/api/v1/species/search?q=Pinus&limit=10"),
                ac.get("/api/v1/species/search?q=Quercus&limit=10"),
                ac.get("/api/v1/species/search?q=Fagus&limit=10")
            ]
            
            responses = await asyncio.gather(*tasks)
        
        app.dependency_overrides.clear()
        
        # All requests should succeed
        for response in responses:
            assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test health check endpoint"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert "timestamp" in data
        assert data["status"] == "healthy"


class TestErrorHandling:
    """Test error handling scenarios"""

    @pytest.fixture
    def error_client(self):
        """Mock client that raises errors"""
        mock_client = AsyncMock()
        mock_client.get.side_effect = Exception("Network error")
        
        app.dependency_overrides[get_http_client] = lambda: mock_client
        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()

    def test_search_network_error(self, error_client):
        """Test handling of network errors during search"""
        response = error_client.get("/api/v1/species/search?q=Pinus&limit=10")
        
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data

    def test_observations_network_error(self, error_client):
        """Test handling of network errors during observations fetch"""
        response = error_client.get("/api/v1/species/2684876/observations")
        
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
