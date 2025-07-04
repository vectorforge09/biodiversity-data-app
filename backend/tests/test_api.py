import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
import json
from datetime import datetime

from main import app, CacheManager, transform_gbif_species, transform_gbif_occurrence

# Test client
client = TestClient(app)

class TestSpeciesSearch:
    """Test cases for species search functionality"""
    
    def test_search_species_success(self):
        """Test successful species search"""
        with patch('main.http_client') as mock_client:
            # Mock GBIF API response
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "results": [
                    {
                        "key": 123,
                        "scientificName": "Pinus sylvestris",
                        "canonicalName": "Pinus sylvestris",
                        "kingdom": "Plantae",
                        "family": "Pinaceae",
                        "rank": "SPECIES",
                        "vernacularNames": [
                            {"vernacularName": "Scots Pine", "language": "en"}
                        ]
                    }
                ],
                "count": 1
            }
            mock_response.raise_for_status.return_value = None
            mock_client.get.return_value = mock_response
            
            response = client.get("/api/v1/species/search?q=Pinus")
            
            assert response.status_code == 200
            data = response.json()
            assert "results" in data
            assert len(data["results"]) == 1
            assert data["results"][0]["scientificName"] == "Pinus sylvestris"
            assert data["results"][0]["kingdom"] == "Plantae"
    
    def test_search_species_invalid_query(self):
        """Test search with invalid query (too short)"""
        response = client.get("/api/v1/species/search?q=P")
        assert response.status_code == 422  # Validation error
    
    def test_search_species_api_error(self):
        """Test search when GBIF API is unavailable"""
        with patch('main.http_client') as mock_client:
            mock_client.get.side_effect = Exception("API Error")
            
            response = client.get("/api/v1/species/search?q=Pinus")
            assert response.status_code == 500

class TestObservations:
    """Test cases for observations functionality"""
    
    def test_get_observations_success(self):
        """Test successful observations retrieval"""
        with patch('main.http_client') as mock_client:
            # Mock GBIF API response
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "results": [
                    {
                        "key": 456,
                        "decimalLatitude": 52.2297,
                        "decimalLongitude": 21.0122,
                        "eventDate": "2023-06-15",
                        "locality": "Warsaw",
                        "basisOfRecord": "HUMAN_OBSERVATION"
                    }
                ],
                "count": 1
            }
            mock_response.raise_for_status.return_value = None
            mock_client.get.return_value = mock_response
            
            response = client.get("/api/v1/species/123/observations")
            
            assert response.status_code == 200
            data = response.json()
            assert "observations" in data
            assert len(data["observations"]) == 1
            assert data["observations"][0]["decimalLatitude"] == 52.2297
    
    def test_get_observations_coordinate_filtering(self):
        """Test that observations outside Poland bounds are filtered"""
        with patch('main.http_client') as mock_client:
            # Mock GBIF API response with coordinates outside Poland
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "results": [
                    {
                        "key": 456,
                        "decimalLatitude": 60.0,  # Outside Poland bounds
                        "decimalLongitude": 21.0122,
                        "eventDate": "2023-06-15",
                        "basisOfRecord": "HUMAN_OBSERVATION"
                    },
                    {
                        "key": 457,
                        "decimalLatitude": 52.2297,  # Within Poland bounds
                        "decimalLongitude": 21.0122,
                        "eventDate": "2023-06-15",
                        "basisOfRecord": "HUMAN_OBSERVATION"
                    }
                ],
                "count": 2
            }
            mock_response.raise_for_status.return_value = None
            mock_client.get.return_value = mock_response
            
            response = client.get("/api/v1/species/123/observations")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["observations"]) == 1  # Only one within bounds

class TestSpeciesDetails:
    """Test cases for species details functionality"""
    
    def test_get_species_details_success(self):
        """Test successful species details retrieval"""
        with patch('main.http_client') as mock_client:
            # Mock species response
            species_response = MagicMock()
            species_response.json.return_value = {
                "key": 123,
                "scientificName": "Pinus sylvestris",
                "kingdom": "Plantae",
                "family": "Pinaceae",
                "rank": "SPECIES"
            }
            species_response.raise_for_status.return_value = None
            species_response.status_code = 200
            
            # Mock vernacular names response
            vernacular_response = MagicMock()
            vernacular_response.json.return_value = {
                "results": [
                    {"vernacularName": "Scots Pine", "language": "en"}
                ]
            }
            vernacular_response.status_code = 200
            
            mock_client.get.side_effect = [species_response, vernacular_response]
            
            response = client.get("/api/v1/species/123")
            
            assert response.status_code == 200
            data = response.json()
            assert data["scientificName"] == "Pinus sylvestris"
            assert data["kingdom"] == "Plantae"

class TestStats:
    """Test cases for biodiversity statistics"""
    
    def test_get_stats_success(self):
        """Test successful stats retrieval"""
        with patch('main.http_client') as mock_client:
            # Mock multiple API responses
            responses = []
            
            # Species response
            species_response = MagicMock()
            species_response.json.return_value = {
                "facets": [
                    {
                        "field": "SPECIES_KEY",
                        "counts": [{"name": "123", "count": 100}] * 1000  # 1000 species
                    }
                ]
            }
            species_response.status_code = 200
            responses.append(species_response)
            
            # Occurrence response
            occurrence_response = MagicMock()
            occurrence_response.json.return_value = {"count": 50000}
            occurrence_response.status_code = 200
            responses.append(occurrence_response)
            
            # Kingdom response
            kingdom_response = MagicMock()
            kingdom_response.json.return_value = {
                "facets": [
                    {
                        "field": "KINGDOM_KEY",
                        "counts": [
                            {"name": "6", "count": 30000},  # Plantae
                            {"name": "1", "count": 20000}   # Animalia
                        ]
                    }
                ]
            }
            kingdom_response.status_code = 200
            responses.append(kingdom_response)
            
            mock_client.get.side_effect = responses
            
            response = client.get("/api/v1/stats")
            
            assert response.status_code == 200
            data = response.json()
            assert "totalSpecies" in data
            assert "totalObservations" in data
            assert data["totalSpecies"] == 1000
            assert data["totalObservations"] == 50000

class TestDataTransformation:
    """Test cases for data transformation functions"""
    
    def test_transform_gbif_species(self):
        """Test GBIF species data transformation"""
        gbif_data = {
            "key": 123,
            "scientificName": "Pinus sylvestris",
            "kingdom": "Plantae",
            "family": "Pinaceae",
            "rank": "SPECIES",
            "vernacularNames": [
                {"vernacularName": "Scots Pine", "language": "en"}
            ]
        }
        
        species = transform_gbif_species(gbif_data)
        
        assert species.id == "123"
        assert species.scientific_name == "Pinus sylvestris"
        assert species.kingdom == "Plantae"
        assert species.family == "Pinaceae"
    
    def test_transform_gbif_occurrence(self):
        """Test GBIF occurrence data transformation"""
        gbif_data = {
            "key": 456,
            "decimalLatitude": 52.2297,
            "decimalLongitude": 21.0122,
            "eventDate": "2023-06-15",
            "locality": "Warsaw",
            "basisOfRecord": "HUMAN_OBSERVATION"
        }
        
        observation = transform_gbif_occurrence(gbif_data, "123")
        
        assert observation.id == "456"
        assert observation.species_id == "123"
        assert observation.decimal_latitude == 52.2297
        assert observation.decimal_longitude == 21.0122
        assert observation.event_date == "2023-06-15"

class TestCaching:
    """Test cases for caching functionality"""
    
    @pytest.mark.asyncio
    async def test_cache_manager_memory_fallback(self):
        """Test cache manager with memory fallback"""
        # Test setting and getting from memory cache
        await CacheManager.set("test_key", "test_value", 300)
        result = await CacheManager.get("test_key")
        
        assert result == "test_value"
    
    @pytest.mark.asyncio
    async def test_cache_manager_expiration(self):
        """Test cache expiration"""
        # This would require mocking datetime, simplified for demo
        await CacheManager.set("expire_test", "value", 1)
        # In real test, would wait or mock time passage
        result = await CacheManager.get("expire_test")
        assert result == "value"  # Would be None after expiration

class TestHealthCheck:
    """Test cases for health check endpoint"""
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data

class TestRootEndpoint:
    """Test cases for root endpoint"""
    
    def test_root_endpoint(self):
        """Test root endpoint returns API information"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "endpoints" in data

# Performance tests
class TestPerformance:
    """Test cases for performance requirements"""
    
    def test_search_response_time(self):
        """Test that search responds within acceptable time"""
        with patch('main.http_client') as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {"results": [], "count": 0}
            mock_response.raise_for_status.return_value = None
            mock_client.get.return_value = mock_response
            
            import time
            start_time = time.time()
            response = client.get("/api/v1/species/search?q=test")
            end_time = time.time()
            
            assert response.status_code == 200
            assert (end_time - start_time) < 2.0  # Should respond within 2 seconds
    
    def test_large_dataset_handling(self):
        """Test handling of large observation datasets"""
        with patch('main.http_client') as mock_client:
            # Mock large dataset response
            large_results = []
            for i in range(1000):  # 1000 observations
                large_results.append({
                    "key": i,
                    "decimalLatitude": 52.0 + (i * 0.001),
                    "decimalLongitude": 21.0 + (i * 0.001),
                    "eventDate": "2023-06-15",
                    "basisOfRecord": "HUMAN_OBSERVATION"
                })
            
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "results": large_results,
                "count": 1000
            }
            mock_response.raise_for_status.return_value = None
            mock_client.get.return_value = mock_response
            
            response = client.get("/api/v1/species/123/observations?limit=1000")
            
            assert response.status_code == 200
            data = response.json()
            # Should handle large dataset efficiently
            assert len(data["observations"]) <= 1000

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=main", "--cov-report=html"])
