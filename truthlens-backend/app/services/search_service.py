"""Search service for finding relevant sources."""
import requests
import asyncio
from typing import List
from concurrent.futures import ThreadPoolExecutor
from app.config import settings

# Thread pool for async operations
executor = ThreadPoolExecutor(max_workers=settings.MAX_WORKERS)


class SearchService:
    """Service for searching and retrieving fact-check sources."""
    
    # Blacklisted domains to exclude from results
    BLACKLISTED_DOMAINS = ["wikipedia.org", "en.wikipedia.org", "www.christianpost.com"]
    
    @staticmethod
    async def search_claim(claim: str) -> List[dict]:
        """
        Search for sources using Brave Search API.
        
        Args:
            claim: The claim text to search for
            
        Returns:
            List of search results with title, url, content, published_date
        """
        try:
            headers = {
                "Accept": "application/json",
                "X-Subscription-Token": settings.BRAVE_API_KEY
            }
            params = {
                "q": claim,
                "count": settings.SEARCH_RESULT_COUNT,
                "freshness": settings.SEARCH_FRESHNESS,
            }
            
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                executor,
                lambda: requests.get(
                    settings.BRAVE_SEARCH_URL,
                    headers=headers,
                    params=params,
                    timeout=settings.SEARCH_TIMEOUT
                )
            )
            response.raise_for_status()
            data = response.json()
            
            # Parse and filter results
            results = []
            if "web" in data and "results" in data["web"]:
                # First pass: trusted domains only (excluding blacklisted)
                for result in data["web"]["results"]:
                    url_lower = result.get("url", "").lower()
                    
                    # Skip blacklisted domains
                    if any(domain in url_lower for domain in SearchService.BLACKLISTED_DOMAINS):
                        continue
                    
                    if any(domain in url_lower for domain in settings.TRUSTED_DOMAINS):
                        results.append({
                            "title": result.get("title", "N/A"),
                            "url": result.get("url", ""),
                            "content": result.get("description", ""),
                            "published_date": result.get("age", None)
                        })
                        if len(results) >= settings.MAX_SOURCES:
                            break
                
                # Second pass: add general results if needed (excluding blacklisted)
                if len(results) < settings.MAX_SOURCES:
                    for result in data["web"]["results"]:
                        url_lower = result.get("url", "").lower()
                        
                        # Skip blacklisted domains
                        if any(domain in url_lower for domain in SearchService.BLACKLISTED_DOMAINS):
                            continue
                        
                        if not any(domain in url_lower for domain in settings.TRUSTED_DOMAINS):
                            results.append({
                                "title": result.get("title", "N/A"),
                                "url": result.get("url", ""),
                                "content": result.get("description", ""),
                                "published_date": result.get("age", None)
                            })
                            if len(results) >= settings.MAX_SOURCES:
                                break
            
            return results[:settings.MAX_SOURCES]
            
        except Exception as e:
            print(f"Error searching claim: {str(e)}")
            return []
