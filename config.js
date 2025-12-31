// ============================================
// 디자인지그 외부 서비스 연동 설정
// ============================================

const CONFIG = {
    // ----------------------------------------
    // 1. Cloudinary 설정 (이미지 저장)
    // https://cloudinary.com 가입 후 Dashboard에서 확인
    // ----------------------------------------
    CLOUDINARY: {
        CLOUD_NAME: 'designjig',
    },

    // ----------------------------------------
    // 2. Notion 설정 (포트폴리오)
    // ※ API Secret은 netlify/functions/notion-portfolio.js에 설정됨
    // ----------------------------------------
    NOTION: {
        PORTFOLIO_DB_ID: '2d016b5df7b380d2a974c5f07b6ebf82',
        // 칼럼용 데이터베이스 ID
        COLUMNS_DB_ID: '2d116b5df7b380dcb0ebc5e97f6f9332',
    },

    // ----------------------------------------
    // 3. Google Sheets 설정 (고객/견적 관리)
    // https://console.cloud.google.com 에서 API 키 생성
    // ----------------------------------------
    GOOGLE_SHEETS: {
        API_KEY: 'YOUR_GOOGLE_API_KEY',
        SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',
        SHEETS: {
            CUSTOMERS: '고객관리',
            ESTIMATES: '견적서',
            CONTRACTS: '계약서'
        }
    }
};
