import { SiteConfiguration } from '../config-types';

export const bskySiteConfig: SiteConfiguration = {
    targetSelector: 'div[contenteditable="true"][role="textbox"] p',
    buttonAnchorSelector: 'div button[aria-label="Publish post"], div button[aria-label="Publish reply"]',
    buttonPosition: {
        topOffset: 0,
        gapToAnchorLeft: 10,
    },
    canvasStyle: {
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: 18,
        lineHeightMultiplier: 1.4,
        textMaxWidth: 520,
        padding: 18,
        backgroundColor: '#F0F0FF',
        textColor: '#111111',
    },
};