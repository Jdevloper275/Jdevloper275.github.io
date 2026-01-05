
// State Management
const appState = {
    currentTab: 'calc',
    theme: 'dark',
    calcValue: '0',
    calcHistory: '',
    gstRate: 18,
    lastCalcResult: 0,
    lastConvResult: 0,
    history: []
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupTabs();
    updateUnitOptions(); // Initialize conversion options
    loadHistory(); // Load saved history
    initBackHandler(); // Double back to exit
    preventAccidentalRefresh();
});

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
    let current = display.value;

    if (val === 'C') {
        display.value = '0';
        document.getElementById('calcHistory').innerText = '';
        document.getElementById('gstDetails').innerText = '';
        updatePreview(); // Clear preview
    } else if (val === 'back') {
        display.value = current.length > 1 ? current.slice(0, -1) : '0';
        updatePreview(); // Update preview
    } else if (val === '=') {
        try {
            // Replace symbols for JS eval
            const expression = current.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
            // Safety check: only allow numbers and operators
            if (/[^0-9+\-*/().%]/.test(expression)) throw new Error('Invalid Input');

            const result = eval(expression);
            document.getElementById('calcHistory').innerText = current + ' =';
            display.value = Number(result.toPrecision(12)); // Clean up floating point errors
            appState.lastCalcResult = parseFloat(display.value);

            document.getElementById('calcPreview').innerText = ''; // Clear preview on result

            // Add to History
            addToHistory({
                type: 'CALC',
                expression: current,
                result: display.value,
                timestamp: new Date()
            });
        } catch (e) {
            display.value = 'Error';
            document.getElementById('calcPreview').innerText = '';
        }
    } else if (val === '%') {
        try {
            const result = eval(current) / 100;
            display.value = result;
            updatePreview();
        } catch (e) { display.value = 'Error'; }
    } else {
        // Prevent multiple operators or leading zeros
        if (current === '0' && !['.', '+', '-', '*', '/'].includes(val)) {
            display.value = val;
        } else {
            // Handle 00
            if (val === '00' && current === '0') return; // Don't add 00 to 0
            display.value += val;
        }
        updatePreview(); // Update preview on new input
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
        const expression = current.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');

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

        // New Side-by-side layout: Expression (Left) - Result (Right)
        div.innerHTML = `
            <div class="h-expr">${item.expression} =</div>
            <div class="h-result">${item.result}</div>
        `;

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
