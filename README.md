<div align="center">

# xLongly

<a href="https://github.com/kpulka247/xlongly/releases" title="GitHub Release"><img src="https://img.shields.io/github/v/release/kpulka247/xlongly?logo=github&logoColor=white"></a>
<a href="https://github.com/kpulka247/xlongly/blob/main/LICENSE" title="GitHub License"><img src="https://img.shields.io/github/license/kpulka247/xlongly?color=%23252525"></a>

</div>

## Overview

This browser extension allows users to quickly convert text entered into specific input fields (like tweet composers or social media post areas) into an image. This can be useful for bypassing character limits, sharing text visually, or preserving formatting.

The extension works by identifying target text fields on supported websites, adding control buttons near them, and generating a PNG image based on the text content and site-specific styling.

## Features

*   **🖼️ Text to Image:** Turn your text into a clean PNG image.
*   **🔘 Action Buttons:**
    *   **Show image** in a new browser tab
    *   **Convert to image** (smart paste or direct insert)
*   **🔢 Live Character Counter** to track your text length.
*   **🎨 Auto Theme Match:** Buttons blend in with Light, Dim, or Dark mode on supported sites (like X & Bluesky).
*   **🛠️ Custom Site Support:** Easily adapt to new websites with flexible config options.
*   **🔔 User Feedback:** Get instant notifications like “Image opened” or “Text replaced”.

### 🌐 Supported Sites

Currently configured and tested for:

*   **X (formerly Twitter):** (`x.com`, `twitter.com`)
*   **Bluesky:** (`bsky.app`)

The extension is designed to be easily extended to support other websites by adding new site configurations.

## Usage

1.  **Activation:** Navigate to a supported website (like X or Bluesky).
2.  **Interaction:** When you focus on or interact with the designated text input field (e.g., the post composer), action buttons (Show image, Convert to image) and a character counter should appear nearby.
    *   The exact position of the buttons depends on the site configuration (either next to the text field or another "anchor" element).
    *   The appearance of the buttons will match the website's current theme (light or dark).
3.  **Actions:**
    *   Type your text into the field.
    *   Click the "Show image" button to see the generated image in a new tab.
    *   Click the "Convert to image" button to clear the text field and insert the generated image. You might need to manually trigger an update on the site (like adding a space) for the site to recognize the change fully.

## Development & Build

### 🚀 Getting started

Make sure you have:

- [Node.js](https://nodejs.org) (LTS version recommended) installed on your system
- [Git](https://git-scm.com/) for version control

Then install dependencies:

```bash
npm install
```

### 🧪 Development Mode

To run the extension in development mode with live reloading:

```bash
npm run dev
```

- Watches for changes in the `src/` directory.
- Builds unpacked versions of the extension for both Chrome and Firefox into the `dist/chrome` and `dist/firefox` folders respectively.
- Includes source maps for easier debugging.

**Loading the Unpacked Extension:**

- **Chrome:**
1. Go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist/chrome` folder
- **Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Navigate into the `dist/firefox` folder and select the `manifest.json` file

### 📦 Building for Production

To create optimized, production-ready builds and ZIP archives for distribution:

```bash
npm run build
```

- Cleans the `dist/` directory.
- Builds optimized, minified versions for Chrome and Firefox into `dist/chrome` and `dist/firefox`.
- Generates corresponding ZIP archives (e.g., `dist/chrome-x.x.x.zip`, `dist/firefox-x.x.x.zip`) suitable for uploading to web stores.

### ⚙️ Configuration

Site-specific behavior is handled through config files in `src/config/`:

- **`config-types.ts`** – Defines TypeScript interfaces for config objects.
- **`x.ts`, `bsky.ts`, etc.** – Each exports a `SiteConfiguration` for a specific site.

Key properties include:

- `targetSelector` – CSS selector for the main text input field.
- `buttonAnchorSelector` (optional) – Element to position buttons next to (defaults to `targetSelector`).
- `buttonPosition` – Includes offsets like `topOffset`, `gapToAnchorLeft`, or `rightOffset`.
- `canvasStyle` – Controls the look of the generated image: font, size, color, padding, etc.
- `active-config.ts` – Chooses the correct config based on `window.location.hostname`.

**To support a new site:**

1. Create a new config file (e.g. `src/config/newsite.ts`) with the necessary properties.  
2. Update `src/config/active-config.ts` to return it for the correct hostname.

### 🏁 Release Process

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) and [Conventional Commits](https://www.conventionalcommits.org/) for automated version management and release publishing.

- **How it works:** When commits following the Conventional Commits specification (e.g., `feat: ...`, `fix: ...`, `perf: ...`, commits with `BREAKING CHANGE: ...`) are merged into the `main` branch, a GitHub Actions workflow automatically:

    1. Analyzes the commits since the last release
    2. Determines the next semantic version number (patch, minor, or major)
    3. Updates the `version` in `package.json` and `manifest.*.json` files
    4. Generates/updates the `CHANGELOG.md` file
    5. Commits these updated files
    6. Creates a Git tag for the new version (e.g., `v2.1.0`)
    7. Creates a GitHub Release with the generated changelog notes
- **Developers generally do not need to manually bump versions** using `npm version` for standard releases. The automation handles it based on commit messages.

## Changelog

Changes for each release are automatically documented in the [CHANGELOG.md](./CHANGELOG.md) file.