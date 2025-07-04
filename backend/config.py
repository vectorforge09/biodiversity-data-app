"""
Configuration settings for BioDiversity API
"""
import os
from typing import Dict, Any

class Settings:
    """Application settings"""
    
    # API Configuration
    API_TITLE = "BioDiversity Explorer API"
    API_VERSION = "1.0.0"
    API_DESCRIPTION = "FastAPI backend for visualizing biodiversity data from GBIF"
    
    # GBIF API Configuration
    GBIF_API_BASE = "https://api.gbif.org/v1"
    GBIF_USER_AGENT = "BioDiversityExplorer/1.0 (FastAPI Backend)"
    
    # Geographic bounds for Poland
    POLAND_BOUNDS = {
        "min_lat": 49.0,
        "max_lat": 54.5,
        "min_lng": 14.1,
        "max_lng": 24.1
    }
    
    # Cache configuration (in seconds)
    CACHE_DURATIONS = {
        "search": 300,      # 5 minutes
        "observations": 600, # 10 minutes
        "species": 900,     # 15 minutes
        "stats": 1800       # 30 minutes
    }
    
    # Redis configuration
    REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
    REDIS_DB = int(os.getenv('REDIS_DB', 0))
    
    # Performance settings
    MAX_SEARCH_RESULTS = 50
    MAX_OBSERVATIONS = 1000
    DEFAULT_SEARCH_LIMIT = 10
    DEFAULT_OBSERVATIONS_LIMIT = 300
    
    # HTTP client settings
    HTTP_TIMEOUT = 30.0
    MAX_RETRIES = 3
    
    # Logging configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    # CORS settings
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "https://biodiversity-explorer.vercel.app",
        "https://*.vercel.app"
    ]
    
    @classmethod
    def get_cors_origins(cls) -> list:
        """Get CORS origins from environment or use defaults"""
        env_origins = os.getenv('CORS_ORIGINS')
        if env_origins:
            return env_origins.split(',')
        return cls.ALLOWED_ORIGINS

# Global settings instance
settings = Settings()
