// TruthLens Content Script - Injects fact-check icons into X (Twitter)

const API_ENDPOINT = 'http://localhost:8000/api/fact-check';
const TTS_ENDPOINT = 'http://localhost:8000/api/text-to-speech';

// SVG icon for the magnifying glass
const MAGNIFY_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true" class="truthlens-icon">
  <g>
    <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"></path>
  </g>
</svg>
`;

// Speaker icon for TTS
const SPEAKER_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true" class="truthlens-icon truthlens-icon-speaker">
  <g>
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path>
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
  
  // Check if we are on X/Twitter
  const isTwitter = window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com');
  
  if (isTwitter) {
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
    
    // Re-inject when URL changes (for SPA navigation)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        console.log('TruthLens: URL changed, re-injecting icons');
        lastUrl = url;
        // Delay to allow Twitter to render new content
        setTimeout(() => injectFactCheckIcons(), 500);
        setTimeout(() => injectFactCheckIcons(), 1000);
      }
    }).observe(document, { subtree: true, childList: true });
    
    // Also listen for browser back/forward
    window.addEventListener('popstate', () => {
      console.log('TruthLens: Navigation detected (popstate), re-injecting icons');
      setTimeout(() => injectFactCheckIcons(), 500);
      setTimeout(() => injectFactCheckIcons(), 1000);
    });
    
    // Periodic check to re-inject icons if they disappear (fallback safety net)
    setInterval(() => {
      injectFactCheckIcons();
    }, 3000); // Check every 3 seconds
  }
  
  // Listen for messages from background script (Context Menu)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "verify_selection") {
      console.log("TruthLens: Verifying selection:", request.text);
      handleSelectionVerification(request.text);
    }
  });
  
  // Listen for text selection (Floating Action Button)
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);
  
  // Close FAB on click outside
  document.addEventListener('mousedown', (e) => {
    if (!e.target.classList.contains('truthlens-fab') && !e.target.closest('.truthlens-fab')) {
      removeFloatingButton();
    }
  });
}

// Find all tweets and inject the magnifying glass icon
function injectFactCheckIcons() {
  // Find all tweet articles
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');
  
  tweets.forEach((tweet) => {
    // Find the action bar (reply, retweet, like buttons)
    const actionBar = tweet.querySelector('[role="group"]');
    if (!actionBar) {
      return;
    }

    // Check if we already injected our icon
    // Be more defensive - check both in actionBar and as direct child
    const existingButton = actionBar.querySelector('.truthlens-button');
    
    // Verify the button is actually in the DOM and attached
    if (existingButton && existingButton.isConnected) {
      return;
    }
    
    // If button exists but is disconnected, remove the marker
    if (tweet.hasAttribute('data-truthlens-processed') && !existingButton) {
      tweet.removeAttribute('data-truthlens-processed');
    }
    
    // Skip if already processed and button exists
    if (tweet.hasAttribute('data-truthlens-processed') && existingButton) {
      return;
    }

    // Get tweet ID for reference (optional)
    const tweetId = getTweetId(tweet);

    // Create and inject the magnifying glass button
    const factCheckButton = createFactCheckButton(tweet, tweetId);
    
    // Mark the tweet as processed to avoid re-injection
    tweet.setAttribute('data-truthlens-processed', 'true');
    
    actionBar.appendChild(factCheckButton);
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
  console.log('TruthLens: showFactCheckResult called', result);
  console.log('TruthLens: tweet element', tweet);
  
  // Remove any existing overlay from the entire tweet
  const existingOverlay = document.querySelector('.truthlens-overlay');
  if (existingOverlay) {
    console.log('TruthLens: Removing existing overlay');
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
      // Brave returns age as text like "2 days ago", so display it as-is
      const dateStr = source.published_date ? `<span class="truthlens-date">${source.published_date}</span> ` : '';
      sourcesHTML += `<div class="truthlens-source-item">${dateStr}<a href="${source.url}" target="_blank" rel="noopener noreferrer" class="truthlens-source-link">${source.title || source.url}</a></div>`;
    });
    sourcesHTML += '</div>';
  }
  
  // Show bias warning only for misleading claims with detected bias
  let biasHTML = '';
  if (result.label.toLowerCase() === 'misleading' && result.bias && result.bias.toLowerCase() !== 'none') {
    const biasLevel = result.bias.toLowerCase() === 'likely' ? 'Likely bias' : 'Potential bias';
    biasHTML = `<div class="truthlens-bias">⚠️ ${biasLevel} detected in this post</div>`;
  }
  
  // Detect if tweet has images (not videos)
  // Videos may have tweetPhoto for poster, so check for video first
  const hasVideo = tweet.querySelector('[data-testid="tweetVideo"]');
  const images = tweet.querySelectorAll('[data-testid="tweetPhoto"] img');
  let mediaCheckHTML = '';
  
  console.log('TruthLens: Checking media - hasVideo:', !!hasVideo, 'images found:', images.length);
  
  if (images.length > 0 && !hasVideo) {
    // Always show single button initially
    console.log('TruthLens: Adding media check button for', images.length, 'image(s)');
    mediaCheckHTML = '<button class="truthlens-media-check-btn" data-image-count="' + images.length + '">🖼️ Check if image is AI</button><div class="truthlens-media-result"></div>';
  } else if (hasVideo) {
    console.log('TruthLens: Video detected - NOT adding media check button');
  }
  
  overlay.innerHTML = `
    <div class="truthlens-header">
      <span class="truthlens-label truthlens-label-${labelClass}">${result.label}</span>
      <div class="truthlens-header-buttons">
        <button class="truthlens-speaker-btn" title="Listen to fact check">
          ${SPEAKER_ICON}
        </button>
        <button class="truthlens-close">×</button>
      </div>
    </div>
    <div class="truthlens-body">
      ${biasHTML}
      <p class="truthlens-explanation">${result.explanation}</p>
      ${sourcesHTML}
      ${mediaCheckHTML}
    </div>
  `;
  
  // Stop all event propagation on the overlay
  overlay.addEventListener('click', (e) => {
    // Allow links to work
    if (e.target.classList.contains('truthlens-source-link') || e.target.tagName === 'A') {
      return; // Let the link click through
    }
    e.stopPropagation();
    e.preventDefault();
  });
  
  overlay.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  
  overlay.addEventListener('mouseup', (e) => {
    e.stopPropagation();
  });
  
  // Add close button functionality
  const closeButton = overlay.querySelector('.truthlens-close');
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    overlay.remove();
  });
  
  // Add speaker button functionality
  const speakerButton = overlay.querySelector('.truthlens-speaker-btn');
  let currentAudio = null; // Track current audio playback
  
  speakerButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    // If audio is currently playing, stop it
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
      speakerButton.classList.remove('truthlens-speaker-playing');
      return;
    }
    
    try {
      // Show loading state
      speakerButton.classList.add('truthlens-speaker-loading');
      
      // Get the tweet text (claim)
      const tweetText = extractTweetText(tweet);
      
      console.log('🔊 TTS: Requesting audio for fact check');
      
      // Call the TTS endpoint
      const response = await fetch(TTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claim: tweetText,
          result: result
        })
      });
      
      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }
      
      // Get the audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play audio
      currentAudio = new Audio(audioUrl);
      
      speakerButton.classList.remove('truthlens-speaker-loading');
      speakerButton.classList.add('truthlens-speaker-playing');
      
      currentAudio.onended = () => {
        speakerButton.classList.remove('truthlens-speaker-playing');
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
      };
      
      currentAudio.onerror = () => {
        console.error('🔊 TTS: Audio playback error');
        speakerButton.classList.remove('truthlens-speaker-playing');
        speakerButton.classList.remove('truthlens-speaker-loading');
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
      };
      
      await currentAudio.play();
      console.log('🔊 TTS: Playing audio');
      
    } catch (error) {
      console.error('🔊 TTS error:', error);
      speakerButton.classList.remove('truthlens-speaker-loading');
      alert('Unable to generate audio. Please check if ElevenLabs API is configured.');
    }
  });
  
  // Add media check button functionality (for all buttons)
  const mediaCheckBtns = overlay.querySelectorAll('.truthlens-media-check-btn');
  mediaCheckBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      const resultDiv = overlay.querySelector('.truthlens-media-result');
      
      // Check if this is the initial button (has data-image-count) or a numbered button (has data-image-index)
      const imageCount = parseInt(e.target.getAttribute('data-image-count'));
      const imageIndex = e.target.getAttribute('data-image-index');
      
      // If this is the initial button and there are multiple images, show numbered buttons
      if (imageCount && imageCount > 1 && !imageIndex) {
        console.log('TruthLens: Expanding to show', imageCount, 'image selection buttons');
        
        // Replace the button with numbered buttons
        let numberedButtonsHTML = '<div class="truthlens-media-check-container">';
        numberedButtonsHTML += '<div style="font-size: 13px; color: rgb(83, 100, 113); margin-bottom: 6px;">Select image to check:</div>';
        for (let i = 0; i < imageCount; i++) {
          numberedButtonsHTML += `<button class="truthlens-media-check-btn truthlens-media-check-btn-small" data-image-index="${i}">Image ${i + 1}</button> `;
        }
        numberedButtonsHTML += '</div>';
        
        e.target.outerHTML = numberedButtonsHTML;
        
        // Attach click handlers to new buttons
        const newBtns = overlay.querySelectorAll('.truthlens-media-check-btn');
        newBtns.forEach(newBtn => {
          newBtn.addEventListener('click', async (e2) => {
            e2.stopPropagation();
            e2.preventDefault();
            
            const idx = parseInt(e2.target.getAttribute('data-image-index'));
            await performMediaCheck(idx);
          });
        });
        
        return;
      }
      
      // Otherwise proceed with the check
      const idx = parseInt(imageIndex || '0');
      await performMediaCheck(idx);
      
      async function performMediaCheck(selectedIndex) {
        resultDiv.innerHTML = '<div class="truthlens-loading-small">Checking...</div>';
      
      try {
        console.log('🔍 TruthLens: Starting media check...');
        console.log('Selected image index:', selectedIndex);
        
        // Get all images in the tweet
        const allImages = tweet.querySelectorAll('[data-testid="tweetPhoto"] img');
        
        if (allImages.length === 0) {
          console.error('❌ No images found in tweet');
          resultDiv.innerHTML = '<div class="truthlens-error">Could not find images</div>';
          return;
        }
        
        // Get the specific image selected by user
        const mediaElement = allImages[selectedIndex];
        if (!mediaElement) {
          console.error('❌ Invalid image index:', selectedIndex);
          resultDiv.innerHTML = '<div class="truthlens-error">Image not found</div>';
          return;
        }
        
        const mediaUrl = mediaElement.src;
        console.log('✓ Found image:', mediaUrl);
        
        if (!mediaUrl) {
          console.error('❌ Could not extract media URL from tweet');
          console.log('Tweet element:', tweet);
          console.log('All images in tweet:', tweet.querySelectorAll('img'));
          resultDiv.innerHTML = '<div class="truthlens-error">Could not extract image URL</div>';
          return;
        }
        
        console.log('📤 Sending to backend:', { media_url: mediaUrl, media_type: 'image' });
        
        // Call backend (always use 'image' type now)
        const apiUrl = `${API_ENDPOINT.replace('/fact-check', '/check-media')}`;
        console.log('API endpoint:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media_url: mediaUrl, media_type: 'image' })
        });
        
        console.log('📥 Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API error:', errorText);
          throw new Error(`API returned ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✓ Response data:', data);
        
        // Display result with verdict
        const icon = data.ai_generated ? '🤖' : '👤';
        const verdict = data.ai_generated ? 'AI-generated' : 'Human-created';
        const confidencePercent = Math.round(data.confidence * 100);
        resultDiv.innerHTML = `<div class="truthlens-media-result-text">${icon} ${verdict} (${confidencePercent}% confidence)</div>`;
        console.log('✓ Media check complete');
        
      } catch (error) {
        console.error('❌ Media check error:', error);
        console.error('Error details:', error.message);
        resultDiv.innerHTML = `<div class="truthlens-error">Check failed: ${error.message}</div>`;
      }
      }
    });
  });
  
  // Find tweet text container and append below it
  const tweetTextContainer = tweet.querySelector('[data-testid="tweetText"]');
  if (tweetTextContainer && tweetTextContainer.parentElement) {
    console.log('TruthLens: Found tweet text container, appending to parent');
    tweetTextContainer.parentElement.appendChild(overlay);
  } else {
    // Fallback: append to tweet article
    console.log('TruthLens: Using fallback - appending to tweet article');
    tweet.appendChild(overlay);
  }
  
  console.log('TruthLens: Overlay appended', overlay);
  console.log('TruthLens: Overlay visible?', overlay.offsetHeight > 0);
}

// Handle selection verification from context menu
async function handleSelectionVerification(text) {
  // Show loading overlay
  showGenericOverlay({
    label: "Analyzing...",
    explanation: `<span style="font-size: 17px;">Verifying your selected text with</span> <img src="${chrome.runtime.getURL('icons/ForReal-logo-long-blue-cropped.jpg')}" alt="ForReal" style="height: 17px; vertical-align: 0px; margin-left: 4px;">`,
    sources: [],
    isLoading: true
  }, text);
  
  try {
    const result = await factCheckTweet(text); // Reuse existing API function
    showGenericOverlay(result, text);
  } catch (error) {
    console.error("TruthLens error:", error);
    showGenericOverlay({
      label: "Error",
      explanation: "Unable to verify text. Please try again.",
      sources: [],
      error: true
    }, text);
  }
}

// Show validation result for generic text selection (Fixed Bottom-Right)
function showGenericOverlay(result, claimText = null) {
  // Remove existing overlay
  const existing = document.getElementById('truthlens-generic-overlay');
  if (existing) existing.remove();
  
  const overlay = document.createElement('div');
  overlay.id = 'truthlens-generic-overlay';
  overlay.className = 'truthlens-overlay truthlens-fixed-overlay';
  
  // Determine styling
  let labelClass = 'neutral';
  let labelText = result.label || '...';
  
  if (result.isLoading) {
    labelClass = 'loading';
  } else if (result.error) {
    labelClass = 'error';
  } else if (result.label) {
    labelClass = result.label.toLowerCase().replace(/\s+/g, '-');
  }
  
  // Build sources HTML
  let sourcesHTML = '';
  if (result.sources && result.sources.length > 0) {
    sourcesHTML = '<div class="truthlens-sources">';
    result.sources.forEach(source => {
      const dateStr = source.published_date ? `<span class="truthlens-date">${source.published_date}</span> ` : '';
      sourcesHTML += `<div class="truthlens-source-item">${dateStr}<a href="${source.url}" target="_blank" rel="noopener noreferrer" class="truthlens-source-link">${source.title || source.url}</a></div>`;
    });
    sourcesHTML += '</div>';
  }
  
  // Bias warning
  let biasHTML = '';
  if (result.bias && result.bias.toLowerCase() !== 'none' && !result.isLoading) {
    const biasLevel = result.bias.toLowerCase() === 'likely' ? 'Likely bias' : 'Potential bias';
    biasHTML = `<div class="truthlens-bias">⚠️ ${biasLevel} detected</div>`;
  }
  
  overlay.innerHTML = `
    <div class="truthlens-header">
      <span class="truthlens-label truthlens-label-${labelClass}">
        ${result.isLoading ? '<span class="truthlens-spinner"></span> Analyzing' : labelText}
      </span>
      <div class="truthlens-header-buttons">
        ${claimText && !result.isLoading && !result.error ? `
          <button class="truthlens-speaker-btn" title="Listen to fact check">
            ${SPEAKER_ICON}
          </button>
        ` : ''}
        <button class="truthlens-close">×</button>
      </div>
    </div>
    <div class="truthlens-body">
      ${biasHTML}
      <p class="truthlens-explanation">${result.explanation}</p>
      ${sourcesHTML}
    </div>
  `;
  
  // Close handler
  overlay.querySelector('.truthlens-close').addEventListener('click', () => {
    overlay.remove();
  });
  
  // Speaker button handler
  const speakerButton = overlay.querySelector('.truthlens-speaker-btn');
  if (speakerButton && claimText) {
    let currentAudio = null;
    
    speakerButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // If audio is currently playing, stop it
      if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
        speakerButton.classList.remove('truthlens-speaker-playing');
        return;
      }
      
      try {
        speakerButton.classList.add('truthlens-speaker-loading');
        
        console.log('🔊 TTS: Requesting audio for generic fact check');
        
        const response = await fetch(TTS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            claim: claimText,
            result: result
          })
        });
        
        if (!response.ok) {
          throw new Error(`TTS API error: ${response.status}`);
        }
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        currentAudio = new Audio(audioUrl);
        
        speakerButton.classList.remove('truthlens-speaker-loading');
        speakerButton.classList.add('truthlens-speaker-playing');
        
        currentAudio.onended = () => {
          speakerButton.classList.remove('truthlens-speaker-playing');
          URL.revokeObjectURL(audioUrl);
          currentAudio = null;
        };
        
        currentAudio.onerror = () => {
          console.error('🔊 TTS: Audio playback error');
          speakerButton.classList.remove('truthlens-speaker-playing');
          speakerButton.classList.remove('truthlens-speaker-loading');
          URL.revokeObjectURL(audioUrl);
          currentAudio = null;
        };
        
        await currentAudio.play();
        console.log('🔊 TTS: Playing audio');
        
      } catch (error) {
        console.error('🔊 TTS error:', error);
        speakerButton.classList.remove('truthlens-speaker-loading');
        alert('Unable to generate audio. Please check if ElevenLabs API is configured.');
      }
    });
  }
  
  document.body.appendChild(overlay);
}

// Handle text selection for Floating Action Button
function handleTextSelection(e) {
  // Wait a brief moment for selection to complete
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text.length < 5) {
      removeFloatingButton();
      return;
    }
    
    // Don't show if we already have the button for this selection
    const r1 = selection.getRangeAt(0).getBoundingClientRect();
    const existingBtn = document.getElementById('truthlens-fab');
    if (existingBtn && existingBtn.dataset.text === text) {
      return;
    }
    
    showFloatingButton(r1, text);
  }, 10);
}

// Show Floating Action Button (FAB)
function showFloatingButton(rect, text) {
  removeFloatingButton();
  
  const btn = document.createElement('div');
  btn.id = 'truthlens-fab';
  btn.className = 'truthlens-fab';
  btn.innerHTML = MAGNIFY_ICON;
  btn.title = 'Verify with TruthLens';
  btn.dataset.text = text;
  
  // Calculate position (centered above selection)
  const btnHeight = 32;
  const btnWidth = 32;
  const gap = 10;
  
  // Absolute positioning relative to document
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  
  let top = rect.top + scrollTop - btnHeight - gap;
  let left = rect.left + scrollLeft + (rect.width / 2) - (btnWidth / 2);
  
  // Adjust if going off screen
  if (top < scrollTop) {
    top = rect.bottom + scrollTop + gap; // Show below if no space above
  }
  
  btn.style.top = `${top}px`;
  btn.style.left = `${left}px`;
  
  // Animation styling is in CSS
  
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSelectionVerification(text);
    removeFloatingButton();
    window.getSelection().removeAllRanges(); // Clear selection
  });
  
  document.body.appendChild(btn);
}

// Remove Floating Action Button
function removeFloatingButton() {
  const btn = document.getElementById('truthlens-fab');
  if (btn) btn.remove();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
