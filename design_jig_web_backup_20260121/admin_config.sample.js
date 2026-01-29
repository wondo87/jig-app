// 디자인지그 통합 관리 시스템 설정 파일 (샘플)
// 주의: 실제 사용 시 이 파일을 admin_config.js로 복사하고 값을 수정하세요.
// admin_config.js는 .gitignore에 포함되어 있어 GitHub에 업로드되지 않습니다.

// 비밀번호 해시 생성 방법:
// 터미널에서: echo -n '비밀번호' | shasum -a 256
// 또는 https://emn178.github.io/online-tools/sha256.html 사용

const MAIN_ADMIN = {
    id: 'your_admin_id',           // 관리자 아이디
    passwordHash: 'SHA256_HASH',    // SHA-256 해시값 (원본 비밀번호 아님!)
    role: 'main',
    name: '메인관리자'
};

// 일반관리자 삭제/잠금해제 승인 비밀번호 (SHA-256 해시)
const DELETE_PASSWORD_HASH = 'SHA256_HASH';

// Google Apps Script Web App URL (고객 데이터 동기화용)
const GOOGLE_SHEET_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL';

// [중요] 고객관리 동기화 전용 URL (integrated_apps_script.js 배포 URL)
const CUSTOMER_SYNC_URL = 'YOUR_CUSTOMER_SYNC_URL';

// 초기 설정값
const DEFAULT_PROFIT_RATE = 15; // 기본 이윤율 (%)
