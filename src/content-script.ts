import activeConfig from './config/active-config';
import { initializeThemeManager, cleanupThemeManager } from './utils/theme';

let buttonAnchorElement: HTMLElement | null = null;
let targetField: (HTMLElement & { isContentEditable?: boolean; innerText?: string; value?: string; focus?: () => void; }) | HTMLInputElement | HTMLTextAreaElement | null = null;
let charCounterElement: HTMLDivElement | null = null;
let buttonContainerElement: HTMLDivElement | null = null;
let generateOpenButtonElement: HTMLButtonElement | null = null;
let generateReplaceButtonElement: HTMLButtonElement | null = null;
let actionNotificationElement: HTMLDivElement | null = null;
let lastUpdateCharCountFunction: (() => void) | null = null;
let observer: MutationObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
let currentPath: string = window.location.pathname + window.location.search;

import './styles/base.css';
import './styles/sites/bsky.css';
import './styles/sites/x.css';

const iconShowImage: string = `<svg viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px" style="display: block; margin: auto;"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>`;
const iconConvertToImage: string = `<svg viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px" style="display: block; margin: auto;"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`;
const iconCopy: string = `<svg viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px" style="display: block; margin: auto;"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;

function updateButtonContainerPosition(): void {
    const positionRelativeToElement = buttonAnchorElement || targetField;

    if (!positionRelativeToElement || !buttonContainerElement || !activeConfig) {
        if (buttonContainerElement) buttonContainerElement.style.display = 'none';
        return;
    }

    const rect = positionRelativeToElement.getBoundingClientRect();
    const configPos = activeConfig.buttonPosition;
    const containerWidth = buttonContainerElement.offsetWidth;

    if (containerWidth === 0 && buttonContainerElement.style.display !== 'none') {
        requestAnimationFrame(updateButtonContainerPosition);
        return;
    }

    let calculatedLeft: number;

    if (typeof configPos.gapToAnchorLeft === 'number') {
        calculatedLeft = window.scrollX + rect.left - configPos.gapToAnchorLeft - containerWidth;
    } else if (typeof configPos.rightOffset === 'number') {
        calculatedLeft = window.scrollX + rect.right - configPos.rightOffset - containerWidth;
    } else {
        calculatedLeft = window.scrollX + rect.left;
        console.warn('[xLongly] No rightOffset or gapToAnchorLeft configuration in buttonPosition.');
    }

    // Zastosuj obliczoną pozycję
    buttonContainerElement.style.left = `${calculatedLeft}px`;
    // Pozycjonowanie pionowe pozostaje bez zmian
    buttonContainerElement.style.top = `${window.scrollY + rect.top + configPos.topOffset}px`;
    buttonContainerElement.style.display = 'flex';

    // Sprawdź, czy nie wychodzi poza lewą krawędź ekranu
    if (calculatedLeft < 5) {
        buttonContainerElement.style.left = '5px';
    }

    // Opcjonalnie: Sprawdź, czy nie wychodzi poza prawą krawędź ekranu
    const bodyWidth = document.body.clientWidth;
    if (calculatedLeft + containerWidth > bodyWidth - 5) {
        buttonContainerElement.style.left = `${bodyWidth - containerWidth - 5}px`;
    }
}

type TargetElementType = (HTMLElement & { isContentEditable?: boolean; innerText?: string; value?: string; focus?: () => void; }) | HTMLInputElement | HTMLTextAreaElement;

function setupUIForTarget(textInputElement: TargetElementType): void {
    if (!textInputElement) return;

    const anchorElement = buttonAnchorElement || textInputElement;

    if (targetField === textInputElement && buttonContainerElement && document.body.contains(buttonContainerElement)) {
        updateButtonContainerPosition();
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
        if (targetField) {
            const tc = targetField.isContentEditable ? targetField.innerText : (targetField as HTMLInputElement | HTMLTextAreaElement).value;
            if (charCounterElement) charCounterElement.textContent = `Characters: ${tc ? tc.length : 0}`;
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


    updateButtonContainerPosition();
    const INITIAL_POSITION_DELAY_MS = 100;
    setTimeout(() => {
        if (buttonContainerElement && (buttonAnchorElement || targetField)) {
            updateButtonContainerPosition();
        }
    }, INITIAL_POSITION_DELAY_MS);


    window.addEventListener('resize', updateButtonContainerPosition);
    window.addEventListener('scroll', updateButtonContainerPosition, true);

    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = new ResizeObserver(updateButtonContainerPosition);
    if (anchorElement) {
        resizeObserver.observe(anchorElement as Element);
    }
}

function cleanupExistingUIElements(): void {
    if (charCounterElement) charCounterElement.remove();
    if (buttonContainerElement) buttonContainerElement.remove();
    if (actionNotificationElement) actionNotificationElement.remove();
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
    window.removeEventListener('resize', updateButtonContainerPosition);
    window.removeEventListener('scroll', updateButtonContainerPosition, true);
    console.log('[xLongly] Full UI, listeners and ResizeObserver cleared.');
}

function tryFindAndSetupTarget(): void {
    if (!activeConfig) {
        if (targetField || buttonAnchorElement) {
            cleanupFullUIAndListeners();
        }
        buttonAnchorElement = null;
        return;
    }

    const targetSelectorFromConfig = activeConfig.targetSelector;
    const anchorSelectorFromConfig = activeConfig.buttonAnchorSelector;
    const excludeSelector = activeConfig.excludeUiIfSelectorVisible;

    if (excludeSelector) {
        const excludingElement = document.querySelector(excludeSelector) as HTMLElement | null;
        if (excludingElement) {
            const style = window.getComputedStyle(excludingElement);
            const isExcludingElementVisible = style.display !== 'none' && style.visibility !== 'hidden' && excludingElement.offsetParent !== null;
            if (isExcludingElementVisible) {
                console.log(`[xLongly] The UI exclusion element is visible (${excludeSelector}). Hiding UI.`);
                if (targetField || buttonAnchorElement) {
                    cleanupFullUIAndListeners();
                }
                buttonAnchorElement = null;
                targetField = null;
                return;
            }
        }
    }

    if (!targetSelectorFromConfig) {
        console.log('[xLongly] tryFindAndSetupTarget: No targetSelector in active config.');
        if (targetField || buttonAnchorElement) {
            cleanupFullUIAndListeners();
        }
        buttonAnchorElement = null;
        return;
    }

    const textInputElement = document.querySelector(targetSelectorFromConfig) as TargetElementType | null;
    let newButtonAnchorElement: HTMLElement | null = null;

    if (anchorSelectorFromConfig) {
        newButtonAnchorElement = document.querySelector(anchorSelectorFromConfig) as HTMLElement | null;
        if (!newButtonAnchorElement) {
            console.debug(`[xLongly] buttonAnchorSelector not found: ${anchorSelectorFromConfig}. Buttons will be next to the text field.`);
        }
    }
    buttonAnchorElement = newButtonAnchorElement || (textInputElement as HTMLElement | null);

    if (textInputElement) {
        const style = window.getComputedStyle(textInputElement);
        const isTextInputVisible = style.display !== 'none' && style.visibility !== 'hidden' && textInputElement.offsetParent !== null;

        let isAnchorVisible = isTextInputVisible;
        if (buttonAnchorElement && buttonAnchorElement !== textInputElement) {
            const anchorStyle = window.getComputedStyle(buttonAnchorElement);
            isAnchorVisible = anchorStyle.display !== 'none' && anchorStyle.visibility !== 'hidden' && buttonAnchorElement.offsetParent !== null;
        }

        if (isTextInputVisible && isAnchorVisible) {
            const uiAlreadyExistsForCurrentElements =
                targetField === textInputElement &&
                buttonAnchorElement === (newButtonAnchorElement || textInputElement) &&
                buttonContainerElement &&
                document.body.contains(buttonContainerElement);


            if (!uiAlreadyExistsForCurrentElements) {
                console.log('[xLongly] tryFindAndSetupTarget: Visible elements found or changed, configuring/reconfiguring UI.');
                setupUIForTarget(textInputElement);
            } else {
                updateButtonContainerPosition();
            }
        } else {
            console.log('[xLongly] tryFindAndSetupTarget: Text field or anchor not visible.');
            if (targetField === textInputElement ||
                (buttonAnchorElement && buttonAnchorElement === (newButtonAnchorElement || textInputElement))) {
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

let currentSiteClass: string | null = null;

function applySiteSpecificClass(hostname: string): void {
    if (currentSiteClass) {
        document.body.classList.remove(currentSiteClass);
        currentSiteClass = null;
    }

    if (hostname.includes('bsky.app')) {
        currentSiteClass = 'site-bsky';
    } else if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
        currentSiteClass = 'site-x';
    }

    if (currentSiteClass) {
        document.body.classList.add(currentSiteClass);
        console.log(`[xLongly] Site-specific class added: ${currentSiteClass}`);
    }
}

function cleanupSiteSpecificClass(): void {
    if (currentSiteClass) {
        document.body.classList.remove(currentSiteClass);
        currentSiteClass = null;
        console.log('[xLongly] Site-specific class removed.');
    }
}

function initializePlugin(): void {
    buttonAnchorElement = null;
    if (!activeConfig) {
        console.log('[xLongly] Initialisation: No active config. Plugin not active.');
        cleanupFullUIAndListeners();
        cleanupSiteSpecificClass();
        cleanupThemeManager();
        if (observer) {
            observer.disconnect();
            console.log('[xLongly] MutationObserver disconnected (no config).');
        }
        return;
    }

    console.log('[xLongly] Initialisation with selector:', activeConfig.targetSelector);
    applySiteSpecificClass(window.location.hostname);
    initializeThemeManager(window.location.hostname);

    if (observer) {
        observer.disconnect();
        console.log('[xLongly] Old MutationObserver disconnected.');
    }

    tryFindAndSetupTarget();

    observer = new MutationObserver(() => {
        tryFindAndSetupTarget();
    });

    const targetNode = document.querySelector('#main') || document.body;
    observer.observe(targetNode, { childList: true, subtree: true });
    console.log('[xLongly] MutationObserver started.');
}

function handleUrlChange(): void {
    const newPath = window.location.pathname + window.location.search;
    if (newPath !== currentPath) {
        console.log(`[xLongly] Change URL from: ${currentPath} to: ${newPath}`);
        currentPath = newPath;
        setTimeout(tryFindAndSetupTarget, 300);
    }
}

const originalPushState = history.pushState;
history.pushState = function (...args: [data: any, unused: string, url?: string | URL | null]) {
    originalPushState.apply(this, args);
    handleUrlChange();
};
const originalReplaceState = history.replaceState;
history.replaceState = function (...args: [data: any, unused: string, url?: string | URL | null]) {
    originalReplaceState.apply(this, args);
    handleUrlChange();
};
window.addEventListener('popstate', handleUrlChange);


function deleteContentNatively(element: TargetElementType | null): void {
    if (!element) return;
    if (element.focus) element.focus();

    if (element.isContentEditable) {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(element);
        sel?.addRange(range);

        const success = document.execCommand('delete');
        if (!success) {
            element.innerHTML = '';
        }
    } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        (element as HTMLInputElement | HTMLTextAreaElement).value = '';
    }

    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
}

interface WrapTextResult {
    lines: string[];
    height: number;
    width: number;
}

async function processImageAction(actionType: 'openInNewTab' | 'replaceInField'): Promise<void> {
    if (!activeConfig) {
        alert('Error: No config for this page.');
        return;
    }
    let originalText = '';
    if (targetField) {
        originalText = targetField.isContentEditable ? (targetField.innerText || '') : ((targetField as HTMLInputElement | HTMLTextAreaElement).value || '');
    }

    if (!targetField || typeof originalText !== 'string' || originalText.trim() === "") {
        alert('Text field is empty or not found.');
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        alert('Failed to get 2D canvas context.');
        return;
    }

    const styleConf = activeConfig.canvasStyle;
    const CALCULATED_LINE_HEIGHT = Math.round(styleConf.fontSize * styleConf.lineHeightMultiplier);

    ctx.font = `${styleConf.fontSize}px ${styleConf.fontFamily}`;
    ctx.textBaseline = 'top';

    const { lines, height: textBlockHeight, width: actualTextWidth } = wrapTextAndCalcHeight(
        ctx,
        originalText,
        styleConf.textMaxWidth,
        CALCULATED_LINE_HEIGHT
    );

    if (lines.length === 0 && originalText.trim() === "") {
        canvas.width = styleConf.padding * 2 + 50;
        canvas.height = styleConf.padding * 2 + CALCULATED_LINE_HEIGHT;
    } else if (lines.length === 0) {
        canvas.width = styleConf.padding * 2 + ctx.measureText(originalText.trim() || " ").width;
        canvas.height = styleConf.padding * 2 + CALCULATED_LINE_HEIGHT;
    } else {
        canvas.width = Math.min(actualTextWidth, styleConf.textMaxWidth) + (styleConf.padding * 2);
        canvas.height = textBlockHeight + (styleConf.padding * 2);
    }
    if (canvas.width < styleConf.padding * 2 + 50) canvas.width = styleConf.padding * 2 + 50;
    if (canvas.height < styleConf.padding * 2 + CALCULATED_LINE_HEIGHT) canvas.height = styleConf.padding * 2 + CALCULATED_LINE_HEIGHT;

    ctx.fillStyle = styleConf.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = styleConf.textColor;
    ctx.font = `${styleConf.fontSize}px ${styleConf.fontFamily}`;
    ctx.textBaseline = 'top';

    let currentY = styleConf.padding;
    if (lines.length === 0 && originalText.trim() !== "") {
        ctx.fillText(originalText.trim(), styleConf.padding, currentY);
    } else {
        lines.forEach(line => {
            ctx.fillText(line, styleConf.padding, currentY);
            currentY += CALCULATED_LINE_HEIGHT;
        });
    }

    const dataURL = canvas.toDataURL('image/png');

    try {
        const blob = await dataURLtoBlob(dataURL);
        if (actionType === 'openInNewTab') {
            const blobUrl = URL.createObjectURL(blob);
            const imageWindow = window.open(blobUrl, "_blank");
            if (!imageWindow) {
                alert('Failed to open a new tab...'); URL.revokeObjectURL(blobUrl); throw new Error('Window open blocked.');
            } else {
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1500); showActionNotification('Image opened', 'success');
            }
        } else if (actionType === 'replaceInField') {
            const isOnBluesky = window.location.hostname.includes('bsky.app');

            deleteContentNatively(targetField);
            await new Promise(resolve => setTimeout(resolve, 50));

            if (isOnBluesky) {
                if (targetField) {
                    try {
                        const item = new ClipboardItem({ "image/png": blob });
                        await navigator.clipboard.write([item]);
                        showActionNotification('Image copied! Use Ctrl+V to paste.', 'success');
                    } catch (copyError) {
                        console.error('[xLongly] Error copying image to clipboard on Bluesky:', copyError);
                        showActionNotification('Error copying image. Please try again.', 'warning');
                    }
                } else {
                    showActionNotification('Error: Target field not found for copying.', 'warning');
                }
            } else {
                if (targetField && targetField.isContentEditable) {
                    try {
                        const dataTransfer = new DataTransfer(); dataTransfer.items.add(new File([blob], "gen.png", { type: blob.type }));
                        targetField.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dataTransfer, bubbles: true, cancelable: true }));
                        showActionNotification('Text replaced with image', 'success');
                        setTimeout(() => {
                            if (targetField) {
                                targetField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                            }
                        }, 150);
                    } catch (e) {
                        console.error('[xLongly] Paste sim error (non-Bluesky):', e); const blobUrl = URL.createObjectURL(blob); const img = document.createElement('img');
                        img.src = blobUrl; if (targetField) targetField.appendChild(img);
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
                        if (targetField) targetField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); showActionNotification('Image inserted (fallback)', 'success');
                    }
                } else if (targetField && (targetField instanceof HTMLInputElement || targetField instanceof HTMLTextAreaElement)) {
                    const item = new ClipboardItem({ "image/png": blob }); await navigator.clipboard.write([item]); showActionNotification('Copied (Ctrl+V to paste)', 'warning');
                }
            }
        }
    } catch (error) {
        console.error('[xLongly] Image process error:', error); alert('Error. The image will be downloaded automatically.');
        const link = document.createElement('a'); link.href = dataURL; link.download = 'gen.png'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
}

async function dataURLtoBlob(dataurl: string): Promise<Blob> {
    const response = await fetch(dataurl);
    return await response.blob();
}

function wrapTextAndCalcHeight(context: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number): WrapTextResult {
    const paragraphs = text.split('\n'); let lines: string[] = []; let currentHeight = 0; let actualMaxWidthUsed = 0;
    paragraphs.forEach(paragraph => {
        if (paragraph.trim() === '') { if (lines.length > 0 && lines[lines.length - 1] !== '') { lines.push(''); currentHeight += lineHeight; } return; }
        const words = paragraph.split(' '); let currentLine = '';
        for (const word of words) {
            if (word.trim() === '') { continue; } const wordWidth = context.measureText(word).width;
            if (currentLine === '') {
                if (wordWidth <= maxWidth) { currentLine = word; }
                else { let subFragment = ''; for (let i = 0; i < word.length; i++) { const char = word[i]; const testFragment = subFragment + char; if (context.measureText(testFragment).width <= maxWidth) { subFragment = testFragment; } else { lines.push(subFragment); actualMaxWidthUsed = Math.max(actualMaxWidthUsed, context.measureText(subFragment).width); currentHeight += lineHeight; subFragment = char; } } currentLine = subFragment; }
            } else {
                const testLine = currentLine + ' ' + word;
                if (context.measureText(testLine).width <= maxWidth) { currentLine = testLine; }
                else {
                    lines.push(currentLine); actualMaxWidthUsed = Math.max(actualMaxWidthUsed, context.measureText(currentLine).width); currentHeight += lineHeight;
                    if (wordWidth <= maxWidth) { currentLine = word; }
                    else { let subFragment = ''; for (let i = 0; i < word.length; i++) { const char = word[i]; const testFragment = subFragment + char; if (context.measureText(testFragment).width <= maxWidth) { subFragment = testFragment; } else { lines.push(subFragment); actualMaxWidthUsed = Math.max(actualMaxWidthUsed, context.measureText(subFragment).width); currentHeight += lineHeight; subFragment = char; } } currentLine = subFragment; }
                }
            }
        }
        if (currentLine !== '') { lines.push(currentLine); actualMaxWidthUsed = Math.max(actualMaxWidthUsed, context.measureText(currentLine).width); currentHeight += lineHeight; }
    });
    if (lines.length === 0 && text.trim().length > 0) {
        let subFragment = ''; const trimmedText = text.trim();
        for (let i = 0; i < trimmedText.length; i++) { const char = trimmedText[i]; if (context.measureText(subFragment + char).width <= maxWidth) { subFragment += char; } else { if (subFragment !== '') { lines.push(subFragment); actualMaxWidthUsed = Math.max(actualMaxWidthUsed, context.measureText(subFragment).width); currentHeight += lineHeight; } subFragment = char; } }
        if (subFragment !== '') { lines.push(subFragment); actualMaxWidthUsed = Math.max(actualMaxWidthUsed, context.measureText(subFragment).width); currentHeight += lineHeight; }
    } else if (lines.length === 0 && text.length > 0 && text.trim().length === 0) { lines.push(' '); actualMaxWidthUsed = Math.max(actualMaxWidthUsed, context.measureText(' ').width); currentHeight += lineHeight; }
    if (currentHeight === 0 && lines.length > 0) { currentHeight = lines.length * lineHeight; }
    return { lines, height: currentHeight, width: actualMaxWidthUsed };
}

function showActionNotification(message: string, type: 'success' | 'warning' = 'success'): void {
    if (!actionNotificationElement) return;
    actionNotificationElement.textContent = message;

    actionNotificationElement.classList.remove('notification-show', 'notification-warning');

    if (type === 'warning') {
        actionNotificationElement.classList.add('notification-warning');
    }

    actionNotificationElement.classList.add('notification-show');

    setTimeout(() => {
        if (actionNotificationElement) {
            actionNotificationElement.classList.remove('notification-show');
            actionNotificationElement.classList.remove('notification-warning');
        }
    }, 3500);
}

if (activeConfig) {
    initializePlugin();
    console.log('[xLongly] Plugin loaded. Active config:', activeConfig.targetSelector);
} else {
    console.log('[xLongly] Plugin loaded but no config found for:', window.location.hostname, '. Plugin inactive.');
    cleanupSiteSpecificClass();
    cleanupThemeManager();
}