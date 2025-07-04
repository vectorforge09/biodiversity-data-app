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
        
        # Set up side_effect to return different responses for different calls
        mock_client.get.side_effect = [mock_response, vernacular_response]
        
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
    """Test species observations functionality with enhanced coordinate testing"""

    @pytest.fixture
    def mock_observations_client(self):
        """Mock HTTP client for observations with proper coordinate data"""
        mock_client = AsyncMock()
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "results": [
                {
                    "key": 1234567890,
                    "speciesKey": 2684876,
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
                },
                {
                    "key": 1234567891,
                    "speciesKey": 2684876,
                    "eventDate": "2023-07-20",
                    "decimalLatitude": 50.0647,
                    "decimalLongitude": 19.945,
                    "locality": "Kraków",
                    "municipality": "Kraków",
                    "stateProvince": "Małopolskie",
                    "country": "Poland",
                    "recordedBy": "Another Observer",
                    "institutionCode": "GBIF",
                    "basisOfRecord": "HUMAN_OBSERVATION",
                    "year": 2023,
                    "month": 7,
                    "day": 20
                }
            ],
            "count": 2
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
        """Test successful observations retrieval with coordinates"""
        response = observations_client.get("/api/v1/species/2684876/observations?limit=300")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "observations" in data
        assert "total" in data
        assert "queryTimeMs" in data
        assert len(data["observations"]) == 2
        
        # Test first observation
        obs1 = data["observations"][0]
        assert obs1["eventDate"] == "2023-06-15"
        assert obs1["decimalLatitude"] == 52.2297
        assert obs1["decimalLongitude"] == 21.0122
        assert obs1["locality"] == "Warsaw, Warsaw, Mazowieckie, Poland"
        
        # Test second observation
        obs2 = data["observations"][1]
        assert obs2["eventDate"] == "2023-07-20"
        assert obs2["decimalLatitude"] == 50.0647
        assert obs2["decimalLongitude"] == 19.945
        assert obs2["locality"] == "Kraków, Kraków, Małopolskie, Poland"

    def test_observations_coordinate_validation(self, observations_client):
        """Test that observations have valid coordinates within Poland bounds"""
        response = observations_client.get("/api/v1/species/2684876/observations")
        
        assert response.status_code == 200
        data = response.json()
        
        for obs in data["observations"]:
            lat = obs["decimalLatitude"]
            lng = obs["decimalLongitude"]
            
            # Check Poland bounds (more precise)
            assert 49.002 <= lat <= 54.8389
            assert 14.1229 <= lng <= 24.1458
            
            # Ensure coordinates are not null or zero
            assert lat != 0.0
            assert lng != 0.0


class TestDataTransformation:
    """Test data transformation functions with coordinate handling"""

    def test_transform_gbif_occurrence_with_coordinates(self):
        """Test GBIF occurrence data transformation with proper coordinates"""
        gbif_data = {
            "key": 1234567890,
            "speciesKey": 2684876,
            "eventDate": "2023-06-15",
            "decimalLatitude": 52.2297,
            "decimalLongitude": 21.0122,
            "locality": "Warsaw",
            "municipality": "Warsaw",
            "stateProvince": "Mazowieckie",
            "country": "Poland",
            "recordedBy": "Test Observer",
            "institutionCode": "GBIF",
            "basisOfRecord": "HUMAN_OBSERVATION"
        }
        
        observation = transform_gbif_occurrence(gbif_data, "2684876")
        
        assert observation is not None
        assert observation.id == "1234567890"
        assert observation.species_id == "2684876"
        assert observation.event_date == "2023-06-15"
        assert observation.decimal_latitude == 52.2297
        assert observation.decimal_longitude == 21.0122
        assert observation.locality == "Warsaw, Warsaw, Mazowieckie, Poland"

    def test_transform_gbif_occurrence_invalid_coordinates(self):
        """Test that invalid coordinates are filtered out"""
        # Test with coordinates outside Poland
        gbif_data_outside = {
            "key": 1234567890,
            "speciesKey": 2684876,
            "eventDate": "2023-06-15",
            "decimalLatitude": 60.0,  # Too far north
            "decimalLongitude": 25.0,  # Too far east
            "locality": "Helsinki",
            "country": "Finland",
            "recordedBy": "Test Observer",
            "institutionCode": "GBIF",
            "basisOfRecord": "HUMAN_OBSERVATION"
        }
        
        observation = transform_gbif_occurrence(gbif_data_outside, "2684876")
        assert observation is None
        
        # Test with missing coordinates
        gbif_data_no_coords = {
            "key": 1234567890,
            "speciesKey": 2684876,
            "eventDate": "2023-06-15",
            "locality": "Somewhere",
            "recordedBy": "Test Observer",
            "institutionCode": "GBIF",
            "basisOfRecord": "HUMAN_OBSERVATION"
        }
        
        observation = transform_gbif_occurrence(gbif_data_no_coords, "2684876")
        assert observation is None

    def test_transform_gbif_species_with_vernacular(self):
        """Test GBIF species data transformation with vernacular names"""
        gbif_data = {
            "key": 2684876,
            "scientificName": "Pinus sylvestris",
            "kingdom": "Plantae",
            "family": "Pinaceae",
            "genus": "Pinus",
            "rank": "SPECIES",
            "vernacularNames": [
                {"vernacularName": "Scots Pine", "language": "en"},
                {"vernacularName": "Sosna zwyczajna", "language": "pl"}
            ]
        }
        
        species = transform_gbif_species(gbif_data)
        
        assert species.id == "2684876"
        assert species.scientific_name == "Pinus sylvestris"
        assert species.vernacular_name == "Scots Pine"  # Should pick English first
        assert species.kingdom == "Plantae"
        assert species.family == "Pinaceae"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
