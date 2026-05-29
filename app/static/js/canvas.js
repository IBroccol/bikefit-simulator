import { Interface } from "./canvas_interface.js"

function init() {
    const INTERFACE = new Interface(window.element_ids);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}