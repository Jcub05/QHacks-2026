from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from exa_py import Exa
import os
from typing import List, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
print("✓ Environment variables loaded")

# Initialize FastAPI app
app = FastAPI(title="TruthLens API", version="1.0.0")
print("✓ FastAPI app initialized")

# Configure CORS for Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize API clients
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
EXA_API_KEY = os.getenv("EXA_API_KEY")

if not GEMINI_API_KEY or not EXA_API_KEY:
    raise ValueError("Missing API keys. Set GEMINI_API_KEY and EXA_API_KEY environment variables.")

print("✓ API keys loaded")

genai.configure(api_key=GEMINI_API_KEY)
print("✓ Gemini configured")

exa_client = Exa(api_key=EXA_API_KEY)
print("✓ Exa client initialized")

# Create Gemini model instance
model = genai.GenerativeModel('gemini-3-flash-preview')
print("✓ Gemini model configured")

# Thread pool for async operations
executor = ThreadPoolExecutor(max_workers=5)


# Request/Response models
class FactCheckRequest(BaseModel):
    text: str


class Source(BaseModel):
    title: str
    url: str
    snippet: Optional[str] = None


class FactCheckResponse(BaseModel):
    label: str  # True, False, Misleading, Unverifiable
    explanation: str
    sources: List[Source]
    confidence: float  # 0.0 to 1.0


@app.get("/")
async def root():
    return {"message": "TruthLens API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/fact-check", response_model=FactCheckResponse)
async def fact_check(request: FactCheckRequest):
    """
    Main fact-checking endpoint.
    
    Process:
    1. Extract searchable claim from tweet using Gemini
    2. Search for sources using Tavily
    3. Synthesize fact-check result using Gemini
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
        
        # Step 1: Extract the core claim
        claim = await extract_claim(tweet_text)
        
        if not claim or claim.lower() == "no verifiable claim":
            return FactCheckResponse(
                label="Unverifiable",
                explanation="This tweet does not contain a verifiable factual claim.",
                sources=[],
                confidence=0.0
            )
        
        # Step 2: Search for sources
        search_results = await search_claim(claim)
        
        if not search_results:
            return FactCheckResponse(
                label="Unverifiable",
                explanation="No reliable sources found to verify this claim.",
                sources=[],
                confidence=0.0
            )
        
        # Step 3: Synthesize the fact-check
        result = await synthesize_fact_check(claim, tweet_text, search_results)
        
        return result
        
    except Exception as e:
        print(f"Error in fact_check: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


async def extract_claim(tweet_text: str) -> str:
    """
    Use Gemini to extract the core factual claim from a tweet.
    """
    prompt = f"""
Extract the main verifiable claim from this tweet. If no verifiable claim exists, respond "No verifiable claim".

Tweet: "{tweet_text}"

Claim (max 2 sentences):
"""
    
    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            executor,
            lambda: model.generate_content(prompt)
        )
        claim = response.text.strip()
        return claim
    except Exception as e:
        print(f"Error extracting claim: {str(e)}")
        return "Error extracting claim"


async def search_claim(claim: str) -> List[dict]:
    """
    Search for sources using Exa API.
    """
    try:
        loop = asyncio.get_event_loop()
        search_response = await loop.run_in_executor(
            executor,
            lambda: exa_client.search_and_contents(
                query=claim,
                num_results=3,
                use_autoprompt=True,
                text={"max_characters": 500},
                include_domains=["reuters.com", "apnews.com", "bbc.com", "snopes.com", 
                                "factcheck.org", "politifact.com", "npr.org"]
            )
        )
        
        # Convert Exa response format to match expected format
        results = []
        for result in search_response.results:
            results.append({
                "title": result.title,
                "url": result.url,
                "content": result.text if hasattr(result, 'text') else ""
            })
        return results
    except Exception as e:
        print(f"Error searching claim: {str(e)}")
        return []


async def synthesize_fact_check(claim: str, original_tweet: str, search_results: List[dict]) -> FactCheckResponse:
    """
    Use Gemini to analyze search results and generate a fact-check verdict.
    """
    # Format search results for the prompt
    sources_text = "\n\n".join([
        f"Source {i+1}:\nTitle: {result.get('title', 'N/A')}\nURL: {result.get('url', 'N/A')}\nContent: {result.get('content', 'N/A')[:500]}"
        for i, result in enumerate(search_results[:5])
    ])
    
    prompt = f"""
Analyze this claim against these sources. Determine: TRUE, FALSE, MISLEADING, or UNVERIFIABLE.

Claim: "{claim}"

Sources:
{sources_text}

Format:
LABEL: [TRUE/FALSE/MISLEADING/UNVERIFIABLE]
EXPLANATION: [1-2 sentences]
CONFIDENCE: [0.0-1.0]
"""
    
    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            executor,
            lambda: model.generate_content(prompt)
        )
        
        # Parse the response
        response_text = response.text.strip()
        lines = response_text.split('\n')
        
        label = "Unverifiable"
        explanation = "Unable to determine accuracy."
        confidence = 0.5
        
        for line in lines:
            if line.startswith("LABEL:"):
                label = line.replace("LABEL:", "").strip().title()
            elif line.startswith("EXPLANATION:"):
                explanation = line.replace("EXPLANATION:", "").strip()
            elif line.startswith("CONFIDENCE:"):
                try:
                    confidence = float(line.replace("CONFIDENCE:", "").strip())
                except:
                    confidence = 0.5
        
        # Format sources
        sources = [
            Source(
                title=result.get("title", "Source"),
                url=result.get("url", ""),
                snippet=result.get("content", "")[:200]
            )
            for result in search_results[:3]  # Top 3 sources
        ]
        
        return FactCheckResponse(
            label=label,
            explanation=explanation,
            sources=sources,
            confidence=confidence
        )
        
    except Exception as e:
        print(f"Error synthesizing fact-check: {str(e)}")
        return FactCheckResponse(
            label="Error",
            explanation="An error occurred while analyzing this claim.",
            sources=[],
            confidence=0.0
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
