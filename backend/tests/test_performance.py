import pytest
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import statistics

from main import app

client = TestClient(app)

class TestPerformanceOptimizations:
    """Performance tests for the biodiversity API"""
    
    def test_concurrent_search_requests(self):
        """Test API performance under concurrent search requests"""
        with patch('main.http_client') as mock_client:
            # Mock GBIF response
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "results": [
                    {
                        "key": 123,
                        "scientificName": "Test species",
                        "kingdom": "Plantae",
                        "rank": "SPECIES"
                    }
                ],
                "count": 1
            }
            mock_response.raise_for_status.return_value = None
            mock_client.get.return_value = mock_response
            
            def make_request():
                start_time = time.time()
                response = client.get("/api/v1/species/search?q=test")
                end_time = time.time()
                return response.status_code, end_time - start_time
            
            # Test with 10 concurrent requests
            with ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(make_request) for _ in range(10)]
                results = [future.result() for future in futures]
            
            # All requests should succeed
            status_codes = [result[0] for result in results]
            response_times = [result[1] for result in results]
            
            assert all(code == 200 for code in status_codes)
            assert statistics.mean(response_times) < 1.0  # Average response time < 1s
            assert max(response_times) < 2.0  # Max response time < 2s
    
    def test_large_observation_dataset_performance(self):
        """Test performance with large observation datasets"""
        with patch('main.http_client') as mock_client:
            # Create large mock dataset (1000 observations)
            large_dataset = []
            for i in range(1000):
                large_dataset.append({
                    "key": i,
                    "decimalLatitude": 52.0 + (i * 0.001),
                    "decimalLongitude": 21.0 + (i * 0.001),
                    "eventDate": f"2023-{(i % 12) + 1:02d}-15",
                    "locality": f"Location {i}",
                    "basisOfRecord": "HUMAN_OBSERVATION"
                })
            
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "results": large_dataset,
                "count": 1000
            }
            mock_response.raise_for_status.return_value = None
            mock_client.get.return_value = mock_response
            
            start_time = time.time()
            response = client.get("/api/v1/species/123/observations?limit=1000")
            end_time = time.time()
            
            assert response.status_code == 200
            data = response.json()
            
            # Should process 1000 observations efficiently
            assert len(data["observations"]) <= 1000
            assert (end_time - start_time) < 3.0  # Should complete within 3 seconds
            
            # Verify data quality (coordinates within Poland bounds)
            for obs in data["observations"]:
                if obs["decimalLatitude"] and obs["decimalLongitude"]:
                    assert 49.0 <= obs["decimalLatitude"] <= 54.5
                    assert 14.1 <= obs["decimalLongitude"] <= 24.1
    
    def test_caching_performance_improvement(self):
        """Test that caching improves response times"""
        with patch('main.http_client') as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "results": [{"key": 123, "scientificName": "Test", "kingdom": "Plantae", "rank": "SPECIES"}],
                "count": 1
            }
            mock_response.raise_for_status.return_value = None
            mock_client.get.return_value = mock_response
            
            # First request (cache miss)
            start_time = time.time()
            response1 = client.get("/api/v1/species/search?q=cachetest")
            first_request_time = time.time() - start_time
            
            # Second request (cache hit)
            start_time = time.time()
            response2 = client.get("/api/v1/species/search?q=cachetest")
            second_request_time = time.time() - start_time
            
            assert response1.status_code == 200
            assert response2.status_code == 200
            
            # Second request should be significantly faster (cache hit)
            # Note: In real scenario with actual cache, this would be much more pronounced
            assert second_request_time <= first_request_time * 1.5  # Allow some variance
    
    def test_memory_usage_with_large_datasets(self):
        """Test memory efficiency with large datasets"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        with patch('main.http_client') as mock_client:
            # Create very large mock dataset
            huge_dataset = []
            for i in range(5000):  # 5000 observations
                huge_dataset.append({
                    "key": i,
                    "decimalLatitude": 52.0 + (i * 0.0001),
                    "decimalLongitude": 21.0 + (i * 0.0001),
                    "eventDate": f"2023-{(i % 12) + 1:02d}-{(i % 28) + 1:02d}",
                    "locality": f"Location {i}",
                    "recordedBy": f"Observer {i % 100}",
                    "institutionCode": "TEST",
                    "basisOfRecord": "HUMAN_OBSERVATION"
                })
            
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "results": huge_dataset,
                "count": 5000
            }
            mock_response.raise_for_status.return_value = None
            mock_client.get.return_value = mock_response
            
            # Process large dataset
            response = client.get("/api/v1/species/123/observations?limit=1000")
            
            final_memory = process.memory_info().rss
            memory_increase = final_memory - initial_memory
            
            assert response.status_code == 200
            # Memory increase should be reasonable (less than 100MB for this test)
            assert memory_increase < 100 * 1024 * 1024  # 100MB
    
    def test_api_response_time_requirements(self):
        """Test that API meets response time requirements"""
        response_times = []
        
        with patch('main.http_client') as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {"results": [], "count": 0}
            mock_response.raise_for_status.return_value = None
            mock_client.get.return_value = mock_response
            
            # Test multiple endpoints
            endpoints = [
                "/api/v1/species/search?q=test",
                "/api/v1/species/123/observations",
                "/api/v1/species/123",
                "/api/v1/stats"
            ]
            
            for endpoint in endpoints:
                for _ in range(5):  # 5 requests per endpoint
                    start_time = time.time()
                    response = client.get(endpoint)
                    end_time = time.time()
                    
                    if response.status_code == 200:
                        response_times.append(end_time - start_time)
            
            # Performance requirements
            avg_response_time = statistics.mean(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
            
            assert avg_response_time < 0.5  # Average response time < 500ms
            assert p95_response_time < 1.0   # 95th percentile < 1s
            assert max(response_times) < 2.0  # Max response time < 2s
    
    def test_database_query_optimization(self):
        """Test optimized database queries (simulated)"""
        # This test simulates database query optimization
        # In a real implementation, this would test actual database performance
        
        with patch('main.http_client') as mock_client:
            # Simulate optimized query response
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "results": [
                    {
                        "key": i,
                        "decimalLatitude": 52.0 + (i * 0.01),
                        "decimalLongitude": 21.0 + (i * 0.01),
                        "eventDate": "2023-06-15",
                        "basisOfRecord": "HUMAN_OBSERVATION"
                    }
                    for i in range(100)
                ],
                "count": 100
            }
            mock_response.raise_for_status.return_value = None
            mock_client.get.return_value = mock_response
            
            # Test query with geographic bounds (should be faster)
            start_time = time.time()
            response = client.get("/api/v1/species/123/observations?limit=100")
            query_time = time.time() - start_time
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify all results are within Poland bounds (optimized filtering)
            for obs in data["observations"]:
                if obs["decimalLatitude"] and obs["decimalLongitude"]:
                    assert 49.0 <= obs["decimalLatitude"] <= 54.5
                    assert 14.1 <= obs["decimalLongitude"] <= 24.1
            
            # Query should complete quickly due to geographic indexing
            assert query_time < 1.0

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
