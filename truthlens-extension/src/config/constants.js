// TruthLens Configuration and Constants

// API Endpoints
const API_ENDPOINT = 'http://localhost:8000/api/fact-check';
const TTS_ENDPOINT = 'http://localhost:8000/api/text-to-speech';

// SVG Icons
const MAGNIFY_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true" class="truthlens-icon">
  <g>
    <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"></path>
  </g>
</svg>
`;

const SPEAKER_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true" class="truthlens-icon truthlens-icon-speaker">
  <g>
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path>
  </g>
</svg>
`;

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

// DOM Selectors
const SELECTORS = {
    TWEET_ARTICLE: 'article[data-testid="tweet"]',
    ACTION_BAR: '[role="group"]',
    TWEET_TEXT: '[data-testid="tweetText"]',
    TWEET_PHOTO: '[data-testid="tweetPhoto"]',
    TWEET_VIDEO: '[data-testid="tweetVideo"]',
    TWEET_LINK: 'a[href*="/status/"]'
};

// Configuration
const CONFIG = {
    OBSERVER_CHECK_INTERVAL: 3000, // ms
    NAVIGATION_DELAY: 500, // ms
    SELECTION_MIN_LENGTH: 5 // characters
};
