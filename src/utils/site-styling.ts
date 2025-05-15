let currentSiteClassApplied: string | null = null;

export function applySiteSpecificClass(hostname: string): void {
    if (currentSiteClassApplied) {
        document.body.classList.remove(currentSiteClassApplied);
    }

    if (hostname.includes('bsky.app')) {
        currentSiteClassApplied = 'site-bsky';
    } else if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
        currentSiteClassApplied = 'site-x';
    } else {
        currentSiteClassApplied = null;
    }

    if (currentSiteClassApplied) {
        document.body.classList.add(currentSiteClassApplied);
        console.log(`[xLongly] Site-specific class added: ${currentSiteClassApplied}`);
    }
}

export function cleanupSiteSpecificClass(): void {
    if (currentSiteClassApplied) {
        document.body.classList.remove(currentSiteClassApplied);
        console.log(`[xLongly] Site-specific class removed: ${currentSiteClassApplied}`);
        currentSiteClassApplied = null;
    }
}