import { Interface } from "./canvas_interface.js"

function init() {
    window.INTERFACE_LEFT = new Interface(window.element_ids_left);
    window.INTERFACE_RIGHT = new Interface(window.element_ids_right);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}