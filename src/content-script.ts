import { initializeActiveConfig, getActiveConfig } from './config/active-config';
import type { SiteConfiguration } from './config/config-types';
import { initializeThemeManager, cleanupThemeManager } from './utils/theme';
import { iconShowImage, iconConvertToImage, iconCopy } from './constants/icons';
import { isElementVisible } from './utils/dom';
import { dataURLtoBlob } from './utils/image';
import { applySiteSpecificClass, cleanupSiteSpecificClass } from './utils/site-styling';
import { initializeUrlWatcher, getCurrentWatcherPath, setCurrentWatcherPath } from './utils/url-watcher';
import { showActionNotification as showUiNotification } from './ui/notifications';
import { updateButtonContainerPosition as updateUiButtonContainerPosition } from './ui/positioning';

// --- Global State Variables ---
let buttonAnchorElement: HTMLElement | null = null;
let targetField: TargetElementType | null = null;
let charCounterElement: HTMLDivElement | null = null;
let buttonContainerElement: HTMLDivElement | null = null;
let generateOpenButtonElement: HTMLButtonElement | null = null;
let generateReplaceButtonElement: HTMLButtonElement | null = null;
let actionNotificationElement: HTMLDivElement | null = null;
let currentActiveConfig: SiteConfiguration | null = null;

let lastUpdateCharCountFunction: (() => void) | null = null;
let observer: MutationObserver | null = null;
let resizeObserver: ResizeObserver | null = null;

// Store handlers to be able to remove them
let currentResizeHandler: (() => void) | null = null;
let currentScrollHandler: (() => void) | null = null;


// --- Styles ---
import './styles/base.css';
import './styles/sites/bsky.css';
import './styles/sites/x.css';

// --- Types ---
type TargetElementType = (HTMLElement & { isContentEditable?: boolean; innerText?: string; value?: string; focus?: () => void; }) | HTMLInputElement | HTMLTextAreaElement;

interface WrapTextResult {
    lines: string[];
    height: number;
    width: number;
}

// --- Core UI Functions (kept in main file due to heavy global state usage) ---
function callUpdatePosition() {
    updateUiButtonContainerPosition(
        buttonContainerElement,
        buttonAnchorElement,
        targetField,
        currentActiveConfig?.buttonPosition
    );
}

function setupUIForTarget(textInputElement: TargetElementType): void {
    if (!textInputElement) return;

    const anchorElement = buttonAnchorElement || textInputElement;

    if (targetField === textInputElement && buttonContainerElement && document.body.contains(buttonContainerElement)) {
        callUpdatePosition();
        return;
    }

    targetField = textInputElement;
    console.log('[xLongly] UI config. Text field:', targetField, 'Button anchor element:', anchorElement);

    cleanupExistingUIElements();

    buttonContainerElement = document.createElement('div');
    buttonContainerElement.id = 'button-container';
    document.body.appendChild(buttonContainerElement);

    charCounterElement = document.createElement('div');
    charCounterElement.id = 'char-counter';
    document.body.appendChild(charCounterElement);

    const updateCharCount = () => {
        if (targetField && charCounterElement) {
            const textContent = targetField.isContentEditable ? targetField.innerText : (targetField as HTMLInputElement | HTMLTextAreaElement).value;
            charCounterElement.textContent = `Characters: ${textContent ? textContent.length : 0}`;
        }
    };
    lastUpdateCharCountFunction = updateCharCount;
    targetField.addEventListener('input', updateCharCount);
    updateCharCount();

    generateOpenButtonElement = document.createElement('button');
    generateOpenButtonElement.className = 'action-button';
    generateOpenButtonElement.title = 'Show image';
    generateOpenButtonElement.innerHTML = iconShowImage;
    buttonContainerElement.appendChild(generateOpenButtonElement);
    generateOpenButtonElement.addEventListener('click', () => processImageAction('openInNewTab'));

    generateReplaceButtonElement = document.createElement('button');
    generateReplaceButtonElement.className = 'action-button';
    const isOnBluesky = window.location.hostname.includes('bsky.app');
    if (isOnBluesky) {
        generateReplaceButtonElement.title = 'Copy text as image (Ctrl+V to paste)';
        generateReplaceButtonElement.innerHTML = iconCopy;
    } else {
        generateReplaceButtonElement.title = 'Convert text to image and replace';
        generateReplaceButtonElement.innerHTML = iconConvertToImage;
    }
    buttonContainerElement.appendChild(generateReplaceButtonElement);
    generateReplaceButtonElement.addEventListener('click', () => processImageAction('replaceInField'));

    actionNotificationElement = document.createElement('div');
    actionNotificationElement.id = 'action-notification';
    document.body.appendChild(actionNotificationElement);

    callUpdatePosition();

    // Remove previous handlers if they exist
    if (currentResizeHandler) window.removeEventListener('resize', currentResizeHandler);
    if (currentScrollHandler) window.removeEventListener('scroll', currentScrollHandler, true);

    // Create new handlers that capture the current state for callUpdatePosition
    currentResizeHandler = callUpdatePosition;
    currentScrollHandler = callUpdatePosition;

    window.addEventListener('resize', currentResizeHandler);
    window.addEventListener('scroll', currentScrollHandler, true);

    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = new ResizeObserver(callUpdatePosition); // Pass the wrapper
    if (anchorElement) {
        resizeObserver.observe(anchorElement as Element);
    }
}

function cleanupExistingUIElements(): void {
    charCounterElement?.remove();
    buttonContainerElement?.remove();
    actionNotificationElement?.remove();
    charCounterElement = buttonContainerElement = generateOpenButtonElement = generateReplaceButtonElement = actionNotificationElement = null;
}

function cleanupFullUIAndListeners(): void {
    cleanupExistingUIElements();

    if (targetField && lastUpdateCharCountFunction) {
        targetField.removeEventListener('input', lastUpdateCharCountFunction);
        lastUpdateCharCountFunction = null;
    }

    const elementToUnobserve = buttonAnchorElement || targetField;
    if (resizeObserver && elementToUnobserve) {
        resizeObserver.unobserve(elementToUnobserve as Element);
    } else if (resizeObserver) {
        resizeObserver.disconnect();
    }

    targetField = null;
    buttonAnchorElement = null;

    if (currentResizeHandler) {
        window.removeEventListener('resize', currentResizeHandler);
        currentResizeHandler = null;
    }
    if (currentScrollHandler) {
        window.removeEventListener('scroll', currentScrollHandler, true);
        currentScrollHandler = null;
    }
    console.log('[xLongly] Full UI, listeners and ResizeObserver cleared.');
}

function tryFindAndSetupTarget(): void {
    const configToUse = getActiveConfig();
    if (!configToUse) {
        if (targetField || buttonAnchorElement) cleanupFullUIAndListeners();
        return;
    }

    const { targetSelector: targetSelectorFromConfig, buttonAnchorSelector: anchorSelectorFromConfig, excludeUiIfSelectorVisible: excludeSelector } = configToUse;

    if (excludeSelector) {
        const excludingElement = document.querySelector(excludeSelector) as HTMLElement | null;
        if (isElementVisible(excludingElement)) {
            console.log(`[xLongly] The UI exclusion element is visible (${excludeSelector}). Hiding UI.`);
            if (targetField || buttonAnchorElement) cleanupFullUIAndListeners();
            return;
        }
    }

    if (!targetSelectorFromConfig) {
        console.log('[xLongly] tryFindAndSetupTarget: No targetSelector in active config.');
        if (targetField || buttonAnchorElement) cleanupFullUIAndListeners();
        return;
    }

    const newTextInputElement = document.querySelector(targetSelectorFromConfig) as TargetElementType | null;
    let newButtonAnchorElement: HTMLElement | null = null;

    if (anchorSelectorFromConfig) {
        newButtonAnchorElement = document.querySelector(anchorSelectorFromConfig) as HTMLElement | null;
        if (!newButtonAnchorElement) {
            console.debug(`[xLongly] buttonAnchorSelector not found: ${anchorSelectorFromConfig}. Buttons will be next to the text field.`);
        }
    }
    const resolvedButtonAnchorElement = newButtonAnchorElement || (newTextInputElement as HTMLElement | null);

    if (newTextInputElement) {
        const isTextInputVisible = isElementVisible(newTextInputElement);
        const isAnchorVisible = (resolvedButtonAnchorElement === newTextInputElement) ? isTextInputVisible : isElementVisible(resolvedButtonAnchorElement);

        if (isTextInputVisible && isAnchorVisible) {
            const uiAlreadyExistsForCurrentElements =
                targetField === newTextInputElement &&
                buttonAnchorElement === resolvedButtonAnchorElement &&
                buttonContainerElement &&
                document.body.contains(buttonContainerElement);

            if (!uiAlreadyExistsForCurrentElements) {
                buttonAnchorElement = resolvedButtonAnchorElement;
                console.log('[xLongly] tryFindAndSetupTarget: Visible elements found or changed, configuring/reconfiguring UI.');
                setupUIForTarget(newTextInputElement);
            } else {
                callUpdatePosition();
            }
        } else {
            console.log('[xLongly] tryFindAndSetupTarget: Text field or anchor not visible.');
            if (targetField === newTextInputElement || buttonAnchorElement === resolvedButtonAnchorElement) {
                cleanupFullUIAndListeners();
            }
        }
    } else {
        console.log('[xLongly] tryFindAndSetupTarget: Text field (targetSelector) not found.');
        if (targetField || buttonAnchorElement) {
            cleanupFullUIAndListeners();
        }
    }
}

// --- Core Logic Functions (Text Deletion, Image Generation/Insertion) ---
function deleteContentNatively(element: TargetElementType | null): void {
    if (!element) return;
    element.focus?.();

    if (element.isContentEditable) {
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            const range = document.createRange();
            range.selectNodeContents(element);
            sel.addRange(range);
        }
        if (!document.execCommand('delete')) {
            element.innerHTML = '';
        }
    } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        (element as HTMLInputElement | HTMLTextAreaElement).value = '';
    }
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
}

function wrapTextAndCalcHeight(context: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number): WrapTextResult {
    const lines: string[] = [];
    let currentHeight = 0;
    let actualMaxWidthUsed = 0;

    if (text.trim() === "") {
        return { lines: [], height: 0, width: 0 };
    }

    const breakLongWordInternal = (wordToBreak: string): string => {
        let fragment = '';
        for (let i = 0; i < wordToBreak.length; i++) {
            const char = wordToBreak[i];
            const testFragment = fragment + char;
            if (context.measureText(testFragment).width <= maxWidth) {
                fragment = testFragment;
            } else {
                if (fragment) {
                    lines.push(fragment);
                    actualMaxWidthUsed = Math.max(actualMaxWidthUsed, context.measureText(fragment).width);
                    currentHeight += lineHeight;
                }
                fragment = char;
                if (context.measureText(fragment).width > maxWidth) {
                    lines.push(fragment);
                    actualMaxWidthUsed = Math.max(actualMaxWidthUsed, context.measureText(fragment).width);
                    currentHeight += lineHeight;
                    fragment = '';
                }
            }
        }
        return fragment;
    };

    const paragraphs = text.split('\n');
    paragraphs.forEach(paragraph => {
        if (paragraph.trim() === '') {
            if (lines.length > 0 && lines[lines.length - 1] !== '') {
                lines.push('');
                currentHeight += lineHeight;
            }
            return;
        }

        const words = paragraph.split(' ');
        let currentLine = '';
        for (const word of words) {
            if (word.trim() === '') continue;
            const wordWidth = context.measureText(word).width;
            if (currentLine === '') {
                if (wordWidth <= maxWidth) {
                    currentLine = word;
                } else {
                    currentLine = breakLongWordInternal(word);
                }
            } else {
                const testLine = currentLine + ' ' + word;
                if (context.measureText(testLine).width <= maxWidth) {
                    currentLine = testLine;
                } else {
                    lines.push(currentLine);
                    actualMaxWidthUsed = Math.max(actualMaxWidthUsed, context.measureText(currentLine).width);
                    currentHeight += lineHeight;
                    if (wordWidth <= maxWidth) {
                        currentLine = word;
                    } else {
                        currentLine = breakLongWordInternal(word);
                    }
                }
            }
        }
        if (currentLine !== '') {
            lines.push(currentLine);
            actualMaxWidthUsed = Math.max(actualMaxWidthUsed, context.measureText(currentLine).width);
            currentHeight += lineHeight;
        }
    });

    if (currentHeight === 0 && lines.length > 0) {
        currentHeight = lines.length * lineHeight;
    }
    return { lines, height: currentHeight, width: actualMaxWidthUsed };
}

async function processImageAction(actionType: 'openInNewTab' | 'replaceInField'): Promise<void> {
    const configToUse = getActiveConfig();
    if (!configToUse) {
        alert('Error: No active configuration for this page.');
        return;
    }
    let originalText = '';
    if (targetField) {
        originalText = targetField.isContentEditable ? (targetField.innerText || '') : ((targetField as HTMLInputElement | HTMLTextAreaElement).value || '');
    }

    if (!targetField || originalText.trim() === "") {
        alert('Text field is empty or not found.');
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        alert('Failed to get 2D canvas context.');
        return;
    }

    const styleConf = configToUse.canvasStyle;
    const CALCULATED_LINE_HEIGHT = Math.round(styleConf.fontSize * styleConf.lineHeightMultiplier);

    ctx.font = `${styleConf.fontSize}px ${styleConf.fontFamily}`;
    ctx.textBaseline = 'top';

    const { lines, height: textBlockHeight, width: actualTextWidth } = wrapTextAndCalcHeight(
        ctx, originalText, styleConf.textMaxWidth, CALCULATED_LINE_HEIGHT
    );

    let canvasContentWidth: number;
    let canvasContentHeight: number;

    if (textBlockHeight === 0 && actualTextWidth === 0) {
        canvasContentWidth = 50;
        canvasContentHeight = CALCULATED_LINE_HEIGHT;
    } else {
        canvasContentWidth = actualTextWidth;
        canvasContentHeight = textBlockHeight;
    }

    canvas.width = Math.max(canvasContentWidth + (styleConf.padding * 2), styleConf.padding * 2 + 50);
    canvas.height = Math.max(canvasContentHeight + (styleConf.padding * 2), styleConf.padding * 2 + CALCULATED_LINE_HEIGHT);

    ctx.fillStyle = styleConf.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = styleConf.textColor;
    ctx.font = `${styleConf.fontSize}px ${styleConf.fontFamily}`;
    ctx.textBaseline = 'top';

    let currentY = styleConf.padding;
    lines.forEach(line => {
        ctx.fillText(line, styleConf.padding, currentY);
        currentY += CALCULATED_LINE_HEIGHT;
    });

    const dataURL = canvas.toDataURL('image/png');

    try {
        const blob = await dataURLtoBlob(dataURL); // Using imported util
        if (actionType === 'openInNewTab') {
            const blobUrl = URL.createObjectURL(blob);
            const imageWindow = window.open(blobUrl, "_blank");
            if (!imageWindow) {
                alert('Failed to open a new tab. Pop-up blocker might be active.');
                URL.revokeObjectURL(blobUrl);
                throw new Error('Window open blocked.');
            } else {
                showUiNotification(actionNotificationElement, 'Image opened in new tab', 'success');
                setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
            }
        } else if (actionType === 'replaceInField') {
            const isOnBluesky = window.location.hostname.includes('bsky.app');
            deleteContentNatively(targetField);
            await new Promise(resolve => setTimeout(resolve, 50));

            if (isOnBluesky || (targetField && (targetField instanceof HTMLInputElement || targetField instanceof HTMLTextAreaElement))) {
                try {
                    const item = new ClipboardItem({ "image/png": blob });
                    await navigator.clipboard.write([item]);
                    showUiNotification(actionNotificationElement, 'Image copied (Ctrl+V to paste)', 'success');
                } catch (copyError) {
                    console.error('[xLongly] Error copying image to clipboard:', copyError);
                    showUiNotification(actionNotificationElement, 'Error copying image. Please try again.', 'warning');
                }
            } else if (targetField && targetField.isContentEditable) {
                try {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(new File([blob], "generated-image.png", { type: blob.type }));
                    targetField.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dataTransfer, bubbles: true, cancelable: true }));
                    showUiNotification(actionNotificationElement, 'Text replaced with image', 'success');
                    setTimeout(() => targetField?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })), 150);
                } catch (e) {
                    console.error('[xLongly] Paste simulation error (non-Bluesky contentEditable):', e);
                    const blobUrl = URL.createObjectURL(blob);
                    const img = document.createElement('img');
                    img.src = blobUrl;
                    targetField.appendChild(img);
                    showUiNotification(actionNotificationElement, 'Image inserted (fallback)', 'success');
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
                    targetField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                }
            }
        }
    } catch (error) {
        console.error('[xLongly] Image processing or action error:', error);
        alert('An error occurred. The image will be downloaded automatically as a fallback.');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'generated-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// --- Initialization ---
async function reinitializePluginWithNewConfig() {
    console.log('[xLongly ContentScript] Starting reinitializePluginWithNewConfig...');

    // 1. Complete cleaning of the existing UI and listeners
    cleanupFullUIAndListeners();

    // 2. Disconnection of the old MutationObserver, if it still exists
    if (observer) {
        observer.disconnect();
        observer = null;
        console.log('[xLongly ContentScript] Old MutationObserver disconnected for reinitialization.');
    }
    buttonAnchorElement = null;
    targetField = null;

    // 3. Load a fresh configuration (which should now include the changes from the popup)
    currentActiveConfig = await initializeActiveConfig();

    if (!currentActiveConfig) {
        console.log('[xLongly ContentScript] Reinitialisation: No active config after update. Plugin inactive.');
        cleanupSiteSpecificClass();
        cleanupThemeManager();
        return;
    }

    console.log('[xLongly ContentScript] Reinitialisation with new config. Selector:', currentActiveConfig.targetSelector);
    console.log('[xLongly ContentScript] New canvasStyle:', currentActiveConfig.canvasStyle);

    applySiteSpecificClass(window.location.hostname);
    initializeThemeManager(window.location.hostname);

    // 4. Try to find the target and reconfigure the UI
    tryFindAndSetupTarget(); // To użyje świeżego currentActiveConfig

    // 5. Restart MutationObserver
    observer = new MutationObserver(() => {
        // console.log('[xLongly ContentScript] MutationObserver triggered after reinit.');
        tryFindAndSetupTarget();
    });

    const targetNode = document.querySelector('#main') || document.body;
    observer.observe(targetNode, { childList: true, subtree: true });
    console.log('[xLongly ContentScript] MutationObserver (re)started after reinit.');
}

console.log('[xLongly ContentScript] Attempting to register onMessage listener...');
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    console.log('[xLongly ContentScript] Message received in listener. Type:', request.type, 'Sender ID:', sender.id, 'Sender URL:', sender.url);

    if (request.type === 'XLONGLY_SETTINGS_UPDATED') {
        console.log('[xLongly ContentScript] Received XLONGLY_SETTINGS_UPDATED from popup. Reinitializing plugin.');
        await reinitializePluginWithNewConfig();
        sendResponse({ status: "Settings received and plugin reinitialized by content script." });
        return true;
    } else if (request.type === 'XLONGLY_GET_CURRENT_SITE_INFO') {
        const hostname = window.location.hostname;
        let siteIdentifier = 'x.com';

        if (hostname.includes('bsky.app')) {
            siteIdentifier = 'bsky.app';
        } else if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
            siteIdentifier = 'x.com';
        }

        console.log(`[xLongly ContentScript] Received XLONGLY_GET_CURRENT_SITE_INFO. Responding with site: ${siteIdentifier}`);
        sendResponse({ siteIdentifier: siteIdentifier });
        return false;
    }

    console.warn('[xLongly ContentScript] Received unhandled message type:', request.type);
    return false;
});
console.log('[xLongly ContentScript] onMessage listener registered.');

// --- Plugin Start ---
(async () => {
    await reinitializePluginWithNewConfig();

    if (currentActiveConfig) {
        setCurrentWatcherPath(window.location.pathname + window.location.search);
        initializeUrlWatcher(async () => {
            console.log("[xLongly] URL changed, re-evaluating config and UI.");
            await reinitializePluginWithNewConfig();
        });
        console.log('[xLongly] Plugin loaded. Active config for target selector:', (currentActiveConfig as SiteConfiguration).targetSelector);
    } else {
        console.log('[xLongly] Plugin loaded but no config found for:', window.location.hostname, '. Plugin inactive.');
        cleanupSiteSpecificClass();
        cleanupThemeManager();
    }
})();