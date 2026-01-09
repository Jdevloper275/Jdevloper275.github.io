
// State Management
const appState = {
    currentTab: 'calc',
    theme: 'dark',
    calcValue: '0',
    calcValue: '0',
    calcHistory: '',
    gstRate: 18,
    lastCalcResult: 0,
    lastConvResult: 0,
    history: [],
    layout: {
        // 8 Configurable Slots
        // R1: Slot 0, Slot 1
        // R2: Slot 2, Slot 3
        // R3: Slot 4, Slot 5
        // R4: Slot 6, Slot 7
        // Default matches v60 state (AC on top)
        slots: ['/', 'AC', '*', 'back', '-', '%', '+', '=']
    }
};

let longPressTimer;
let isLongPress = false;
let currentSlotIndex = -1;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupTabs();
    updateUnitOptions(); // Initialize conversion options
    loadHistory(); // Load saved history
    initBackHandler(); // Double back to exit
    renderKeypad(); // Draw the grid
    // renderSettings(); REMOVED
    preventAccidentalRefresh();
});

// --- DYNAMIC LAYOUT ---
function renderKeypad() {
    const grid = document.getElementById('keypadGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const slots = appState.layout.slots;

    // Fixed Numeric Grid + Dynamic Slots
    // R1: 7, 8, 9, Slot0, Slot1
    // R2: 4, 5, 6, Slot2, Slot3
    // R3: 1, 2, 3, Slot4, Slot5
    // R4: 0, 00, ., Slot6, Slot7

    const rows = [
        ['7', '8', '9', slots[0], slots[1]],
        ['4', '5', '6', slots[2], slots[3]],
        ['1', '2', '3', slots[4], slots[5]],
        ['0', '00', '.', slots[6], slots[7]]
    ];

    let slotCounter = 0;

    rows.forEach(row => {
        row.forEach(key => {
            const btn = document.createElement('button');

            // Determine if this is a configurable slot
            // Digits are fixed. 
            const isConfigurable = !['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '00', '.'].includes(key);
            let mySlotIndex = -1;

            if (isConfigurable) {
                mySlotIndex = slotCounter++;
            }

            // Handle Empty Slot
            if (key === 'empty') {
                btn.className = 'key btn-dark-grey';
                // Even empty slots need to be clickable to configure
                btn.innerText = '+'; // Show placeholder
                btn.style.opacity = '0.3';
            } else {
                // Text & Style
                let text = key;
                let styleClass = 'btn-dark-grey';

                if (['/', '*', '-', '+', '='].includes(key)) {
                    styleClass = key === '=' ? 'btn-yellow op-key' : 'btn-dark-grey op-key';
                    if (key === '/') text = '÷';
                    if (key === '*') text = '×';
                    if (key === '-') text = '−';
                } else if (key === 'AC') {
                    text = 'AC';
                    styleClass = 'btn-light';
                } else if (key === 'back') {
                    text = '⌫';
                    styleClass = 'btn-light';
                } else if (key === '%') {
                    styleClass = 'btn-light';
                }
                btn.className = `key ${styleClass}`;
                btn.innerText = text;
            }

            // Events
            if (isConfigurable) {
                // Pointer Events (Unified Touch/Mouse)

                btn.addEventListener('pointerdown', (e) => {
                    // Capture pointer to track movement even if it leaves element bounds slightly
                    btn.setPointerCapture(e.pointerId);

                    // Track starting coordinates
                    btn.dataset.startX = e.clientX;
                    btn.dataset.startY = e.clientY;

                    startLongPress(e, btn, mySlotIndex);
                });

                btn.addEventListener('pointermove', (e) => {
                    if (!btn.dataset.startX) return;

                    const moveX = Math.abs(e.clientX - parseFloat(btn.dataset.startX));
                    const moveY = Math.abs(e.clientY - parseFloat(btn.dataset.startY));

                    // Tolerance: 10px
                    if (moveX > 10 || moveY > 10) {
                        cancelLongPress(btn);
                    }
                });

                btn.addEventListener('pointerup', (e) => {
                    endLongPress(e, btn);
                    btn.releasePointerCapture(e.pointerId);
                });

                btn.addEventListener('pointercancel', (e) => {
                    cancelLongPress(btn);
                    btn.releasePointerCapture(e.pointerId);
                });

                btn.addEventListener('pointerleave', (e) => {
                    // Optional: if pointer leaves button area significantly, cancel?
                    // With setPointerCapture, we receive events even outside.
                    // Let's rely on distance check in pointermove instead of leave
                    // But if capture is lost or something:
                    // cancelLongPress(btn); 
                    // Actually, let's keep capture logic main.
                });

                // Prevent Context Menu
                btn.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (isLongPress) return false;
                });

                // Click Handling
                // With pointer events, we can treat pointerup as click if not long press
                // But keeping onclick is safer for general 'click' semantics
                btn.onclick = (e) => {
                    if (!isLongPress && key !== 'empty') {
                        calcAction(key === 'AC' ? 'C' : (key === 'back' ? 'back' : key));
                    }
                };

            } else {
                // Fixed keys
                btn.onclick = () => calcAction(key);
            }

            grid.appendChild(btn);
        });
    });
}

function startLongPress(e, btn, index) {
    isLongPress = false;
    currentSlotIndex = index;

    // Add visual feedback
    btn.classList.add('pressing');

    longPressTimer = setTimeout(() => {
        isLongPress = true;
        btn.classList.remove('pressing'); // Remove press effect when acting

        // Trigger Haptic
        if (navigator.vibrate) navigator.vibrate([50]);

        showLayoutModal();
    }, 600); // Reduced to 600ms for snappier feel
}

function cancelLongPress(btn) {
    clearTimeout(longPressTimer);
    if (btn) btn.classList.remove('pressing');
}

function endLongPress(e, btnHTML) {
    clearTimeout(longPressTimer);
    const btn = btnHTML || e.target.closest('.key');
    if (btn) btn.classList.remove('pressing');
}

function showLayoutModal() {
    const modal = document.getElementById('layoutModal');
    const container = document.getElementById('modalOptions');
    container.innerHTML = '';

    const options = [
        { val: 'AC', label: 'AC' },
        { val: 'back', label: '⌫' },
        { val: '/', label: '÷' },
        { val: '*', label: '×' },
        { val: '-', label: '−' },
        { val: '+', label: '+' },
        { val: '%', label: '%' },
        { val: '=', label: '=' },
        { val: 'empty', label: 'Empty' }
    ];

    options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'modal-option';
        div.innerText = opt.label;
        if (appState.layout.slots[currentSlotIndex] === opt.val) {
            div.classList.add('selected');
        }
        div.onclick = () => {
            updateSlot(currentSlotIndex, opt.val);
            closeLayoutModal();
        };
        container.appendChild(div);
    });

    modal.classList.add('active');
}

function closeLayoutModal() {
    document.getElementById('layoutModal').classList.remove('active');
}

function updateSlot(index, value) {
    appState.layout.slots[index] = value;
    renderKeypad();
    // Save to local storage if implementing persistence
}

// --- THEME HANDLING ---
function initTheme() {
    const btn = document.getElementById('themeToggle');
    const html = document.documentElement;

    btn.addEventListener('click', () => {
        appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', appState.theme);
    });
}

// --- TAB NAVIGATION ---
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // Activate clicked
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
            appState.currentTab = targetId;
        });
    });
}

// --- CALCULATOR MODULE ---
function calcAction(val) {
    const display = document.getElementById('calcDisplay');

    // Ensure display has focus so we can use selectionStart/End
    display.focus();

    let current = display.value;
    let start = display.selectionStart;
    let end = display.selectionEnd;

    // Helper to insert text at cursor and update position
    const insertAtCursor = (text) => {
        const before = current.substring(0, start);
        const after = current.substring(end);
        display.value = before + text + after;
        // Move cursor to end of inserted text
        const newPos = start + text.length;
        display.setSelectionRange(newPos, newPos);
        updatePreview();
    };

    if (val === 'C') {
        display.value = '0';
        document.getElementById('calcHistory').innerText = '';
        document.getElementById('gstDetails').innerText = '';
        // Remove cursor visibility on Clear
        display.classList.remove('active-cursor');
        updatePreview();
        adjustFontSize();
    } else if (val === 'back') {
        if (start === end) {
            // No selection, delete 1 char back
            if (start > 0) {
                const before = current.substring(0, start - 1);
                const after = current.substring(start);
                display.value = before + after;
                display.setSelectionRange(start - 1, start - 1);
            }
        } else {
            // Delete selection
            const before = current.substring(0, start);
            const after = current.substring(end);
            display.value = before + after;
            display.setSelectionRange(start, start);
        }

        if (display.value === '') display.value = '0';
        updatePreview();
        adjustFontSize();
    } else if (val === '=') {
        try {
            // Replace symbols for JS eval
            let expression = display.value.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
            const historyExpression = display.value; // Store original for history

            // --- PERCENTAGE PRE-PROCESSING ---
            // 1. Handle "Base + N%" -> "Base + (Base * N/100)"
            expression = expression.replace(/(\d+(?:\.\d+)?)([\+\-])(\d+(?:\.\d+)?)%/g, (match, base, op, percent) => {
                return `${base}${op}(${base}*${percent}/100)`;
            });
            // 2. Handle simple "N%" -> "N/100"
            expression = expression.replace(/(\d+(?:\.\d+)?)%/g, '$1/100');
            // -----------------------------

            // Safety check: only allow numbers and operators
            if (/[^0-9+\-*/().%]/.test(expression)) throw new Error('Invalid Input');

            const result = eval(expression);
            document.getElementById('calcHistory').innerText = historyExpression + ' =';
            display.value = Number(result.toPrecision(12)); // Clean up floating point errors
            appState.lastCalcResult = parseFloat(display.value);

            document.getElementById('calcPreview').innerText = ''; // Clear preview on result

            // Add to History
            addToHistory({
                type: 'CALC',
                expression: historyExpression,
                result: display.value,
                timestamp: new Date()
            });
            // Move cursor to end
            display.setSelectionRange(display.value.length, display.value.length);
            adjustFontSize();
        } catch (e) {
            display.value = 'Error';
            document.getElementById('calcPreview').innerText = '';
        }
    } else if (val === '%') {
        // Just append '%' formatting
        display.value += '%';
        display.setSelectionRange(display.value.length, display.value.length);
        updatePreview();
        adjustFontSize();
    } else {
        if (current === '0' && !['.', '+', '-', '*', '/'].includes(val)) {
            display.value = val;
            display.setSelectionRange(1, 1);
        } else {
            // Handle 00
            if (val === '00' && current === '0') return; // Don't add 00 to 0

            insertAtCursor(val);
        }
        adjustFontSize();
    }
}

function adjustFontSize() {
    const display = document.getElementById('calcDisplay');
    const length = display.value.length;

    // Scaling: Large -> Small -> Wrap
    // Lower threshold to ensure it shrinks BEFORE wrapping (approx 12 chars)
    if (length < 12) {
        display.style.fontSize = '2.5rem';
    } else {
        display.style.fontSize = '1.7rem';
    }

    // Auto-expand height (up to max-height defined in CSS)
    display.style.height = 'auto';
    display.style.height = (display.scrollHeight) + 'px';

    // Auto-scroll to bottom ONLY if cursor is at the end
    // This allows editing earlier lines without jumping to the bottom
    if (display.selectionEnd === display.value.length) {
        display.scrollTop = display.scrollHeight;
    }
}

function updatePreview() {
    const display = document.getElementById('calcDisplay');
    const preview = document.getElementById('calcPreview');
    let current = display.value;

    // Don't show preview for simple numbers or empty state
    if (!current || current === '0' || current === 'Error') {
        preview.innerText = '';
        return;
    }

    try {
        // Replace symbols for JS eval
        let expression = current.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');

        // --- PERCENTAGE PRE-PROCESSING (Match =) ---
        expression = expression.replace(/(\d+(?:\.\d+)?)([\+\-])(\d+(?:\.\d+)?)%/g, (match, base, op, percent) => {
            return `${base}${op}(${base}*${percent}/100)`;
        });
        expression = expression.replace(/(\d+(?:\.\d+)?)%/g, '$1/100');
        // -------------------------------------------

        // If ends with operator, don't eval yet (or eval partial?)
        // Standard calculator behavior: typically wait for complete numbers. 
        // But strict eval might fail on trailing operator.
        // Let's try to eval. If it fails, empty preview.

        // Basic check to see if there is an operator (otherwise it's just the number)
        if (!/[+\-*/%]/.test(expression)) {
            preview.innerText = '';
            return;
        }

        const result = eval(expression);
        if (result === undefined || isNaN(result) || !isFinite(result)) {
            preview.innerText = '';
        } else {
            // Don't show if result is same as input (e.g. "50")
            if (String(result) == current) {
                preview.innerText = '';
            } else {
                preview.innerText = Number(result.toPrecision(12));
            }
        }
    } catch (e) {
        // Likely incomplete expression like "5+"
        preview.innerText = '';
    }
}

// --- EXIT HANDLER (Double Back) ---
let lastBackPressTime = 0;

function initBackHandler() {
    // Push state with a hash to ensure it's distinct
    if (!location.hash) {
        history.pushState({ page: 1 }, "title", "#guard");
    }

    window.onpopstate = function (event) {
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - lastBackPressTime;

        if (location.hash === "#guard") {
            // We are back at the guard state (user might have navigated forward? Unlikely in this app)
            return;
        }

        // We popped the state (hash is gone).
        if (timeDiff < 2000) {
            // Second press within 2s -> Allow Exit (do nothing, let the pop happen)
            // But wait, if we popped, we are now at 'no hash'. If that was the start, we exit.
            return;
        } else {
            // First press -> Show Toast & Restore Guard
            lastBackPressTime = currentTime;
            showToast("Press back again to exit");

            // Restore the guard state immediately
            history.pushState({ page: 1 }, "title", "#guard");
        }
    };
}

function showToast(message) {
    // Remove existing
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger Fade In
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after 2s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// --- REFRESH PREVENTION ---
function preventAccidentalRefresh() {
    // Display Click Listener for Cursor Visibility
    const display = document.getElementById('calcDisplay');
    display.addEventListener('click', () => {
        display.classList.add('active-cursor');
    });

    window.addEventListener('beforeunload', (e) => {
        // Cancel the event
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = '';
        return 'Are you sure you want to refresh?';
    });
}

// --- RIPPLE EFFECT REMOVED ---

function handleGstButton(rate, mode) {
    const display = document.getElementById('calcDisplay');
    let currentVal = parseFloat(display.value);

    // Evaluate if there's an expression pending (e.g. "50+50")
    if (isNaN(currentVal) || /[+\-*/]/.test(display.value)) {
        try {
            currentVal = eval(display.value.replace(/×/g, '*').replace(/÷/g, '/'));
        } catch (e) {
            return; // Can't calc GST on invalid expr
        }
    }

    let finalVal = 0;
    let gstAmt = 0;

    if (mode === 'add') {
        gstAmt = (currentVal * rate) / 100;
        finalVal = currentVal + gstAmt;
    } else {
        // Reverse Calculation: Value is inclusive of GST, strip it.
        // Formula: Base = Total / (1 + rate/100) -> BUT usually calculator buttons "-", "5%" simply mean subtract 5% of value.
        // User requested: "Remove 28%". In a GST Context, "Remove" usually means "Find Base".
        // However, generic "Tax-" buttons often just do X - (X*Rate).
        // Let's implement STANDARD MATH logic: Value - (Value * Rate).
        // If user wants Reverse GST, they usually use a specific tool. The "Remove 5%" button on a calculator usually means "Minus 5%".
        // Wait, looking at the image... It has +9% and -9%.
        // If I have 109. +9% = 109.
        // If I have 109. -9% (of 109) != 100.
        // BUT for a "GST Calculator" app, usually -% means "Extract GST".
        // I will implement "Extract GST" (Reverse) for the negative buttons because this is a GST APP.
        // Formula: Base = Total * 100 / (100 + Rate)

        // Actually, typical "Tax-" buttons on merchant calculators operate as:
        // Tax- on Net -> reduces it? No.
        // Let's stick to the MOST useful feature for a GST app: Reverse Calc.
        const base = (currentVal * 100) / (100 + rate);
        finalVal = base;
        gstAmt = currentVal - base;
    }

    const cgst = gstAmt / 2;
    const sgst = gstAmt / 2;

    // Update Display
    display.value = parseFloat(finalVal.toFixed(2));

    // Update History string to show what happened
    document.getElementById('calcHistory').innerText = `${currentVal} ${mode === 'add' ? '+' : '-'} ${rate}% GST`;

    // Update Details
    const detailsEl = document.getElementById('gstDetails');
    if (mode === 'add') {
        detailsEl.innerText = `GST: ${formatCurrency(gstAmt)} (C: ${formatCurrency(cgst)}, S: ${formatCurrency(sgst)})`;
    } else {
        detailsEl.innerText = `GST Rem: ${formatCurrency(gstAmt)} (C: ${formatCurrency(cgst)}, S: ${formatCurrency(sgst)})`;
    }

    // Clear Preview immediately to avoid confusion
    document.getElementById('calcPreview').innerText = '';

    // Add to History List
    addToHistory({
        type: 'GST_QUICK',
        expression: `${currentVal} ${mode === 'add' ? '+' : '-'} ${rate}%`,
        result: display.value,
        timestamp: new Date()
    });
}

function formatCurrency(num) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(num);
}


// --- CONVERSION MODULE ---
const conversionInfo = {
    length: {
        base: 'm', // meter
        units: {
            'mm': 0.001,
            'cm': 0.01,
            'm': 1,
            'in': 0.0254,
            'ft': 0.3048
        },
        labels: {
            'mm': 'Millimeter', 'cm': 'Centimeter', 'm': 'Meter', 'in': 'Inch', 'ft': 'Feet'
        }
    },
    area: {
        base: 'sqm',
        units: {
            'sqm': 1,
            'sqft': 0.092903,
            'sqin': 0.00064516
        },
        labels: {
            'sqm': 'Square Meter', 'sqft': 'Square Feet', 'sqin': 'Square Inch'
        }
    },
    volume: {
        base: 'l',
        units: {
            'l': 1,
            'ml': 0.001,
            'm3': 1000,
            'ft3': 28.3168
        },
        labels: {
            'l': 'Liter', 'ml': 'Milliliter', 'm3': 'Cubic Meter', 'ft3': 'Cubic Feet'
        }
    },
    weight: {
        base: 'kg',
        units: {
            'g': 0.001,
            'kg': 1,
            'ton': 1000,
            'lb': 0.453592
        },
        labels: {
            'g': 'Gram', 'kg': 'Kilogram', 'ton': 'Ton', 'lb': 'Pound'
        }
    }
};

function updateUnitOptions() {
    const category = document.getElementById('convCategory').value;
    const data = conversionInfo[category];
    const fromSelect = document.getElementById('convFrom');
    const toSelect = document.getElementById('convTo');

    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';

    Object.keys(data.units).forEach(key => {
        const option1 = new Option(data.labels[key], key);
        const option2 = new Option(data.labels[key], key);
        fromSelect.add(option1);
        toSelect.add(option2);
    });

    // Defaults: select distinct units
    if (toSelect.options.length > 1) toSelect.selectedIndex = 1;

    performConversion();
}

function performConversion() {
    const category = document.getElementById('convCategory').value;
    const val = parseFloat(document.getElementById('convInput').value);
    const fromUnit = document.getElementById('convFrom').value;
    const toUnit = document.getElementById('convTo').value;

    if (isNaN(val)) {
        document.getElementById('convidx').value = '';
        return;
    }

    const data = conversionInfo[category];
    const baseValue = val * data.units[fromUnit]; // Convert to base
    const finalValue = baseValue / data.units[toUnit]; // Convert from base to target

    // Professional rounding: up to 4 decimals, strip trailing zeros
    const result = parseFloat(finalValue.toFixed(4));
    document.getElementById('convidx').value = result;
    appState.lastConvResult = result;
}

// --- SMART INTEGRATION ---
function smartTransfer(type) {
    // Legacy functions from removed modules (like 'conv_to_gst') can remain or be cleaned.
    // Since GST Tab is removed, 'calc_to_gst' is obsolete. 'conv_to_gst' could just paste to Calc?
    // For now, let's just leave empty or remove if uncalled.
}

// --- HISTORY MODULE ---
function switchSubTab(type) {
    const genBtn = document.querySelectorAll('.h-subtab')[0];
    const gstBtn = document.querySelectorAll('.h-subtab')[1];

    // Safety check if elements exist
    if (!genBtn || !gstBtn) return;

    const genCont = document.getElementById('histContainerGeneral');
    const gstCont = document.getElementById('histContainerGST');

    if (type === 'general') {
        genBtn.classList.add('active');
        gstBtn.classList.remove('active');
        genCont.style.display = 'block';
        gstCont.style.display = 'none';
    } else {
        genBtn.classList.remove('active');
        gstBtn.classList.add('active');
        genCont.style.display = 'none';
        gstCont.style.display = 'block';
    }
}

function addToHistory(entry) {
    appState.history.unshift(entry); // Add to top
    if (appState.history.length > 50) appState.history.pop(); // Limit to 50
    saveHistory(); // Save persistence
    renderHistory();
}

function renderHistory() {
    const calcList = document.getElementById('calcHistoryList');
    const gstList = document.getElementById('gstHistoryList');

    // Safety check
    if (!calcList || !gstList) return;

    // Reset both
    calcList.innerHTML = '';
    gstList.innerHTML = '';

    const historyItems = appState.history;

    let calcCount = 0;
    let gstCount = 0;

    historyItems.forEach(item => {
        if (typeof item === 'string') return;

        const div = document.createElement('div');
        div.className = 'history-card';

        // New Stacked layout: Expression (Top) - Result (Bottom)
        div.innerHTML = `
            <div class="h-expr">${item.expression} =</div>
            <div class="h-result">${item.result}</div>
        `;

        // Click to load history
        div.onclick = () => loadFromHistory(item.expression);

        // Check if item should go to GST or General list
        if (item.type === 'GST' || item.type === 'GST_QUICK') {
            gstList.appendChild(div);
            gstCount++;
        } else {
            // Default to Calc for 'CALC' or any legacy items
            calcList.appendChild(div);
            calcCount++;
        }
    });

    if (gstCount === 0) gstList.innerHTML = '<div class="empty-state">No GST history yet</div>';
}


function clearCalculatorHistory() {
    appState.history = [];
    saveHistory(); // Clear persistence
    renderHistory();
}

// --- LOCAL STORAGE ---
function saveHistory() {
    localStorage.setItem('gst_calc_history', JSON.stringify(appState.history));
}

function loadHistory() {
    const saved = localStorage.getItem('gst_calc_history');
    if (saved) {
        try {
            appState.history = JSON.parse(saved);
            renderHistory();
        } catch (e) {
            console.error('Failed to parse history', e);
        }
    }
}

// Load history item into calculator
function loadFromHistory(expression) {
    const display = document.getElementById('calcDisplay');
    display.value = expression;
    adjustFontSize(); // update font size

    // Feedback
    if (navigator.vibrate) navigator.vibrate(50); // Haptic
    showToast('Loaded from History');

    // Switch to Calculator tab
    switchTab('calc');
}

// Toast Notification
function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.innerText = message;

    // Trigger reflow
    void toast.offsetWidth;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 1000);
}
