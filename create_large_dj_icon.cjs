const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

function createLargeDJIcon(size, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // 검정 배경 (라운드 사각형)
    const cornerRadius = size * 0.225; // iOS 기본 라운드 (22.5%)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, cornerRadius);
    ctx.fill();

    // 흰색 DJ 텍스트 - 화면 가득 채우기
    ctx.fillStyle = '#FFFFFF';
    // 폰트 크기를 최대한 크게 (90%)
    ctx.font = `900 ${size * 0.90}px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Arial Black', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 텍스트를 약간 위로 (시각적 균형)
    ctx.fillText('DJ', size / 2, size / 2 + size * 0.02);

    const buffer = canvas.toBuffer('image/png');
    const filepath = path.join(iconsDir, filename);
    fs.writeFileSync(filepath, buffer);
    console.log(`✓ Created: ${filename} (${size}x${size}) - 화면 가득 채움`);
}

console.log('Creating large DJ icons...\n');

// 180x180이 가장 중요 (iPhone Retina)
createLargeDJIcon(180, 'apple-touch-icon-180.png');
createLargeDJIcon(120, 'apple-touch-icon-120.png');
createLargeDJIcon(152, 'apple-touch-icon-152.png');
createLargeDJIcon(167, 'apple-touch-icon-167.png');
createLargeDJIcon(192, 'icon-192.png');
createLargeDJIcon(512, 'icon-512.png');
createLargeDJIcon(1024, 'dj_icon_v4.png'); // 원본도 업데이트

console.log('\n✅ 화면 가득 채우는 DJ 아이콘 생성 완료!');
