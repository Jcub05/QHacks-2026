// Tweet-specific utility functions

/**
 * Get a unique identifier for a tweet
 * @param {HTMLElement} tweet - Tweet article element
 * @returns {string|null} - Tweet ID or text snippet
 */
function getTweetId(tweet) {
    // Try to find the tweet link which contains the tweet ID
    const tweetLink = tweet.querySelector(SELECTORS.TWEET_LINK);
    if (tweetLink) {
        const match = tweetLink.href.match(/\/status\/(\d+)/);
        if (match) {
            return match[1];
        }
    }

    // Fallback: use the tweet text as identifier
    const tweetText = tweet.querySelector(SELECTORS.TWEET_TEXT);
    if (tweetText) {
        return tweetText.textContent.slice(0, 50);
    }

    return null;
}

/**
 * Extract tweet text from the tweet element
 * @param {HTMLElement} tweet - Tweet article element
 * @returns {string|null} - Tweet text content
 */
function extractTweetText(tweet) {
    const tweetTextElement = tweet.querySelector(SELECTORS.TWEET_TEXT);
    if (!tweetTextElement) {
        return null;
    }

    return tweetTextElement.textContent.trim();
}

/**
 * Get all images in a tweet
 * @param {HTMLElement} tweet - Tweet article element
 * @returns {NodeList} - List of image elements
 */
function getTweetImages(tweet) {
    return tweet.querySelectorAll(`${SELECTORS.TWEET_PHOTO} img`);
}

/**
 * Check if tweet has a video
 * @param {HTMLElement} tweet - Tweet article element
 * @returns {boolean}
 */
function hasVideo(tweet) {
    return !!tweet.querySelector(SELECTORS.TWEET_VIDEO);
}

/**
 * Find all tweets on the current page
 * @returns {NodeList} - List of tweet article elements
 */
function findAllTweets() {
    return document.querySelectorAll(SELECTORS.TWEET_ARTICLE);
}

/**
 * Check if we are on Twitter/X
 * @returns {boolean}
 */
function isTwitter() {
    return window.location.hostname.includes('twitter.com') ||
        window.location.hostname.includes('x.com');
}
