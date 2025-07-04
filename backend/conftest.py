import pytest
import asyncio
from typing import Generator
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_http_client():
    """Create a mock HTTP client for testing"""
    mock_client = AsyncMock()
    
    # Default successful response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"results": [], "count": 0}
    mock_response.raise_for_status.return_value = None
    mock_client.get.return_value = mock_response
    
    return mock_client


@pytest.fixture
def sample_gbif_species():
    """Sample GBIF species data for testing"""
    return {
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
        "taxonomicStatus": "ACCEPTED",
        "vernacularNames": [
            {"vernacularName": "Scots Pine", "language": "en"},
            {"vernacularName": "Sosna zwyczajna", "language": "pl"}
        ]
    }


@pytest.fixture
def sample_gbif_occurrence():
    """Sample GBIF occurrence data for testing"""
    return {
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


@pytest.fixture
def poland_coordinates():
    """Valid coordinates within Poland bounds"""
    return [
        (52.2297, 21.0122),  # Warsaw
        (50.0647, 19.9450),  # Krakow
        (54.3520, 18.6466),  # Gdansk
        (51.7592, 19.4560),  # Lodz
    ]


@pytest.fixture
def invalid_coordinates():
    """Invalid coordinates outside Poland bounds"""
    return [
        (60.0, 25.0),   # Too far north
        (45.0, 15.0),   # Too far south
        (52.0, 10.0),   # Too far west
        (52.0, 30.0),   # Too far east
    ]
