import type { GeneratedFile } from './types';

export interface ExtensionTemplate {
  id: string;
  title: string;
  description: string;
  initialPrompt: string;
  icon: string;
  files: GeneratedFile[];
}

export const templates: ExtensionTemplate[] = [
  {
    id: 'floating-timer',
    title: 'Floating Draggable Timer',
    description: 'A sleek, black timer that you can drag and place anywhere on a webpage. Perfect for tracking tasks.',
    initialPrompt: 'Create a floating, draggable timer that can be placed on any webpage. It should have a black, rounded design with start and reset buttons, like the one in the image.',
    icon: 'clock',
    files: [
      {
        filename: 'manifest.json',
        content: `{
  "manifest_version": 3,
  "name": "Floating Timer",
  "version": "1.0",
  "description": "Injects a draggable timer onto any page.",
  "permissions": ["scripting", "activeTab"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_title": "Inject Timer"
  },
  "web_accessible_resources": [{
    "resources": ["style.css"],
    "matches": ["<all_urls>"]
  }]
}`
      },
      {
        filename: 'background.js',
        content: `chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['timer.js']
  });
});`
      },
      {
        filename: 'style.css',
        content: `
#floating-timer-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 280px;
    background-color: #0d0d0d;
    color: white;
    border-radius: 16px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    z-index: 99999;
    cursor: move;
    user-select: none;
    display: flex;
    flex-direction: column;
    padding: 12px;
    box-sizing: border-box;
}

#floating-timer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px 12px 8px;
    border-bottom: 1px solid #2a2a2a;
    margin-bottom: 12px;
}

#floating-timer-header h1 {
    font-size: 14px;
    font-weight: 500;
    margin: 0;
    color: #a0a0a0;
}

#floating-timer-close {
    background: none;
    border: none;
    color: #a0a0a0;
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
    padding: 0 4px;
}
#floating-timer-close:hover {
    color: white;
}

#floating-timer-display {
    font-family: 'Fira Code', 'Courier New', monospace;
    font-size: 56px;
    text-align: center;
    padding: 10px 0;
    letter-spacing: 2px;
}

#floating-timer-controls {
    display: flex;
    justify-content: center;
    gap: 12px;
    padding: 12px 0 4px 0;
}

#floating-timer-controls button {
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    padding: 8px 20px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
    background-color: #2a2a2a;
    color: #e0e0e0;
}

#floating-timer-controls button:hover {
    background-color: #3c3c3c;
}

#floating-timer-controls button:active {
    background-color: #4d4d4d;
}
        `
      },
      {
        filename: 'timer.js',
        content: `(function() {
    if (document.getElementById('floating-timer-container')) {
        return;
    }

    const timerHTML = \`
        <div id="floating-timer-header">
            <h1>Timer</h1>
            <button id="floating-timer-close">&times;</button>
        </div>
        <div id="floating-timer-display">00:00</div>
        <div id="floating-timer-controls">
            <button id="floating-timer-start">Start</button>
            <button id="floating-timer-reset">Reset</button>
        </div>
    \`;

    const container = document.createElement('div');
    container.id = 'floating-timer-container';
    container.innerHTML = timerHTML;
    document.body.appendChild(container);

    const link = document.createElement('link');
    link.href = chrome.runtime.getURL('style.css');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);


    // Timer logic
    let timerInterval;
    let totalSeconds = 0;
    let isRunning = false;
    const display = document.getElementById('floating-timer-display');
    const startBtn = document.getElementById('floating-timer-start');
    const resetBtn = document.getElementById('floating-timer-reset');
    const closeBtn = document.getElementById('floating-timer-close');

    function updateDisplay() {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        display.textContent = \`\${String(minutes).padStart(2, '0')}:\${String(seconds).padStart(2, '0')}\`;
    }

    startBtn.addEventListener('click', () => {
        if (isRunning) {
            clearInterval(timerInterval);
            startBtn.textContent = 'Start';
        } else {
            if (totalSeconds === 0) {
              totalSeconds = 25 * 60; // Default to 25 mins if starting from 0
            }
            timerInterval = setInterval(() => {
                if (totalSeconds > 0) {
                    totalSeconds--;
                    updateDisplay();
                } else {
                    clearInterval(timerInterval);
                    alert("Time's up!");
                    startBtn.textContent = 'Start';
                    isRunning = false;
                }
            }, 1000);
            startBtn.textContent = 'Stop';
        }
        isRunning = !isRunning;
    });

    resetBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        isRunning = false;
        totalSeconds = 0;
        updateDisplay();
        startBtn.textContent = 'Start';
    });
    
    closeBtn.addEventListener('click', () => {
        container.remove();
        link.remove();
    });

    // Drag functionality
    let isDragging = false;
    let offsetX, offsetY;

    container.addEventListener('mousedown', (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isDragging = true;
        offsetX = e.clientX - container.getBoundingClientRect().left;
        offsetY = e.clientY - container.getBoundingClientRect().top;
        container.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;
        
        const containerRect = container.getBoundingClientRect();
        const bodyRect = document.body.getBoundingClientRect();

        newX = Math.max(0, Math.min(newX, bodyRect.width - containerRect.width));
        newY = Math.max(0, Math.min(newY, bodyRect.height - containerRect.height));

        container.style.left = \`\${newX}px\`;
        container.style.top = \`\${newY}px\`;
        container.style.bottom = 'auto';
        container.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
})();
`
      }
    ]
  },
  {
    id: 'dark-mode',
    title: 'Dark Mode for Websites',
    description: 'A simple extension to apply a dark theme to any website via a toggle in the popup.',
    initialPrompt: 'Create a Chrome extension that injects CSS to turn any page into dark mode. The popup should have a single, well-styled toggle switch to turn the dark mode on or off for the current tab.',
    icon: 'moon',
    files: [
      {
        filename: 'manifest.json',
        content: `{
  "manifest_version": 3,
  "name": "Dark Mode",
  "version": "1.0",
  "description": "Toggle dark mode on the current page.",
  "permissions": ["activeTab", "scripting"],
  "action": {
    "default_popup": "popup.html"
  }
}`
      },
      {
        filename: 'popup.html',
        content: `<!DOCTYPE html>
<html>
<head>
    <title>Dark Mode</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Dark Mode</h1>
        <label class="switch">
            <input type="checkbox" id="darkModeToggle">
            <span class="slider round"></span>
        </label>
    </div>
    <script src="popup.js"></script>
</body>
</html>`
      },
      {
        filename: 'style.css',
        content: `body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #1f2937;
    color: #f3f4f6;
    width: 200px;
    margin: 0;
    padding: 16px;
    text-align: center;
}

.container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

h1 {
    font-size: 18px;
    margin: 0;
    font-weight: 600;
}

.switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
}

.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #4b5563;
    transition: .4s;
}

.slider:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: .4s;
}

input:checked + .slider {
    background-color: #8b5cf6;
}

input:focus + .slider {
    box-shadow: 0 0 1px #8b5cf6;
}

input:checked + .slider:before {
    transform: translateX(26px);
}

.slider.round {
    border-radius: 34px;
}

.slider.round:before {
    border-radius: 50%;
}`
      },
      {
        filename: 'popup.js',
        content: `const toggle = document.getElementById('darkModeToggle');

async function getCurrentTab() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

// Set initial state of the toggle
getCurrentTab().then(tab => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => !!document.getElementById('dark-mode-style'),
    }, (results) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
        } else if (results && results[0]) {
            toggle.checked = results[0].result;
        }
    });
});

toggle.addEventListener('change', async () => {
    const tab = await getCurrentTab();
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const styleId = 'dark-mode-style';
            const existingStyle = document.getElementById(styleId);
            if (existingStyle) {
                existingStyle.remove();
                return false;
            } else {
                const style = document.createElement('style');
                style.id = styleId;
                style.innerHTML = \`
                    html { filter: invert(1) hue-rotate(180deg); background-color: #1f1f1f; }
                    img, video, iframe, .no-dark-mode { filter: invert(1) hue-rotate(180deg); }
                \`;
                document.head.appendChild(style);
                return true;
            }
        }
    });
});`
      }
    ]
  },
  {
    id: 'note-taker',
    title: 'Quick Note Taker',
    description: 'A popup that lets you jot down notes and saves them automatically as you type.',
    initialPrompt: 'Create a Chrome extension with a beautiful popup that has a textarea for notes. The text in the textarea should be saved automatically to chrome.storage.local whenever it changes, and loaded when the popup is opened. The design should be clean and modern.',
    icon: 'clipboard',
    files: [
        {
            filename: 'manifest.json',
            content: `{
  "manifest_version": 3,
  "name": "Quick Note Taker",
  "version": "1.0",
  "description": "A simple popup to jot down and save notes.",
  "permissions": ["storage"],
  "action": {
    "default_popup": "popup.html"
  }
}`
        },
        {
            filename: 'popup.html',
            content: `<!DOCTYPE html>
<html>
<head>
    <title>Quick Notes</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <textarea id="notes" placeholder="Jot down something..."></textarea>
    <script src="popup.js"></script>
</body>
</html>`
        },
        {
            filename: 'style.css',
            content: `body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #1f2937;
    width: 300px;
    height: 250px;
    margin: 0;
    padding: 0;
}

#notes {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border: none;
    background-color: #1f2937;
    color: #f3f4f6;
    padding: 16px;
    font-size: 14px;
    line-height: 1.5;
    resize: none;
    outline: none;
}

#notes::placeholder {
    color: #6b7280;
}`
        },
        {
            filename: 'popup.js',
            content: `const notesArea = document.getElementById('notes');

// Load saved notes
chrome.storage.local.get(['notes'], function(result) {
    if (result.notes) {
        notesArea.value = result.notes;
    }
});

// Save notes on input
notesArea.addEventListener('input', function() {
    chrome.storage.local.set({ notes: notesArea.value });
});`
        }
    ]
  },
  {
    id: 'color-picker',
    title: 'Color Picker',
    description: 'An eyedropper tool to pick colors from any webpage and copy the hex code.',
    initialPrompt: 'Create a Chrome extension that acts as a color picker. The popup should have a button "Pick Color". When clicked, it should activate an eyedropper tool. The selected color\'s hex code should be displayed prominently in the popup and automatically copied to the clipboard. Show a small preview of the color.',
    icon: 'palette',
    files: [
      {
        filename: 'manifest.json',
        content: `{
  "manifest_version": 3,
  "name": "Color Picker",
  "version": "1.0",
  "description": "An eyedropper tool to pick colors from webpages.",
  "permissions": ["activeTab", "scripting"],
  "action": {
    "default_popup": "popup.html"
  }
}`
      },
      {
        filename: 'popup.html',
        content: `<!DOCTYPE html>
<html>
<head>
    <title>Color Picker</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <button id="pickColorBtn">Pick Color from Page</button>
        <div class="result">
            <div id="colorPreview"></div>
            <input id="colorHex" type="text" readonly value="#ffffff">
        </div>
        <p id="copyStatus"></p>
    </div>
    <script src="popup.js"></script>
</body>
</html>`
      },
      {
        filename: 'style.css',
        content: `body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #1f2937;
    color: #f3f4f6;
    width: 250px;
    margin: 0;
    padding: 16px;
}

.container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
}

#pickColorBtn {
    width: 100%;
    padding: 10px;
    background-color: #8b5cf6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
}

#pickColorBtn:hover {
    background-color: #7c3aed;
}

.result {
    display: flex;
    align-items: center;
    gap: 12px;
    background-color: #374151;
    padding: 8px;
    border-radius: 8px;
    width: 100%;
    box-sizing: border-box;
}

#colorPreview {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    border: 2px solid #4b5563;
    background-color: #ffffff;
}

#colorHex {
    flex-grow: 1;
    background: none;
    border: none;
    color: #f3f4f6;
    font-family: 'Fira Code', monospace;
    font-size: 16px;
    text-align: center;
    outline: none;
    width: 100px;
}

#copyStatus {
    font-size: 12px;
    color: #a5b4fc;
    height: 16px;
    margin: 0;
}`
      },
      {
        filename: 'popup.js',
        content: `const pickColorBtn = document.getElementById('pickColorBtn');
const colorPreview = document.getElementById('colorPreview');
const colorHex = document.getElementById('colorHex');
const copyStatus = document.getElementById('copyStatus');

pickColorBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: activateEyeDropper,
    }, (results) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
        }
    });
});

function activateEyeDropper() {
    if (!window.EyeDropper) {
        alert("Your browser does not support the EyeDropper API.");
        return;
    }

    const eyeDropper = new EyeDropper();
    eyeDropper.open().then(result => {
        chrome.runtime.sendMessage({ type: 'color-picked', color: result.sRGBHex });
    }).catch(e => {
        // User canceled the dropper, do nothing.
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'color-picked' && request.color) {
        const color = request.color;
        colorPreview.style.backgroundColor = color;
        colorHex.value = color;
        navigator.clipboard.writeText(color);
        copyStatus.textContent = 'Copied to clipboard!';
        setTimeout(() => { copyStatus.textContent = ''; }, 2000);
    }
});`
      }
    ]
  },
  {
    id: 'pomodoro-timer',
    title: 'Pomodoro Timer',
    description: 'A simple timer to help you focus using the Pomodoro Technique, with notifications.',
    initialPrompt: 'Create a Chrome extension that is a Pomodoro timer. The popup should display a 25-minute timer with a large, easy-to-read display. It needs a start, pause, and reset button. When the timer finishes, it should show a browser notification saying "Time for a break!".',
    icon: 'timer',
    files: [
      {
        filename: 'manifest.json',
        content: `{
  "manifest_version": 3,
  "name": "Pomodoro Timer",
  "version": "1.0",
  "description": "A simple timer to help you focus.",
  "permissions": ["storage", "alarms", "notifications"],
  "action": {
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  }
}`
      },
      {
        filename: 'background.js',
        content: `chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "pomodoroTimer") {
        chrome.notifications.create({
            type: "basic",
            title: "Pomodoro Timer",
            message: "Time for a break!",
            priority: 2,
            iconUrl: "images/icon128.png"
        });
        chrome.storage.local.set({ isRunning: false, timerEnd: 0 });
    }
});`
      },
      {
        filename: 'popup.html',
        content: `<!DOCTYPE html>
<html>
<head>
    <title>Pomodoro Timer</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <div id="timerDisplay">25:00</div>
        <div class="buttons">
            <button id="startBtn">Start</button>
            <button id="resetBtn">Reset</button>
        </div>
    </div>
    <script src="popup.js"></script>
</body>
</html>`
      },
      {
        filename: 'style.css',
        content: `body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #1f2937;
    color: #f3f4f6;
    width: 220px;
    margin: 0;
    padding: 24px;
}

.container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

#timerDisplay {
    font-size: 56px;
    font-weight: 700;
    font-family: 'Fira Code', monospace;
}

.buttons {
    display: flex;
    gap: 12px;
}

button {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.1s;
}

#startBtn {
    background-color: #8b5cf6;
    color: white;
}

#startBtn:hover {
    background-color: #7c3aed;
}

#resetBtn {
    background-color: #4b5563;
    color: #f3f4f6;
}
#resetBtn:hover {
    background-color: #6b7280;
}

button:active {
    transform: scale(0.98);
}`
      },
      {
        filename: 'popup.js',
        content: `const timerDisplay = document.getElementById('timerDisplay');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const DEFAULT_MINUTES = 25;
let intervalId;

function updateDisplay() {
    chrome.storage.local.get(['timerEnd', 'isRunning'], (res) => {
        if (res.isRunning && res.timerEnd) {
            const remaining = res.timerEnd - Date.now();
            if (remaining > 0) {
                const minutes = Math.floor((remaining / 1000) / 60);
                const seconds = Math.floor((remaining / 1000) % 60);
                timerDisplay.textContent = \`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
                startBtn.textContent = 'Pause';
            } else {
                timerDisplay.textContent = '00:00';
                startBtn.textContent = 'Start';
                clearInterval(intervalId);
            }
        } else {
             timerDisplay.textContent = \`\${DEFAULT_MINUTES}:00\`;
             startBtn.textContent = 'Start';
        }
    });
}

startBtn.addEventListener('click', () => {
    chrome.storage.local.get(['isRunning', 'timerEnd'], (res) => {
        if (res.isRunning) {
            // Pause timer
            clearInterval(intervalId);
            chrome.alarms.clear("pomodoroTimer");
            chrome.storage.local.set({ isRunning: false });
            startBtn.textContent = 'Start';
        } else {
            // Start or resume timer
            const now = Date.now();
            const remaining = (res.timerEnd > now && res.timerEnd - now < DEFAULT_MINUTES * 60 * 1000) 
                ? res.timerEnd - now 
                : DEFAULT_MINUTES * 60 * 1000;
            const newTimerEnd = now + remaining;

            chrome.storage.local.set({ isRunning: true, timerEnd: newTimerEnd });
            chrome.alarms.create("pomodoroTimer", { delayInMinutes: remaining / (60 * 1000) });
            
            startBtn.textContent = 'Pause';
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(updateDisplay, 100);
        }
    });
});

resetBtn.addEventListener('click', () => {
    clearInterval(intervalId);
    chrome.alarms.clear("pomodoroTimer");
    chrome.storage.local.set({ isRunning: false, timerEnd: 0 });
    timerDisplay.textContent = \`\${DEFAULT_MINUTES}:00\`;
    startBtn.textContent = 'Start';
});


// Initial display update
updateDisplay();
if (intervalId) clearInterval(intervalId);
intervalId = setInterval(updateDisplay, 100);`
      }
    ]
  }
];
