console.log("pgAdmin Smart Autocomplete: Script injected into " + window.location.href);

let recentQueries = [];
let currentSuggestion = "";
let suggestionOverlay = null;

console.log("pgAdmin Smart Autocomplete extension loaded.");
/**
 * Extracts recent queries from the editor text.
 * Splits by semicolons and returns the last few completed queries.
 */
function extractRecentQueries(target) {
    let text = "";
    if (target.matches('.cm-content')) {
        text = target.innerText;
    } else if (target.tagName === 'TEXTAREA') {
        text = target.value;
    } else {
        text = target.innerText || target.value || "";
    }

    // Split by semicolon to get individual queries
    const queries = text.split(';').map(q => q.trim()).filter(q => q.length > 0);

    // Return last 5 queries (excluding the current incomplete one)
    return queries.slice(Math.max(0, queries.length - 5), -1);
}

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
 * Gets the coordinates of the caret (cursor) position.
 */
function getCaretCoordinates() {
    let x = 0;
    let y = 0;
    const selection = window.getSelection();
    if (selection.rangeCount !== 0) {
        const range = selection.getRangeAt(0).cloneRange();
        range.collapse(true);
        const rects = range.getClientRects();
        if (rects.length > 0) {
            const rect = rects[0];
            x = rect.left;
            y = rect.top;
        }
    }
    return { x, y };
}

/**
 * Creates or updates the suggestion UI.
 */
function showSuggestionUI(suggestion, x, y) {
    if (!suggestionOverlay) {
        suggestionOverlay = document.createElement('div');
        suggestionOverlay.id = 'pgadmin-smart-autocomplete-overlay';
        suggestionOverlay.style.cssText = `
            position: fixed;
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

    // Position the overlay near the cursor
    // Add some offset so it doesn't cover the text
    const top = y + 20;
    const left = x;

    suggestionOverlay.style.top = `${top}px`;
    suggestionOverlay.style.left = `${left}px`;
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
            recentQueries = extractRecentQueries(target);
            const { x, y } = getCaretCoordinates();
            provideSuggestion(currentLine, target, x, y);
        }
    } else if (!event.ctrlKey && !event.metaKey && event.key.length === 1) {
        // Hide overlay if user continues typing normally
        hideSuggestionUI();
    }
}, { capture: true });

/**
 * Extracts visible data from the Data Output panel (User Provided Logic).
 */
function extractGridData() {
    try {
        const gridRows = Array.from(
            document.querySelectorAll('#id-dataoutput [role="grid"] [role="row"]')
        );

        if (gridRows.length === 0) return null;

        let output = "Visible Data Sample:\n";

        // Limit to first 20 rows
        const visibleRows = gridRows.slice(0, 20);

        visibleRows.forEach(row => {
            const cells = Array.from(
                row.querySelectorAll('[role="columnheader"],[role="gridcell"]'),
                cell => cell.textContent.trim()
            );

            const rowData = cells.join(" | ");
            if (rowData) {
                output += rowData + "\n";
            }
        });
        console.log(output)

        return output.trim();
    } catch (e) {
        console.error("pgAdmin Autocomplete: Error extracting grid data", e);
        return null;
    }
}

async function provideSuggestion(currentLine, element, x, y) {
    try {
        console.log("pgAdmin Autocomplete: Requesting suggestion...");

        // Extract visible data from the Data Output grid (if available)
        const previousOutput = extractGridData();

        const response = await fetch('http://127.0.0.1:8000/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recent_queries: recentQueries,
                current_query: currentLine,
                previous_output: previousOutput
            })
        });

        if (!response.ok) {
            console.error("pgAdmin Autocomplete: Server error response:", response.status);
            return;
        }

        const data = await response.json();
        if (data.suggestion && data.suggestion.trim().length > 0) {
            console.log("pgAdmin Autocomplete: Suggestion received.");
            showSuggestionUI(data.suggestion, x, y);
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
