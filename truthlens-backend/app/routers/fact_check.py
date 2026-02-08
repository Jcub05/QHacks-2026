"""Fact-checking API routes."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import time
from app.models import FactCheckRequest, FactCheckResponse, TTSRequest
from app.services import FactCheckService, SearchService, TTSService

router = APIRouter(prefix="/api", tags=["fact-check"])


@router.post("/fact-check", response_model=FactCheckResponse)
async def fact_check(request: FactCheckRequest):
    """
    Main fact-checking endpoint.
    
    Process:
    1. Extract core claim using Gemini AI
    2. Search for sources using Brave Search with extracted claim
    3. Synthesize fact-check result using Gemini AI
    """
    try:
        tweet_text = request.text.strip()
        
        if not tweet_text:
            return FactCheckResponse(
                label="Unverifiable",
                explanation="No text content to fact-check.",
                sources=[],
                confidence=0.0
            )
        
        # Step 1: Extract the core claim using Gemini
        print(f"📝 Original text: {tweet_text[:100]}...")
        extracted_claim = await FactCheckService.extract_claim(tweet_text)
        
        # Step 2: Search for relevant sources using extracted claim
        print(f"🔍 Searching for: {extracted_claim[:100]}...")
        search_start = time.time()
        search_results = await SearchService.search_claim(extracted_claim)
        search_time = time.time() - search_start
        print(f"⏱️  Brave search took: {search_time:.2f}s")
        
        if not search_results:
            return FactCheckResponse(
                label="Unverifiable",
                explanation="No reliable sources found to verify this claim.",
                sources=[],
                confidence=0.0
            )
        
        # Step 3: Synthesize the fact-check using AI with original text
        synthesis_start = time.time()
        result = await FactCheckService.synthesize_fact_check(
            extracted_claim, tweet_text, search_results
        )
        synthesis_time = time.time() - synthesis_start
        print(f"⏱️  Gemini synthesis took: {synthesis_time:.2f}s")
        
        return result
        
    except Exception as e:
        print(f"Error in fact_check: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/text-to-speech")
async def text_to_speech(request: TTSRequest):
    """
    Generate text-to-speech audio for a fact check result.
    
    This endpoint takes a claim and its fact check result, formats it into
    a speech-friendly narrative, and returns MP3 audio data.
    """
    try:
        print(f"🔊 TTS request for claim: {request.claim[:50]}...")
        
        # Generate the audio
        audio_data = await TTSService.generate_fact_check_speech(
            request.claim,
            request.result
        )
        
        print(f"✓ Generated {len(audio_data)} bytes of audio")
        
        # Return the audio as MP3
        return Response(
            content=audio_data,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=fact-check.mp3"
            }
        )
        
    except Exception as e:
        print(f"Error in text_to_speech: {str(e)}")
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")
