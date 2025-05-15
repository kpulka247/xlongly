let currentPathWatcher: string = window.location.pathname + window.location.search;
let onUrlChangeCallback: (() => void) | null = null;

function handleUrlChangeInternal(): void {
    const newPath = window.location.pathname + window.location.search;
    if (newPath !== currentPathWatcher) {
        console.log(`[xLongly] URL changed (watcher) from: ${currentPathWatcher} to: ${newPath}`);
        currentPathWatcher = newPath;
        if (onUrlChangeCallback) {
            // Delay slightly to allow SPA frameworks to update the DOM
            setTimeout(onUrlChangeCallback, 300);
        }
    }
}

export function initializeUrlWatcher(callback: () => void): void {
    onUrlChangeCallback = callback;
    currentPathWatcher = window.location.pathname + window.location.search; // Initialize with current path

    const originalPushState = history.pushState;
    history.pushState = function (...args: [data: any, unused: string, url?: string | URL | null]) {
        originalPushState.apply(this, args);
        handleUrlChangeInternal();
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args: [data: any, unused: string, url?: string | URL | null]) {
        originalReplaceState.apply(this, args);
        handleUrlChangeInternal();
    };

    window.addEventListener('popstate', handleUrlChangeInternal);
    console.log('[xLongly] URL Watcher initialized.');
}

export function getCurrentWatcherPath(): string {
    return currentPathWatcher;
}
export function setCurrentWatcherPath(newPath: string): void {
    currentPathWatcher = newPath;
}