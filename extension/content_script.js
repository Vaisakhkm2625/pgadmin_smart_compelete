console.log("pgAdmin Smart Autocomplete: Script injected into " + window.location.href);

let recentQueries = [];

// Only run on the pgAdmin port (optional warning, not blocking)
if (window.location.port !== "15433") {
    console.warn(`pgAdmin Autocomplete: Port is ${window.location.port}, not the expected 15433. Continuing anyway.`);
}

console.log("pgAdmin Smart Autocomplete extension loaded.");

/**
 * Robust way to get the current editor text and line.
 * pgAdmin 4 uses CodeMirror.
 */
function getEditorContext(target) {
    let text = "";
    if (target.matches('.cm-content')) {
        text = target.innerText;
    } else if (target.tagName === 'TEXTAREA') {
        text = target.value;
    } else {
        // Fallback for other potential editors
        text = target.innerText || target.value || "";
    }

    const lines = text.split('\n');
    // For CodeMirror, target.innerText might include a lot of stuff, 
    // but the last line current cursor is on is usually what we want.
    // However, a perfect implementation would use CodeMirror API.
    return lines[lines.length - 1].trim();
}

// Use window.addEventListener with capture: true to ensure we catch events in iframes
window.addEventListener('keydown', (event) => {
    // This log should trigger for every key you press in the editor
    console.log("pgAdmin Autocomplete: Keydown detected in frame:", window.location.href, "Target:", event.target);

    // Check for Ctrl + Space (or Cmd + Space on Mac)
    if ((event.ctrlKey || event.metaKey) && (event.code === 'Space' || event.key === ' ')) {
        console.log("pgAdmin Autocomplete: Ctrl+Space detected!");

        // We trigger if it's an editor OR if we can't be sure (broadening the match)
        const target = event.target;
        const isEditor = target.matches('.cm-content') ||
            target.tagName === 'TEXTAREA' ||
            target.classList.contains('cm-text') ||
            target.closest('.cm-editor');

        if (isEditor) {
            console.log("pgAdmin Autocomplete: Target matched as editor. Fetching suggestion...");
            event.preventDefault();
            event.stopPropagation();

            const currentLine = getEditorContext(target);
            console.log(`pgAdmin Autocomplete: Current line: "${currentLine}"`);

            provideSuggestion(currentLine, target);
        } else {
            console.warn("pgAdmin Autocomplete: Ctrl+Space ignored because target is not an editor.");
        }
    }
}, { capture: true });

async function provideSuggestion(currentLine, element) {
    try {
        console.log("pgAdmin Autocomplete: Sending request to 127.0.0.1:8000...");
        const response = await fetch('http://127.0.0.1:8000/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recent_queries: recentQueries,
                current_query: currentLine
            })
        });

        if (!response.ok) {
            console.error("pgAdmin Autocomplete: Server error response:", response.status);
            return;
        }

        const data = await response.json();
        console.log("pgAdmin Autocomplete suggestion received:", data.suggestion);
        alert("Smart Suggestion: " + data.suggestion); // Visual feedback for now
    } catch (error) {
        console.error("pgAdmin Autocomplete: Fetch Error:", error);
        console.log("Check if your FastAPI server is running at http://127.0.0.1:8000");
    }
}

// Mocking recent queries capture
document.addEventListener('click', (event) => {
    if (event.target.closest('[data-test-id="execute-button"]')) {
        console.log("pgAdmin Autocomplete: Execute button clicked. Ready for query capture.");
    }
});
