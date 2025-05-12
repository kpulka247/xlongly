export type ThemeSetting = 'light' | 'dim' | 'dark';

interface ThemeDetectionStrategy {
    detect(): ThemeSetting;
    observeChanges(callback: (newTheme: ThemeSetting) => void): MutationObserver | null;
    cleanupObserver?(observer: MutationObserver): void;
}

const xThemeStrategy: ThemeDetectionStrategy = {
    detect: (): ThemeSetting => {
        const nightModeValue = getCookie('night_mode');
        if (nightModeValue === '1') return 'dim';
        if (nightModeValue === '2') return 'dark';
        return 'light';
    },
    observeChanges: (callback: (newTheme: ThemeSetting) => void): MutationObserver | null => {
        console.log('[xLongly-Theme] Observation of theme changes for X by cookie (periodic check).');
        return null;
    }
};

const blueskyThemeStrategy: ThemeDetectionStrategy = {
    detect: (): ThemeSetting => {
        const htmlElement = document.documentElement;
        if (htmlElement.classList.contains('theme--dim')) return 'dim';
        if (htmlElement.classList.contains('theme--dark')) return 'dark';
        return 'light';
    },
    observeChanges: (callback: (newTheme: ThemeSetting) => void): MutationObserver => {
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    callback(blueskyThemeStrategy.detect());
                }
            }
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        console.log('[xLongly-Theme] MutationObserver for the Bluesky theme was started on <html>.');
        return observer;
    },
    cleanupObserver: (observer: MutationObserver): void => {
        observer.disconnect();
        console.log('[xLongly-Theme] MutationObserver was stopped for the Bluesky theme.');
    }
};

function getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

let currentThemeStrategy: ThemeDetectionStrategy | null = null;
let themeMutationObserver: MutationObserver | null = null;
let lastAppliedThemeSetting: ThemeSetting | null = null;
let xThemeIntervalId: number | null = null;

function applyThemeToBody(theme: ThemeSetting): void {
    if (lastAppliedThemeSetting === theme) return;

    document.body.classList.remove('theme-light', 'theme-dim', 'theme-dark');
    switch (theme) {
        case 'dim':
            document.body.classList.add('theme-dim');
            break;
        case 'dark':
            document.body.classList.add('theme-dark');
            break;
        case 'light':
        default:
            document.body.classList.add('theme-light');
            break;
    }
    lastAppliedThemeSetting = theme;
    console.log(`[xLongly-Theme] Theme was applied to the body: theme-${theme}`);
}

function handleThemeChange(): void {
    if (currentThemeStrategy) {
        const newTheme = currentThemeStrategy.detect();
        applyThemeToBody(newTheme);
    }
}

export function initializeThemeManager(hostname: string): void {
    if (themeMutationObserver && currentThemeStrategy?.cleanupObserver) {
        currentThemeStrategy.cleanupObserver(themeMutationObserver);
        themeMutationObserver = null;
    }
    if (xThemeIntervalId !== null) {
        clearInterval(xThemeIntervalId);
        xThemeIntervalId = null;
    }
    lastAppliedThemeSetting = null;

    if (hostname.includes('bsky.app')) {
        currentThemeStrategy = blueskyThemeStrategy;
    } else if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
        currentThemeStrategy = xThemeStrategy;
    } else {
        currentThemeStrategy = null;
        console.warn(`[xLongly-Theme] No theme detection strategy for the host: ${hostname}`);
        applyThemeToBody('light');
        return;
    }

    if (currentThemeStrategy) {
        const initialTheme = currentThemeStrategy.detect();
        applyThemeToBody(initialTheme);

        if (currentThemeStrategy === xThemeStrategy) {
            let lastXCookieValue = getCookie('night_mode');
            xThemeIntervalId = window.setInterval(() => {
                const currentXCookieValue = getCookie('night_mode');
                if (currentXCookieValue !== lastXCookieValue) {
                    lastXCookieValue = currentXCookieValue;
                    handleThemeChange();
                }
            }, 2000);
        } else {
            themeMutationObserver = currentThemeStrategy.observeChanges(handleThemeChange);
        }
    }
}

export function cleanupThemeManager(): void {
    if (themeMutationObserver && currentThemeStrategy?.cleanupObserver) {
        currentThemeStrategy.cleanupObserver(themeMutationObserver);
    } else if (themeMutationObserver) {
        themeMutationObserver.disconnect();
    }
    if (xThemeIntervalId !== null) {
        clearInterval(xThemeIntervalId);
    }
    themeMutationObserver = null;
    xThemeIntervalId = null;
    currentThemeStrategy = null;
    document.body.classList.remove('theme-light', 'theme-dim', 'theme-dark');
    lastAppliedThemeSetting = null;
    console.log('[xLongly-Theme] Theme manager cleared.');
}