const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}
async function createIOSOptimizedIcon(size, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    try {
        // Source file path - Using the specific file requested by user
        const sourcePath = path.join(iconsDir, 'DESIGN_JIG_LOGO_원본_4096.png');

        if (!fs.existsSync(sourcePath)) {
            throw new Error(`Source image not found at: ${sourcePath}`);
        }

        const image = await loadImage(sourcePath);

        // Draw the image resized to fit the canvas (high quality scaling)
        ctx.quality = 'best';
        ctx.patternQuality = 'best';
        ctx.drawImage(image, 0, 0, size, size);

        const buffer = canvas.toBuffer('image/png');
        const filepath = path.join(iconsDir, filename);
        fs.writeFileSync(filepath, buffer);
        console.log(`✓ Created: ${filename} (${size}x${size}) - Converted from DESIGN_JIG_LOGO_원본_4096.png`);
    } catch (error) {
        console.error(`Error creating icon ${filename}:`, error);
        process.exit(1); // Fail hard if source missing
    }
}

console.log('Creating iOS optimized DJ icons from source image...\n');

(async () => {
    try {
        // Apple Touch Icons (iOS)
        await createIOSOptimizedIcon(180, 'apple-touch-icon.png');
        await createIOSOptimizedIcon(180, 'apple-touch-icon-180.png');
        await createIOSOptimizedIcon(120, 'apple-touch-icon-120.png');
        await createIOSOptimizedIcon(152, 'apple-touch-icon-152.png');
        await createIOSOptimizedIcon(167, 'apple-touch-icon-167.png');

        // Favicons
        await createIOSOptimizedIcon(16, 'favicon-16x16.png');
        await createIOSOptimizedIcon(32, 'favicon-32x32.png');
        await createIOSOptimizedIcon(48, 'favicon.ico');

        // PWA / Android
        await createIOSOptimizedIcon(192, 'icon-192.png');
        await createIOSOptimizedIcon(512, 'icon-512.png');
        await createIOSOptimizedIcon(1024, 'dj_icon_master.png');

        console.log('\n✅ All icons generated successfully from DESIGN_JIG_LOGO_원본_4096.png!');
    } catch (e) {
        console.error('Fatal Error:', e);
        process.exit(1);
    }
})();
createIOSOptimizedIcon(1024, 'dj_icon_master.png');

console.log('\n✅ iOS(아이폰) 최적화 아이콘(정사각형 검정 배경) 및 파비콘 생성 완료!');
