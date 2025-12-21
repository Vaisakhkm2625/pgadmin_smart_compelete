// This is a simplified content script to demonstrate the concept.
// pgAdmin uses CodeMirror, so a robust implementation would interact with the CodeMirror instance.
// For this demo, we'll listen for keydown events on common editor elements.

let recentQueries = [];
let debounceTimer;

console.log("pgAdmin Smart Autocomplete extension loaded.");

document.addEventListener('keydown', (event) => {
    const target = event.target;
    if (target.matches('.cm-content') || target.tagName === 'TEXTAREA') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const currentText = target.innerText || target.value;
            const lines = currentText.split('\n');
            const currentLine = lines[lines.length - 1].trim();

            if (currentLine.length > 5) {
                provideSuggestion(currentLine, target);
            }
        }, 800);
    }
});

async function provideSuggestion(currentLine, element) {
    try {
        const response = await fetch('http://localhost:8000/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recent_queries: recentQueries,
                current_query: currentLine
            })
        });

        const data = await response.json();
        if (data.suggestion) {
            console.log("Autocomplete Suggestion:", data.suggestion);
            // In a real implementation, we would show a custom autocomplete UI here.
        }
    } catch (error) {
        console.error("Error fetching suggestion:", error);
    }
}

// Mocking recent queries capture for demo
// In real use, we'd listen for Execute button clicks
document.addEventListener('click', (event) => {
    if (event.target.closest('[data-test-id="execute-button"]')) {
        // Logic to scrape current editor content and add to recentQueries
    }
});
