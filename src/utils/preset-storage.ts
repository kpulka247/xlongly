export const TEXT_PRESET_STORAGE_KEY = 'xlongly_text_presets_v1';
export const MAX_PRESETS = 5;

export interface TextPresets {
    [key: `preset_${number}`]: string;
}

export async function saveTextPreset(slot: number, text: string): Promise<void> {
    if (slot < 1 || slot > MAX_PRESETS) {
        console.error(`[xLongly] Invalid preset slot number: ${slot}`);
        throw new Error(`Invalid preset slot number: ${slot}`);
    }
    const keyInPresetsObject = `preset_${slot}` as const; 
    try {
        const currentPresets = await loadAllTextPresets();
        const newPresets: TextPresets = {
            ...currentPresets,
            [keyInPresetsObject]: text,
        };
        await chrome.storage.local.set({ [TEXT_PRESET_STORAGE_KEY]: newPresets });
        console.log(`[xLongly] Text preset stored in slot ${slot}`);
    } catch (error) {
        console.error(`[xLongly] Error while saving a text preset to slot ${slot}:`, error);
        throw error;
    }
}

export async function loadTextPreset(slot: number): Promise<string | null> {
    if (slot < 1 || slot > MAX_PRESETS) {
        console.error(`[xLongly] Invalid preset slot number: ${slot}`);
        return null;
    }
    const keyInPresetsObject = `preset_${slot}` as const;
    try {
        const presets = await loadAllTextPresets();
        return presets[keyInPresetsObject] || null;
    } catch (error) {
        console.error(`[xLongly] Error loading a text preset from slot ${slot}:`, error);
        return null;
    }
}

export async function loadAllTextPresets(): Promise<TextPresets> {
    try {
        const result = await chrome.storage.local.get(TEXT_PRESET_STORAGE_KEY);
        return (result[TEXT_PRESET_STORAGE_KEY] as TextPresets) || {};
    } catch (error) {
        console.error('[xLongly] Error when loading all text presets:', error);
        return {};
    }
}

export async function deleteTextPreset(slot: number): Promise<void> {
    if (slot < 1 || slot > MAX_PRESETS) {
        console.error(`[xLongly] Invalid preset slot number: ${slot}`);
        throw new Error(`Invalid preset slot number: ${slot}`);
    }
    const keyInPresetsObject = `preset_${slot}` as const;
    try {
        const currentPresets = await loadAllTextPresets();
        if (currentPresets[keyInPresetsObject] !== undefined) {
            delete currentPresets[keyInPresetsObject];
            await chrome.storage.local.set({ [TEXT_PRESET_STORAGE_KEY]: currentPresets });
            console.log(`[xLongly]  Text preset deleted from slot ${slot}`);
        }
    } catch (error) {
        console.error(`[xLongly] Error deleting a text preset from slot ${slot}:`, error);
        throw error;
    }
}