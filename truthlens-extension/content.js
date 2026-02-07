// TruthLens Content Script - Injects fact-check icons into X (Twitter)

const API_ENDPOINT = 'http://localhost:8000/api/fact-check';
const PROCESSED_TWEETS = new Set();

// SVG icon for the magnifying glass
const MAGNIFY_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true" class="truthlens-icon">
  <g>
    <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"></path>
  </g>
</svg>
`;

// Status icons
const CHECK_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true" class="truthlens-icon truthlens-icon-check">
  <g>
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path>
  </g>
</svg>
`;

const WARNING_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true" class="truthlens-icon truthlens-icon-warning">
  <g>
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path>
  </g>
</svg>
`;

const QUESTION_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true" class="truthlens-icon truthlens-icon-question">
  <g>
    <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14C9.79 6 8 7.79 8 10h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"></path>
  </g>
</svg>
`;

const X_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true" class="truthlens-icon truthlens-icon-false">
  <g>
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
  </g>
</svg>
`;

// Main initialization
function init() {
  console.log('TruthLens: Initializing...');
  
  // Watch for new tweets being loaded (X is an SPA)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(() => {
      injectFactCheckIcons();
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial injection
  injectFactCheckIcons();
}

// Find all tweets and inject the magnifying glass icon
function injectFactCheckIcons() {
  // Find all tweet articles that haven't been processed
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');
  
  tweets.forEach((tweet) => {
    // Use a unique identifier to avoid duplicate processing
    const tweetId = getTweetId(tweet);
    if (!tweetId || PROCESSED_TWEETS.has(tweetId)) {
      return;
    }

    // Find the action bar (reply, retweet, like buttons)
    const actionBar = tweet.querySelector('[role="group"]');
    if (!actionBar) {
      return;
    }

    // Check if we already injected our icon
    if (actionBar.querySelector('.truthlens-button')) {
      return;
    }

    // Create and inject the magnifying glass button
    const factCheckButton = createFactCheckButton(tweet, tweetId);
    actionBar.appendChild(factCheckButton);
    
    PROCESSED_TWEETS.add(tweetId);
  });
}

// Get a unique identifier for a tweet
function getTweetId(tweet) {
  // Try to find the tweet link which contains the tweet ID
  const tweetLink = tweet.querySelector('a[href*="/status/"]');
  if (tweetLink) {
    const match = tweetLink.href.match(/\/status\/(\d+)/);
    if (match) {
      return match[1];
    }
  }
  
  // Fallback: use the tweet text as identifier
  const tweetText = tweet.querySelector('[data-testid="tweetText"]');
  if (tweetText) {
    return tweetText.textContent.slice(0, 50);
  }
  
  return null;
}

// Create the fact-check button
function createFactCheckButton(tweet, tweetId) {
  const button = document.createElement('div');
  button.className = 'truthlens-button';
  button.innerHTML = MAGNIFY_ICON;
  button.title = 'Fact-check this tweet';
  
  let factCheckResult = null;
  let isChecked = false;
  
  button.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    // If already checked, show the full overlay
    if (isChecked && factCheckResult) {
      console.log('TruthLens: Showing full details', factCheckResult);
      
      // Remove any existing overlay first
      const existingOverlay = tweet.querySelector('.truthlens-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
        return; // If clicking to close, just return
      }
      
      showFactCheckResult(tweet, factCheckResult);
      return;
    }
    
    console.log('TruthLens: Button clicked!');
    
    // Show loading state
    button.classList.add('truthlens-loading');
    
    // Extract tweet text
    const tweetText = extractTweetText(tweet);
    console.log('TruthLens: Extracted text:', tweetText);
    
    if (!tweetText) {
      console.log('TruthLens: No text found');
      factCheckResult = {
        label: 'Unverifiable',
        explanation: 'This tweet contains no text to fact-check.',
        sources: [],
        confidence: 0
      };
      button.classList.remove('truthlens-loading');
      updateButtonIcon(button, factCheckResult.label);
      isChecked = true;
      return;
    }
    
    try {
      console.log('TruthLens: Calling API...');
      // Call the backend API
      const result = await factCheckTweet(tweetText);
      console.log('TruthLens: Got result:', result);
      factCheckResult = result;
      updateButtonIcon(button, result.label);
      isChecked = true;
    } catch (error) {
      console.error('TruthLens error:', error);
      factCheckResult = {
        label: 'Error',
        explanation: 'Unable to fact-check at this time. Please try again.',
        sources: [],
        confidence: 0
      };
      updateButtonIcon(button, 'Error');
      isChecked = true;
    } finally {
      button.classList.remove('truthlens-loading');
    }
  });
  
  return button;
}

// Update button icon based on result
function updateButtonIcon(button, label) {
  button.classList.remove('truthlens-loading');
  button.classList.add('truthlens-checked');
  
  const normalizedLabel = label.toLowerCase();
  
  if (normalizedLabel === 'true') {
    button.innerHTML = CHECK_ICON;
    button.title = 'True - Click for details';
    button.classList.add('truthlens-true');
  } else if (normalizedLabel === 'false') {
    button.innerHTML = X_ICON;
    button.title = 'False - Click for details';
    button.classList.add('truthlens-false');
  } else if (normalizedLabel === 'misleading') {
    button.innerHTML = WARNING_ICON;
    button.title = 'Misleading - Click for details';
    button.classList.add('truthlens-misleading');
  } else {
    button.innerHTML = QUESTION_ICON;
    button.title = 'Unverifiable - Click for details';
    button.classList.add('truthlens-unverifiable');
  }
}

// Extract tweet text from the tweet element
function extractTweetText(tweet) {
  const tweetTextElement = tweet.querySelector('[data-testid="tweetText"]');
  if (!tweetTextElement) {
    return null;
  }
  
  return tweetTextElement.textContent.trim();
}

// Call the backend API to fact-check
async function factCheckTweet(text) {
  console.log('TruthLens: Fetching from:', API_ENDPOINT);
  console.log('TruthLens: Request body:', { text });
  
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text })
  });
  
  console.log('TruthLens: Response status:', response.status);
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('TruthLens: Response data:', data);
  return data;
}

// Show the fact-check result overlay
function showFactCheckResult(tweet, result) {
  // Remove any existing overlay
  const existingOverlay = tweet.querySelector('.truthlens-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'truthlens-overlay';
  
  // Determine label styling
  const labelClass = result.label.toLowerCase().replace(/\s+/g, '-');
  
  // Build sources HTML
  let sourcesHTML = '';
  if (result.sources && result.sources.length > 0) {
    sourcesHTML = '<div class="truthlens-sources">';
    result.sources.forEach(source => {
      sourcesHTML += `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title || source.url}</a>`;
    });
    sourcesHTML += '</div>';
  }
  
  overlay.innerHTML = `
    <div class="truthlens-header">
      <span class="truthlens-label truthlens-label-${labelClass}">${result.label}</span>
      <button class="truthlens-close">&times;</button>
    </div>
    <div class="truthlens-content">
      <p class="truthlens-explanation">${result.explanation}</p>
      ${sourcesHTML}
      ${result.confidence ? `<div class="truthlens-confidence">Confidence: ${Math.round(result.confidence * 100)}%</div>` : ''}
    </div>
  `;
  
  // Add close button functionality
  const closeButton = overlay.querySelector('.truthlens-close');
  closeButton.addEventListener('click', () => {
    overlay.remove();
  });
  
  // Insert overlay into tweet
  tweet.style.position = 'relative';
  tweet.appendChild(overlay);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
