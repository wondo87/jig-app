const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// icons 폴더 생성
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

function createIcon(size, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // 검정 배경 (라운드 사각형)
    const cornerRadius = size * 0.1; // 10% 라운드
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, cornerRadius);
    ctx.fill();

    // 흰색 DJ 텍스트
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${size * 0.45}px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DJ', size / 2, size / 2);

    // 파일 저장
    const buffer = canvas.toBuffer('image/png');
    const filepath = path.join(iconsDir, filename);
    fs.writeFileSync(filepath, buffer);
    console.log(`✓ Created: ${filename} (${size}x${size})`);
}

// 아이콘 생성
console.log('Creating icons...\n');

createIcon(120, 'apple-touch-icon-120.png');
createIcon(152, 'apple-touch-icon-152.png');
createIcon(167, 'apple-touch-icon-167.png');
createIcon(180, 'apple-touch-icon-180.png');
createIcon(192, 'icon-192.png');
createIcon(512, 'icon-512.png');

console.log('\n✅ All icons created successfully in /icons folder!');
