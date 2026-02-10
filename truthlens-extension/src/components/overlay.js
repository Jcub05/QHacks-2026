// Overlay Component - Result display for fact-checks

/**
 * Show the fact-check result overlay on a tweet
 * @param {HTMLElement} tweet - Tweet element
 * @param {Object} result - Fact-check result
 */
function showFactCheckResult(tweet, result) {
    console.log('TruthLens: showFactCheckResult called', result);

    // Remove any existing overlay from the entire page
    const existingOverlay = document.querySelector('.truthlens-overlay');
    if (existingOverlay) {
        console.log('TruthLens: Removing existing overlay');
        existingOverlay.remove();
    }

    // Create overlay
    const overlay = createElement('div', 'truthlens-overlay');

    // Determine label styling
    const labelClass = result.label.toLowerCase().replace(/\s+/g, '-');

    // Build sources HTML
    const sourcesHTML = buildSourcesHTML(result.sources);

    // Show bias warning only for misleading claims with detected bias
    const biasHTML = buildBiasHTML(result);

    // Check for images and create media check section
    const images = getTweetImages(tweet);
    const hasVideoElement = hasVideo(tweet);
    let mediaCheckHTML = '';

    if (images.length > 0 && !hasVideoElement) {
        console.log('TruthLens: Adding media check button for', images.length, 'image(s)');
        mediaCheckHTML = createMediaCheckHTML(tweet, images.length);
    }

    // Get tweet text for TTS
    const tweetText = extractTweetText(tweet);

    // Build overlay HTML
    overlay.innerHTML = `
    <div class="truthlens-header">
      <span class="truthlens-label truthlens-label-${labelClass}">${result.label}</span>
      <div class="truthlens-header-buttons">
        <span id="truthlens-speaker-container"></span>
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
    setupOverlayEventHandlers(overlay);

    // Add close button functionality
    const closeButton = overlay.querySelector('.truthlens-close');
    closeButton.addEventListener('click', (e) => {
        stopEvent(e);
        overlay.remove();
    });

    // Add TTS button
    if (tweetText) {
        const speakerContainer = overlay.querySelector('#truthlens-speaker-container');
        const speakerButton = createTTSButton(tweetText, result);
        speakerContainer.appendChild(speakerButton);
    }

    // Attach media check handlers
    if (mediaCheckHTML) {
        attachMediaCheckHandlers(overlay, tweet);
    }

    // Find tweet text container and append below it
    const tweetTextContainer = tweet.querySelector(SELECTORS.TWEET_TEXT);
    if (tweetTextContainer && tweetTextContainer.parentElement) {
        console.log('TruthLens: Found tweet text container, appending to parent');
        tweetTextContainer.parentElement.appendChild(overlay);
    } else {
        // Fallback: append to tweet article
        console.log('TruthLens: Using fallback - appending to tweet article');
        tweet.appendChild(overlay);
    }

    console.log('TruthLens: Overlay appended', overlay);
}

/**
 * Show validation result for generic text selection (Fixed Bottom-Right)
 * @param {Object} result - Fact-check result
 * @param {string} claimText - The claim text (optional)
 */
function showGenericOverlay(result, claimText = null) {
    // Remove existing overlay
    removeElementById('truthlens-generic-overlay');

    const overlay = createElement('div', 'truthlens-overlay truthlens-fixed-overlay');
    overlay.id = 'truthlens-generic-overlay';

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

    // Build sources and bias HTML
    const sourcesHTML = buildSourcesHTML(result.sources);
    const biasHTML = result.isLoading ? '' : buildBiasHTML(result);

    overlay.innerHTML = `
    <div class="truthlens-header">
      <span class="truthlens-label truthlens-label-${labelClass}">
        ${result.isLoading ? '<span class="truthlens-spinner"></span> Analyzing' : labelText}
      </span>
      <div class="truthlens-header-buttons">
        ${claimText && !result.isLoading && !result.error ? '<span id="truthlens-speaker-container"></span>' : ''}
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

    // Add TTS button if applicable
    if (claimText && !result.isLoading && !result.error) {
        const speakerContainer = overlay.querySelector('#truthlens-speaker-container');
        if (speakerContainer) {
            const speakerButton = createTTSButton(claimText, result);
            speakerContainer.appendChild(speakerButton);
        }
    }

    document.body.appendChild(overlay);
}

/**
 * Build sources HTML
 * @param {Array} sources - Array of source objects
 * @returns {string} - HTML string
 */
function buildSourcesHTML(sources) {
    if (!sources || sources.length === 0) return '';

    let html = '<div class="truthlens-sources">';
    sources.forEach(source => {
        const dateStr = source.published_date ? `<span class="truthlens-date">${source.published_date}</span> ` : '';
        html += `<div class="truthlens-source-item">${dateStr}<a href="${source.url}" target="_blank" rel="noopener noreferrer" class="truthlens-source-link">${source.title || source.url}</a></div>`;
    });
    html += '</div>';
    return html;
}

/**
 * Build bias warning HTML
 * @param {Object} result - Fact-check result
 * @returns {string} - HTML string
 */
function buildBiasHTML(result) {
    if (!result.bias || result.bias.toLowerCase() === 'none') return '';
    if (result.label && result.label.toLowerCase() !== 'misleading') return '';

    const biasLevel = result.bias.toLowerCase() === 'likely' ? 'Likely bias' : 'Potential bias';
    return `<div class="truthlens-bias">⚠️ ${biasLevel} detected in this post</div>`;
}

/**
 * Setup event handlers for overlay to prevent propagation
 * @param {HTMLElement} overlay - Overlay element
 */
function setupOverlayEventHandlers(overlay) {
    overlay.addEventListener('click', (e) => {
        // Allow links to work
        if (e.target.classList.contains('truthlens-source-link') || e.target.tagName === 'A') {
            return; // Let the link click through
        }
        stopEvent(e);
    });

    overlay.addEventListener('mousedown', (e) => e.stopPropagation());
    overlay.addEventListener('mouseup', (e) => e.stopPropagation());
}
