import { Interface } from "./canvas_interface.js"

document.addEventListener('DOMContentLoaded', () => {
    window.INTERFACE_LEFT = new Interface(window.element_ids_left);
    window.INTERFACE_RIGHT = new Interface(window.element_ids_right);
});