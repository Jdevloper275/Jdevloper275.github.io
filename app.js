
// State Management
const appState = {
    currentTab: 'calc',
    theme: 'dark',
    calcValue: '0',
    calcHistory: '',
    gstRate: 18,
    lastCalcResult: 0,
    lastConvResult: 0
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupTabs();
    updateUnitOptions(); // Initialize conversion options
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
    } else if (val === 'back') {
        display.value = current.length > 1 ? current.slice(0, -1) : '0';
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
        } catch (e) {
            display.value = 'Error';
        }
    } else if (val === '%') {
        try {
            const result = eval(current) / 100;
            display.value = result;
        } catch (e) { display.value = 'Error'; }
    } else {
        // Prevent multiple operators or leading zeros if simpler logic is desired
        if (current === '0' && !['.', '+', '-', '*', '/'].includes(val)) {
            display.value = val;
        } else {
            display.value += val;
        }
    }
}

// --- GST MODULE ---
function setGstRate(rate) {
    appState.gstRate = Number(rate);

    // UI Update
    document.querySelectorAll('.rate-btn').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.rate) === rate);
    });

    // Re-calculate if result is already showing
    if (document.getElementById('gstResultContainer').style.display !== 'none') {
        // Detect if we were doing add or remove based on context? 
        // For simplicity, just reset or re-trigger if possible. 
        // Ideally we'd store the last operation type. Let's just clear for now to avoid confusion.
        // Or better: Use the input value and default to 'add' if typed?
        // Let's leave it as manual trigger for clarity.
    }
}

function calculateGST(mode) {
    const amount = parseFloat(document.getElementById('gstAmount').value);
    if (isNaN(amount)) return;

    const rate = appState.gstRate;
    let base, gstAmount, total, cgst, sgst;

    if (mode === 'add') {
        base = amount;
        gstAmount = (amount * rate) / 100;
        total = base + gstAmount;
    } else {
        // Remove GST
        total = amount;
        base = (amount * 100) / (100 + rate);
        gstAmount = total - base;
    }

    cgst = gstAmount / 2;
    sgst = gstAmount / 2;

    // Display
    document.getElementById('gstResultContainer').style.display = 'block';
    document.getElementById('resNet').textContent = formatCurrency(base);
    document.getElementById('cgstRate').textContent = rate / 2;
    document.getElementById('resCGST').textContent = formatCurrency(cgst);
    document.getElementById('sgstRate').textContent = rate / 2;
    document.getElementById('resSGST').textContent = formatCurrency(sgst);
    document.getElementById('resTotal').textContent = formatCurrency(total);
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
    if (type === 'calc_to_gst') {
        const val = appState.lastCalcResult;
        if (!val) return alert('No calculated value to transfer!');

        // Switch Tab
        document.querySelector('[data-tab="gst"]').click();
        // Fill Value
        document.getElementById('gstAmount').value = val;

    } else if (type === 'conv_to_gst') {
        const val = appState.lastConvResult;
        if (!val) return alert('No conversion result to transfer!');

        document.querySelector('[data-tab="gst"]').click();
        document.getElementById('gstAmount').value = val;
    }
}
