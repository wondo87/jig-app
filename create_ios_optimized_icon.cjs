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

    // 폰트 렌더링이 불안정하므로 Path(선)로 직접 그리기 방식 사용
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = size * 0.08; // 두꺼운 선 (8%)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const padding = size * 0.2; // 여백
    const contentWidth = size - (padding * 2);
    const contentHeight = size * 0.5; // 글자 높이
    const charWidth = contentWidth * 0.45; // 글자 폭

    const startY = (size - contentHeight) / 2;
    const startX = padding;

    // Draw 'D' (Bauhaus Style: Vertical bar + Right Semi-Circle)
    const letterWidth = charWidth;
    const strokeW = size * 0.12; // Thick geometric stroke
    ctx.lineWidth = strokeW;

    // Adjust start positions to account for stroke width
    const dX = startX + strokeW / 2;
    const dH = contentHeight;

    ctx.beginPath();
    // Vertical Bar
    ctx.moveTo(dX, startY);
    ctx.lineTo(dX, startY + dH);
    // Top Horizontal
    ctx.moveTo(dX, startY);
    ctx.lineTo(dX + letterWidth / 2, startY);
    // Bottom Horizontal
    ctx.moveTo(dX, startY + dH);
    ctx.lineTo(dX + letterWidth / 2, startY + dH);
    // Right Curve (Semi-circle connecting top and bottom horizontal ends)
    // Center of arc is at (dX + letterWidth/2, startY + dH/2)
    // Radius is dH/2
    ctx.moveTo(dX + letterWidth / 2, startY);
    ctx.arc(dX + letterWidth / 2, startY + dH / 2, dH / 2, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Draw 'J' (Bauhaus Style: Long vertical descending + Left Curve)
    const jX = startX + contentWidth - letterWidth / 2; // Align to right side

    ctx.beginPath();
    // Start from top
    ctx.moveTo(jX, startY);
    // Go down to where curve starts
    const curveRadius = letterWidth / 2;
    const straightHeight = dH - curveRadius;
    ctx.lineTo(jX, startY + straightHeight);
    // Curve to left
    // Center is (jX - curveRadius, startY + straightHeight)
    ctx.arc(jX - curveRadius, startY + straightHeight, curveRadius, 0, Math.PI / 2);
    ctx.stroke();

    console.log(`[${size}px] Drew DJ using vector paths (guaranteed visibility)`);

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
