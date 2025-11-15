/*
 * File: domPreview.js
 * Description: Insecure live preview of ticket descriptions using innerHTML.
 * Author: Liam Connell
 * Date: 2025-11-14
 *
 * INTENTIONAL VULNERABILITY:
 * --------------------------
 * DOM-Based XSS:
 *   - User input is injected directly into the DOM using innerHTML.
 *   - No sanitisation, no filtering, no escaping.
 *   - Any <script> entered will immediately execute.
 */

document.addEventListener("DOMContentLoaded", () => {
    const descriptionInput = document.getElementById("description");
    const preview = document.getElementById("descriptionPreview");

    if (!descriptionInput || !preview) return;

    // INSECURE: Directly injects user-supplied text into HTML → DOM XSS
    descriptionInput.addEventListener("input", () => {
        preview.innerHTML = descriptionInput.value;
    });
});
