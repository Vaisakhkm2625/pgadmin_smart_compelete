console.log("pgAdmin Smart Autocomplete: Script injected into " + window.location.href);

let recentQueries = [];
let currentSuggestion = "";
let suggestionOverlay = null;

console.log("pgAdmin Smart Autocomplete extension loaded.");

/**
 * Robust way to get the current editor text and line.
 */
function getEditorContext(target) {
    let text = "";
    if (target.matches('.cm-content')) {
        text = target.innerText;
    } else if (target.tagName === 'TEXTAREA') {
        text = target.value;
    } else {
        text = target.innerText || target.value || "";
    }

    const lines = text.split('\n');
    return lines[lines.length - 1].trim();
}

/**
 * Creates or updates the suggestion UI.
 */
function showSuggestionUI(suggestion, target) {
    if (!suggestionOverlay) {
        suggestionOverlay = document.createElement('div');
        suggestionOverlay.id = 'pgadmin-smart-autocomplete-overlay';
        suggestionOverlay.style = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #2c3e50;
            color: #ecf0f1;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 99999;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 13px;
            border-left: 4px solid #3498db;
            display: flex;
            flex-direction: column;
            gap: 4px;
            pointer-events: none;
            transition: opacity 0.2s;
        `;
        document.body.appendChild(suggestionOverlay);
    }

    currentSuggestion = suggestion;
    suggestionOverlay.innerHTML = `
        <div style="font-size: 11px; color: #bdc3c7; text-transform: uppercase; letter-spacing: 0.5px;">Smart Suggestion</div>
        <div style="font-weight: 500;">${suggestion}</div>
        <div style="font-size: 10px; color: #95a5a6; margin-top: 4px;">Press <span style="background: #34495e; padding: 1px 4px; border-radius: 3px;">Tab</span> to accept</div>
    `;
    suggestionOverlay.style.opacity = '1';
}

function hideSuggestionUI() {
    if (suggestionOverlay) {
        suggestionOverlay.style.opacity = '0';
        setTimeout(() => {
            if (suggestionOverlay.style.opacity === '0') {
                currentSuggestion = "";
            }
        }, 200);
    }
}

/**
 * Inserts text at the current cursor position.
 */
function insertText(text) {
    // Focus the element first
    const activeElement = document.activeElement;
    if (!activeElement) return;

    // Use execCommand for better compatibility with editors like CodeMirror
    document.execCommand('insertText', false, text);
    hideSuggestionUI();
}

window.addEventListener('keydown', (event) => {
    const target = event.target;

    // 1. Handle "Accept Suggestion" with Tab
    if (event.key === 'Tab' && currentSuggestion) {
        event.preventDefault();
        event.stopPropagation();
        console.log("pgAdmin Autocomplete: Suggestion accepted via Tab.");
        insertText(currentSuggestion);
        return;
    }

    // 2. Hide UI on Escape or normal typing
    if (event.key === 'Escape') {
        hideSuggestionUI();
        return;
    }

    // 3. Trigger Autocomplete with Ctrl+Space
    if ((event.ctrlKey || event.metaKey) && (event.code === 'Space' || event.key === ' ')) {
        const isEditor = target.matches('.cm-content') ||
            target.tagName === 'TEXTAREA' ||
            target.classList.contains('cm-text') ||
            target.closest('.cm-editor');

        if (isEditor) {
            event.preventDefault();
            event.stopPropagation();

            const currentLine = getEditorContext(target);
            provideSuggestion(currentLine, target);
        }
    } else if (!event.ctrlKey && !event.metaKey && event.key.length === 1) {
        // Hide overlay if user continues typing normally
        hideSuggestionUI();
    }
}, { capture: true });

async function provideSuggestion(currentLine, element) {
    try {
        console.log("pgAdmin Autocomplete: Requesting suggestion...");
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
        if (data.suggestion && data.suggestion.trim().length > 0) {
            console.log("pgAdmin Autocomplete: Suggestion received.");
            showSuggestionUI(data.suggestion, element);
        } else {
            console.log("pgAdmin Autocomplete: No suggestion returned from API.");
            hideSuggestionUI();
        }
    } catch (error) {
        console.error("pgAdmin Autocomplete: Fetch Error:", error);
    }
}

// Global cleanup
document.addEventListener('click', hideSuggestionUI);
