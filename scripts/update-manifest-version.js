const fs = require('fs-extra');
const path = require('path');

const newVersion = process.argv[2];
if (!newVersion) {
    console.error('❌ No version provided! Usage: node scripts/update-manifest-version.js <version>');
    process.exit(1);
}

const manifestFiles = [
    path.join(__dirname, '..', 'public', 'manifest.chrome.json'),
    path.join(__dirname, '..', 'public', 'manifest.firefox.json')
];

console.log(`🔧 Updating template manifests to version: ${newVersion}`);

async function updateManifests() {
    let success = true;
    for (const filePath of manifestFiles) {
        try {
            if (!await fs.pathExists(filePath)) {
                console.warn(`⚠️ Warning: Template manifest file not found, skipping: ${filePath}`);
                continue;
            }
            const manifest = await fs.readJson(filePath);
            manifest.version = newVersion;
            if (manifest.version_name) {
                manifest.version_name = newVersion;
            }
            await fs.writeJson(filePath, manifest, { spaces: 2 });
            console.log(`✅ Updated: ${path.relative(path.join(__dirname, '..'), filePath)}`);
        } catch (err) {
            console.error(`❌ Error updating ${path.relative(path.join(__dirname, '..'), filePath)}:`, err);
            success = false;
        }
    }
    if (!success) {
        process.exit(1);
    }
}

updateManifests();