// 디자인지그 통합 관리 시스템 설정 파일
// 주의: 이 파일은 관리자 계정 정보와 주요 설정값을 포함하고 있습니다.
// 시스템 로직 수정 시 이 파일은 건드리지 않도록 주의하세요.

const MAIN_ADMIN = {
    id: 'sweet00700',
    passwordHash: '671076167de6f4ed03c9f267f0c42620b10801dd3ee47c79e59090755ba43acc', // SHA-256 해시 (원본 비밀번호 노출 안됨)
    role: 'main',
    name: '메인관리자'
};

// 일반관리자 삭제/잠금해제 승인 비밀번호 (SHA-256 해시)
const DELETE_PASSWORD_HASH = '80409fb2145a39539cf9c876c11c903d341c6166edce59e0e852604566cbb848';

// Google Apps Script Web App URL (고객 데이터 동기화용)
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyfuz04nNSRGrUPClqnBpV0v74eep5iqBzKxJxAVxamw9dzBMB7qIuoMN25wPCcONf5JQ/exec';

// [중요] 고객관리 동기화 전용 URL (integrated_apps_script.js 배포 URL)
const CUSTOMER_SYNC_URL = 'https://script.google.com/macros/s/AKfycbyfuz04nNSRGrUPClqnBpV0v74eep5iqBzKxJxAVxamw9dzBMB7qIuoMN25wPCcONf5JQ/exec';

// 초기 설정값
const DEFAULT_PROFIT_RATE = 15; // 기본 이윤율 (%)
