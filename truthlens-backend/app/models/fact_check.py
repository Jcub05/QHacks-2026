"""Models for fact-checking API."""
from pydantic import BaseModel
from typing import List, Optional


class FactCheckRequest(BaseModel):
    """Request model for fact-checking."""
    text: str


class TTSRequest(BaseModel):
    """Request model for text-to-speech generation."""
    claim: str
    result: 'FactCheckResponse'


class Source(BaseModel):
    """Source information for fact-check results."""
    title: str
    url: str
    snippet: Optional[str] = None
    published_date: Optional[str] = None


class FactCheckResponse(BaseModel):
    """Response model for fact-checking."""
    label: str  # True, False, Misleading, Unverifiable
    explanation: str
    sources: List[Source]
    confidence: float  # 0.0 to 1.0 (internal only)
    bias: Optional[str] = None  # None / Potential / Likely


# Update forward references
TTSRequest.model_rebuild()
