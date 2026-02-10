// Media Checker Component - AI-generated image detection

/**
 * Create media check button and result display
 * @param {HTMLElement} tweet - Tweet element
 * @param {number} imageCount - Number of images in tweet
 * @returns {string} - HTML string for media check section
 */
function createMediaCheckHTML(tweet, imageCount) {
    if (imageCount === 0) return '';

    return `
    <button class="truthlens-media-check-btn" data-image-count="${imageCount}">
      🖼️ Check if image is AI
    </button>
    <div class="truthlens-media-result"></div>
  `;
}

/**
 * Attach media check button handlers
 * @param {HTMLElement} overlay - Overlay element containing the buttons
 * @param {HTMLElement} tweet - Tweet element
 */
function attachMediaCheckHandlers(overlay, tweet) {
    const mediaCheckBtns = overlay.querySelectorAll('.truthlens-media-check-btn');

    mediaCheckBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            stopEvent(e);

            const resultDiv = overlay.querySelector('.truthlens-media-result');
            const imageCount = parseInt(e.target.getAttribute('data-image-count'));
            const imageIndex = e.target.getAttribute('data-image-index');

            // If this is the initial button and there are multiple images, show numbered buttons
            if (imageCount && imageCount > 1 && !imageIndex) {
                expandToImageSelection(e.target, imageCount, overlay, tweet);
                return;
            }

            // Otherwise proceed with the check
            const idx = parseInt(imageIndex || '0');
            await performMediaCheck(tweet, idx, resultDiv);
        });
    });
}

/**
 * Expand button to show numbered image selection
 * @param {HTMLElement} button - Button to replace
 * @param {number} imageCount - Number of images
 * @param {HTMLElement} overlay - Overlay element
 * @param {HTMLElement} tweet - Tweet element
 */
function expandToImageSelection(button, imageCount, overlay, tweet) {
    console.log('TruthLens: Expanding to show', imageCount, 'image selection buttons');

    let numberedButtonsHTML = '<div class="truthlens-media-check-container">';
    numberedButtonsHTML += '<div style="font-size: 13px; color: rgb(83, 100, 113); margin-bottom: 6px;">Select image to check:</div>';
    for (let i = 0; i < imageCount; i++) {
        numberedButtonsHTML += `<button class="truthlens-media-check-btn truthlens-media-check-btn-small" data-image-index="${i}">Image ${i + 1}</button> `;
    }
    numberedButtonsHTML += '</div>';

    button.outerHTML = numberedButtonsHTML;

    // Attach click handlers to new buttons
    const resultDiv = overlay.querySelector('.truthlens-media-result');
    const newBtns = overlay.querySelectorAll('.truthlens-media-check-btn');
    newBtns.forEach(newBtn => {
        newBtn.addEventListener('click', async (e2) => {
            stopEvent(e2);
            const idx = parseInt(e2.target.getAttribute('data-image-index'));
            await performMediaCheck(tweet, idx, resultDiv);
        });
    });
}

/**
 * Perform media check on a specific image
 * @param {HTMLElement} tweet - Tweet element
 * @param {number} selectedIndex - Index of image to check
 * @param {HTMLElement} resultDiv - Result display element
 */
async function performMediaCheck(tweet, selectedIndex, resultDiv) {
    resultDiv.innerHTML = '<div class="truthlens-loading-small">Checking...</div>';

    try {
        console.log('🔍 TruthLens: Starting media check...');
        console.log('Selected image index:', selectedIndex);

        // Get all images in the tweet
        const allImages = getTweetImages(tweet);

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
            resultDiv.innerHTML = '<div class="truthlens-error">Could not extract image URL</div>';
            return;
        }

        // Call backend API
        const data = await checkMedia(mediaUrl, 'image');

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
