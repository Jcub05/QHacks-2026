"""
Configuration management for TruthLens API.
Loads environment variables and provides configuration objects.
"""
import os
from dotenv import load_dotenv
from typing import Optional

# Load environment variables
load_dotenv()



class Settings:
    """Application settings loaded from environment variables."""
    
    # API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    BRAVE_API_KEY: str = os.getenv("BRAVE_API_KEY", "")
    AIORNOT_API_KEY: Optional[str] = os.getenv("AIORNOT_API_KEY")  # Replaced Hive with AI or Not
    ELEVENLABS_API_KEY: Optional[str] = os.getenv("ELEVENLABS_API_KEY")  # ElevenLabs TTS
    
    # API Configuration
    GEMINI_MODEL: str = "gemini-2.0-flash-lite"
    BRAVE_SEARCH_URL: str = "https://api.search.brave.com/res/v1/web/search"
    AIORNOT_API_URL: str = "https://api.aiornot.com/v1/reports/image"  # AI or Not endpoint
    ELEVENLABS_API_URL: str = "https://api.elevenlabs.io/v1/text-to-speech"  # ElevenLabs TTS
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"  # Default voice: Rachel (neutral, clear)
    
    # Search Configuration
    SEARCH_RESULT_COUNT: int = 20
    SEARCH_FRESHNESS: str = "pw"  # Past week
    MAX_SOURCES: int = 3
    
    # Trusted Domains for Fact-Checking
    TRUSTED_DOMAINS: list = [
        # News Agencies & Wire Services
        "reuters.com", "apnews.com", "afp.com",
        # Fact-Checking Organizations
        "snopes.com", "factcheck.org", "politifact.com", "fullfact.org",
        # International News
        "bbc.com", "bbc.co.uk", "theguardian.com", "aljazeera.com", "dw.com",
        # US National News
        "npr.org", "pbs.org", "cbsnews.com", "nbcnews.com", "abcnews.go.com",
        # Major Newspapers
        "nytimes.com", "washingtonpost.com", "usatoday.com", "latimes.com",
        # Business/Financial News
        "bloomberg.com", "wsj.com", "cnbc.com",
        # Science/Medical
        "nature.com", "sciencemag.org", "nejm.org"
    ]
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Thread Pool
    MAX_WORKERS: int = 5
    
    # Timeouts (seconds)
    SEARCH_TIMEOUT: int = 10
    AIORNOT_TIMEOUT: int = 30  # AI or Not timeout
    
    def validate(self):
        """Validate required configuration."""
        errors = []
        
        if not self.GEMINI_API_KEY:
            errors.append("GEMINI_API_KEY is required")
        if not self.BRAVE_API_KEY:
            errors.append("BRAVE_API_KEY is required")
        
        if errors:
            raise ValueError(f"Configuration errors: {', '.join(errors)}")
        
        if not self.AIORNOT_API_KEY:
            print("⚠️  AIORNOT_API_KEY not set - AI media detection will be unavailable")
        
        if not self.ELEVENLABS_API_KEY:
            print("⚠️  ELEVENLABS_API_KEY not set - Text-to-speech will be unavailable")
        
        return True


# Global settings instance
settings = Settings()

# Validate on import
try:
    settings.validate()
    print("✓ Configuration loaded and validated")
except ValueError as e:
    print(f"❌ Configuration error: {e}")
    raise
