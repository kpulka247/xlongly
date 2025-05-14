import { SiteConfiguration } from './config-types';
import { xSiteConfig } from './sites/x';
import { bskySiteConfig } from './sites/bsky';

const siteConfigs: { [hostnamePattern: string]: SiteConfiguration } = {
    "x.com": xSiteConfig,
    "twitter.com": xSiteConfig,
    "bsky.app": bskySiteConfig,
};

function getActiveConfig(): SiteConfiguration | null {
    const currentHostname = window.location.hostname;

    for (const pattern in siteConfigs) {
        if (currentHostname.includes(pattern)) {
            console.log(`[xLongly] Found config for: ${pattern}`);
            return siteConfigs[pattern];
        }
    }

    console.warn(`[xLongly] No specific config found for: ${currentHostname}. The plugin may not work properly.`);
    return null;
}

const activeConfig = getActiveConfig();

export default activeConfig;