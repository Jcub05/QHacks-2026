// TruthLens Content Script - Entry Point and Orchestrator
// All modules are loaded via manifest.json in the correct order

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
