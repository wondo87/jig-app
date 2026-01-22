const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

function createIOSOptimizedIcon(size, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // 검정 배경 (Full Square)
    // iOS는 자동으로 모서리를 둥글게 처리하므로, 이미지는 정사각형으로 제공해야 합니다.
    // 투명 배경이 있으면 검정색으로 채워버리므로, 꽉 찬 사각형이 최적입니다.
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    // 흰색 DJ 텍스트
    ctx.fillStyle = '#FFFFFF';
    // 폰트 크기: 잘리지 않으면서 꽉 차게 (85% 정도가 안전하지만, 임팩트를 위해 85% 설정)
    ctx.font = `900 ${size * 0.85}px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Arial Black', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 텍스트 중앙 정렬 (약간의 시각적 보정)
    ctx.fillText('DJ', size / 2, size / 2 + size * 0.02);

    const buffer = canvas.toBuffer('image/png');
    const filepath = path.join(iconsDir, filename);
    fs.writeFileSync(filepath, buffer);
    console.log(`✓ Created: ${filename} (${size}x${size}) - Square optimized for iOS`);
}

console.log('Creating iOS optimized DJ icons...\n');

// Apple Touch Icons (iOS uses these)
createIOSOptimizedIcon(180, 'apple-touch-icon.png'); // Default name often used
createIOSOptimizedIcon(180, 'apple-touch-icon-180.png');
createIOSOptimizedIcon(120, 'apple-touch-icon-120.png');
createIOSOptimizedIcon(152, 'apple-touch-icon-152.png');
createIOSOptimizedIcon(167, 'apple-touch-icon-167.png');

// Favicons
createIOSOptimizedIcon(16, 'favicon-16x16.png');
createIOSOptimizedIcon(32, 'favicon-32x32.png');
createIOSOptimizedIcon(48, 'favicon.ico'); // Saving as png but usually ico is needed, browsers support png favicons now.
// For true ico support I'd need a different lib, but 32x32 png as favicon is standard now.

// Android / PWA
createIOSOptimizedIcon(192, 'icon-192.png');
createIOSOptimizedIcon(512, 'icon-512.png');
createIOSOptimizedIcon(1024, 'dj_icon_master.png');

console.log('\n✅ iOS(아이폰) 최적화 아이콘(정사각형 검정 배경) 및 파비콘 생성 완료!');
