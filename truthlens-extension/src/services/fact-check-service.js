// Fact-Check Service - Orchestrates fact-checking workflow

/**
 * Handle fact-checking for a tweet
 * @param {HTMLElement} tweet - Tweet element
 * @param {string} tweetText - Tweet text content
 * @param {HTMLElement} button - Fact-check button element
 * @returns {Promise<Object>} - Fact-check result
 */
async function handleFactCheck(tweet, tweetText, button) {
    if (!tweetText) {
        console.log('TruthLens: No text found');
        return {
            label: 'Unverifiable',
            explanation: 'This tweet contains no text to fact-check.',
            sources: [],
            confidence: 0
        };
    }

    try {
        console.log('TruthLens: Calling API...');
        const result = await factCheckTweet(tweetText);
        console.log('TruthLens: Got result:', result);
        return result;
    } catch (error) {
        console.error('TruthLens error:', error);
        return {
            label: 'Error',
            explanation: 'Unable to fact-check at this time. Please try again.',
            sources: [],
            confidence: 0
        };
    }
}

/**
 * Handle selection verification from context menu or floating button
 * @param {string} text - Selected text to verify
 */
async function handleSelectionVerification(text) {
    // Show loading overlay
    showGenericOverlay({
        label: "Analyzing...",
        explanation: `<span style="font-size: 17px;">Verifying your selected text with</span> <img src="${chrome.runtime.getURL('icons/ForReal-logo-long-blue-cropped.jpg')}" alt="ForReal" style="height: 17px; vertical-align: 0px; margin-left: 4px;">`,
        sources: [],
        isLoading: true
    }, text);

    try {
        const result = await factCheckTweet(text);
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
