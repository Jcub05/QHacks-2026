"""Fact-checking service using Gemini AI."""
import google.generativeai as genai
import asyncio
import time
from typing import List
from concurrent.futures import ThreadPoolExecutor
from app.config import settings
from app.models import FactCheckResponse, Source

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel(settings.GEMINI_MODEL)
print(f"✓ Gemini model configured: {settings.GEMINI_MODEL}")

# Thread pool for async operations
executor = ThreadPoolExecutor(max_workers=settings.MAX_WORKERS)


class FactCheckService:
    """Service for fact-checking claims using AI."""
    
    @staticmethod
    async def extract_claim(text: str) -> str:
        """
        Extract the core factual claim from a tweet or text using Gemini.
        
        Args:
            text: The original tweet/post text
            
        Returns:
            Extracted claim as a searchable query
        """
        prompt = f"""
<context>
ROLE: Claim Extraction Specialist
TASK: Extract the core factual claim from the text below that can be fact-checked.
</context>

<text>
"{text}"
</text>

<instructions>
1. Identify the main factual claim or statement (ignore opinions, questions, or commentary)
2. Extract it as a clear, searchable query (remove hashtags, mentions, links)
3. If multiple claims exist, extract the most significant one
4. If no factual claim exists, return the original text
5. Keep it concise (under 100 characters if possible)
</instructions>

<output_format>
Return ONLY the extracted claim text, nothing else.
</output_format>
"""
        
        try:
            loop = asyncio.get_event_loop()
            extract_start = time.time()
            response = await loop.run_in_executor(
                executor,
                lambda: model.generate_content(prompt)
            )
            extract_time = time.time() - extract_start
            print(f"⏱️  Gemini claim extraction took: {extract_time:.2f}s")
            
            extracted = response.text.strip()
            # Remove quotes if Gemini added them
            extracted = extracted.strip('"').strip("'").strip()
            
            print(f"📝 Extracted claim: {extracted}")
            return extracted if extracted else text
            
        except Exception as e:
            print(f"Error extracting claim: {str(e)}")
            return text  # Fallback to original text
    
    @staticmethod
    async def synthesize_fact_check(
        claim: str,
        original_tweet: str,
        search_results: List[dict]
    ) -> FactCheckResponse:
        """
        Analyze search results and generate a fact-check verdict using Gemini.
        
        Args:
            claim: The extracted claim to check
            original_tweet: The original tweet text
            search_results: List of search results to analyze
            
        Returns:
            FactCheckResponse with label, explanation, sources, confidence, bias
        """
        # Format search results for the prompt
        sources_text = "\n\n".join([
            f"Source {i+1}:\nTitle: {result.get('title', 'N/A')}\nURL: {result.get('url', 'N/A')}\nContent: {result.get('content', 'N/A')[:1000]}"
            for i, result in enumerate(search_results[:5])
        ])
        
        prompt = f"""
<context>
ROLE: Senior Fact-Checker.
TASK: Verify the CLAIM against the provided SEARCH_EVIDENCE.
</context>

<search_evidence>
{sources_text}
</search_evidence>

<claim>
"{claim}"
</claim>

<instructions>
1. CROSS-REFERENCE: Does the evidence mention the specific entities in the claim?
2. VERIFY: Label based on direct evidence matches.
   - TRUE: Supported by multiple reputable sources.
   - FALSE: Contradicted by primary sources.
   - MISLEADING: Grain of truth but significant omission/bias.
   - UNVERIFIABLE: Claim entities not found in sources.
3. POLITICAL BIAS CHECK (for misleading/controversial claims only):
   - Analyze ONLY the tweet content (not the sources)
   - Detect if the framing shows political bias or partisan slant
   - Do NOT label as left/right/center - only detect if bias exists
   - Consider: selective facts, partisan framing, political agenda
</instructions>

<output_format>
LABEL: [TRUE/FALSE/MISLEADING/UNVERIFIABLE]
EXPLANATION: [Context + Source Name in < 20 words]
BIAS: [None / Potential / Likely]
CONFIDENCE: [0.0 - 1.0]
</output_format>
"""
        
        try:
            loop = asyncio.get_event_loop()
            gemini_start = time.time()
            response = await loop.run_in_executor(
                executor,
                lambda: model.generate_content(prompt)
            )
            gemini_time = time.time() - gemini_start
            print(f"⏱️  Gemini API call took: {gemini_time:.2f}s")
            
            # Parse the response
            response_text = response.text.strip()
            lines = response_text.split('\n')
            
            label = "Unverifiable"
            explanation = "Unable to determine accuracy."
            confidence = 0.5
            bias = None
            
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
                elif line.startswith("BIAS:"):
                    bias = line.replace("BIAS:", "").strip()
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
                for result in search_results[:settings.MAX_SOURCES]
            ]
            
            return FactCheckResponse(
                label=label,
                explanation=explanation,
                sources=sources,
                confidence=confidence,
                bias=bias
            )
            
        except Exception as e:
            print(f"Error synthesizing fact-check: {str(e)}")
            return FactCheckResponse(
                label="Error",
                explanation="An error occurred while analyzing this claim.",
                sources=[],
                confidence=0.0
            )
