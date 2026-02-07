from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import requests
import os
from typing import List, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv
import time

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
BRAVE_API_KEY = os.getenv("BRAVE_API_KEY")

if not GEMINI_API_KEY or not BRAVE_API_KEY:
    raise ValueError("Missing API keys. Set GEMINI_API_KEY and BRAVE_API_KEY environment variables.")

print("✓ API keys loaded")

genai.configure(api_key=GEMINI_API_KEY)
print("✓ Gemini configured")

brave_api_key = BRAVE_API_KEY
print("✓ Brave API key loaded")

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
    published_date: Optional[str] = None


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
    1. Search for sources using Exa (using full tweet text)
    2. Synthesize fact-check result using Gemini
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
        
        # Skip claim extraction - search directly with tweet text
        print(f"Searching for: {tweet_text[:100]}...")
        search_start = time.time()
        search_results = await search_claim(tweet_text)
        search_time = time.time() - search_start
        print(f"⏱️  Exa search took: {search_time:.2f}s")
        
        if not search_results:
            return FactCheckResponse(
                label="Unverifiable",
                explanation="No reliable sources found to verify this claim.",
                sources=[],
                confidence=0.0
            )
        
        # Synthesize the fact-check
        synthesis_start = time.time()
        result = await synthesize_fact_check(tweet_text, tweet_text, search_results)
        synthesis_time = time.time() - synthesis_start
        print(f"⏱️  Gemini synthesis took: {synthesis_time:.2f}s")
        print(f"⏱️  Total time: {search_time + synthesis_time:.2f}s")
        
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
    Search for sources using Brave Search API for fact-checking.
    """
    try:
        # Brave Search Web Search API
        url = "https://api.search.brave.com/res/v1/web/search"
        headers = {
            "Accept": "application/json",
            "X-Subscription-Token": brave_api_key
        }
        params = {
            "q": claim,
            "count": 5,  # Get more results to filter
            "freshness": "pw",  # Past week for recent fact-checks
        }
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            executor,
            lambda: requests.get(url, headers=headers, params=params, timeout=10)
        )
        response.raise_for_status()
        data = response.json()
        
        # Trusted domains for filtering
        trusted_domains = [
            "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk",
            "snopes.com", "factcheck.org", "politifact.com", 
            "npr.org", "theguardian.com", "nytimes.com",
            "washingtonpost.com", "cnn.com", "nbcnews.com"
        ]
        
        # Parse and filter results
        results = []
        if "web" in data and "results" in data["web"]:
            for result in data["web"]["results"]:
                # Filter for trusted domains
                url_lower = result.get("url", "").lower()
                if any(domain in url_lower for domain in trusted_domains):
                    results.append({
                        "title": result.get("title", "N/A"),
                        "url": result.get("url", ""),
                        "content": result.get("description", ""),
                        "published_date": result.get("age", None)
                    })
                    if len(results) >= 3:
                        break
            
            # If we don't have 3 trusted sources, add more general results
            if len(results) < 3:
                for result in data["web"]["results"]:
                    url_lower = result.get("url", "").lower()
                    if not any(domain in url_lower for domain in trusted_domains):
                        results.append({
                            "title": result.get("title", "N/A"),
                            "url": result.get("url", ""),
                            "content": result.get("description", ""),
                            "published_date": result.get("age", None)
                        })
                        if len(results) >= 3:
                            break
        
        return results[:3]  # Return top 3
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
                label_raw = line.replace("LABEL:", "").strip().upper()
                # Map to consistent format
                if "TRUE" in label_raw and "FALSE" not in label_raw:
                    label = "True"
                elif "FALSE" in label_raw:
                    label = "False"
                elif "MISLEADING" in label_raw:
                    label = "Misleading"
                else:
                    label = "Unverifiable"
            elif line.startswith("EXPLANATION:"):
                explanation = line.replace("EXPLANATION:", "").strip()
                # Remove markdown formatting
                explanation = explanation.replace("**", "").replace("__", "").replace("*", "").replace("_", "")
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
                snippet=result.get("content", "")[:200],
                published_date=result.get("published_date")
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
