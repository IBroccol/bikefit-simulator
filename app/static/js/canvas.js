import { Interface } from "./canvas_interface.js"

function init() {
    const INTERFACE = new Interface(window.element_ids);
}

// When injected dynamically by React, DOMContentLoaded has already fired.
// Run immediately in that case; otherwise wait for the event.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}