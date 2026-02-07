
// Sample data tailored to the embedded posts
const sampleResults = {
    "post-1": {
        label: "True",
        explanation: "This is a genuine photograph of the artist SZA, released as part of a promotional campaign. The image has been verified by multiple entertainment news outlets.",
        sources: [
            { title: "Entertainment Weekly: SZA's New Look", url: "#" },
            { title: "Vulture: See the New SZA Photo", url: "#" }
        ],
        bias: "none"
    },
    "post-2": {
        label: "Misleading",
        explanation: "While this was a widely circulated report from a credible journalist at the time, the term 'hiring' implies a finalized deal. At the moment this was posted, the agreement was not yet officially confirmed by the Lakers organization, making the claim premature.",
        sources: [
            { title: "ESPN: Lakers in talks with JJ Redick", url: "#" }
        ],
        bias: "Likely"
    },
    "post-3": {
        label: "True",
        explanation: "This was a correct expectation. Apple officially announced its partnership with OpenAI to integrate ChatGPT features into iOS 18 during its WWDC keynote event.",
        sources: [
            { title: "Bloomberg: Apple to Announce OpenAI Partnership", url: "#" },
            { title: "The Verge: WWDC 2024 Live Blog", url: "#" }
        ],
        bias: "none"
    }
};

// Adapted showFactCheckResult function for the new demo layout
function showFactCheckResult(postCard, result) {
    // Remove any existing overlay from this specific card
    const existingOverlay = postCard.querySelector('.truthlens-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
        return; // If the overlay is already showing, clicking again should close it.
    }

    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'truthlens-overlay';

    const labelClass = result.label.toLowerCase().replace(/\s+/g, '-');

    let sourcesHTML = '';
    if (result.sources && result.sources.length > 0) {
        sourcesHTML = '<div class="truthlens-sources">';
        result.sources.forEach(source => {
            sourcesHTML += `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title}</a>`;
        });
        sourcesHTML += '</div>';
    }

    let biasHTML = '';
    if (result.label.toLowerCase() === 'misleading' && result.bias && result.bias.toLowerCase() !== 'none') {
        const biasLevel = result.bias.toLowerCase() === 'likely' ? 'Likely bias' : 'Potential bias';
        biasHTML = `<div class="truthlens-bias">⚠️ ${biasLevel} detected in this post</div>`;
    }

    overlay.innerHTML = `
    <div class="truthlens-header">
      <span class="truthlens-label truthlens-label-${labelClass}">${result.label}</span>
      <button class="truthlens-close">×</button>
    </div>
    <div class="truthlens-content">
      ${biasHTML}
      <p class="truthlens-explanation">${result.explanation}</p>
      ${sourcesHTML}
    </div>
  `;

    // Add close button functionality
    const closeButton = overlay.querySelector('.truthlens-close');
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        overlay.remove();
    });

    // Append the overlay to the post card
    postCard.appendChild(overlay);
}

// Main function to set up event listeners
function initializeDemo() {
    const factCheckButtons = document.querySelectorAll('.fact-check-button');
    factCheckButtons.forEach(button => {
        button.addEventListener('click', () => {
            const postId = button.dataset.postId;
            if (postId && sampleResults[postId]) {
                const postCard = document.getElementById(postId);
                const result = sampleResults[postId];
                showFactCheckResult(postCard, result);
            }
        });
    });
}

// The twitter widgets.js script can take time to load and render the tweets.
// We need to wait for it to finish before we attach our listeners.
// A simple polling mechanism is a reliable way to do this.
const checkTwitterWidgets = setInterval(() => {
    if (window.twttr && window.twttr.widgets && typeof window.twttr.widgets.load === 'function') {
        // Once the Twitter widgets script is ready, render the tweets
        window.twttr.widgets.load(document.querySelectorAll('.twitter-tweet'))
            .then(() => {
                // Once tweets are rendered, initialize our demo logic
                console.log('Tweets rendered, initializing demo.');
                initializeDemo();
                clearInterval(checkTwitterWidgets); // Stop polling
            });
    } else {
        console.log('Waiting for Twitter widgets to load...');
    }
}, 100); // Check every 100ms
