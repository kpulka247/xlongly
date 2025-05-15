interface ButtonPositionConfig {
    gapToAnchorLeft?: number;
    rightOffset?: number;
    topOffset: number;
}

export function updateButtonContainerPosition(
    buttonContainerEl: HTMLDivElement | null,
    anchorEl: HTMLElement | null,
    targetFieldEl: HTMLElement | null,
    buttonPosConfig: ButtonPositionConfig | null | undefined
): void {
    const positionRelativeToElement = anchorEl || targetFieldEl;

    if (!positionRelativeToElement || !buttonContainerEl || !buttonPosConfig) {
        if (buttonContainerEl) buttonContainerEl.style.display = 'none';
        return;
    }

    const rect = positionRelativeToElement.getBoundingClientRect();
    const configPos = buttonPosConfig;
    const containerWidth = buttonContainerEl.offsetWidth;

    if (containerWidth === 0 && buttonContainerEl.style.display !== 'none') {
        requestAnimationFrame(() => updateButtonContainerPosition(buttonContainerEl, anchorEl, targetFieldEl, buttonPosConfig));
        return;
    }

    let calculatedLeft: number;
    if (typeof configPos.gapToAnchorLeft === 'number') {
        calculatedLeft = window.scrollX + rect.left - configPos.gapToAnchorLeft - containerWidth;
    } else if (typeof configPos.rightOffset === 'number') {
        calculatedLeft = window.scrollX + rect.right - configPos.rightOffset - containerWidth;
    } else {
        calculatedLeft = window.scrollX + rect.left;
        console.warn('[xLongly] No rightOffset or gapToAnchorLeft configuration in buttonPosition. Defaulting to rect.left.');
    }

    buttonContainerEl.style.left = `${calculatedLeft}px`;
    buttonContainerEl.style.top = `${window.scrollY + rect.top + configPos.topOffset}px`;
    buttonContainerEl.style.display = 'flex';

    if (calculatedLeft < 5) {
        buttonContainerEl.style.left = '5px';
    }
    const bodyWidth = document.body.clientWidth;
    if (calculatedLeft + containerWidth > bodyWidth - 5) {
        buttonContainerEl.style.left = `${bodyWidth - containerWidth - 5}px`;
    }
}