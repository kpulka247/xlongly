chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
    if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
        const manifest = chrome.runtime.getManifest();
        const version = manifest.version;

        if (chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icons/icon128.png'),
                title: 'xLongly',
                message: `Updated to version ${version}. Click here to see what's new! 📄✒️`,
                priority: 2,
            });
        } else {
            console.warn("[xLongly] Notifications API is not available.");
        }
    }
});

chrome.notifications.onClicked.addListener((notificationId: string) => {
  chrome.tabs.create({ url: 'https://github.com/kpulka247/xlongly/blob/main/CHANGELOG.md' });
});

export {};