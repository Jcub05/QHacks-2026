// Floating Action Button (FAB) Component

/**
 * Handle text selection for Floating Action Button
 * @param {Event} e - Event object
 */
function handleTextSelection(e) {
    // Wait a brief moment for selection to complete
    setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (text.length < CONFIG.SELECTION_MIN_LENGTH) {
            removeFloatingButton();
            return;
        }

        // Don't show if we already have the button for this selection
        const r1 = selection.getRangeAt(0).getBoundingClientRect();
        const existingBtn = document.getElementById('truthlens-fab');
        if (existingBtn && existingBtn.dataset.text === text) {
            return;
        }

        showFloatingButton(r1, text);
    }, 10);
}

/**
 * Show Floating Action Button (FAB)
 * @param {DOMRect} rect - Bounding rectangle of selection
 * @param {string} text - Selected text
 */
function showFloatingButton(rect, text) {
    removeFloatingButton();

    const btn = createElement('div', 'truthlens-fab');
    btn.id = 'truthlens-fab';
    btn.innerHTML = MAGNIFY_ICON;
    btn.title = 'Verify with TruthLens';
    btn.dataset.text = text;

    // Calculate position
    const btnHeight = 32;
    const btnWidth = 32;
    const position = calculateFloatingPosition(rect, btnWidth, btnHeight, 10);

    btn.style.top = `${position.top}px`;
    btn.style.left = `${position.left}px`;

    // Add click handler
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSelectionVerification(text);
        removeFloatingButton();
        window.getSelection().removeAllRanges(); // Clear selection
    });

    document.body.appendChild(btn);
}

/**
 * Remove Floating Action Button
 */
function removeFloatingButton() {
    removeElementById('truthlens-fab');
}
