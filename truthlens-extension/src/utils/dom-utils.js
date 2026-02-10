// DOM Utility Functions

/**
 * Stop event propagation and prevent default behavior
 * @param {Event} event - The event to stop
 */
function stopEvent(event) {
    event.stopPropagation();
    event.preventDefault();
}

/**
 * Create an element with optional class and attributes
 * @param {string} tag - HTML tag name
 * @param {string} className - CSS class name(s)
 * @param {Object} attributes - HTML attributes
 * @returns {HTMLElement}
 */
function createElement(tag, className = '', attributes = {}) {
    const element = document.createElement(tag);
    if (className) element.className = className;

    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });

    return element;
}

/**
 * Remove an element by selector
 * @param {string} selector - CSS selector
 */
function removeElement(selector) {
    const element = document.querySelector(selector);
    if (element) element.remove();
}

/**
 * Remove an element by ID
 * @param {string} id - Element ID
 */
function removeElementById(id) {
    const element = document.getElementById(id);
    if (element) element.remove();
}

/**
 * Calculate position for floating element above a rect
 * @param {DOMRect} rect - Bounding rectangle
 * @param {number} elementWidth - Width of floating element
 * @param {number} elementHeight - Height of floating element
 * @param {number} gap - Gap between rect and element
 * @returns {{top: number, left: number}}
 */
function calculateFloatingPosition(rect, elementWidth, elementHeight, gap = 10) {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let top = rect.top + scrollTop - elementHeight - gap;
    let left = rect.left + scrollLeft + (rect.width / 2) - (elementWidth / 2);

    // Adjust if going off screen
    if (top < scrollTop) {
        top = rect.bottom + scrollTop + gap; // Show below if no space above
    }

    return { top, left };
}
