// Injection Service - Handles icon injection and DOM observation

/**
 * Initialize the TruthLens extension
 */
function init() {
    console.log('TruthLens: Initializing...');

    // Check if we are on X/Twitter
    if (!isTwitter()) {
        console.log('TruthLens: Not on Twitter/X, extension not active');
        return;
    }

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
    setupNavigationObserver();

    // Also listen for browser back/forward
    window.addEventListener('popstate', () => {
        console.log('TruthLens: Navigation detected (popstate), re-injecting icons');
        setTimeout(() => injectFactCheckIcons(), CONFIG.NAVIGATION_DELAY);
        setTimeout(() => injectFactCheckIcons(), CONFIG.NAVIGATION_DELAY * 2);
    });

    // Periodic check to re-inject icons if they disappear (fallback safety net)
    setInterval(() => {
        injectFactCheckIcons();
    }, CONFIG.OBSERVER_CHECK_INTERVAL);

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

/**
 * Setup navigation observer for SPA routing
 */
function setupNavigationObserver() {
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            console.log('TruthLens: URL changed, re-injecting icons');
            lastUrl = url;
            // Delay to allow Twitter to render new content
            setTimeout(() => injectFactCheckIcons(), CONFIG.NAVIGATION_DELAY);
            setTimeout(() => injectFactCheckIcons(), CONFIG.NAVIGATION_DELAY * 2);
        }
    }).observe(document, { subtree: true, childList: true });
}

/**
 * Find all tweets and inject the magnifying glass icon
 */
function injectFactCheckIcons() {
    // Find all tweet articles
    const tweets = findAllTweets();

    tweets.forEach((tweet) => {
        // Find the action bar (reply, retweet, like buttons)
        const actionBar = tweet.querySelector(SELECTORS.ACTION_BAR);
        if (!actionBar) {
            return;
        }

        // Check if we already injected our icon
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
