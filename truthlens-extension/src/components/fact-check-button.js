// Fact-Check Button Component

/**
 * Create the fact-check button for a tweet
 * @param {HTMLElement} tweet - Tweet article element
 * @param {string} tweetId - Tweet identifier
 * @returns {HTMLDivElement} - Button element
 */
function createFactCheckButton(tweet, tweetId) {
    const button = createElement('div', 'truthlens-button');
    button.innerHTML = MAGNIFY_ICON;
    button.title = 'Fact-check this tweet';

    let factCheckResult = null;
    let isChecked = false;

    button.addEventListener('click', async (e) => {
        stopEvent(e);

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

        // Perform fact-check
        factCheckResult = await handleFactCheck(tweet, tweetText, button);
        updateButtonIcon(button, factCheckResult.label);
        isChecked = true;
        button.classList.remove('truthlens-loading');
    });

    return button;
}

/**
 * Update button icon based on result
 * @param {HTMLElement} button - Button element
 * @param {string} label - Result label
 */
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
