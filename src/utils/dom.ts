export function isElementVisible(element: HTMLElement | null): boolean {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        element.offsetParent !== null;
}