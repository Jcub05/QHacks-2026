"""Text-to-speech service using ElevenLabs."""
import httpx
from typing import Optional
from datetime import datetime
from app.config import settings
from app.models import FactCheckResponse


class TTSService:
    """Service for generating text-to-speech audio using ElevenLabs."""
    
    @staticmethod
    def format_fact_check_for_speech(
        claim: str,
        result: FactCheckResponse
    ) -> str:
        """
        Format a fact check result into a speech-friendly text.
        
        Args:
            claim: The original claim that was fact-checked
            result: The fact check response from the API
            
        Returns:
            Formatted text ready for text-to-speech conversion
        """
        # Start with the claim
        speech_text = f"The tweet claims that {claim}. "
        
        # Add the fact check result
        speech_text += f"After fact check, it has been determined that this post is {result.label.lower()}. "
        
        # Add the explanation
        speech_text += f"{result.explanation} "
        
        # Add source information
        if result.sources and len(result.sources) > 0:
            speech_text += "This information is based on the following sources: "
            
            for i, source in enumerate(result.sources):
                # Add source number and title
                speech_text += f"Source {i + 1}: {source.title}. "
                
                # Add age information if available
                if source.published_date:
                    # Parse the published_date to get relative age
                    age_str = source.published_date
                    speech_text += f"Published {age_str}. "
        else:
            speech_text += "No sources were found to verify this claim."
        
        return speech_text
    
    @staticmethod
    async def generate_speech(
        text: str,
        voice_id: Optional[str] = None
    ) -> bytes:
        """
        Generate speech audio from text using ElevenLabs API.
        
        Args:
            text: The text to convert to speech
            voice_id: Optional custom voice ID (uses default if not provided)
            
        Returns:
            Audio data as bytes (MP3 format)
            
        Raises:
            Exception: If API call fails or API key is not configured
        """
        if not settings.ELEVENLABS_API_KEY:
            raise Exception("ElevenLabs API key not configured")
        
        # Use provided voice ID or default
        voice = voice_id or settings.ELEVENLABS_VOICE_ID
        
        # Build the API URL
        url = f"{settings.ELEVENLABS_API_URL}/{voice}"
        
        # Request headers
        headers = {
            "xi-api-key": settings.ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        }
        
        # Request body
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",  # Better quality model
            "voice_settings": {
                "stability": 0.5,  # Balanced stability
                "similarity_boost": 0.75  # Good clarity
            }
        }
        
        # Make the API call
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                error_text = response.text
                raise Exception(f"ElevenLabs API error ({response.status_code}): {error_text}")
            
            # Return the audio data
            return response.content
    
    @staticmethod
    async def generate_fact_check_speech(
        claim: str,
        result: FactCheckResponse
    ) -> bytes:
        """
        Generate speech audio for a complete fact check result.
        
        Args:
            claim: The original claim that was fact-checked
            result: The fact check response from the API
            
        Returns:
            Audio data as bytes (MP3 format)
        """
        # Format the text for speech
        speech_text = TTSService.format_fact_check_for_speech(claim, result)
        
        # Generate the audio
        return await TTSService.generate_speech(speech_text)
