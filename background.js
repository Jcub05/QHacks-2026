// background.js - THE LOUD VERSION
const API_KEY = ''; // <--- Put your key here

console.log('🤖 Service Worker Loaded!');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message Received in Background:', request); // <--- Debug 5

    if (request.action === 'verify_claim') {
        checkClaim(request.text).then((data) => {
            console.log('📤 Sending Response back to Page:', data); // <--- Debug 6
            sendResponse(data);
        });
        return true; // Keep channel open
    }
});

async function checkClaim(claim) {
    console.log('🧠 Calling Gemini API...');
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Fact check this tweet. Return JSON {isTrue (bool), summary (string)}. Tweet: "${claim}"`,
                                },
                            ],
                        },
                    ],
                    tools: [{ google_search: {} }],
                }),
            },
        );

        const data = await response.json();
        console.log('📦 Raw API Data:', data); // <--- Debug 7

        if (!data.candidates) {
            console.error('❌ API Refused:', data);
            return { success: false, error: 'API Refused' };
        }

        // Parse
        let rawText = data.candidates[0].content.parts[0].text;
        rawText = rawText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
        const result = JSON.parse(rawText);

        // Extract sources
        const sources = [];
        if (data.candidates[0].groundingMetadata?.groundingChunks) {
            data.candidates[0].groundingMetadata.groundingChunks.forEach(
                (chunk) => {
                    if (chunk.web?.uri)
                        sources.push({
                            title: chunk.web.title,
                            url: chunk.web.uri,
                        });
                },
            );
        }

        return { success: true, ...result, sources };
    } catch (error) {
        console.error('❌ Background Error:', error);
        return { success: false, error: error.message };
    }
}
