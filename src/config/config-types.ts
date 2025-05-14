export interface ButtonPositionConfig {
    topOffset: number;
    rightOffset?: number;
    gapToAnchorLeft?: number;

}

export interface CanvasStyleConfig {
    fontFamily: string;
    fontSize: number;
    lineHeightMultiplier: number;
    textMaxWidth: number;
    padding: number;
    backgroundColor: string;
    textColor: string;
}

export interface SiteConfiguration {
    targetSelector: string;
    buttonAnchorSelector?: string;
    buttonPosition: ButtonPositionConfig;
    canvasStyle: CanvasStyleConfig;
    excludeUiIfSelectorVisible?: string;
}