// content.js - THE LOUD VERSION

console.log('🚀 TruthCheck Extension Loaded on Twitter!');

// 1. Watch for new tweets
const observer = new MutationObserver(() => injectButtons());
observer.observe(document.body, { childList: true, subtree: true });

function injectButtons() {
    const actionBars = document.querySelectorAll('[role="group"]');
    actionBars.forEach((bar) => {
        if (bar.querySelector('.truthcheck-btn')) return;

        // Create Button
        const btn = document.createElement('div');
        btn.className = 'truthcheck-btn';
        btn.style.cssText =
            'display: flex; align-items: center; margin-left: 20px; cursor: pointer; color: #71767B; font-size: 13px; font-family: sans-serif;';
        btn.innerHTML = `<span style="margin-right:4px">🔍</span> Verify`;

        // Click Handler
        btn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();

            console.log('🖱️ Button Clicked!'); // <--- Debug 1
            btn.innerHTML = '⏳ Checking...';

            // Get Tweet Text
            const tweetArticle = bar.closest('article');
            const tweetText = tweetArticle.querySelector(
                '[data-testid="tweetText"]',
            )?.innerText;

            if (!tweetText) {
                console.error('❌ Could not find text in this tweet.');
                btn.innerHTML = '❌ No Text';
                return;
            }

            console.log('📝 Sending text to background:', tweetText); // <--- Debug 2

            // Send to Background
            try {
                chrome.runtime.sendMessage(
                    { action: 'verify_claim', text: tweetText },
                    (response) => {
                        console.log(
                            '📩 Received response from background:',
                            response,
                        ); // <--- Debug 3

                        if (chrome.runtime.lastError) {
                            console.error(
                                '❌ Runtime Error:',
                                chrome.runtime.lastError.message,
                            );
                            btn.innerHTML = '❌ Connection Error';
                            return;
                        }

                        if (response && response.success) {
                            showResult(tweetArticle, response);
                            btn.innerHTML = response.isTrue
                                ? '✅ Verified'
                                : '❌ Misleading';
                            btn.style.color = response.isTrue
                                ? '#00BA7C'
                                : '#F44336';
                        } else {
                            btn.innerHTML = '❌ Error';
                            alert(
                                'Error: ' +
                                    (response
                                        ? response.error
                                        : 'Unknown Error'),
                            );
                        }
                    },
                );
            } catch (err) {
                console.error('❌ Send Message Failed:', err);
            }
        };

        bar.appendChild(btn);
    });
}

function showResult(tweetNode, data) {
    if (tweetNode.querySelector('.truthcheck-result')) return;

    console.log('🎨 Rendering Result Box...'); // <--- Debug 4

    const box = document.createElement('div');
    box.className = 'truthcheck-result';
    box.style.cssText = `margin: 10px; padding: 12px; border-radius: 8px; background: ${data.isTrue ? '#00BA7C1a' : '#F443361a'}; border-left: 4px solid ${data.isTrue ? '#00BA7C' : '#F44336'}; color: white; font-family: sans-serif;`;

    let sourceLinks = (data.sources || [])
        .map(
            (s) =>
                `<a href="${s.url}" style="color:inherit; text-decoration:underline; margin-right:10px" target="_blank">${s.title}</a>`,
        )
        .join('');

    box.innerHTML = `
    <strong>${data.isTrue ? 'Verified' : 'Potential Misinformation'}</strong><br/>
    <div style="margin-top:4px; opacity:0.9">${data.summary}</div>
    <div style="margin-top:8px; font-size:11px;">Sources: ${sourceLinks || 'General Knowledge'}</div>
  `;

    // Append below tweet text
    const textContainer = tweetNode.querySelector(
        '[data-testid="tweetText"]',
    )?.parentElement;
    if (textContainer) textContainer.appendChild(box);
}
