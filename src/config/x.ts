import { SiteConfiguration } from './config-types';

export const xSiteConfig: SiteConfiguration = {
    targetSelector: 'div[data-testid="tweetTextarea_0"]',
    buttonPosition: {
        topOffset: -4,
        rightOffset: -2,
    },
    canvasStyle: {
        fontFamily: '"XChirp", Verdana, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: 20,
        lineHeightMultiplier: 1.33,
        textMaxWidth: 550,
        padding: 20,
        backgroundColor: '#000000',
        textColor: '#ffffff',
    },
};