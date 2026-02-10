// Text-to-Speech Service

/**
 * Create a speaker button with TTS functionality
 * @param {string} claim - The claim/tweet text
 * @param {Object} result - The fact-check result
 * @returns {HTMLButtonElement} - Speaker button element
 */
function createTTSButton(claim, result) {
    const speakerButton = createElement('button', 'truthlens-speaker-btn');
    speakerButton.title = 'Listen to fact check';
    speakerButton.innerHTML = SPEAKER_ICON;

    let currentAudio = null;

    speakerButton.addEventListener('click', async (e) => {
        stopEvent(e);

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

            // Get audio from backend
            const audioBlob = await generateTTS(claim, result);
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

    return speakerButton;
}
