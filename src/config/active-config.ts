import { SiteConfiguration, CanvasStyleConfig } from './config-types';
import { xSiteConfig } from './sites/x';
import { bskySiteConfig } from './sites/bsky';
import { loadUserStyles, SiteSpecificCanvasStyles } from '../utils/storage';

const siteConfigs: { [hostnamePattern: string]: SiteConfiguration } = {
    "x.com": xSiteConfig,
    "twitter.com": xSiteConfig,
    "bsky.app": bskySiteConfig,
};

// Helper function for deep linking of canvas styles
function mergeCanvasStyles(baseStyle: CanvasStyleConfig, userOverride?: Partial<CanvasStyleConfig>): CanvasStyleConfig {
    if (!userOverride) {
        return baseStyle;
    }
    // Simple linking
    return { ...baseStyle, ...userOverride };
}


let activeConfig: SiteConfiguration | null = null;
let userStyles: SiteSpecificCanvasStyles | null = null;

// Function to initialise or refresh the configuration
export async function initializeActiveConfig(): Promise<SiteConfiguration | null> {
    const currentHostname = window.location.hostname;
    userStyles = await loadUserStyles();

    let baseConfig: SiteConfiguration | null = null;
    let siteIdentifierForUserStyles: string | null = null;

    for (const pattern in siteConfigs) {
        if (currentHostname.includes(pattern)) {
            baseConfig = siteConfigs[pattern];
            siteIdentifierForUserStyles = pattern;
            console.log(`[xLongly] Found base config for: ${pattern}`);
            break;
        }
    }

    if (!baseConfig) {
        console.warn(`[xLongly] No specific base config found for: ${currentHostname}.`);
        activeConfig = null;
        return null;
    }

    const effectiveConfig = JSON.parse(JSON.stringify(baseConfig)) as SiteConfiguration;


    if (userStyles && siteIdentifierForUserStyles && userStyles[siteIdentifierForUserStyles]) {
        console.log(`[xLongly] Applying user styles for ${siteIdentifierForUserStyles}.`);
        effectiveConfig.canvasStyle = mergeCanvasStyles(
            baseConfig.canvasStyle,
            userStyles[siteIdentifierForUserStyles]
        );
    } else {
        effectiveConfig.canvasStyle = { ...baseConfig.canvasStyle };
    }

    activeConfig = effectiveConfig;
    console.log('[xLongly] Effective config:', activeConfig);
    return activeConfig;
}

export function getActiveConfig(): SiteConfiguration | null {
    return activeConfig;
}