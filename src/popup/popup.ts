import { CanvasStyleConfig } from '../config/config-types';
import { SiteSpecificCanvasStyles, loadUserStyles, saveUserStyles, clearUserStylesForSite } from '../utils/storage';

const PRESET_BG_COLORS = ['#000000', '#FFFFFF', '#F0F0FF', '#1DA1F2', '#17BF63', '#FFAD1F'];
const PRESET_TEXT_COLORS = ['#FFFFFF', '#000000', '#111111', '#E7E9EA', '#0F1419'];

interface Elements {
    siteSelect: HTMLSelectElement;
    bgColorOptionsContainer: HTMLDivElement;
    customBgColorInput: HTMLInputElement;
    textColorOptionsContainer: HTMLDivElement;
    customTextColorInput: HTMLInputElement;
    saveButton: HTMLButtonElement;
    resetButton: HTMLButtonElement;
    statusMessage: HTMLParagraphElement;
}

let currentSelectedSite: string = 'x.com'; // Default
let loadedUserStyles: SiteSpecificCanvasStyles = {};

import '../styles/popup.css';

// Function to retrieve DOM elements
function getElements(): Elements {
    return {
        siteSelect: document.getElementById('site-select') as HTMLSelectElement,
        bgColorOptionsContainer: document.getElementById('bg-color-options') as HTMLDivElement,
        customBgColorInput: document.getElementById('custom-bg-color') as HTMLInputElement,
        textColorOptionsContainer: document.getElementById('text-color-options') as HTMLDivElement,
        customTextColorInput: document.getElementById('custom-text-color') as HTMLInputElement,
        saveButton: document.getElementById('save-button') as HTMLButtonElement,
        resetButton: document.getElementById('reset-button') as HTMLButtonElement,
        statusMessage: document.getElementById('status-message') as HTMLParagraphElement,
    };
}

function displayStatusMessage(message: string, type: 'success' | 'error' = 'success') {
    const { statusMessage } = getElements();
    statusMessage.textContent = message;
    statusMessage.className = type;
    setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.className = '';
    }, 3000);
}

function populateColorOptions(container: HTMLDivElement, colors: string[], inputTarget: HTMLInputElement, type: 'bg' | 'text') {
    container.innerHTML = '';
    colors.forEach(color => {
        const box = document.createElement('div');
        box.className = 'color-box';
        box.style.backgroundColor = color;
        box.dataset.color = color;
        box.addEventListener('click', () => {
            inputTarget.value = color;
            container.querySelectorAll('.color-box.selected').forEach(b => b.classList.remove('selected'));
            box.classList.add('selected');
        });
        container.appendChild(box);
    });
}

// Loads saved or default styles for the selected page
function loadStylesForSelectedSite() {
    const { customBgColorInput, customTextColorInput, bgColorOptionsContainer, textColorOptionsContainer, siteSelect } = getElements();

    currentSelectedSite = siteSelect.value;

    const siteStyles = loadedUserStyles[currentSelectedSite];

    let defaultBgColor = '#000000';
    let defaultTextColor = '#FFFFFF';

    if (currentSelectedSite === 'bsky.app') {
        defaultBgColor = '#F0F0FF';
        defaultTextColor = '#111111';
    }

    const bgColorToSet = siteStyles?.backgroundColor || defaultBgColor;
    const textColorToSet = siteStyles?.textColor || defaultTextColor;

    customBgColorInput.value = bgColorToSet;
    customTextColorInput.value = textColorToSet;

    bgColorOptionsContainer.querySelectorAll('.color-box').forEach(b => b.classList.remove('selected'));
    const selectedBgBox = Array.from(bgColorOptionsContainer.querySelectorAll<HTMLDivElement>('.color-box'))
        .find(b => b.dataset.color?.toLowerCase() === bgColorToSet.toLowerCase());
    if (selectedBgBox) selectedBgBox.classList.add('selected');

    textColorOptionsContainer.querySelectorAll('.color-box').forEach(b => b.classList.remove('selected'));
    const selectedTextBox = Array.from(textColorOptionsContainer.querySelectorAll<HTMLDivElement>('.color-box'))
        .find(b => b.dataset.color?.toLowerCase() === textColorToSet.toLowerCase());
    if (selectedTextBox) selectedTextBox.classList.add('selected');
}


async function notifyContentScriptsOfUpdate(siteIdentifier: string) {
    console.log(`[xLongly Popup] Attempting to notify content scripts for site: ${siteIdentifier}`);
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        for (const tab of tabs) {
            if (tab.id && tab.url && !tab.url.startsWith('chrome-extension://')) {
                const tabHostname = new URL(tab.url).hostname;
                const isXRelated = (siteIdentifier === "x.com" || siteIdentifier === "twitter.com") && (tabHostname.includes("x.com") || tabHostname.includes("twitter.com"));
                const isBskyRelated = siteIdentifier === "bsky.app" && tabHostname.includes("bsky.app");

                if (isXRelated || isBskyRelated) {
                    console.log(`[xLongly Popup] Sending XLONGLY_SETTINGS_UPDATED to tab ID: ${tab.id}, URL: ${tab.url}`);
                    try {
                        const response = await chrome.tabs.sendMessage(tab.id, { type: 'XLONGLY_SETTINGS_UPDATED' });
                        if (response) {
                            console.log(`[xLongly Popup] Message acknowledged by tab ${tab.id}. Response:`, response.status);
                        } else {
                            console.log(`[xLongly Popup] Message sent to tab ${tab.id}, but no specific response received (this is okay if content script does not call sendResponse).`);
                        }
                    } catch (err) {
                        let errorMessage = "Unknown error during sendMessage";
                        if (err instanceof Error) {
                            errorMessage = err.message;
                        } else if (typeof err === 'string') {
                            errorMessage = err;
                        }
                        if (chrome.runtime.lastError && chrome.runtime.lastError.message) {
                            errorMessage = chrome.runtime.lastError.message;
                        }
                        console.warn(`[xLongly Popup] Failed to send message to tab ${tab.id}. Error: ${errorMessage}. Content script might not be listening or tab is privileged.`);
                    }
                }
            }
        }
    } catch (error) {
        let outerErrorMessage = "Unknown error in notifyContentScriptsOfUpdate";
        if (error instanceof Error) {
            outerErrorMessage = error.message;
        } else if (typeof error === 'string') {
            outerErrorMessage = error;
        }
        console.error("[xLongly Popup] Error in notifyContentScriptsOfUpdate:", outerErrorMessage);
    }
}

async function handleSave() {
    const { customBgColorInput, customTextColorInput, siteSelect } = getElements();
    const siteToSaveFor = siteSelect.value;

    const newStylesForSite: Partial<CanvasStyleConfig> = {
        backgroundColor: customBgColorInput.value,
        textColor: customTextColorInput.value,
    };

    loadedUserStyles[siteToSaveFor] = { ...loadedUserStyles[siteToSaveFor], ...newStylesForSite };

    try {
        await saveUserStyles(loadedUserStyles);
        displayStatusMessage('Settings saved!', 'success');
        await notifyContentScriptsOfUpdate(siteToSaveFor);
    } catch (error) {
        displayStatusMessage('Error saving settings.', 'error');
        console.error("Error saving settings:", error);
    }
}

async function handleReset() {
    const { siteSelect } = getElements();
    const siteToResetFor = siteSelect.value;

    try {
        if (loadedUserStyles[siteToResetFor]) {
            delete loadedUserStyles[siteToResetFor];
        }
        await saveUserStyles(loadedUserStyles);

        loadStylesForSelectedSite();
        displayStatusMessage(`Settings for ${siteToResetFor} reset to default.`, 'success');
        await notifyContentScriptsOfUpdate(siteToResetFor);
    } catch (error) {
        displayStatusMessage('Error resetting settings.', 'error');
        console.error("Error resetting settings:", error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const elements = getElements();

    populateColorOptions(elements.bgColorOptionsContainer, PRESET_BG_COLORS, elements.customBgColorInput, 'bg');
    populateColorOptions(elements.textColorOptionsContainer, PRESET_TEXT_COLORS, elements.customTextColorInput, 'text');

    const userStylesFromStorage = await loadUserStyles();
    if (userStylesFromStorage) {
        loadedUserStyles = userStylesFromStorage;
    }

    // Ask the content script for the current page
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.id && activeTab.url && !activeTab.url.startsWith('chrome://') && !activeTab.url.startsWith('edge://') && !activeTab.url.startsWith('about:')) {
            console.log(`[xLongly Popup] Sending XLONGLY_GET_CURRENT_SITE_INFO to tab ID: ${activeTab.id}`);
            const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'XLONGLY_GET_CURRENT_SITE_INFO' });
            if (response && response.siteIdentifier) {
                console.log(`[xLongly Popup] Received site info: ${response.siteIdentifier}`);
                // Check whether the received site identifier exists as an option in select
                const optionExists = Array.from(elements.siteSelect.options).some(opt => opt.value === response.siteIdentifier);
                if (optionExists) {
                    elements.siteSelect.value = response.siteIdentifier;
                    currentSelectedSite = response.siteIdentifier; // Update the global variable
                } else {
                    console.warn(`[xLongly Popup] Received siteIdentifier '${response.siteIdentifier}' not found in select options. Using default.`);
                    currentSelectedSite = elements.siteSelect.value; // Use the default value from select
                }
            } else {
                console.warn('[xLongly Popup] No response or siteIdentifier from content script. Using default selected site.');
                currentSelectedSite = elements.siteSelect.value; // Use the default value from select
            }
        } else {
            console.warn('[xLongly Popup] Could not get active tab ID or URL is privileged. Using default selected site.');
            currentSelectedSite = elements.siteSelect.value; // Use the default value from select
        }
    } catch (error) {
        console.warn('[xLongly Popup] Error communicating with content script or no content script on active tab:', error);
        currentSelectedSite = elements.siteSelect.value; // Use the default value from select in case of error
    }

    loadStylesForSelectedSite();

    elements.siteSelect.addEventListener('change', (event) => {
        currentSelectedSite = (event.target as HTMLSelectElement).value;
        loadStylesForSelectedSite();
    });

    elements.saveButton.addEventListener('click', handleSave);
    elements.resetButton.addEventListener('click', handleReset);

    elements.customBgColorInput.addEventListener('input', () => {
        elements.bgColorOptionsContainer.querySelectorAll('.color-box.selected').forEach(b => b.classList.remove('selected'));
    });
    elements.customTextColorInput.addEventListener('input', () => {
        elements.textColorOptionsContainer.querySelectorAll('.color-box.selected').forEach(b => b.classList.remove('selected'));
    });
});