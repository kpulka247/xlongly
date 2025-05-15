import { CanvasStyleConfig } from '../config/config-types';

export type SiteSpecificCanvasStyles = {
    [siteIdentifier: string]: Partial<CanvasStyleConfig>;
};

const STORAGE_KEY = 'xLonglyUserStyles';

export async function loadUserStyles(): Promise<SiteSpecificCanvasStyles | null> {
    try {
        const result = await chrome.storage.sync.get(STORAGE_KEY);
        if (result && result[STORAGE_KEY]) {
            return result[STORAGE_KEY] as SiteSpecificCanvasStyles;
        }
        return null;
    } catch (error) {
        console.error("[xLongly] Error loading user styles from storage:", error);
        return null;
    }
}

export async function saveUserStyles(styles: SiteSpecificCanvasStyles): Promise<void> {
    try {
        await chrome.storage.sync.set({ [STORAGE_KEY]: styles });
        console.log("[xLongly] User styles saved to storage.");
    } catch (error) {
        console.error("[xLongly] Error saving user styles to storage:", error);
    }
}

export async function clearUserStylesForSite(siteIdentifier: string): Promise<void> {
    const currentStyles = await loadUserStyles() || {};
    if (currentStyles[siteIdentifier]) {
        delete currentStyles[siteIdentifier];
        await saveUserStyles(currentStyles);
        console.log(`[xLongly] User styles for ${siteIdentifier} cleared.`);
    }
}

export async function clearAllUserStyles(): Promise<void> {
    try {
        await chrome.storage.sync.remove(STORAGE_KEY);
        console.log("[xLongly] All user styles cleared from storage.");
    } catch (error) {
        console.error("[xLongly] Error clearing all user styles from storage:", error);
    }
}