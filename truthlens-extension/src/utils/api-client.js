// API Client - Centralized API communication

/**
 * Call the backend API to fact-check text
 * @param {string} text - Text to fact-check
 * @returns {Promise<Object>} - Fact-check result
 */
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

/**
 * Check if media is AI-generated
 * @param {string} mediaUrl - URL of the media to check
 * @param {string} mediaType - Type of media ('image' or 'video')
 * @returns {Promise<Object>} - Media check result
 */
async function checkMedia(mediaUrl, mediaType = 'image') {
    console.log('📤 Sending to backend:', { media_url: mediaUrl, media_type: mediaType });

    const apiUrl = API_ENDPOINT.replace('/fact-check', '/check-media');
    console.log('API endpoint:', apiUrl);

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_url: mediaUrl, media_type: mediaType })
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API error:', errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✓ Response data:', data);
    return data;
}

/**
 * Generate text-to-speech audio
 * @param {string} claim - The claim/tweet text
 * @param {Object} result - The fact-check result
 * @returns {Promise<Blob>} - Audio blob
 */
async function generateTTS(claim, result) {
    console.log('🔊 TTS: Requesting audio for fact check');

    const response = await fetch(TTS_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            claim: claim,
            result: result
        })
    });

    if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    return audioBlob;
}
