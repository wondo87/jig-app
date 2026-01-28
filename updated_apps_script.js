/**
 * [통합형] 디자인지그 웹사이트 & 관리자 동기화 스크립트
 *
 * 1. 웹사이트 상담 문의 접수 및 이메일 발송
 * 2. 관리자 페이지(adminwonpro.html) 고객 데이터 동기화
 * 3. 트리거 기반 자동화 (상담 상태 변경 시 이동, A/S 만료 알림)
 *
 * 마지막 업데이트: 2026-01-21 (고객 상태 자동 갱신 기능 추가)
 */

// ==========================================
// [디버그용] DriveApp 권한 승인 함수 (실행 후 삭제 가능)
// 1. 이 함수를 선택하고 '실행' 버튼을 클릭하세요.
// 2. 권한 검토 팝업에서 승인을 완료하세요.
// ==========================================
function debugUseDriveApp() {
    console.log("Drive 권한 확인 중...");
    var files = DriveApp.getFiles();
    if (files.hasNext()) {
        console.log("Drive 접근 성공: " + files.next().getName());
    } else {
        console.log("Drive 접근 성공 (파일 없음)");
    }
}

// ==========================================
// 1. 설정 및 상수 정의
// ==========================================

// [상담용] 스프레드시트 ID (기존 상담 문의가 쌓이는 시트)
// 만약 이 스크립트가 '상담용 시트'에 바인딩되어 있다면 getActiveSpreadsheet()를 써도 되지만,
// 명시적으로 ID를 지정하는 것이 안전합니다.
const CONSULTING_SHEET_ID = '1Yp9UjY37PlBgXdyC2_acwfa8prxo7yD_VKAOcnIQQVw';

// [고객관리용] 스프레드시트 ID (관리자 페이지와 연동되는 시트)
// [수정] Make 연동 시트로 통합하기 위해 ID를 상담용과 동일하게 설정
const CUSTOMER_SHEET_ID = '1Yp9UjY37PlBgXdyC2_acwfa8prxo7yD_VKAOcnIQQVw';

// [원가관리표용] 스프레드시트 ID (통합 시트에 추가됨)
// [원가관리표용] 스프레드시트 ID (통합 시트에 추가됨)
const COST_SHEET_ID = '1Yp9UjY37PlBgXdyC2_acwfa8prxo7yD_VKAOcnIQQVw';
const SETTLEMENT_SHEET_NAME = '정산관리대장';
const LOG_SHEET_NAME = '작업기록';

// [상담용] 설문 Form URL
const FORM_BASE_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdcsD1hjKMNezFTaPAZRlKovdRDfCW08cy4VfLHL_LJDcmbVw/viewform';

// [상담용] 설문 Entry IDs
const ENTRY_IDS = {
    NAME: '2076163714',
    PHONE: '217138793',
    EMAIL: '916215270',
    ADDRESS: '840428259',
    MESSAGE: '1360575573'
};

const SENDER_NAME = '디자인지그';
// [노션 연동 설정]
// 주의: API 키는 스크립트 속성(Project Settings > Script Properties)에 저장해야 안전합니다.
// 아래 setupNotionProperties() 함수를 한 번 실행하여 키를 저장하세요.
// 깃허브에 코드를 올려도 키는 노출되지 않습니다.

// [수정] 함수로 변경하여 매번 새로 읽도록 함 (캐싱 문제 해결)
function getNotionApiKey() {
    return PropertiesService.getScriptProperties().getProperty('NOTION_API_KEY');
}

const NOTION_DB_IDS = {
    PROJECTS: '22bc2a121ce94ff28e171cf91bcdf3a8',
    SCHEDULE: '6b993a15bb2643979ceb382460ed7e77',
    CHECKLIST: '6040d967e63e4268905739f2a8be436e',
    AS_LIST: '4f22eaa4dab246f2b32ab9dcbb37bd7a',
    FAQ: 'dd49a5148c7a41cf8244f8f97dd8e0eb' // [추가] 고객 안내·FAQ
};

// 커버 이미지 URL (브랜딩 통일)
// Cloudinary Transformation: 상단 로고만 크롭 (텍스트 제거)
const NOTION_COVER_IMAGE = 'https://res.cloudinary.com/designjig/image/upload/c_crop,g_north,h_300/v1769232218/sfugtbfiuyi8ehvtkzcs.png';

/**
 * [보안 설정] Notion API 키 안전 저장소
 * 1. 노션 개발자 센터에서 '시크릿 재발급'을 받으세요.
 * 2. 아래 변수 newKey에 '새로운 시크릿 키'를 붙여넣으세요.
 * 3. 이 함수를 선택하고 [실행] 버튼을 한 번만 누르세요.
 * 4. 실행 후에는 newKey 값을 지우고 저장소에 올리셔도 안전합니다.
 */
function setupNotionProperties() {
    const newKey = '여기에_새_키를_붙여넣으세요'; // 예: ntn_...

    PropertiesService.getScriptProperties().setProperty('NOTION_API_KEY', newKey);
    Logger.log('✅ 새로운 Notion API Key가 안전하게 저장되었습니다!');
    Logger.log('이제 코드를 깃허브에 올려도 키는 유출되지 않습니다.');
}

// [기본 데이터] 공사 스케줄 템플릿
const DEFAULT_SCHEDULE_TEMPLATE = [
    ['01. 기획·준비', '현장 실측 및 디자인 상담', '디자인 컨셉 확정 여부', '', '', '디자인팀', ''],
    ['01. 기획·준비', '도면 설계 및 견적 확정', '최종 도면/견적 승인', '', '', '디자인팀', ''],
    ['01. 기획·준비', '공사 안내문 부착 및 동의서', '관리사무소 신고 완료 여부', '', '', '현장관리자', ''],
    ['01. 기획·준비', '자재 선정 및 발주', '타일/도기/조명 등 주요 자재', '', '', '디자인팀', ''],
    ['02. 철거 공사', '전체 철거 및 폐기물 반출', '철거 범위 재확인', '', '', '철거팀', ''],
    ['02. 철거 공사', '설비 라인 마킹 및 확인', '급배수 위치 확인', '', '', '설비팀', ''],
    ['03. 설비/방수', '수도/배관 이설 및 신설', '누수 여부 확인 필수', '', '', '설비팀', ''],
    ['03. 설비/방수', '1차 방수 공사 (액체 방수)', '방수층 양생 상태 확인', '', '', '설비팀', ''],
    ['03. 설비/방수', '2차 방수 공사 (도막 방수)', '코너 부위 보강 확인', '', '', '설비팀', ''],
    ['04. 전기 공사', '배선 작업 및 스위치/콘센트 위치 타공', '도면과 위치 일치 여부', '', '', '전기팀', ''],
    ['05. 목공 공사', '천장/가벽 구조틀 작업', '수평/수직 레벨 확인', '', '', '목공팀', ''],
    ['05. 목공 공사', '도어/문틀 설치 및 몰딩 작업', '문 개폐 간섭 확인', '', '', '목공팀', ''],
    ['06. 타일/욕실', '벽/바닥 타일 시공', '줄눈 간격 및 평활도', '', '', '타일팀', ''],
    ['06. 타일/욕실', '위생도기 및 액세서리 세팅', '설치 견고성 확인', '', '', '도기팀', ''],
    ['07. 도장/필름', '퍼티 작업 및 샌딩', '표면 평활도 체크', '', '', '도장팀', ''],
    ['07. 도장/필름', '인테리어 필름 시공', '기포 및 들뜸 확인', '', '', '필름팀', ''],
    ['08. 도배/바닥', '도배 기초 및 정배', '이음매 상태 확인', '', '', '도배팀', ''],
    ['08. 도배/바닥', '바닥재(마루/장판) 시공', '걸레받이 마감 확인', '', '', '바닥팀', ''],
    ['09. 가구 공사', '주방/붙박이장 설치', '도어 라인 및 수평 확인', '', '', '가구팀', ''],
    ['10. 마감/준공', '조명/스위치/콘센트 설치', '점등 및 작동 테스트', '', '', '전기팀', ''],
    ['10. 마감/준공', '입주 청소 및 베이크아웃', '공사 분진 제거 상태', '', '', '청소팀', ''],
    ['10. 마감/준공', '최종 점검 및 인수인계', '고객 최종 승인', '', '', '현장관리자', '']
];

// [기본 데이터] 공사 스케줄 유의사항
const DEFAULT_SCHEDULE_GUIDELINES = [
    '공사 일정은 현장 상황 및 자재 수급 상황에 따라 변동될 수 있습니다.',
    '주말 및 공휴일은 소음 발생 공사가 불가능하므로 일정 협의가 필요합니다.',
    '우천 시 외부 창호 코킹 작업 등 일부 공정이 지연될 수 있습니다.',
    '추가 공사 요청 시 전체 일정이 연기될 수 있으니 사전에 협의 부탁드립니다.',
    '입주 예정일 최소 3일 전까지는 모든 공사를 완료하는 것을 목표로 합니다.'
];

// [기본 데이터] A/S 유의사항
const DEFAULT_AS_GUIDELINES = [
    '무상 A/S 기간은 공사 완료일로부터 1년입니다.',
    '사용자의 부주의나 과실로 인한 파손은 유상으로 처리됩니다.',
    '소모품(전구 등) 교체는 A/S 대상에서 제외됩니다.',
    '긴급한 누수나 전기 문제는 24시간 내 방문 점검을 원칙으로 합니다.',
    'A/S 접수 시 하자 부위의 사진을 함께 보내주시면 빠른 처리가 가능합니다.'
];

// ==========================================
// 2. Main Entry Points (doPost, doGet)
// ==========================================

/**
 * POST 요청 통합 처리기
 */
function doPost(e) {
    var lock = LockService.getScriptLock();
    // 최대 10초 대기 (동시성 제어)
    if (!lock.tryLock(10000)) {
        return ContentService.createTextOutput(JSON.stringify({ result: "error", error: "Server busy" }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    try {
        var contents = e.postData.contents;
        var payload;

        // JSON 파싱 (text/plain 대응)
        try {
            payload = JSON.parse(contents);
        } catch (error) {
            payload = e.parameter || {};
        }

        // --- [라우팅 로직] ---
        // 1. 원가관리표 업데이트 요청 (DISABLED: Master DB는 읽기 전용)
        if (payload.action === 'updateCost') {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: '마스터 데이터베이스(원가관리표)는 이 API를 통해 수정할 수 없습니다. 시트에서 직접 수정하세요.'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // 1.5. 샘플 견적서 처리
        if (payload.action === 'saveSampleEstimate') {
            return handleSaveSampleEstimate(payload);
        }
        if (payload.action === 'deleteSampleEstimate') {
            return handleDeleteSampleEstimate(payload);
        }
        if (payload.action === 'restoreCostDatabase') {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: '마스터 데이터베이스 복구 기능이 비활성화되었습니다.'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // 1.6 정산 관리 대장 저장
        if (payload.action === 'updateSettlement') {
            return handleSettlementUpdate(payload);
        }

        // 1.7 운영비 관리 대장 저장
        if (payload.action === 'updateExpenses') {
            return handleExpensesUpdate(payload);
        }

        // 1.8 작업 기록 저장
        if (payload.action === 'logUserAction') {
            return handleLogUserAction(payload);
        }

        // 1.9 공정별 체크리스트 마스터 저장 (ENABLED)
        if (payload.action === 'updateChecklistMaster' || payload.action === 'saveChecklistMaster') {
            return handleChecklistMasterUpdate(payload);
        }

        // 2. 노션 내보내기 요청 (반드시 CustomerSync보다 먼저 체크!)
        // exportToNotion 요청도 customerId를 포함하므로, 먼저 체크해야 함
        if (payload.action === 'exportToNotion') {
            return handleNotionExport(payload);
        }

        // 3. 관리자 데이터 동기화 요청인지 확인
        // 조건: action 필드가 있거나, 데이터 내에 customerId가 있음 (관리자 기능)
        var isAdminAction = (payload.action === 'admin' || payload.action === 'deleteAdmin');
        var isCustomerSync = (payload.data && payload.data.customerId) || (payload.customerId);

        if (isAdminAction || isCustomerSync) {
            // -> 고객관리 로직 실행
            return handleCustomerSync(payload);
        }

        // 4. 그 외에는 상담 문의 접수로 간주
        // -> 상담 접수 로직 실행
        return handleConsultingInquiry(payload);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            result: "error",
            error: err.toString(),
            stack: err.stack
        })).setMimeType(ContentService.MimeType.JSON);

    } finally {
        lock.releaseLock();
    }
}

/**
 * GET 요청 통합 처리기
 */
function doGet(e) {
    try {
        var sheetParam = e.parameter.sheet; // '관리자', '고객관리', '원가관리표' 등
        var actionParam = e.parameter.action; // 'getGuidelines' 등

        // 1. 원가관리표 데이터 요청
        if (sheetParam === '원가관리표') {
            return handleCostGet(e);
        }

        // 2. 고객관리/관리자 데이터 요청인 경우 (파라미터가 명시적인 경우)
        if (sheetParam === '관리자' || sheetParam === '고객관리' || sheetParam === '고객관리_견적서' || sheetParam === '계약완료고객' || sheetParam === '계약완료') {
            return handleCustomerGet(e);
        }

        // 2.1. A/S 관리 리스트 데이터 요청
        if (sheetParam === 'AS관리리스트' || sheetParam === 'as_list') {
            // [추가] 유의사항만 요청하는 경우
            if (actionParam === 'getGuidelines') {
                return handleGetASGuidelines(e);
            }
            return handleASListGet(e);
        }

        // 2.2. 공사 스케줄 템플릿 요청 [수정: 띄어쓰기 있는 버전 추가]
        if (sheetParam === 'schedule_template' || sheetParam === '공사스케줄관리' || sheetParam === '공사 스케줄 관리' || sheetParam === '공사_스케줄') {
            // [추가] 유의사항만 요청하는 경우
            if (actionParam === 'getGuidelines') {
                return handleGetScheduleGuidelines(e);
            }
            return handleScheduleTemplateGet(e);
        }

        // [추가] 공정별 체크리스트 요청
        if (sheetParam === '공정별체크리스트' || sheetParam === '공정별_체크리스트' || sheetParam === '공정별 체크리스트' || sheetParam === 'checklist') {
            return handleChecklistGet(e);
        }

        // [추가] 모바일 최적화: 마스터 + 특정 고객 체크리스트 번들 로드
        if (actionParam === 'loadChecklistBundle') {
            return handleChecklistBundleGet(e);
        }



        // [추가] 정산 관리 대장 옵션 마스터 조회
        if (sheetParam === 'settlement' && actionParam === 'getSettlementOptions') {
            return handleGetSettlementOptions(e);
        }

        // [추가] 정산 관리 대장 조회
        if (sheetParam === 'settlement' || sheetParam === '정산관리대장') {
            return handleSettlementGet(e);
        }

        // [추가] 운영비 관리 대장 조회
        if (sheetParam === 'expenses' || sheetParam === '운영비관리') {
            return handleExpensesGet(e);
        }

        // [추가] 작업 기록 조회
        if (sheetParam === 'action_log' || actionParam === 'getLogs') {
            return handleGetActionLogs(e);
        }

        // 2.5. 샘플 견적서 조회
        if (actionParam === 'getSampleEstimates') {
            return handleGetSampleEstimates();
        }
        if (actionParam === 'getSampleEstimate') {
            return handleGetSampleEstimate(e.parameter.id);
        }


        // 2.6. Excel 내보내기 (읽기 전용)
        if (actionParam === 'exportExcel') {
            return handleExcelExport(e);
        }

        // 3. 그 외(기본값)는 상담 목록 조회로 간주 (기존 웹사이트 호환)
        return handleConsultingGet(e);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * [추가] 스케줄 유의사항만 반환
 */
function handleGetScheduleGuidelines(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName('공사 스케줄 관리');

        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: '공사 스케줄 관리 시트를 찾을 수 없습니다.'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // [수정] 데이터가 없으면 기본값으로 초기화
        if (sheet.getLastRow() < 2) {
            // AS 유의사항 초기화 (헤더 및 데이터)
            // 간단하게 유의사항 리스트만 반환
            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                guidelines: DEFAULT_SCHEDULE_GUIDELINES
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
        var guidelines = [];

        data.forEach(function (row) {
            // '공사 진행 안내 및 유의사항' 또는 '공사 진행 안내사항' 행 찾기
            if (row[0] && (row[0].toString().indexOf('공사 진행') !== -1 || row[0].toString().indexOf('유의사항') !== -1)) {
                var text = row[1]; // B열에 내용이 있다고 가정
                if (text) guidelines.push(text);
            }
        });

        // 추출된 유의사항이 없으면 기본값 사용
        if (guidelines.length === 0) guidelines = DEFAULT_SCHEDULE_GUIDELINES;

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            guidelines: guidelines
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * [추가] A/S 유의사항만 반환
 */
function handleGetASGuidelines(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName('AS 관리 리스트');
        if (!sheet) {
            sheet = spreadsheet.getSheetByName('AS관리리스트');
        }
        if (!sheet) {
            sheet = spreadsheet.getSheetByName('as_list');
        }

        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: 'AS 관리 리스트 시트를 찾을 수 없습니다.'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                guidelines: []
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getDataRange().getValues();
        var guidelines = [];

        for (var i = 1; i < data.length; i++) {
            var row = data[i];
            // 'A/S' 또는 '유의사항' 또는 '안내' 키워드가 있는 행 찾기
            if (row[0] && (row[0].toString().indexOf('A/S') !== -1 || row[0].toString().indexOf('유의사항') !== -1 || row[0].toString().indexOf('안내') !== -1)) {
                var text = row[1]; // B열에 내용이 있다고 가정
                if (text) guidelines.push(text);
            }
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            guidelines: guidelines
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleScheduleTemplateGet(e) {
    var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
    var sheet = spreadsheet.getSheetByName('공사 스케줄 관리');

    // 시트가 없으면 생성하고 헤더 설정
    if (!sheet) {
        sheet = spreadsheet.insertSheet('공사 스케줄 관리');
        var headers = ['카테고리', '세부 공정명', '핵심 체크포인트', '시작일', '종료일', '담당자', '비고'];
        sheet.appendRow(headers);
        var headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setBackground('#6d9eeb');
        headerRange.setFontColor('#ffffff');
        headerRange.setFontWeight('bold');
        sheet.setFrozenRows(1);
    }

    var lastRow = sheet.getLastRow();

    // [New] 데이터 없으면 기본 템플릿으로 초기화
    if (lastRow < 2) {
        if (DEFAULT_SCHEDULE_TEMPLATE.length > 0) {
            sheet.getRange(2, 1, DEFAULT_SCHEDULE_TEMPLATE.length, DEFAULT_SCHEDULE_TEMPLATE[0].length)
                .setValues(DEFAULT_SCHEDULE_TEMPLATE);
        }
        // 초기화 후 다시 데이터 로드
        lastRow = sheet.getLastRow();
    }

    if (lastRow < 2) {
        return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
    var steps = [];
    var notices = [];

    data.forEach(function (row) {
        if (row[0] === '공사 진행 안내사항' || row[0] === '공사 진행 안내 및 유의사항') {
            // This is a notice row. The content is likely in Column B or spanned.
            var text = row[1];
            if (text) notices.push(text);
        } else {
            // Normal schedule step
            steps.push({
                category: row[0] || '',
                name: row[1] || '',
                checkPoint: row[2] || '',
                start: row[3] instanceof Date ? Utilities.formatDate(row[3], Session.getScriptTimeZone(), 'yyyy-MM-dd') : (row[3] || ''),
                end: row[4] instanceof Date ? Utilities.formatDate(row[4], Session.getScriptTimeZone(), 'yyyy-MM-dd') : (row[4] || ''),
                inCharge: row[5] || '',
                memo: row[6] || ''
            });
        }
    });

    return ContentService.createTextOutput(JSON.stringify({
        steps: steps,
        notices: notices
    })).setMimeType(ContentService.MimeType.JSON);
}


// ==========================================
/**
 * Design Jig Web - Integrated Apps Script
 * Last Updated: 2026-01-28 15:50 (KST)
 */
// ==========================================

function handleNotionExport(payload) {
    try {
        const type = payload.type;
        const customerId = payload.customerId;
        const data = typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data;

        let result;

        if (type === 'customer') {
            result = exportCustomerToNotion(customerId, data);
        } else if (type === 'schedule') {
            result = exportScheduleToNotion(customerId, data);
        } else if (type === 'checklist') {
            result = exportChecklistToNotion(customerId, data);
        } else if (type === 'asList') {
            result = exportASListToNotion(customerId, data);
        } else if (type === 'all') {
            // [통합 내보내기] 상세 결과 추적
            const details = {
                customer: { success: false, message: '실패' },
                schedule: { success: false, message: '데이터 없음' },
                checklist: { success: false, message: '데이터 없음' },
                asList: { success: false, message: '데이터 없음' }
            };

            // 1. 고객 정보 (필수)
            const customerData = data.customer || data;
            try {
                result = exportCustomerToNotion(customerId, customerData);
                details.customer = { success: true, message: '성공' };
            } catch (e) {
                console.error('고객 정보 내보내기 실패:', e);
                details.customer = { success: false, message: e.toString() };
                // 고객 정보 생성 실패 시에도 나머지 진행 시도 (단, pageId 의존성이 있다면 실패할 수 있음)
            }

            // 2. 스케줄
            if (data.schedule) {
                Utilities.sleep(300); // 딜레이 단축
                try {
                    exportScheduleToNotion(customerId, data.schedule);
                    details.schedule = { success: true, message: '성공' };
                } catch (e) {
                    console.error('스케줄 내보내기 실패:', e);
                    details.schedule = { success: false, message: e.toString() };
                }
            }

            // 3. 체크리스트
            if (data.checklist) {
                Utilities.sleep(300);
                try {
                    exportChecklistToNotion(customerId, data.checklist);
                    details.checklist = { success: true, message: '성공' };
                } catch (e) {
                    console.error('체크리스트 내보내기 실패:', e);
                    details.checklist = { success: false, message: e.toString() };
                }
            }

            // 4. A/S 리스트
            if (data.asList) {
                Utilities.sleep(300);
                try {
                    exportASListToNotion(customerId, data.asList);
                    details.asList = { success: true, message: '성공' };
                } catch (e) {
                    console.error('A/S 리스트 내보내기 실패:', e);
                    details.asList = { success: false, message: e.toString() };
                }
            }

            // 최종 응답에 details 포함
            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                notionUrl: result ? result.url : null,
                details: details,
                message: '통합 내보내기 완료'
            })).setMimeType(ContentService.MimeType.JSON);

        } else {
            throw new Error('지원하지 않는 내보내기 유형입니다: ' + type);
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            notionUrl: result ? result.url : null,
            message: '성공적으로 내보냈습니다.'
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: e.toString(),
            stack: e.stack
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

// Notion API 호출 헬퍼
function callNotionAPI(endpoint, method, payload) {
    const url = 'https://api.notion.com/v1' + endpoint;
    const options = {
        method: method,
        headers: {
            'Authorization': 'Bearer ' + getNotionApiKey(),
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
        },
        payload: payload ? JSON.stringify(payload) : null,
        muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode >= 400) {
        throw new Error('Notion API Error (' + responseCode + '): ' + responseBody);
    }

    return JSON.parse(responseBody);
}

// 1. Notion Page ID 찾기 (공통 헬퍼)
function findCustomerPageId(customerId) {
    const dbId = NOTION_DB_IDS.PROJECTS;
    try {
        const response = callNotionAPI('/databases/' + dbId + '/query', 'POST', {
            filter: {
                property: '고객ID',
                rich_text: { equals: customerId }
            }
        });
        if (response.results && response.results.length > 0) {
            return response.results[0].id;
        }
        return null; // 없음
    } catch (e) {
        console.error('findCustomerPageId Error: ' + e.toString());
        return null;
    }
}

// 1. 고객 정보 내보내기
function exportCustomerToNotion(customerId, data) {
    // 디버깅 로그
    console.log('📤 Notion Export - Customer ID:', customerId);
    console.log('📤 Notion Export - Data:', JSON.stringify(data));

    if (!customerId) throw new Error('Customer ID is missing');

    // PropertiesService에서 API Key 확인
    const apiKey = getNotionApiKey();
    if (!apiKey) throw new Error('Notion API Key가 설정되지 않았습니다.');

    // DB ID 확인
    const dbId = NOTION_DB_IDS.PROJECTS;
    if (!dbId) throw new Error('Notion Project Database ID not configured.');

    // 1. 기존 페이지 검색
    let pageId = findCustomerPageId(customerId);
    let notionUrl;

    // 2. 속성 매핑
    const totalAmount = data['총 계약금액'] ? Number(String(data['총 계약금액']).replace(/[^0-9]/g, '')) : 0;
    const area = data['평수'] ? Number(String(data['평수']).replace(/[^0-9.]/g, '')) : 0;

    // 현장명 생성 규칙 변경 (2026-01-27)
    const clientName = (data['성명'] || '').trim();
    const spouseName = (data['배우자 성명'] || '').trim();
    let siteTitle = '';

    // [수정] 현장명은 심플하게, 상세 내용은 본문으로 이동 (중복 방지)
    siteTitle = '공사 안내문';
    const customerGreeting = spouseName ? `${clientName}·${spouseName} 고객님` : `${clientName} 고객님`;

    const properties = {
        '현장명': { title: [{ text: { content: siteTitle } }] },
        '성명': { rich_text: [{ text: { content: data['성명'] || '' } }] },
        '이메일': { email: data['이메일'] || null },
        '주소': { rich_text: [{ text: { content: data['주소'] || '' } }] },
        '현장주소': { rich_text: [{ text: { content: data['현장주소'] || '' } }] },
        '배우자 성명': { rich_text: [{ text: { content: data['배우자 성명'] || '' } }] },
        '공사 담당자': { rich_text: [{ text: { content: data['공사 담당자'] || '' } }] },
        '건물유형': { rich_text: [{ text: { content: data['건물유형'] || '' } }] },
        '유입경로': { rich_text: [{ text: { content: data['유입경로'] || '' } }] },
        '고객 요청사항': { rich_text: [{ text: { content: data['고객 요청사항'] || '' } }] },
        '내부 메모': { rich_text: [{ text: { content: data['내부 메모'] || '' } }] },
        '특약사항': { rich_text: [{ text: { content: data['특약사항'] || '' } }] },
        // '공사 유의사항': { rich_text: [{ text: { content: data['공사 유의사항'] || '' } }] }, // 노션에 컬럼 없음
        // 'A/S 유의사항': { rich_text: [{ text: { content: data['A/S 유의사항'] || '' } }] }, // 노션에 컬럼 없음
        '고객ID': { rich_text: [{ text: { content: customerId || '' } }] },
        '총 계약금액 (VAT 포함)': { number: totalAmount },
        '평수': { number: area }
    };

    // 연락처 (값이 있을 때만 포함)
    if (data['연락처']) {
        properties['연락처'] = { phone_number: data['연락처'] };
    }
    // 배우자 연락처 (값이 있을 때만 포함)
    if (data['배우자 연락처']) {
        properties['배우자 연락처'] = { phone_number: data['배우자 연락처'] };
    }

    // 날짜 필드 (공백일 경우 제외) - 'A/S 기간' 포함
    ['이사날짜', '계약일', '착공일', '준공일', '잔금일', 'A/S 기간'].forEach(field => {
        if (data[field] && data[field].match(/^\d{4}-\d{2}-\d{2}/)) {
            properties[field] = { date: { start: data[field] } };
        }
    });

    if (pageId) {
        // [업데이트]
        const response = callNotionAPI('/pages/' + pageId, 'PATCH', { properties: properties });
        notionUrl = response.url;
    } else {
        // [생성] - 커버 이미지 및 아이콘 포함
        const response = callNotionAPI('/pages', 'POST', {
            parent: { database_id: dbId },
            properties: properties,
            icon: {
                type: 'external',
                external: {
                    url: 'https://res.cloudinary.com/designjig/image/upload/v1769224042/cqnem8lysrkpusbdi1rb.png'
                }
            },
            cover: {
                type: 'external',
                external: {
                    url: 'https://res.cloudinary.com/designjig/image/upload/v1769232218/sfugtbfiuyi8ehvtkzcs.png'
                }
            }
        });
        pageId = response.id;
        notionUrl = response.url;
    }

    // [추가] 페이지 본문에 콘텐츠 추가
    const pageBlocks = [];

    // 0. 최상단 브랜딩 블록 (SNS 공유 시 Description으로 사용됨)
    pageBlocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
            rich_text: [{
                type: 'text',
                text: { content: `${customerGreeting}을 위한 공사 안내\n공사 스케줄·공정별 체크리스트·자재목록(A/S)정보·FAQ` }
            }]
        }
    });

    pageBlocks.push({
        object: 'block',
        type: 'divider',
        divider: {}
    });

    // 1. 📅 공사 스케줄 섹션
    if (NOTION_DB_IDS.SCHEDULE) {
        pageBlocks.push({
            object: 'block',
            type: 'heading_2',
            heading_2: {
                rich_text: [{ type: 'text', text: { content: '📅 공사 스케줄' } }]
            }
        });

        // 공사 유의사항 삭제됨 (사용자 요청)
        /*
        if (data['공사 유의사항'] && data['공사 유의사항'].trim()) {
            pageBlocks.push({
                object: 'block',
                type: 'callout',
                callout: {
                    rich_text: [{ type: 'text', text: { content: '공사 진행 안내 및 유의사항' } }],
                    color: 'yellow_background'
                }
            });

            const constructionItems = data['공사 유의사항'].split('\n').filter(item => item.trim());
            constructionItems.forEach(item => {
                pageBlocks.push({
                    object: 'block',
                    type: 'bulleted_list_item',
                    bulleted_list_item: {
                        rich_text: [{ type: 'text', text: { content: item.trim() } }]
                    }
                });
            });
        }
        */

        pageBlocks.push({
            object: 'block',
            type: 'link_to_page',
            link_to_page: {
                type: 'database_id',
                database_id: NOTION_DB_IDS.SCHEDULE
            }
        });
    }

    // 2. ✅ 공정별 체크리스트 섹션
    if (NOTION_DB_IDS.CHECKLIST) {
        pageBlocks.push({
            object: 'block',
            type: 'heading_2',
            heading_2: {
                rich_text: [{ type: 'text', text: { content: '✅ 공정별 체크리스트' } }]
            }
        });
        pageBlocks.push({
            object: 'block',
            type: 'link_to_page',
            link_to_page: {
                type: 'database_id',
                database_id: NOTION_DB_IDS.CHECKLIST
            }
        });
    }

    // 3. 🔧 A/S 관리 리스트 섹션
    if (NOTION_DB_IDS.AS_LIST) {
        pageBlocks.push({
            object: 'block',
            type: 'heading_2',
            heading_2: {
                rich_text: [{ type: 'text', text: { content: ' A/S 관리 리스트' } }]
            }
        });

        // A/S 유의사항 (A/S 리스트 상단에 배치)
        if (data['A/S 유의사항'] && data['A/S 유의사항'].trim()) {
            pageBlocks.push({
                object: 'block',
                type: 'callout',
                callout: {
                    rich_text: [{ type: 'text', text: { content: 'A/S(사후관리) 안내 및 유의사항' } }],
                    color: 'blue_background'
                }
            });

            const asItems = data['A/S 유의사항'].split('\n').filter(item => item.trim());
            asItems.forEach(item => {
                pageBlocks.push({
                    object: 'block',
                    type: 'bulleted_list_item',
                    bulleted_list_item: {
                        rich_text: [{ type: 'text', text: { content: item.trim() } }]
                    }
                });
            });
        }

        pageBlocks.push({
            object: 'block',
            type: 'link_to_page',
            link_to_page: {
                type: 'database_id',
                database_id: NOTION_DB_IDS.AS_LIST
            }
        });
    }

    // 4. 📚 고객 안내·FAQ 섹션
    if (NOTION_DB_IDS.FAQ) {
        pageBlocks.push({
            object: 'block',
            type: 'heading_2',
            heading_2: {
                rich_text: [{ type: 'text', text: { content: ' 고객 안내·FAQ' } }]
            }
        });
        pageBlocks.push({
            object: 'block',
            type: 'link_to_page',
            link_to_page: {
                type: 'database_id',
                database_id: NOTION_DB_IDS.FAQ
            }
        });
    }

    // 5. 구분선 추가
    pageBlocks.push({
        object: 'block',
        type: 'divider',
        divider: {}
    });

    // 페이지 본문에 블록 추가
    if (pageBlocks.length > 0) {
        try {
            callNotionAPI('/blocks/' + pageId + '/children', 'PATCH', {
                children: pageBlocks
            });
        } catch (e) {
            console.warn('페이지 본문 추가 실패:', e.toString());
        }
    }

    // 만약 Schedule/Checklist 데이터가 같이 넘어왔다면 연결 처리 (선택사항)
    if (data.scheduleRows && data.scheduleRows.length > 0) {
        exportScheduleToNotion(customerId, data);
    }
    if (data.checklist && data.checklist.length > 0) {
        exportChecklistToNotion(customerId, data);
    }

    return { url: notionUrl, pageId: pageId };
}

// 3. 스케줄 내보내기 (관계형 DB 연결 + 고객ID)
function exportScheduleToNotion(customerId, data) {
    const pageId = findCustomerPageId(customerId);
    if (!pageId) throw new Error('고객 페이지를 찾을 수 없습니다. 먼저 고객 정보를 내보내주세요.');

    const dbId = NOTION_DB_IDS.SCHEDULE;
    if (!dbId) throw new Error('Notion Schedule Database ID not configured.');

    // 1. 기존 해당 프로젝트의 스케줄 항목 삭제 (고객ID 기준)
    deleteExistingRelatedPages(dbId, customerId, pageId);

    const scheduleRows = data.scheduleRows || data.공정목록 || [];
    let count = 0;

    scheduleRows.forEach((row, index) => {
        const process = row.process || row.공정 || row.공정명 || '공정';
        const start = row.startDate || row.시작일 || '';
        const end = row.endDate || row.종료일 || '';
        const manager = row.manager || row.담당자 || '';
        const memo = row.memo || row.비고 || '';

        const props = {
            '공정명': { title: [{ text: { content: process } }] },
            '담당자': { rich_text: [{ text: { content: manager } }] },
            '비고': { rich_text: [{ text: { content: memo } }] },
            '고객ID': { rich_text: [{ text: { content: customerId } }] },
            'NO': { number: index + 1 }, // [추가] NO 속성
            '고객정보': { relation: [{ id: pageId }] } // [수정] 컬럼명 '프로젝트' -> '고객정보'
        };

        if (start) {
            // 종료일이 없거나 시작일과 같으면 start만, 다르면 end 포함 (단, 노션은 end가 start보다 커야 함)
            const dateObj = { start: start };
            if (end && end !== start) {
                dateObj.end = end;
            }
            props['시작-종료'] = { date: dateObj }; // [수정] 스크린샷 기준 '시작-종료'로 변경
        }

        callNotionAPI('/pages', 'POST', {
            parent: { database_id: dbId },
            properties: props
        });
        count++;
    });

    // [삭제] 고객 페이지에 공사 진행 안내 및 유의사항 콜아웃 추가 (사용자 요청)
    /*
    try {
        const guidelines = data.guidelines || data.유의사항 || [];
        if (guidelines.length > 0) {
            const calloutContent = guidelines.map(g => ({
                type: 'paragraph',
                paragraph: {
                    rich_text: [{ type: 'text', text: { content: '• ' + g } }]
                }
            }));

            callNotionAPI('/blocks/' + pageId + '/children', 'PATCH', {
                children: [
                    {
                        type: 'callout',
                        callout: {
                            color: 'yellow_background',
                            rich_text: [{ type: 'text', text: { content: '공사 진행 안내 및 유의사항' } }],
                            children: calloutContent
                        }
                    }
                ]
            });
        }
    } catch (e) {
        console.warn('유의사항 콜아웃 추가 실패:', e.toString());
    }
    */

    return { url: '', count: count };
}

// 4. 체크리스트 내보내기 (관계형 DB 연결 + 고객ID)
function exportChecklistToNotion(customerId, data) {
    const pageId = findCustomerPageId(customerId);
    if (!pageId) throw new Error('고객 페이지를 찾을 수 없습니다. 먼저 고객 정보를 내보내주세요.');

    const dbId = NOTION_DB_IDS.CHECKLIST;
    if (!dbId) throw new Error('Notion Checklist Database ID not configured.');

    // 1. 기존 항목 삭제 (고객정보 Relation 기준)
    deleteExistingRelatedPages(dbId, customerId, pageId);

    // [수정] 체크리스트 순서
    const checklist = (data.checklist || data.체크리스트 || []).slice().reverse();
    let count = 0;

    checklist.forEach(item => {
        const title = item.항목 || item.content || '체크리스트 항목';
        const category = item.카테고리 || item.category || item.분류 || '기타';
        const detail = item.내용 || '';
        const stage = item.진행단계 || '';
        const note = item.비고 || '';
        const isChecked = item.isChecked === true;
        const no = parseInt(item.번호) || 0;

        // 노션 DB 속성에 맞춰 수정
        const props = {
            '항목': { title: [{ text: { content: title } }] },
            '카테고리': { rich_text: [{ text: { content: category } }] },
            '내용': { rich_text: [{ text: { content: detail } }] },
            '진행단계': { rich_text: [{ text: { content: stage } }] },
            '비고': { rich_text: [{ text: { content: note } }] },
            '완료': { checkbox: isChecked }, // [수정] 노션 속성명 '완료'
            'NO': { number: no },
            '고객정보': { relation: [{ id: pageId }] }
        };

        callNotionAPI('/pages', 'POST', {
            parent: { database_id: dbId },
            properties: props
        });
        count++;
    });

    return { url: '', count: count };
}

// [헬퍼] 관련 페이지 삭제 (고객정보 Relation 기준 필터링 및 전체 삭제)
function deleteExistingRelatedPages(dbId, customerId, pageId) {
    try {
        const filter = pageId ? {
            property: '고객정보',
            relation: { contains: pageId }
        } : {
            property: '고객ID', // fallback
            rich_text: { equals: customerId }
        };

        let hasMore = true;
        let startCursor = undefined;

        while (hasMore) {
            const payload = {
                filter: filter,
                page_size: 100
            };
            if (startCursor) {
                payload.start_cursor = startCursor;
            }

            const response = callNotionAPI('/databases/' + dbId + '/query', 'POST', payload);

            if (response.results && response.results.length > 0) {
                // 병렬 처리는 안되지만 순차적으로 삭제
                response.results.forEach(page => {
                    try {
                        callNotionAPI('/blocks/' + page.id, 'DELETE', {}); // 페이지 삭제(Archive)
                    } catch (delErr) {
                        console.warn('페이지 삭제 중 오류(무시함): ' + page.id, delErr);
                    }
                });
            }

            hasMore = response.has_more;
            startCursor = response.next_cursor;
        }
    } catch (e) {
        console.warn('기존 항목 삭제 실패 (DB 속성 확인 필요): ' + e.toString());
    }
}

// 5. A/S 관리 리스트 내보내기 (관계형 DB 연결 + 고객ID)
function exportASListToNotion(customerId, data) {
    const pageId = findCustomerPageId(customerId);
    if (!pageId) throw new Error('고객 페이지를 찾을 수 없습니다. 먼저 고객 정보를 내보내주세요.');

    const dbId = NOTION_DB_IDS.AS_LIST;
    if (!dbId) throw new Error('Notion A/S List Database ID not configured.');

    // 1) 고객 정보 페이지 속성 업데이트 (잔금일, 보증기간 등)
    // 상단 A/S 정보 테이블의 데이터가 변경되었을 수 있으므로 업데이트
    const customerProps = {};
    if (data.balanceDate) {
        customerProps['잔금일'] = { date: { start: data.balanceDate } };
    }
    if (data.leakWarranty) {
        // 화장실 누수 보증 기간을 텍스트나 날짜로 저장
        customerProps['화장실 누수 보증 기간'] = { rich_text: [{ text: { content: data.leakWarranty } }] };
    }
    // A/S 기간 등도 필요하다면 업데이트

    if (Object.keys(customerProps).length > 0) {
        try {
            callNotionAPI('/pages/' + pageId, 'PATCH', { properties: customerProps });
        } catch (e) {
            console.warn('고객 페이지 속성 업데이트 실패(속성명 확인 필요): ' + e.toString());
        }
    }

    // 2) 기존 A/S 리스트 항목 삭제 (고객ID 기준)
    deleteExistingRelatedPages(dbId, customerId, pageId);

    // 3) 새로운 A/S 항목 추가
    const asList = data.items || [];
    let count = 0;

    // 날짜 포맷 변환 헬퍼 함수 (~27.01.08 -> 2027-01-08)
    function parseWarrantyDate(dateStr) {
        if (!dateStr) return null;
        try {
            // 숫자와 점(.)만 남기고 나머지 제거 (예: ~27.01.08 -> 27.01.08)
            const cleanStr = dateStr.replace(/[^0-9.]/g, "");
            const parts = cleanStr.split('.');
            if (parts.length === 3) {
                let year = parseInt(parts[0], 10);
                const month = parts[1];
                const day = parts[2];
                // 2자리 연도인 경우 2000년대 처리
                if (year < 100) year += 2000;
                return `${year}-${month}-${day}`;
            }
            // 이미 YYYY-MM-DD 형식이면 그대로 반환
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
            return null;
        } catch (e) {
            return null;
        }
    }

    asList.forEach((item, index) => {
        // A/S 항목 데이터 매핑 (노션 A/S 관리 리스트 DB 속성명에 맞춤)
        // [수정] 모든 텍스트형 속성을 명시적으로 문자열로 변환하여 API 오류 방지
        const category = String(item.category || item.카테고리 || '');
        const brand = String(item.brand || item.브랜드 || '');
        const detailItem = String(item.item || item.세부항목 || '');
        const modelNum = String(item.modelNum || item.품번 || '');
        const size = String(item.size || item.치수 || '');
        const serviceCenter = String(item.service || item.serviceCenter || item.서비스센터 || '');
        const warranty = String(item.warranty || item.보증기간 || '');
        const note = String(item.note || item.비고 || '');

        const formattedDate = parseWarrantyDate(warranty);

        const props = {
            '카테고리': { title: [{ text: { content: category } }] },
            '브랜드': { rich_text: [{ text: { content: brand } }] },
            '세부항목': { rich_text: [{ text: { content: detailItem } }] },
            '품번': { rich_text: [{ text: { content: modelNum } }] },
            '치수': { rich_text: [{ text: { content: size } }] },
            '서비스센터': { phone_number: serviceCenter || null },
            '보증기간': formattedDate ? { date: { start: formattedDate } } : undefined,
            '비고': { rich_text: [{ text: { content: note } }] },
            'NO': { number: index + 1 },
            '고객정보': { relation: [{ id: pageId }] }
        };

        // undefined 속성 제거
        Object.keys(props).forEach(key => props[key] === undefined && delete props[key]);

        callNotionAPI('/pages', 'POST', {
            parent: { database_id: dbId },
            properties: props
        });
        count++;
    });

    // [삭제] 고객 페이지에 A/S 유의사항 콜아웃 추가 (사용자 요청)
    /*
    try {
        const guidelines = data.guidelines || data.유의사항 || [];
        if (guidelines.length > 0) {
            const calloutContent = guidelines.map(g => ({
                type: 'paragraph',
                paragraph: {
                    rich_text: [{ type: 'text', text: { content: '• ' + g } }]
                }
            }));

            callNotionAPI('/blocks/' + pageId + '/children', 'PATCH', {
                children: [
                    {
                        type: 'callout',
                        callout: {
                            color: 'orange_background',
                            rich_text: [{ type: 'text', text: { content: 'A/S 안내 및 유의사항' } }],
                            children: calloutContent
                        }
                    }
                ]
            });
        }
    } catch (e) {
        console.warn('A/S 유의사항 콜아웃 추가 실패:', e.toString());
    }
    */

    return { url: '', count: count };
}


// [트리거] onEdit (단순 트리거)
// 주의: "설치형 트리거"로 processStatusChange를 별도 설정했으므로,
// 아래 단순 트리거가 활성화되면 코드가 중복 실행될 위험이 있습니다.
// 따라서 아래 코드는 주석 처리하거나 삭제하는 것이 안전합니다.
/*
function onEdit(e) {
    processStatusChange(e);
}
*/


// ==========================================
// 3. 상담 문의 처리 로직 (Consulting Logic)
// ==========================================

function handleConsultingInquiry(data) {
    // 상담용 시트 열기
    var spreadsheet = SpreadsheetApp.openById(CONSULTING_SHEET_ID);
    // 활성 시트 사용 (명시적으로 '상담관리_마스터' 지정)
    var sheet = spreadsheet.getSheetByName('상담관리_마스터');
    if (!sheet) {
        // 시트가 없으면 생성 (혹은 에러 처리)
        sheet = spreadsheet.insertSheet('상담관리_마스터');
    }

    if (sheet.getLastRow() === 0) {
        setupConsultingSheet(sheet);
    }

    var lastRow = sheet.getLastRow();
    var nextNum = 1;

    if (lastRow > 1) {
        var lastNum = sheet.getRange(lastRow, 1).getValue();
        if (typeof lastNum === 'number') {
            nextNum = lastNum + 1;
        } else {
            nextNum = lastRow;
        }
    }

    sheet.appendRow([
        nextNum,
        new Date(),
        data.name || '',
        data.phone || '',
        data.email || '',
        data.location || '',
        data.message || '',
        '상담문의접수',
        ''
    ]);

    // 이메일 발송
    if (data.email) {
        var emailSent = sendSurveyEmail(data);
        var newRowIndex = sheet.getLastRow();

        if (emailSent) {
            // 이메일 발송 성공 시 상태를 "설문발송"으로 변경 (8번째 열)
            sheet.getRange(newRowIndex, 8).setValue('설문발송');
        } else {
            sheet.getRange(newRowIndex, 8).setValue('발송실패');
        }
    }

    return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
}
function handleConsultingGet(e) {
    var spreadsheet = SpreadsheetApp.openById(CONSULTING_SHEET_ID);
    var sheet = spreadsheet.getSheetByName('상담관리_마스터');
    if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues();

    var rows = data.slice(1); // 헤더 제외

    var result = rows.map(function (row, index) {
        return {
            no: row[0] || index + 1,
            date: row[1] || '',
            name: row[2] || '',
            phone: row[3] || '',
            email: row[4] || '',
            location: row[5] || '',
            message: row[6] || '',
            status: row[7] || '신규문의',
            note: row[8] || ''
        };
    });

    result.reverse(); // 최신순

    return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
}

function sendSurveyEmail(data) {
    var customerName = data.name || '고객';

    var params = [
        'usp=pp_url',
        'entry.' + ENTRY_IDS.NAME + '=' + encodeURIComponent(customerName),
        'entry.' + ENTRY_IDS.PHONE + '=' + encodeURIComponent(data.phone || ''),
        'entry.' + ENTRY_IDS.EMAIL + '=' + encodeURIComponent(data.email || ''),
        'entry.' + ENTRY_IDS.ADDRESS + '=' + encodeURIComponent(data.location || ''),
        'entry.' + ENTRY_IDS.MESSAGE + '=' + encodeURIComponent(data.message || '')
    ];

    var finalSurveyUrl = FORM_BASE_URL + '?' + params.join('&');
    var subject = '[디자인지그] 맞춤 상담을 위해 사전 설문 작성을 부탁드립니다';

    var htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Noto Sans KR', -apple-system, sans-serif; line-height: 1.75; color: #333; letter-spacing: -0.02em; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px; line-height: 1.6; }
        a { color: #1a1a1a; text-decoration: none; border-bottom: 1px solid #1a1a1a; font-weight: bold; transition: opacity 0.2s; }
        a:hover { opacity: 0.7; }
    </style>
</head>
<body>
    <div class="container">
        <p><strong>DESIGN JIG</strong></p>
        <br>
        <p>안녕하세요, <strong>${customerName}</strong> 님.<br>
        디자인지그에 문의해 주셔서 감사합니다.</p>
        <br>
        <p>디자인지그는<br>
        공간을 단순히 꾸미는 것이 아니라,<br>
        그 공간에서 살아갈 분의 생활 방식과 기준을<br>
        먼저 이해하는 것에서 설계를 시작합니다.</p>
        <br>
        <p>보다 정확한 상담을 위해<br>
        간단한 사전 설문 작성을 부탁드립니다.<br>
        설문 내용을 바탕으로 공간의 방향과 우선순위를 정리한 후,<br>
        그에 맞는 상담을 진행해 드리겠습니다.</p>
        <br>
        <p>아래 링크를 통해 설문에 참여하실 수 있으며,<br>
        작성에 필요한 기본 정보는 미리 입력되어 있어<br>
        간단하게 작성하실 수 있습니다.</p>
        <br>
        <p>
            <a href="${finalSurveyUrl}">▶ 사전 설문 작성하기</a><br>
            (약 2~3분 소요)
        </p>
        <br>
        <p>설문 작성 후 확인되는 대로<br>
        순차적으로 연락드리겠습니다.</p>
        <br>
        <p>감사합니다.</p>
        <br>
        <p>디자인지그 드림</p>

        <div class="footer">
            <strong style="color: #1a1a1a; font-size: 13px;">DESIGN JIG</strong><br>
            기본이 탄탄해야 아름다움도 오래갑니다.<br>
            designjig.com
        </div>
    </div>
</body>
</html>
    `;

    var plainTextBody = `
DESIGN JIG

안녕하세요, ${customerName} 님.
디자인지그에 문의해 주셔서 감사합니다.

디자인지그는
공간을 단순히 꾸미는 것이 아니라,
그 공간에서 살아갈 분의 생활 방식과 기준을
먼저 이해하는 것에서 설계를 시작합니다.

보다 정확한 상담을 위해
간단한 사전 설문 작성을 부탁드립니다.
설문 내용을 바탕으로 공간의 방향과 우선순위를 정리한 후,
그에 맞는 상담을 진행해 드리겠습니다.

아래 링크를 통해 설문에 참여하실 수 있으며,
작성에 필요한 기본 정보는 미리 입력되어 있어
간단하게 작성하실 수 있습니다.

▶ 사전 설문 작성하기
${finalSurveyUrl}
(약 2~3분 소요)

설문 작성 후 확인되는 대로
순차적으로 연락드리겠습니다.

감사합니다.

디자인지그 드림

────────────────
DESIGN JIG
기본이 탄탄해야 아름다움도 오래갑니다.
designjig.com
    `;

    try {
        // 1차 시도: 지정된 Sender Email(Alias)로 발송 시도
        GmailApp.sendEmail(data.email, subject, plainTextBody, {
            htmlBody: htmlBody,
            name: SENDER_NAME,
            from: SENDER_EMAIL
        });
        console.log('이메일 발송 성공 (Alias 사용): ' + data.email);
        return true;
    } catch (error) {
        // 실패 시 로그 출력 후 기본 계정으로 재시도
        console.warn('Alias 발송 실패, 기본 계정으로 재시도합니다: ' + error.toString());
        try {
            GmailApp.sendEmail(data.email, subject, plainTextBody, {
                htmlBody: htmlBody,
                name: SENDER_NAME
                // from 옵션 제거 (현재 실행 중인 계정의 기본 주소 사용)
            });
            console.log('이메일 발송 성공 (기본 계정): ' + data.email);
            return true;
        } catch (retryError) {
            console.error('이메일 발송 최종 실패: ' + retryError.toString());
            return false;
        }
    }
}

function setupConsultingSheet(sheet) {
    var headers = ['No.', '접수일시', '이름', '연락처', '이메일', '현장주소', '문의내용', '상담상태', '상담 예약 날짜'];
    sheet.appendRow(headers);

    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4a7c59');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');

    sheet.setColumnWidth(1, 50);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 80);
    sheet.setColumnWidth(6, 200);
    sheet.setColumnWidth(7, 250);

    // 필터 생성
    sheet.getRange(1, 1, 1, headers.length).createFilter();
}


// ==========================================
// 4. 고객 관리 동기화 (Customer Sync Logic)
// ==========================================

function handleCustomerSync(payload) {
    var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);

    // [Case 1] 관리자 저장
    if (payload.action === 'admin') {
        var adminData = payload.data;
        if (!adminData || !adminData.id) throw new Error('Invalid admin data');
        var result = saveAdmin(spreadsheet, adminData);
        return ContentService.createTextOutput(JSON.stringify({
            result: 'success',
            action: result,
            adminId: adminData.id
        })).setMimeType(ContentService.MimeType.JSON);
    }

    // [Case 2] 관리자 삭제
    if (payload.action === 'deleteAdmin') {
        var deleted = deleteAdmin(spreadsheet, payload.adminId);
        return ContentService.createTextOutput(JSON.stringify({
            result: deleted ? 'success' : 'not_found',
            action: 'deleted'
        })).setMimeType(ContentService.MimeType.JSON);
    }

    // [Case 3] 고객 데이터 동기화
    var customerData = payload.data || payload;
    if (!customerData || !customerData.customerId) {
        throw new Error('데이터 오류: 고객 ID(customerId)가 없습니다.');
    }

    var customerId = customerData.customerId;
    var newStatus = customerData.status;

    // 시트 준비
    var mainSheet = spreadsheet.getSheetByName('고객관리_견적서');
    var contractedSheet = spreadsheet.getSheetByName('계약완료');
    var asSheet = spreadsheet.getSheetByName('사후관리_A/S');

    if (!mainSheet) { mainSheet = spreadsheet.insertSheet('고객관리_견적서'); initializeCustomerSheet(mainSheet); }
    if (!contractedSheet) { contractedSheet = spreadsheet.insertSheet('계약완료'); initializeCustomerSheet(contractedSheet); }
    if (!asSheet) { asSheet = spreadsheet.insertSheet('사후관리_A/S'); initializeAsSheet(asSheet); }

    if (mainSheet.getLastRow() === 0) initializeCustomerSheet(mainSheet);
    if (contractedSheet.getLastRow() === 0) initializeCustomerSheet(contractedSheet);
    if (asSheet.getLastRow() === 0) initializeAsSheet(asSheet);

    var rowData = [
        customerData.customerId,
        customerData.status || '',
        customerData.createdAt || new Date().toISOString(),
        customerData.clientName || '',
        customerData.clientPhone || '',
        customerData.clientEmail || '',
        customerData.clientAddress || '',
        customerData.projectName || '',
        customerData.siteAddress || '',
        customerData.pyeong || '',
        customerData.inflowPath || '',      // 유입경로
        customerData.buildingType || '',    // 건물유형
        customerData.contractDate || '',
        customerData.constructionPeriod || '',
        customerData.warrantyPeriod || '',
        customerData.totalAmount || '',
        customerData.estimateProfitRate || '',
        customerData.jsonData || JSON.stringify(customerData),
        formatScheduleToString(customerData.schedules) // 공사 스케줄 (가독성 문자열)
    ];

    // 기존 데이터 위치 검색 (Main)
    var mainData = mainSheet.getDataRange().getValues();
    var mainRowIndex = -1;
    for (var i = 1; i < mainData.length; i++) {
        if (mainData[i][0] === customerId) {
            mainRowIndex = i + 1;
            break;
        }
    }

    // 기존 데이터 위치 검색 (Contracted)
    var contractedData = contractedSheet.getDataRange().getValues();
    var contractedRowIndex = -1;
    for (var j = 1; j < contractedData.length; j++) {
        if (contractedData[j][0] === customerId) {
            contractedRowIndex = j + 1;
            break;
        }
    }

    // 기존 데이터 위치 검색 (A/S)
    var asData = asSheet.getDataRange().getValues();
    var asRowIndex = -1;
    for (var k = 1; k < asData.length; k++) {
        if (asData[k][0] === customerId) {
            asRowIndex = k + 1;
            break;
        }
    }

    var action = '';

    // [로직] 메인 시트는 항상 업데이트/추가
    if (mainRowIndex > 0) {
        mainSheet.getRange(mainRowIndex, 1, 1, rowData.length).setValues([rowData]);
        action = 'updated';
    } else {
        mainSheet.appendRow(rowData);
        action = 'created';
    }

    // [로직] 상태별 분기
    // 1. **계약완료** (Contracted) - 계약완료 시트 + 사후관리_A/S 시트 모두 추가
    if (newStatus === 'contracted' || newStatus === '계약완료') {
        // 계약완료 시트: 추가/업데이트
        if (contractedRowIndex > 0) {
            contractedSheet.getRange(contractedRowIndex, 1, 1, rowData.length).setValues([rowData]);
        } else {
            contractedSheet.appendRow(rowData);
        }

        // 사후관리_A/S 시트: 자동 복사 (A/S 기간 계산)
        var asRowData = buildAsRowData(customerData);
        if (asRowIndex > 0) {
            asSheet.getRange(asRowIndex, 1, 1, asRowData.length).setValues([asRowData]);
        } else {
            asSheet.appendRow(asRowData);
        }
    }
    // 2. **A/S** (After Sales)
    else if (newStatus === 'as_done' || newStatus === 'A/S') {
        // 계약완료 시트: 유지 (Data Copy) - 업데이트
        if (contractedRowIndex > 0) {
            contractedSheet.getRange(contractedRowIndex, 1, 1, rowData.length).setValues([rowData]);
        } else {
            contractedSheet.appendRow(rowData);
        }
        // A/S 시트: 추가/업데이트
        var asRowData2 = buildAsRowData(customerData);
        if (asRowIndex > 0) {
            asSheet.getRange(asRowIndex, 1, 1, asRowData2.length).setValues([asRowData2]);
        } else {
            asSheet.appendRow(asRowData2);
        }
    }
    // 3. **기타** (상담중 등)
    else {
        // 계약완료/AS 시트에서 제거 (상태가 돌아갔을 경우)
        if (contractedRowIndex > 0) contractedSheet.deleteRow(contractedRowIndex);
        if (asRowIndex > 0) asSheet.deleteRow(asRowIndex);
    }

    return ContentService.createTextOutput(JSON.stringify({
        result: 'success',
        action: action,
        customerId: customerId
    })).setMimeType(ContentService.MimeType.JSON);
}


function handleCustomerGet(e) {
    var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
    var sheetName = e.parameter.sheet || '고객관리_견적서';

    // 관리자 목록 조회
    if (sheetName === '관리자') {
        var admins = getAdmins(spreadsheet);
        return ContentService.createTextOutput(JSON.stringify(admins))
            .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) {
        return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    var customers = [];

    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var customerId = row[0]; // 첫 번째 열이 customerId

        // customerId가 없으면 건너뛰기 (빈 행 또는 잘못된 데이터)
        if (!customerId) continue;

        var jsonData = row[17]; // JSON데이터 열 (18번째 열 = 인덱스 17)

        if (jsonData) {
            try {
                var parsedData = JSON.parse(jsonData);
                // 파싱된 데이터에 customerId가 있는지 확인
                if (parsedData.customerId) {
                    customers.push(parsedData);
                } else {
                    // customerId가 없으면 행 데이터에서 추가
                    parsedData.customerId = customerId;
                    customers.push(parsedData);
                }
            } catch (e) {
                // 파싱 실패 시 로깅 및 기본 구조로 생성
                console.warn('JSON 파싱 실패 (행 ' + (i + 1) + '): ' + e.toString());
                customers.push(buildCustomerFromRow(row));
            }
        } else {
            // JSON데이터가 없으면 기본 컬럼에서 구성
            customers.push(buildCustomerFromRow(row));
        }
    }
    return ContentService.createTextOutput(JSON.stringify(customers)).setMimeType(ContentService.MimeType.JSON);
}

// Helper: Build customer object from sheet row
function buildCustomerFromRow(row) {
    // JSON 데이터 파싱 시도 (finalPaymentDate 추출용)
    var jsonStr = row[17] || '{}';
    var jsonData = {};
    try { jsonData = JSON.parse(jsonStr); } catch (e) { }

    return {
        customerId: row[0] || '',
        status: row[1] || '',
        createdAt: row[2] || '',
        clientName: row[3] || '',
        clientPhone: row[4] || '',
        clientEmail: row[5] || '',
        clientAddress: row[6] || '',
        projectName: row[7] || '',
        siteAddress: row[8] || '',
        pyeong: row[9] || '',
        area: row[9] || '',              // UI 호환: pyeong -> area 매핑
        inflowPath: row[10] || '',       // 유입경로
        clientSource: row[10] || '',     // UI 호환: inflowPath -> clientSource 매핑
        buildingType: row[11] || '',     // 건물유형
        contractDate: row[12] || '',
        constructionPeriod: row[13] || '',
        warrantyPeriod: row[14] || '',
        totalAmount: row[15] || '',
        estimateProfitRate: row[16] || '',
        finalPaymentDate: jsonData.finalPaymentDate || '' // JSON에서 추출
    };
}


// Helper: Build row data for 사후관리_A/S sheet
// 컬럼: NO, 고객명, 연락처, 이메일, 현장주소, 기본A/S상태, 화장실A/S상태, 공사기간, 잔금일, 기본A/S보증일(개월), 기본A/S기간, 화장실A/S보증일(개월), 화장실A/S기간, 담당자, 비고
function buildAsRowData(customerData) {
    var asEndDate = '';
    var bathroomWarrantyDate = '';
    // 기본 A/S 기간: 항상 12개월 (warrantyPeriod가 날짜 문자열일 수 있으므로 고정값 사용)
    var warrantyMonths = 12;
    var bathroomWarrantyMonths = 30; // 화장실 누수 보증 기간 (30개월)


    var asStatus = '';           // 기본 A/S 상태
    var bathroomAsStatus = '';   // 화장실 A/S 상태

    // 잔금일 기준으로 계산
    var finalPaymentDate = customerData.finalPaymentDate || customerData.contractDate || '';
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    if (finalPaymentDate) {
        var baseDate = new Date(finalPaymentDate);
        if (!isNaN(baseDate.getTime())) {
            // A/S 완료일 = 잔금일 + A/S 기간
            var asDate = new Date(baseDate);
            asDate.setMonth(asDate.getMonth() + warrantyMonths);
            asEndDate = asDate.toISOString().split('T')[0];

            // 기본 A/S 상태 자동 설정
            if (today <= asDate) {
                asStatus = 'A/S 기간진행';
            } else {
                asStatus = 'A/S 기간완료';
            }

            // 화장실 누수 보증일 = 잔금일 + 30개월
            var bathDate = new Date(baseDate);
            bathDate.setMonth(bathDate.getMonth() + bathroomWarrantyMonths);
            bathroomWarrantyDate = bathDate.toISOString().split('T')[0];

            // 화장실 A/S 상태 자동 설정
            if (today <= bathDate) {
                bathroomAsStatus = 'A/S 기간진행';
            } else {
                bathroomAsStatus = 'A/S 기간완료';
            }
        }
    }

    return [
        customerData.customerId || '',       // NO (고객ID)
        customerData.clientName || '',        // 고객명
        customerData.clientPhone || '',       // 연락처
        customerData.clientEmail || '',       // 이메일
        customerData.siteAddress || '',       // 현장주소
        asStatus,                             // 기본 A/S 상태
        bathroomAsStatus,                     // 화장실 A/S 상태
        customerData.constructionPeriod || '',// 공사기간
        finalPaymentDate,                     // 잔금일
        warrantyMonths,                       // 기본 A/S 보증일(개월) - 12
        asEndDate,                            // 기본 A/S 기간 (날짜)
        bathroomWarrantyMonths,               // 화장실 A/S 보증일(개월) - 30
        bathroomWarrantyDate,                 // 화장실 A/S 기간 (날짜)
        '',                                   // 담당자 (사용자가 직접 입력)
        ''                                    // 비고
    ];
}

// --- Customer Sync Helpers ---

function formatScheduleToString(schedules) {
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) return '';
    return schedules.map(function (s, idx) {
        var start = s.start || '';
        var end = s.end || '';
        var dateStr = (start || end) ? ' (' + start + ' ~ ' + end + ')' : '';
        var managerStr = s.inCharge ? ' - ' + s.inCharge : '';
        var memoStr = s.memo ? ' [' + s.memo + ']' : '';
        return (idx + 1) + '. ' + (s.name || '') + dateStr + managerStr + memoStr;
    }).join('\n');
}

function initializeCustomerSheet(sheet) {
    var headers = [
        '고객ID', '상태', '생성일', '성명', '연락처', '이메일', '주소', '공사명', '현장주소',
        '평수', '유입경로', '건물유형',
        '계약일', '공사기간', 'A/S 기간', '계약금액', '이윤율', 'JSON데이터', '공사 스케줄'
    ];
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#B4956F');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
}

function initializeAdminSheet(sheet) {
    var headers = ['아이디', '비밀번호', '이름', '생성일'];
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4A90D9');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
}

function initializeAsSheet(sheet) {
    var headers = [
        '고객ID', '고객명', '연락처', '이메일', '현장주소',
        '기본 A/S 상태', '화장실 A/S 상태',
        '공사기간', '잔금일',
        '기본 A/S 보증일(개월)', '기본 A/S 기간',
        '화장실 A/S 보증일(개월)', '화장실 A/S 기간',
        '담당자', '비고'
    ];
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#5C6BC0'); // 보라색 계열
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
}

// [유틸리티] 기존 사후관리_A/S 시트 정리 - 드롭다운/체크박스 제거
// 수동 실행: Apps Script Editor에서 이 함수 실행
function cleanupAsSheet() {
    var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
    var sheet = spreadsheet.getSheetByName('사후관리_A/S');

    if (!sheet) {
        SpreadsheetApp.getUi().alert('사후관리_A/S 시트를 찾을 수 없습니다.');
        return;
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow < 1 || lastCol < 1) {
        SpreadsheetApp.getUi().alert('시트에 데이터가 없습니다.');
        return;
    }

    // 전체 데이터 영역의 데이터 유효성 검사 제거
    var dataRange = sheet.getRange(1, 1, lastRow, lastCol);
    dataRange.clearDataValidations();

    // 헤더 재설정
    var headers = [
        '고객ID', '고객명', '연락처', '이메일', '현장주소',
        '기본 A/S 상태', '화장실 A/S 상태',
        '공사기간', '잔금일',
        '기본 A/S 보증일(개월)', '기본 A/S 기간',
        '화장실 A/S 보증일(개월)', '화장실 A/S 기간',
        '담당자', '비고'
    ];

    // 헤더 행 업데이트
    for (var i = 0; i < headers.length; i++) {
        sheet.getRange(1, i + 1).setValue(headers[i]);
    }

    // 헤더 스타일 적용
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#5C6BC0');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);

    SpreadsheetApp.getUi().alert('사후관리_A/S 시트 정리 완료!\n드롭다운/체크박스가 제거되었습니다.');
}


function getAdmins(spreadsheet) {
    var sheet = spreadsheet.getSheetByName('관리자');
    if (!sheet || sheet.getLastRow() < 2) return [];
    var data = sheet.getDataRange().getValues();
    var admins = [];
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (row[0]) {
            admins.push({
                id: row[0],
                passwordHash: row[1],  // 해시값으로 저장된 비밀번호
                name: row[2] || row[0],
                createdAt: row[3]
            });
        }
    }
    return admins;
}

function saveAdmin(spreadsheet, adminData) {
    var sheet = spreadsheet.getSheetByName('관리자');
    if (!sheet) { sheet = spreadsheet.insertSheet('관리자'); initializeAdminSheet(sheet); }
    if (sheet.getLastRow() === 0) initializeAdminSheet(sheet);

    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
        if (data[i][0] === adminData.id) { rowIndex = i + 1; break; }
    }

    // passwordHash 또는 password 둘 다 지원
    var passwordValue = adminData.passwordHash || adminData.password || '';

    var rowData = [
        adminData.id,
        passwordValue,  // 해시값 또는 비밀번호
        adminData.name || adminData.id,
        adminData.createdAt || new Date().toISOString()
    ];

    if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
        return 'updated';
    } else {
        sheet.appendRow(rowData);
        return 'created';
    }
}

function deleteAdmin(spreadsheet, adminId) {
    var sheet = spreadsheet.getSheetByName('관리자');
    if (!sheet) return false;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
        // String()으로 변환하여 비교 (데이터 타입 불일치 방지)
        if (String(data[i][0]) === String(adminId)) {
            sheet.deleteRow(i + 1);
            return true;
        }
    }
    return false;
}

// ==========================================
// 5. 트리거 관련 함수 (Triggers)
// ==========================================

// [트리거] onFormSubmit - 설문지 응답 시 "상담상태"를 "설문응답"으로 자동 기입
function onFormSubmit(e) {
    if (!e) return;

    var sheet = e.range.getSheet();
    var sheetName = sheet.getName();

    // 설문지 응답 시트에서만 동작
    if (sheetName !== '설문지 응답') return;

    var row = e.range.getRow();
    var statusColumn = 6; // F열: 상담상태

    // 1. 설문지 응답 시트: 상담상태 "설문응답" 자동 기입
    sheet.getRange(row, statusColumn).setValue('설문응답');

    // 2. 상담관리_마스터 시트 동기화: 이름/연락처로 매칭하여 상태 업데이트
    try {
        updateMasterStatusIfExists(e.values);
    } catch (err) {
        console.error('Master sync failed: ' + err.toString());
    }

    SpreadsheetApp.getActiveSpreadsheet().toast('새 설문 응답이 등록되었습니다.', '설문 접수');
}

// Helper: 설문 응답 정보를 바탕으로 상담관리_마스터 상태 업데이트
function updateMasterStatusIfExists(rowValues) {
    // 설문지 응답 컬럼 구조 (e.values):
    // [0] 타임스탬프, [1] 성함, [2] 연락처, ...
    if (!rowValues || rowValues.length < 3) return;

    var name = rowValues[1];
    var phone = rowValues[2];

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var masterSheet = spreadsheet.getSheetByName('상담관리_마스터');
    if (!masterSheet) return;

    var data = masterSheet.getDataRange().getValues();
    // 상담관리_마스터: [0] No, [1] Date, [2] Name, [3] Phone, ..., [7] Status

    // 최신 순으로 검색 (아래에서 위로)
    for (var i = data.length - 1; i >= 1; i--) {
        var rowName = data[i][2];
        var rowPhone = data[i][3];

        if (rowName == name && rowPhone == phone) {
            // "상담문의접수" 또는 "설문발송" 상태일 때만 "설문응답"으로 변경
            // (이미 상담이 진행 중이거나 계약된 건은 건드리지 않음)
            var currentStatus = data[i][7];
            if (currentStatus === '상담문의접수' || currentStatus === '설문발송' || currentStatus === '') {
                masterSheet.getRange(i + 1, 8).setValue('설문응답'); // 8번째 열(H)이 상태
                console.log('Updated Master Sheet status for: ' + name);
            }
            break; // 가장 최근 1건만 업데이트
        }
    }
}

// [트리거] onEdit (상담 시트용)

function processStatusChange(e) {
    if (!e) return;
    var range = e.range;
    var sheet = range.getSheet();
    var sheetName = sheet.getName();

    // 상담관리_마스터 또는 설문지 응답 시트에서 동작
    var statusColumn = -1;
    if (sheetName === '상담관리_마스터') {
        statusColumn = 8; // H열: 상담상태
    } else if (sheetName === '설문지 응답') {
        statusColumn = 6; // F열: 상담상태
    } else {
        return;
    }

    if (range.getColumn() !== statusColumn) return;

    var newStatus = e.value;
    var rowNum = range.getRow();

    // 견적서 → 고객관리_견적서로 복사
    if (newStatus === '견적서') {
        if (sheetName === '설문지 응답') {
            copyFromSurveyToCustomer(sheet, rowNum);
        } else {
            copyToCustomerSheet(sheet, rowNum);
        }
    }
    // 계약완료 → 사후관리_A/S로 복사
    else if (newStatus === '계약완료') {
        moveRowToAS(sheet, rowNum);
    }
}

// [견적서] 설문지 응답 → 고객관리_견적서 복사 (유입경로, 건물유형, 평수 포함)
function copyFromSurveyToCustomer(sourceSheet, rowNum) {
    var spreadsheet = sourceSheet.getParent();
    var targetSheet = spreadsheet.getSheetByName('고객관리_견적서');

    if (!targetSheet) {
        targetSheet = spreadsheet.insertSheet('고객관리_견적서');
        initializeCustomerSheet(targetSheet);
    }

    var rowValues = sourceSheet.getRange(rowNum, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
    // 설문지 응답 컬럼: 0:타임스탬프, 1:성함, 2:연락처, 3:이메일, 4:현장주소, 5:상담상태,
    //                  6:Q1.유입경로, 7:Q2.건물유형, 8:Q3.평수, 9:Q4.예산범위, ...

    // 고객ID 생성 (YYMMDD-NNN 형식)
    var today = new Date();
    var yy = String(today.getFullYear()).slice(-2);
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    var datePrefix = yy + mm + dd;

    // 기존 고객 수 확인하여 순번 생성 (최대 번호 + 1)
    var existingData = targetSheet.getDataRange().getValues();
    var maxNum = 0;
    for (var i = 1; i < existingData.length; i++) {
        var existingId = existingData[i][0] || '';
        if (existingId.toString().startsWith(datePrefix)) {
            var numPart = parseInt(existingId.toString().split('-')[1]) || 0;
            if (numPart > maxNum) maxNum = numPart;
        }
    }
    var customerId = datePrefix + '-' + String(maxNum + 1).padStart(3, '0');


    // 중복 체크 (같은 연락처 + 이름이 이미 있는지)
    var clientPhone = rowValues[2]; // 설문지 응답에서 3번째 컬럼이 연락처
    var clientName = rowValues[1];  // 설문지 응답에서 2번째 컬럼이 성함
    for (var j = 1; j < existingData.length; j++) {
        // 고객관리_견적서: 인덱스3=성명, 인덱스4=연락처
        if (existingData[j][4] === clientPhone && existingData[j][3] === clientName) {
            spreadsheet.toast('이미 등록된 고객입니다: ' + clientName, '중복 알림');
            return;
        }
    }

    // 고객관리_견적서 컬럼: 고객ID, 상태, 생성일, 성명, 연락처, 이메일, 주소, 공사명, 현장주소, 평형, 유입경로, 건물유형, 계약일...
    var newRowData = [
        customerId,                     // 고객ID
        '견적서',                        // 상태
        new Date().toISOString().split('T')[0], // 생성일
        rowValues[1] || '',             // 성명 (성함)
        rowValues[2] || '',             // 연락처
        rowValues[3] || '',             // 이메일
        '',                             // 주소 (별도 입력)
        '',                             // 공사명
        rowValues[4] || '',             // 현장주소
        rowValues[8] || '',             // 평형 (Q3.평수) - I열
        rowValues[6] || '',             // 유입경로 (Q1.유입경로) - G열
        rowValues[7] || '',             // 건물유형 (Q2.건물유형) - H열
        '',                             // 계약일
        '',                             // 공사기간
        '',                             // A/S 기간
        '',                             // 계약금액
        '',                             // 이윤율
        ''                              // JSON데이터
    ];

    targetSheet.appendRow(newRowData);
    spreadsheet.toast('설문 고객을 [고객관리_견적서] 시트로 복사했습니다.\n고객ID: ' + customerId, '복사 완료');
}

// [견적서] 상담관리_마스터 → 고객관리_견적서 복사
function copyToCustomerSheet(sourceSheet, rowNum) {
    var spreadsheet = sourceSheet.getParent();
    var targetSheet = spreadsheet.getSheetByName('고객관리_견적서');

    if (!targetSheet) {
        targetSheet = spreadsheet.insertSheet('고객관리_견적서');
        initializeCustomerSheet(targetSheet);
    }

    var rowValues = sourceSheet.getRange(rowNum, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
    // 상담관리_마스터 컬럼: 0:No, 1:접수일시, 2:고객명, 3:연락처, 4:이메일, 5:현장주소, 6:문의내용, 7:상담상태

    // 고객ID 생성 (YYMMDD-NNN 형식)
    var today = new Date();
    var yy = String(today.getFullYear()).slice(-2);
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    var datePrefix = yy + mm + dd;

    // 기존 고객 수 확인하여 순번 생성 (최대 번호 + 1)
    var existingData = targetSheet.getDataRange().getValues();
    var maxNum = 0;
    for (var i = 1; i < existingData.length; i++) {
        var existingId = existingData[i][0] || '';
        if (existingId.toString().startsWith(datePrefix)) {
            var numPart = parseInt(existingId.toString().split('-')[1]) || 0;
            if (numPart > maxNum) maxNum = numPart;
        }
    }
    var customerId = datePrefix + '-' + String(maxNum + 1).padStart(3, '0');


    // 중복 체크 (같은 연락처 + 이름이 이미 있는지)
    var clientPhone = rowValues[3];
    var clientName = rowValues[2];
    for (var j = 1; j < existingData.length; j++) {
        if (existingData[j][4] === clientPhone && existingData[j][3] === clientName) {
            spreadsheet.toast('이미 등록된 고객입니다: ' + clientName, '중복 알림');
            return;
        }
    }

    // 고객관리_견적서 컬럼: 고객ID, 상태, 생성일, 성명, 연락처, 이메일, 주소, 공사명, 현장주소, 평형, 유입경로, 건물유형, 계약일...
    var newRowData = [
        customerId,                     // 고객ID
        '견적서',                        // 상태
        new Date().toISOString().split('T')[0], // 생성일
        rowValues[2] || '',             // 성명 (고객명)
        rowValues[3] || '',             // 연락처
        rowValues[4] || '',             // 이메일
        '',                             // 주소 (별도 입력)
        '',                             // 공사명
        rowValues[5] || '',             // 현장주소
        '',                             // 평형
        '',                             // 유입경로
        '',                             // 건물유형
        '',                             // 계약일
        '',                             // 공사기간
        '',                             // A/S 기간
        '',                             // 계약금액
        '',                             // 이윤율
        ''                              // JSON데이터
    ];

    targetSheet.appendRow(newRowData);
    spreadsheet.toast('고객 정보를 [고객관리_견적서] 시트로 복사했습니다.\n고객ID: ' + customerId, '복사 완료');
}

// [계약완료] 상담관리_마스터 → 사후관리_A/S 복사
function moveRowToAS(sourceSheet, rowNum) {
    var targetSheetName = '사후관리_A/S';
    var spreadsheet = sourceSheet.getParent();
    var targetSheet = spreadsheet.getSheetByName(targetSheetName);

    if (!targetSheet) {
        targetSheet = spreadsheet.insertSheet(targetSheetName);
        initializeAsSheet(targetSheet);
    }

    var rowValues = sourceSheet.getRange(rowNum, 1, 1, sourceSheet.getLastColumn()).getValues()[0];

    var newRowData = [
        rowValues[0],         // No
        rowValues[2],         // 이름
        rowValues[3],         // 연락처
        rowValues[4],         // 이메일
        rowValues[5],         // 주소
        '',                   // 기본 A/S 상태
        '',                   // 화장실 A/S 상태
        '',                   // 공사기간
        '',                   // 잔금일
        12,                   // 기본 A/S 보증일(개월)
        '',                   // 기본 A/S 기간
        30,                   // 화장실 A/S 보증일(개월)
        '',                   // 화장실 A/S 기간
        '',                   // 담당자
        ''                    // 비고
    ];

    targetSheet.appendRow(newRowData);
    spreadsheet.toast('고객 정보를 [사후관리_A/S] 시트로 복사했습니다.', '복사 완료');
}

// [호환성 유지] 기존 트리거(sendExpirationEmail)가 이 함수를 호출할 수 있도록 연결
function sendExpirationEmail() {
    sendWarrantyExpirationEmails();
}

// [트리거] 시간 기반 (일 1회) - 기본 A/S 및 화장실 A/S 완료 이메일 자동 발송
// [트리거] 시간 기반 (일 1회) - 기본 A/S 및 화장실 A/S 완료 이메일 자동 발송
function sendWarrantyExpirationEmails() {
    var targetSheetName = '사후관리_A/S';
    var spreadsheet = SpreadsheetApp.openById(CONSULTING_SHEET_ID);
    var sheet = spreadsheet.getSheetByName(targetSheetName);

    if (!sheet) {
        console.error('오류: [' + targetSheetName + '] 시트를 찾을 수 없습니다. 시트 이름을 확인해주세요.');
        return;
    }

    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var notes = dataRange.getNotes(); // [수정] 이메일 중복 발송 방지를 위한 메모 읽기

    if (values.length <= 1) {
        console.warn('경고: 시트에 데이터가 없습니다.');
        return;
    }

    // 헤더에서 컬럼 인덱스 찾기 (공백 제거 후 비교)
    var headers = values[0].map(function (h) { return String(h).trim(); });
    console.log('감지된 헤더:', headers);

    var IDX_NAME = headers.indexOf('고객명');
    var IDX_EMAIL = headers.indexOf('이메일');

    var IDX_STATUS_BASIC = headers.indexOf('기본 A/S 상태');
    var IDX_STATUS_BATH = headers.indexOf('화장실 A/S 상태');

    // 기간(완료일) 컬럼 - '기본 A/S 기간' 또는 'A/S 완료일'
    var IDX_END_BASIC = headers.indexOf('기본 A/S 기간');
    if (IDX_END_BASIC === -1) IDX_END_BASIC = headers.indexOf('A/S 완료일');

    var IDX_END_BATH = headers.indexOf('화장실 A/S 기간');
    if (IDX_END_BATH === -1) IDX_END_BATH = headers.indexOf('화장실 누수 보증일');

    console.log('인덱스 확인 - 기본상태:', IDX_STATUS_BASIC, ' / 기본기간:', IDX_END_BASIC);
    console.log('인덱스 확인 - 화장실상태:', IDX_STATUS_BATH, ' / 화장실기간:', IDX_END_BATH);

    if (IDX_STATUS_BASIC === -1 || IDX_END_BASIC === -1) {
        console.error('오류: 필수 컬럼(기본 A/S 상태/기간)을 찾을 수 없습니다.');
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log('오늘 날짜(기준):', today.toDateString());

    var basicSentCount = 0;
    var bathroomSentCount = 0;
    var updatedCount = 0;

    for (var i = 1; i < values.length; i++) {
        var row = values[i];
        var rowNum = i + 1;

        // 인덱스를 못 찾았으면 기본값(1, 3) 사용하지만, 위에서 찾았다고 가정
        var name = (IDX_NAME > -1) ? row[IDX_NAME] : row[1];
        var email = (IDX_EMAIL > -1) ? row[IDX_EMAIL] : row[3];
        var rowUpdated = false;

        // 1. 기본 A/S 완료일 체크
        var endDateVal = (IDX_END_BASIC > -1) ? row[IDX_END_BASIC] : '';
        if (endDateVal) {
            // 날짜 파싱 시도
            var basicDate = (endDateVal instanceof Date) ? endDateVal : new Date(endDateVal);

            if (!isNaN(basicDate.getTime())) {
                basicDate.setHours(0, 0, 0, 0);

                // [수정] 날짜 차이 계산 (일 단위)
                var timeDiff = today.getTime() - basicDate.getTime();
                var daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                var note = (notes[i] && IDX_END_BASIC > -1) ? notes[i][IDX_END_BASIC] : '';

                // 디버깅: 첫 3개 행만 상세 로깅
                if (i <= 3) {
                    console.log('Row ' + rowNum + ' [기본] 만료일:', basicDate.toDateString(), '/ 차이(일):', daysDiff);
                }

                // 1-1. 기간 만료 체크 (오늘 > 종료일) -> 상태 업데이트
                // 상태 업데이트는 이메일 발송 여부와 상관없이 날짜가 지났으면 수행
                if (daysDiff > 0) {
                    var currentStatus = (IDX_STATUS_BASIC > -1) ? row[IDX_STATUS_BASIC] : '';
                    if (currentStatus !== 'A/S 기간완료' && IDX_STATUS_BASIC > -1) {
                        console.log('Update Row ' + rowNum + ' [기본]: ' + currentStatus + ' -> A/S 기간완료');
                        sheet.getRange(rowNum, IDX_STATUS_BASIC + 1).setValue('A/S 기간완료')
                            .setBackground('#e0e0e0');
                        rowUpdated = true;
                    }
                }

                // 1-2. 메일 발송 (오늘부터 7일 지난 시점까지 재시도 허용, 메모로 중복 체크)
                // daysDiff === 0 (당일) 또는 1~7 (최근 1주일 내 만료된 건 중 누락된 것)
                if (daysDiff >= 0 && daysDiff <= 7) {
                    if (email && !note.includes('기본A/S메일발송완료')) {
                        console.log('Email Row ' + rowNum + ' [기본]: 알림 발송 (Delay: ' + daysDiff + '일)');
                        sendBasicAsExpirationEmail(email, name);

                        // 메모 업데이트 (발송 기록)
                        var newNote = note ? note + '\n' : '';
                        newNote += '기본A/S메일발송완료: ' + new Date().toLocaleDateString('ko-KR');
                        sheet.getRange(rowNum, IDX_END_BASIC + 1).setNote(newNote);

                        basicSentCount++;
                    } else if (daysDiff >= 0 && daysDiff <= 7 && note.includes('기본A/S메일발송완료')) {
                        if (i <= 3) console.log('Row ' + rowNum + ' [기본]: 이미 발송됨');
                    }
                }
            } else {
                if (i <= 3) console.warn('Row ' + rowNum + ' [기본] 날짜 형식 오류:', endDateVal);
            }
        }

        // 2. 화장실 누수 보증일 체크
        var bathDateVal = (IDX_END_BATH > -1) ? row[IDX_END_BATH] : '';
        if (bathDateVal) {
            var bathDate = (bathDateVal instanceof Date) ? bathDateVal : new Date(bathDateVal);
            if (!isNaN(bathDate.getTime())) {
                bathDate.setHours(0, 0, 0, 0);

                var timeDiff = today.getTime() - bathDate.getTime();
                var daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                var note = (notes[i] && IDX_END_BATH > -1) ? notes[i][IDX_END_BATH] : '';

                // 2-1. 기간 만료 체크
                if (daysDiff > 0) {
                    var currentStatus = (IDX_STATUS_BATH > -1) ? row[IDX_STATUS_BATH] : '';
                    if (currentStatus !== 'A/S 기간완료' && IDX_STATUS_BATH > -1) {
                        console.log('Update Row ' + rowNum + ' [화장실]: ' + currentStatus + ' -> A/S 기간완료');
                        sheet.getRange(rowNum, IDX_STATUS_BATH + 1).setValue('A/S 기간완료')
                            .setBackground('#e0e0e0');
                        rowUpdated = true;
                    }
                }

                // 2-2. 메일 발송
                if (daysDiff >= 0 && daysDiff <= 7) {
                    if (email && !note.includes('화장실A/S메일발송완료')) {
                        console.log('Email Row ' + rowNum + ' [화장실]: 알림 발송 (Delay: ' + daysDiff + '일)');
                        sendBathroomAsExpirationEmail(email, name);

                        var newNote = note ? note + '\n' : '';
                        newNote += '화장실A/S메일발송완료: ' + new Date().toLocaleDateString('ko-KR');
                        sheet.getRange(rowNum, IDX_END_BATH + 1).setNote(newNote);

                        bathroomSentCount++;
                    }
                }
            }
        }

        if (rowUpdated) updatedCount++;
    }
    console.log('완료: 기본메일(' + basicSentCount + '), 화장실메일(' + bathroomSentCount + '), 상태변경(' + updatedCount + ')');
}

// 기본 A/S 보증 기간 완료 이메일
function sendBasicAsExpirationEmail(email, name) {
    var customerName = name || '고객';
    var subject = '[디자인지그] ' + customerName + ' 고객님 A/S 보증기간 경과 안내';

    var body = '안녕하세요, ' + customerName + ' 고객님.\n' +
        '디자인지그입니다.\n\n' +
        '고객님 공간 시공 후 1년이 지났습니다.\n' +
        'A/S 보증 기간이 경과하여 \n' +
        '한 번 더 안부 여쭙고자 연락드렸습니다.\n\n' +
        '그동안 사용하시면서 불편하신 점은 없으셨는지,\n' +
        '혹시 확인이 필요한 부분은 없으신지 궁금합니다.\n\n' +
        '보증 기간이 지나더라도\n' +
        '디자인지그가 시공한 공간에 대한 관리와 상담은 계속됩니다.\n\n' +
        '사용 중 궁금하신 점이나 점검이 필요하신 부분이 있으시면\n' +
        '언제든지 편하게 연락 주시기 바랍니다.\n\n' +
        '감사합니다.\n\n' +
        '디자인지그 드림\n\n' +
        '────────────────\n' +
        'DESIGN JIG\n' +
        '기본이 탄탄해야 아름다움도 오래갑니다.\n' +
        'designjig.com';

    try {
        GmailApp.sendEmail(email, subject, body, {
            name: SENDER_NAME,
            from: SENDER_EMAIL
        });
        console.log('기본 A/S 완료 메일 발송: ' + email);
    } catch (e) {
        console.log('메일 발송 에러 (' + email + '): ' + e.toString());
    }
}

// 화장실 누수 보증 기간 완료 이메일
function sendBathroomAsExpirationEmail(email, name) {
    var customerName = name || '고객';
    var subject = '[디자인지그] ' + customerName + ' 고객님 화장실 누수 보증기간 경과 안내';

    var body = '안녕하세요, ' + customerName + ' 고객님.\n' +
        '디자인지그입니다.\n\n' +
        '고객님 공간 시공 후 2년 6개월(30개월)이 지났습니다.\n' +
        '화장실 누수 보증 기간이 경과하여 \n' +
        '한 번 더 안부 여쭙고자 연락드렸습니다.\n\n' +
        '그동안 화장실 사용에 불편함은 없으셨는지,\n' +
        '혹시 누수 관련 문제는 없으셨는지 궁금합니다.\n\n' +
        '보증 기간이 지나더라도\n' +
        '디자인지그가 시공한 공간에 대한 관리와 상담은 계속됩니다.\n\n' +
        '사용 중 궁금하신 점이나 점검이 필요하신 부분이 있으시면\n' +
        '아래 연락처로 언제든지 편하게 연락 주시기 바랍니다.\n\n' +
        '감사합니다.\n\n' +
        '디자인지그 드림\n\n' +
        '────────────────\n' +
        'DESIGN JIG\n' +
        '기본이 탄탄해야 아름다움도 오래갑니다.\n' +
        'designjig.com';

    try {
        GmailApp.sendEmail(email, subject, body, {
            name: SENDER_NAME,
            from: SENDER_EMAIL
        });
        console.log('화장실 A/S 완료 메일 발송: ' + email);
    } catch (e) {
        console.log('메일 발송 에러 (' + email + '): ' + e.toString());
    }
}


// ==========================================
// 9. 원가관리표 데이터 처리 (Cost Management)
// ==========================================

/**
 * A/S 관리 리스트 데이터 조회 (GET)
 * 'AS 관리 리스트' 시트에서 데이터를 읽어와 반환
 */
function handleASListGet(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        // 시트 이름 확인 (띄어쓰기 유무 등 유연하게 처리)
        var sheet = spreadsheet.getSheetByName('AS 관리 리스트');
        if (!sheet) {
            sheet = spreadsheet.getSheetByName('AS관리리스트');
        }
        if (!sheet) {
            sheet = spreadsheet.getSheetByName('as_list');
        }

        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                result: 'error',
                message: "'AS 관리 리스트' 시트를 찾을 수 없습니다."
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var rows = sheet.getDataRange().getValues();
        var items = [];
        var notices = [];

        // 1행은 헤더일 가능성이 높으므로 2행부터 읽음
        // 헤더: 카테고리 | 세부항목 | 브랜드 | 서비스센터 | 보증기간 | 비고
        for (var i = 1; i < rows.length; i++) {
            var row = rows[i];
            // 빈 행 건너뛰기
            if (!row[0] && !row[1] && !row[2]) continue;

            // 유의사항 행 체크 (스케줄표와 동일한 방식 "AS 관리 유의사항" 혹은 "안내사항")
            if (row[0] && (row[0].toString().indexOf('유의사항') !== -1 || row[0].toString().indexOf('안내사항') !== -1 || row[0].toString().indexOf('A/S') !== -1)) {
                var noticeText = row[1];
                if (noticeText) notices.push(noticeText);
            } else {
                items.push({
                    category: row[0] || '',
                    brand: row[1] || '',
                    item: row[2] || '',
                    modelNum: row[3] || '',
                    rank: row[4] || '',
                    size: row[5] || '',
                    price: row[6] || '',
                    website: row[7] || '',
                    service: row[8] || '',
                    warranty: row[9] || '',
                    note: row[10] || ''
                });
            }
        }

        return ContentService.createTextOutput(JSON.stringify({
            result: 'success',
            items: items,
            notices: notices
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            result: 'error',
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * 원가관리표 데이터 조회 (GET)
 * Google Sheets에서 원가관리표 데이터를 읽어옵니다.
 */
function handleCostGet(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById(COST_SHEET_ID);

        // '원가관리표데이터베이스' 시트만 읽기
        var sheet = spreadsheet.getSheetByName('원가관리표데이터베이스');
        if (!sheet) {
            sheet = spreadsheet.getSheetByName('원가관리표'); // 혹시 모를 짧은 이름도 체크
        }
        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                error: '원가관리표데이터베이스 시트를 찾을 수 없습니다.'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getDataRange().getValues();
        var costData = [];
        var memoData = {};  // 카테고리별 메모 저장

        // 2행(인덱스 1)이 헤더, 3행(인덱스 2)부터 데이터
        // 1행: 제목, 2행: 컬럼 헤더 (카테고리, NO, 구분, 품명...), 3행~: 데이터
        var startRow = 2;

        for (var i = startRow; i < data.length; i++) {
            var row = data[i];

            // 빈 행 건너뛰기
            if (!row[0] && !row[1] && !row[2]) continue;

            // A열: 카테고리, B열: NO 또는 MEMO, C열: 구분/메모번호, D열: 품명/메모내용
            var category = row[0] ? row[0].toString().trim() : '';
            var noOrMemo = row[1] ? row[1].toString().trim() : '';
            var div = row[2] ? row[2].toString().trim() : '';
            var name = row[3] ? row[3].toString().trim() : '';

            // 헤더 행 건너뛰기
            if (category === '카테고리' || noOrMemo === 'NO' || div === '구분') continue;

            // MEMO 행 처리
            if (noOrMemo === 'MEMO' || noOrMemo === '메모') {
                if (!memoData[category]) {
                    memoData[category] = [];
                }
                memoData[category].push({
                    no: div,  // 메모 번호 (1, 2, 3...)
                    content: name  // 메모 내용 (D열)
                });
                continue;
            }

            // 카테고리가 없으면 데이터 아님
            if (!category) continue;

            // 일반 데이터 행
            costData.push({
                no: noOrMemo || '',
                category: category,
                div: div,
                name: name,
                spec: row[4] || '',
                unit: row[5] || '',
                qty: row[6] || '',
                price: row[7] || '',
                total: row[8] || ''
            });
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            data: costData,
            memos: memoData,
            lastUpdated: new Date().toISOString()
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}


/**
 * [DISABLED] 원가관리표 데이터베이스 업데이트 (POST)
 * 마스터 데이터 정합성을 위해 API를 통한 쓰기 권한이 제거되었습니다.
 */
function handleCostUpdate(payload) {
    return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Master DB (Cost) is read-only via API.'
    })).setMimeType(ContentService.MimeType.JSON);
}

// 원본 로직 보존 (필요시 백업 참고)
/*
function handleCostUpdate_ORIGINAL(payload) {
    try {
        var costData = payload.data || [];
        var memoData = payload.memos || {};

        var spreadsheet = SpreadsheetApp.openById(COST_SHEET_ID);
        var sheet = spreadsheet.getSheetByName('원가관리표데이터베이스');
        if (!sheet) {
            sheet = spreadsheet.getSheetByName('원가관리표');
        }

        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                error: '원가관리표데이터베이스 시트를 찾을 수 없습니다.'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // 기존 데이터 영역 확인 (3행부터 시작 - 1행 제목, 2행 헤더)
        var lastRow = sheet.getLastRow();

        // 헤더 유지하고 데이터 영역만 삭제 (3행 이후)
        if (lastRow > 2) {
            sheet.getRange(3, 1, lastRow - 2, 9).clearContent();
        }

        // 카테고리별로 데이터 정렬
        var categoryOrder = ['가설공사', '철거공사', '설비/방수공사', '확장/단열공사', '창호공사',
            '전기/조명공사', '에어컨 공사', '목공/도어공사', '필름공사', '타일공사',
            '욕실공사', '도장공사', '도배공사', '바닥재', '가구공사', '마감공사', '기타공사'];

        // 새 데이터 쓰기
        var rows = [];
        var isFirstCategory = true;

        // 카테고리 순서대로 데이터 정렬
        categoryOrder.forEach(function (category) {
            var categoryRows = [];

            // 해당 카테고리의 일반 데이터
            var categoryData = costData.filter(function (item) {
                return item.category === category;
            });

            categoryData.forEach(function (item) {
                categoryRows.push([
                    category,
                    item.no || '',
                    item.div || '',
                    item.name || '',
                    item.spec || '',
                    item.unit || '',
                    item.qty || '',
                    item.price || '',
                    item.total || ''
                ]);
            });

            // 해당 카테고리의 메모 데이터
            if (memoData[category] && memoData[category].length > 0) {
                memoData[category].forEach(function (memo) {
                    categoryRows.push([
                        category,
                        'MEMO',
                        memo.no || '',
                        memo.content || '',
                        '', '', '', '', ''
                    ]);
                });
            }

            // [추가 요청] 공정이 끝나면 5행 여유공간 추가
            if (categoryRows.length > 0) {
                // 첫 번째 카테고리가 아니고, 데이터가 있다면 위에 5줄 공백 추가
                if (!isFirstCategory) {
                    for (var k = 0; k < 5; k++) {
                        rows.push(['', '', '', '', '', '', '', '', '']);
                    }
                }

                // 데이터 추가
                rows = rows.concat(categoryRows);
                isFirstCategory = false; // 이제 첫 번째가 아님
            }
        });

        // 데이터가 있으면 한 번에 쓰기
        if (rows.length > 0) {
            sheet.getRange(3, 1, rows.length, 9).setValues(rows);
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: '원가관리표가 저장되었습니다.',
            rowsUpdated: rows.length
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        // ...
    }
}
*/

// ==========================================
// 10. 샘플 견적서 기능
// ==========================================

const SAMPLE_ESTIMATE_SHEET_NAME = '샘플견적시트';

/**
 * 샘플 견적서 저장
 */
function handleSaveSampleEstimate(payload) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName(SAMPLE_ESTIMATE_SHEET_NAME);

        if (!sheet) {
            // 시트가 없으면 생성
            sheet = spreadsheet.insertSheet(SAMPLE_ESTIMATE_SHEET_NAME);
            sheet.appendRow(['ID', '제목', '견적데이터', '이윤율', '메모', '작성자', '작성일']);
        }

        var sampleId = 'SAMPLE_' + new Date().getTime();
        var createdAt = new Date().toLocaleDateString('ko-KR');

        sheet.appendRow([
            sampleId,
            payload.title || '제목 없음',
            JSON.stringify(payload.estimateData || {}),
            payload.estimateProfitRate || 15,
            JSON.stringify(payload.estimateMemos || {}),
            payload.createdBy || 'unknown',
            createdAt
        ]);

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            id: sampleId,
            message: '샘플이 저장되었습니다'
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * 샘플 견적서 목록 조회
 */
function handleGetSampleEstimates() {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName(SAMPLE_ESTIMATE_SHEET_NAME);

        if (!sheet || sheet.getLastRow() < 2) {
            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                samples: []
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getDataRange().getValues();
        var samples = [];

        for (var i = 1; i < data.length; i++) {
            samples.push({
                id: data[i][0],
                title: data[i][1],
                createdBy: data[i][5],
                createdAt: data[i][6]
            });
        }

        // 최신순 정렬
        samples.reverse();

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            samples: samples
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * 샘플 견적서 상세 조회
 */
function handleGetSampleEstimate(sampleId) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName(SAMPLE_ESTIMATE_SHEET_NAME);

        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: '샘플 시트가 없습니다'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getDataRange().getValues();

        for (var i = 1; i < data.length; i++) {
            if (data[i][0] === sampleId) {
                var sample = {
                    id: data[i][0],
                    title: data[i][1],
                    estimateData: JSON.parse(data[i][2] || '{}'),
                    estimateProfitRate: data[i][3],
                    estimateMemos: JSON.parse(data[i][4] || '{}'),
                    createdBy: data[i][5],
                    createdAt: data[i][6]
                };

                return ContentService.createTextOutput(JSON.stringify({
                    success: true,
                    sample: sample
                })).setMimeType(ContentService.MimeType.JSON);
            }
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: '샘플을 찾을 수 없습니다'
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * 샘플 견적서 삭제
 */
function handleDeleteSampleEstimate(payload) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName(SAMPLE_ESTIMATE_SHEET_NAME);

        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: '샘플 시트가 없습니다'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getDataRange().getValues();

        for (var i = 1; i < data.length; i++) {
            if (data[i][0] === payload.id) {
                sheet.deleteRow(i + 1);

                return ContentService.createTextOutput(JSON.stringify({
                    success: true,
                    message: '샘플이 삭제되었습니다'
                })).setMimeType(ContentService.MimeType.JSON);
            }
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: '샘플을 찾을 수 없습니다'
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * 원가관리표 데이터베이스 복구 (전체 덮어쓰기)
 */
function handleRestoreCostDatabase(payload) {
    try {
        var spreadsheet = SpreadsheetApp.openById(COST_SHEET_ID);
        var sheetName = '원가관리표데이터베이스';
        var sheet = spreadsheet.getSheetByName(sheetName);

        if (!sheet) {
            sheet = spreadsheet.insertSheet(sheetName);
        }

        var rows = payload.data; // [[대분류, No, 구분, 품명, ...], ...]

        if (!rows || !Array.isArray(rows)) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                message: "데이터 형식이 올바르지 않습니다."
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // 1. 데이터 유실 방지: 모든 행 중 가장 긴 길이를 기준으로 통일
        var maxCols = 0;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].length > maxCols) maxCols = rows[i].length;
        }

        // 최소 9열 확보
        if (maxCols < 9) maxCols = 9;

        // 2. 모든 행의 길이를 maxCols로 맞춤 (빈 값 채우기)
        var normalizedRows = rows.map(function (row) {
            while (row.length < maxCols) {
                row.push('');
            }
            return row;
        });

        // 3. [추가 요청] 공정(카테고리) 간 5줄 띄우기
        var finalRows = [];
        var lastCategory = '';
        var emptyRow = new Array(maxCols).fill('');

        for (var i = 0; i < normalizedRows.length; i++) {
            var row = normalizedRows[i];
            var currentCategory = String(row[0] || '').trim();

            // 이전 카테고리가 있고, 현재 카테고리와 다르면 5줄 띄우기
            if (lastCategory && currentCategory && currentCategory !== lastCategory) {
                for (var k = 0; k < 5; k++) {
                    finalRows.push([...emptyRow]);
                }
            }

            finalRows.push(row);

            // 카테고리 갱신 (빈 값이 아닐 때만)
            if (currentCategory) lastCategory = currentCategory;
        }

        // 전체 초기화 후 다시 쓰기
        sheet.clear();

        // 헤더 작성 (9개 컬럼 표준)
        sheet.appendRow(['대분류', 'No', '구분', '품명', '규격', '단위', '수량', '단가', '합계']);

        // 데이터 쓰기
        if (finalRows.length > 0) {
            // 행 개수만큼 쓰기
            sheet.getRange(2, 1, finalRows.length, maxCols).setValues(finalRows);
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: finalRows.length + "개 항목(공백 포함) 저장 완료"
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: "서버 오류: " + err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

// Helper to safely get spreadsheet
function getTargetSpreadsheet(id) {
    try {
        var active = SpreadsheetApp.getActiveSpreadsheet();
        if (active) return active;
    } catch (e) {
        // standalone script or no active sheet
    }
    return SpreadsheetApp.openById(id);
}

/**
 * [최적화] 체크리스트 마스터 데이터만 추출 (공통 로직)
 */
function getChecklistMasterData() {
    var spreadsheet = getTargetSpreadsheet(CUSTOMER_SHEET_ID);
    var sheet = spreadsheet.getSheetByName('공정 체크리스트');
    if (!sheet) sheet = spreadsheet.getSheetByName('공정체크리스트');
    if (!sheet) sheet = spreadsheet.getSheetByName('공정별 체크리스트');
    if (!sheet) sheet = spreadsheet.getSheetByName('checklist');

    if (!sheet) return null;

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];

    var headers = data[0];
    var rows = data.slice(1);

    return rows.map(function (row) {
        var item = {};
        headers.forEach(function (header, index) {
            item[header] = row[index] || '';
        });
        return item;
    }).filter(function (item) {
        return item['번호'];
    });
}

/**
 * [기존] 체크리스트 마스터 조회
 */
function handleChecklistGet(e) {
    try {
        var masterData = getChecklistMasterData();
        if (masterData === null) {
            var spreadsheet = getTargetSpreadsheet(CUSTOMER_SHEET_ID);
            var allSheets = spreadsheet.getSheets().map(function (s) { return s.getName(); });
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                message: '공정 체크리스트 시트를 찾을 수 없습니다. (검색된 시트: ' + allSheets.join(', ') + ')'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            data: masterData,
            count: masterData.length
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * [모바일 최적화] 마스터 항목 + 특정 고객의 체크 상태 번들 로드
 * GET ?action=loadChecklistBundle&customerId=xxx (customerId는 선택 사항)
 */
function handleChecklistBundleGet(e) {
    try {
        var customerId = e.parameter.customerId;

        // 1. 마스터 체크리스트 로드 (필수)
        var masterData = getChecklistMasterData() || [];

        // 2. 고객 개별 데이터 로드 (선택)
        var customerStatus = {};
        if (customerId && customerId !== 'undefined' && customerId !== 'null') {
            var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
            var sheet = spreadsheet.getSheetByName('고객관리_견적서');

            if (sheet) {
                var data = sheet.getDataRange().getValues();
                for (var i = 1; i < data.length; i++) {
                    if (data[i][0] === customerId) {
                        var jsonData = data[i][17]; // 18번째 열 (JSON데이터)
                        if (jsonData) {
                            try {
                                var parsed = JSON.parse(jsonData);
                                customerStatus = parsed.checklistData || {};
                            } catch (ex) { }
                        }
                        break;
                    }
                }
            }
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            master: masterData,
            customerStatus: customerStatus
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}


// ==========================================
// 12. 정산 관리 대장 (Settlement Management)
// ==========================================

// [추가] 정산 관리 대장 옵션 마스터 조회
function handleGetSettlementOptions(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        // [수정] 실제 시트 이름: "정산 관리 대장"
        var sheet = spreadsheet.getSheetByName('정산 관리 대장');

        // Fallback: 다른 가능한 이름들 시도
        if (!sheet) sheet = spreadsheet.getSheetByName('정산관리대장');
        if (!sheet) sheet = spreadsheet.getSheetByName('정산옵션마스터');

        if (!sheet) {
            // 시트가 없으면 빈 배열 반환
            return ContentService.createTextOutput(JSON.stringify({
                result: 'success',
                options: [],
                message: '정산 관리 대장 시트를 찾을 수 없습니다.'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getDataRange().getValues();
        if (data.length < 2) {
            return ContentService.createTextOutput(JSON.stringify({
                result: 'success',
                options: []
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // 헤더 기반 인덱스 찾기
        var headers = data[0];
        // [수정] 실제 구글 시트 헤더 반영: 카테고리, 공정분류, 거래처/작업자, 비용구분, 대금방식, 사업자/주민번호, 은행명/예금주/계좌번호, 비고
        var idx = {
            category: Math.max(headers.indexOf('카테고리'), headers.indexOf('분류')),
            process: Math.max(headers.indexOf('공정분류'), headers.indexOf('공정'), headers.indexOf('공정명')),
            client: Math.max(headers.indexOf('거래처/작업자'), headers.indexOf('거래처')),
            costType: headers.indexOf('비용구분'),
            payType: headers.indexOf('대금방식'),
            bizId: Math.max(headers.indexOf('사업자/주민번호'), headers.indexOf('사업자번호')),
            bankInfo: Math.max(headers.indexOf('은행명/예금주/계좌번호'), headers.indexOf('계좌정보')),
            note: headers.indexOf('비고')
        };

        // 인덱스 결정 (못 찾으면 기본값)
        // 인덱스 결정
        var iCat = idx.category;
        var iProc = idx.process;
        var iClient = idx.client;
        var iCost = idx.costType;
        var iPay = idx.payType;
        var iBiz = idx.bizId;
        var iBank = idx.bankInfo;
        var iNote = idx.note;

        // 필수 값 fallback
        if (iCat === -1) iCat = 0;

        var options = [];
        for (var i = 1; i < data.length; i++) {
            var row = data[i];
            if (row[iCat]) { // 카테고리가 있는 경우만
                options.push({
                    category: row[iCat] || '',
                    process: row[iProc] || '',
                    client: row[iClient] || '',
                    costType: (iCost > -1 ? row[iCost] : '') || '',
                    payType: (iPay > -1 ? row[iPay] : '') || '',
                    bizId: (iBiz > -1 ? row[iBiz] : '') || '',
                    bankInfo: (iBank > -1 ? row[iBank] : '') || '',
                    note: (iNote > -1 ? row[iNote] : '') || ''
                });
            }
        }

        return ContentService.createTextOutput(JSON.stringify({
            result: 'success',
            options: options
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            result: 'error',
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleSettlementGet(e) {
    try {
        var customerId = e.parameter.customerId;
        if (!customerId) {
            throw new Error('고객 ID가 필요합니다.');
        }

        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName(SETTLEMENT_SHEET_NAME);

        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                result: 'success',
                rows: []
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getDataRange().getValues();
        if (data.length < 2) {
            return ContentService.createTextOutput(JSON.stringify({
                result: 'success',
                rows: []
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var rows = [];
        // 헤더 기반 인덱스 찾기
        var headers = data[0];
        // 예상 헤더: 고객ID, 고객명, 분류, 공정, 거래처, 비용구분, 지출증빙(or 대금방식), 사업자번호, 계좌정보, 결제금액, 결제일, 결제상태, 비고
        var idx = {
            id: headers.indexOf('고객ID'),
            category: headers.indexOf('분류'),
            process: headers.indexOf('공정'),
            client: headers.indexOf('거래처'),
            costType: headers.indexOf('비용구분'),
            payType: headers.indexOf('지출증빙'), // 구글시트 헤더명 '지출증빙'
            payType2: headers.indexOf('대금방식'), // 호환성
            bizId: headers.indexOf('사업자번호'),
            bankInfo: headers.indexOf('계좌정보'),
            payAmount: headers.indexOf('결제금액'),
            payDate: headers.indexOf('결제일'),
            payStatus: headers.indexOf('결제상태'),
            note: headers.indexOf('비고')
        };

        var iId = idx.id > -1 ? idx.id : 0;
        var iCat = idx.category > -1 ? idx.category : 2;
        var iProc = idx.process > -1 ? idx.process : 3;
        var iClient = idx.client > -1 ? idx.client : 4;
        var iCost = idx.costType > -1 ? idx.costType : 5;
        var iPayType = idx.payType > -1 ? idx.payType : (idx.payType2 > -1 ? idx.payType2 : 6);
        var iBiz = idx.bizId > -1 ? idx.bizId : 7;
        var iBank = idx.bankInfo > -1 ? idx.bankInfo : 8;
        var iAmount = idx.payAmount > -1 ? idx.payAmount : 9;
        var iDate = idx.payDate > -1 ? idx.payDate : 10;
        var iStatus = idx.payStatus > -1 ? idx.payStatus : 11;
        var iNote = idx.note > -1 ? idx.note : 12;

        for (var i = 1; i < data.length; i++) {
            var row = data[i];
            if (row[iId].toString() === customerId.toString()) {
                rows.push({
                    category: row[iCat],
                    process: row[iProc],
                    client: row[iClient],
                    costType: row[iCost],
                    payType: row[iPayType],
                    bizId: row[iBiz],
                    bankInfo: row[iBank],
                    payAmount: row[iAmount],
                    payDate: row[iDate] ? formatDate(row[iDate]) : '',
                    payStatus: row[iStatus],
                    note: row[iNote]
                });
            }
        }

        return ContentService.createTextOutput(JSON.stringify({
            result: 'success',
            rows: rows
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            result: 'error',
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleSettlementUpdate(payload) {
    try {
        var customerId = payload.customerId;
        var customerName = payload.customerName || '';
        var rowsData = payload.rows || [];

        if (!customerId) throw new Error('고객 ID가 누락되었습니다.');

        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName(SETTLEMENT_SHEET_NAME);

        if (!sheet) {
            sheet = spreadsheet.insertSheet(SETTLEMENT_SHEET_NAME);
            sheet.appendRow([
                '고객ID', '고객명', '분류', '공정', '거래처', '비용구분',
                '지출증빙', '사업자번호', '계좌정보', '결제금액', '결제일', '결제상태', '비고', '수정일'
            ]);
        }

        // 기존 데이터 삭제 (해당 고객ID)
        var data = sheet.getDataRange().getValues();
        /*
          행 삭제 시 아래에서 위로 삭제해야 인덱스가 꼬이지 않음.
          모든 데이터를 읽어서 메모리에서 필터링 후 다시 쓰는 방식도 있지만,
          데이터가 많아지면 메모리 이슈가 있을 수 있음.
          여기서는 그냥 루프 돌면서 삭제.
        */
        for (var i = data.length - 1; i >= 1; i--) {
            if (data[i][0].toString() === customerId.toString()) {
                sheet.deleteRow(i + 1);
            }
        }

        // 새 데이터 추가
        var newRows = [];
        var now = new Date().toLocaleString('ko-KR');

        rowsData.forEach(function (item) {
            newRows.push([
                customerId,
                customerName,
                item.category || '',
                item.process || '',
                item.client || '',
                item.costType || '',
                item.payType || '',
                item.bizId || '',
                item.bankInfo || '',
                item.payAmount || 0,
                item.payDate || '',
                item.payStatus || '미지급',
                item.note || '',
                now
            ]);
        });

        if (newRows.length > 0) {
            // 한 번에 쓰기 (appendRow 반복보다 빠름)
            sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
        }

        return ContentService.createTextOutput(JSON.stringify({
            result: 'success',
            count: newRows.length
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            result: 'error',
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

// 날짜 포맷 헬퍼 (YYYY-MM-DD)
function formatDate(date) {
    if (!date) return '';
    if (typeof date === 'string') return date.substring(0, 10);
    try {
        var d = new Date(date);
        var year = d.getFullYear();
        var month = ('0' + (d.getMonth() + 1)).slice(-2);
        var day = ('0' + d.getDate()).slice(-2);
        return year + '-' + month + '-' + day;
    } catch (e) {
        return date;
    }
}

// ==========================================
// 12. 운영비 관리 대장 (Expenses Management)
// ==========================================

/**
 * 운영비 관리 대장 조회 (GET)
 * - 시트 이름: "운영비 관리 대장" 또는 "운영비관리"
 * - 고정지출 설정도 함께 반환
 */
function handleExpensesGet(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName('운영비 관리 대장');
        if (!sheet) sheet = spreadsheet.getSheetByName('운영비관리');
        if (!sheet) sheet = spreadsheet.getSheetByName('운영비 관리');

        if (!sheet) {
            // 시트가 없으면 생성
            sheet = spreadsheet.insertSheet('운영비 관리 대장');
            var headers = ['No', '날짜', '대분류', '상세내역', '금액', '결제수단', '증빙자료', '비고'];
            sheet.appendRow(headers);
            var headerRange = sheet.getRange(1, 1, 1, headers.length);
            headerRange.setBackground('#4CAF50');
            headerRange.setFontColor('#ffffff');
            headerRange.setFontWeight('bold');
            sheet.setFrozenRows(1);
        }

        var lastRow = sheet.getLastRow();
        var expenses = [];

        if (lastRow >= 2) {
            var data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
            for (var i = 0; i < data.length; i++) {
                var row = data[i];
                if (row[1] || row[2] || row[3]) { // 날짜, 대분류, 상세내역 중 하나라도 있으면
                    expenses.push({
                        no: row[0] || (i + 1),
                        date: formatDate(row[1]),
                        category: row[2] || '',
                        detail: row[3] || '',
                        amount: row[4] || 0,
                        payMethod: row[5] || '',
                        receipt: row[6] || '',
                        memo: row[7] || ''
                    });
                }
            }
        }

        // 고정지출 설정 조회 (별도 시트 또는 설정 영역)
        var fixedExpenses = [];
        var fixedSheet = spreadsheet.getSheetByName('고정지출 설정');
        if (fixedSheet && fixedSheet.getLastRow() >= 2) {
            // [수정] 6개 컬럼 읽기 (대분류, 상세내역, 금액, 결제수단, 증빙자료, 활성화)
            var fixedData = fixedSheet.getRange(2, 1, fixedSheet.getLastRow() - 1, 6).getValues();
            for (var j = 0; j < fixedData.length; j++) {
                var fRow = fixedData[j];
                // 대분류나 상세내역이 있으면 유효한 데이터로 간주
                if (fRow[0] || fRow[1]) {
                    fixedExpenses.push({
                        category: fRow[0] || '',
                        detail: fRow[1] || '',
                        amount: fRow[2] || 0,
                        payMethod: fRow[3] || '',
                        receipt: fRow[4] || '',
                        active: fRow[5] !== 'N' // 기본 활성화 ('N'일 때만 false)
                    });
                }
            }
        }

        return ContentService.createTextOutput(JSON.stringify({
            result: 'success',
            expenses: expenses,
            fixedExpenses: fixedExpenses
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            result: 'error',
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * 운영비 관리 대장 저장 (POST)
 * - payload.expenses: 운영비 데이터 배열
 * - payload.fixedExpenses: 고정지출 설정 배열 (선택사항)
 */
function handleExpensesUpdate(payload) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);

        // 1. 운영비 저장
        var sheet = spreadsheet.getSheetByName('운영비 관리 대장');
        if (!sheet) sheet = spreadsheet.getSheetByName('운영비관리');
        if (!sheet) {
            sheet = spreadsheet.insertSheet('운영비 관리 대장');
            var headers = ['No', '날짜', '대분류', '상세내역', '금액', '결제수단', '증빙자료', '비고'];
            sheet.appendRow(headers);
            var headerRange = sheet.getRange(1, 1, 1, headers.length);
            headerRange.setBackground('#4CAF50');
            headerRange.setFontColor('#ffffff');
            headerRange.setFontWeight('bold');
            sheet.setFrozenRows(1);
        }

        var expenses = payload.expenses || [];

        // 기존 데이터 삭제 (헤더 제외)
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, 8).clearContent();
        }

        // 새 데이터 입력
        if (expenses.length > 0) {
            var newData = expenses.map(function (exp, idx) {
                return [
                    idx + 1,
                    exp.date || '',
                    exp.category || '',
                    exp.detail || '',
                    exp.amount || 0,
                    exp.payMethod || '',
                    exp.receipt || '',
                    exp.memo || ''
                ];
            });
            sheet.getRange(2, 1, newData.length, 8).setValues(newData);
        }

        // 2. 고정지출 설정 저장 (있는 경우)
        if (payload.fixedExpenses && payload.fixedExpenses.length > 0) {
            var fixedSheet = spreadsheet.getSheetByName('고정지출 설정');
            if (!fixedSheet) {
                fixedSheet = spreadsheet.insertSheet('고정지출 설정');
                // [수정] 대분류, 상세내역, 월 고정금액, 결제수단, 증빙자료, 활성화
                var fixedHeaders = ['대분류', '상세내역', '월 고정금액', '결제수단', '증빙자료', '활성화'];
                fixedSheet.appendRow(fixedHeaders);
                var fHeaderRange = fixedSheet.getRange(1, 1, 1, fixedHeaders.length);
                fHeaderRange.setBackground('#FF9800');
                fHeaderRange.setFontColor('#ffffff');
                fHeaderRange.setFontWeight('bold');
                fixedSheet.setFrozenRows(1);
            }

            // 기존 고정지출 삭제
            var fLastRow = fixedSheet.getLastRow();
            if (fLastRow > 1) {
                fixedSheet.getRange(2, 1, fLastRow - 1, 6).clearContent();
            }

            // 새 고정지출 입력
            var fixedData = payload.fixedExpenses.map(function (f) {
                return [
                    f.category || '',
                    f.detail || f.itemName || '', // itemName -> detail로 명칭 변경 대응
                    f.amount || 0,
                    f.payMethod || '',
                    f.receipt || '', // 증빙자료 추가
                    f.active !== false ? 'Y' : 'N'
                ];
            });
            fixedSheet.getRange(2, 1, fixedData.length, 6).setValues(fixedData);
        }

        return ContentService.createTextOutput(JSON.stringify({
            result: 'success',
            message: '운영비가 저장되었습니다.',
            count: expenses.length
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            result: 'error',
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

// ==========================================
// 7. 고객 상태 자동 갱신 (공사기간/A/S 기간 기반)
// ==========================================

/**
 * 상태 자동 갱신 규칙:
 * - 오늘 < 공사시작일 → 상태 유지 (또는 "공사예정")
 * - 공사시작일 ≤ 오늘 ≤ 공사종료일 → 상태 = "공사중"
 * - 공사종료일 < 오늘 ≤ A/S종료일 → 상태 = "A/S기간"
 * - 오늘 > A/S종료일 → 상태 = "A/S 만료"
 */
function updateCustomerStatusByDate() {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName('계약완료');
        if (!sheet) {
            console.log('[상태갱신] 계약완료 시트가 없습니다.');
            return { updated: 0, checked: 0, error: null };
        }

        var lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            console.log('[상태갱신] 데이터가 없습니다.');
            return { updated: 0, checked: 0, error: null };
        }

        // 헤더 읽기
        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        var headerMap = {};
        headers.forEach(function (h, i) {
            headerMap[String(h).trim()] = i;
        });

        // 필수 컬럼 인덱스
        var IDX_STATUS = headerMap['상태'];
        var IDX_CONSTRUCTION = headerMap['공사기간'];
        var IDX_AS = headerMap['A/S 기간'];

        if (IDX_STATUS === undefined || IDX_CONSTRUCTION === undefined) {
            console.log('[상태갱신] 필수 컬럼이 없습니다. 상태:', IDX_STATUS, '공사기간:', IDX_CONSTRUCTION);
            return { updated: 0, checked: 0, error: '필수 컬럼 없음' };
        }

        var data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var updatedCount = 0;
        var checkedCount = 0;

        for (var i = 0; i < data.length; i++) {
            var row = data[i];
            var currentStatus = String(row[IDX_STATUS] || '').trim();
            var constructionPeriod = String(row[IDX_CONSTRUCTION] || '');
            var asEndDateStr = String(row[IDX_AS] || '');

            // 공사기간 파싱 (형식: "YYYY.MM.DD ~ YYYY.MM.DD" 또는 "YYYY-MM-DD ~ YYYY-MM-DD")
            var startDate = null;
            var endDate = null;

            if (constructionPeriod) {
                var cleanPeriod = constructionPeriod.replace(/\s+/g, '');
                var parts = cleanPeriod.split('~');
                if (parts.length >= 1 && parts[0]) {
                    startDate = parseFlexDate(parts[0]);
                }
                if (parts.length >= 2 && parts[1]) {
                    endDate = parseFlexDate(parts[1]);
                }
            }

            // A/S 종료일 파싱
            var asEndDate = null;
            if (asEndDateStr) {
                asEndDate = parseFlexDate(asEndDateStr);
            }

            // 필수 날짜 없으면 스킵 (상태 유지)
            if (!startDate || !endDate) {
                continue;
            }

            checkedCount++;
            var newStatus = '';

            // 상태 결정 로직
            if (today < startDate) {
                // 공사 시작 전 → 상태 유지 (기존 상태 그대로)
                continue;
            } else if (today >= startDate && today <= endDate) {
                // 공사중
                newStatus = '공사중';
            } else if (today > endDate) {
                // 공사 완료 후
                if (asEndDate && today <= asEndDate) {
                    // A/S 기간 중
                    newStatus = 'A/S기간';
                } else if (asEndDate && today > asEndDate) {
                    // A/S 기간 만료
                    newStatus = 'A/S 만료';
                } else {
                    // A/S 종료일 정보 없으면 공사완료 처리
                    newStatus = '공사완료';
                }
            }

            // 상태가 변경되어야 하고 현재 상태와 다를 때만 업데이트
            if (newStatus && newStatus !== currentStatus) {
                // 시트에 업데이트 (행 번호 = i + 2)
                sheet.getRange(i + 2, IDX_STATUS + 1).setValue(newStatus);
                updatedCount++;
                console.log('[상태갱신] 행 ' + (i + 2) + ': "' + currentStatus + '" → "' + newStatus + '"');
            }
        }

        console.log('[상태갱신] 완료 - 확인: ' + checkedCount + '건, 업데이트: ' + updatedCount + '건');
        return { updated: updatedCount, checked: checkedCount, error: null };

    } catch (err) {
        console.error('[상태갱신] 오류:', err);
        return { updated: 0, checked: 0, error: err.toString() };
    }
}

/**
 * 다양한 날짜 형식 파싱 (YYYY.MM.DD, YYYY-MM-DD, YYYY/MM/DD)
 */
function parseFlexDate(str) {
    if (!str) return null;

    var cleaned = String(str).trim();

    // Date 객체가 이미 들어온 경우
    if (str instanceof Date) {
        return str;
    }

    // 숫자(타임스탬프)인 경우
    if (!isNaN(str) && str > 10000000) {
        return new Date(str);
    }

    // 문자열 형식 파싱
    // 점, 대시, 슬래시 모두 지원
    var normalized = cleaned.replace(/\./g, '-').replace(/\//g, '-');

    // YYYY-MM-DD 형식 체크
    var match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
        var d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        d.setHours(0, 0, 0, 0);
        return d;
    }

    // 그냥 Date 파싱 시도
    var parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0);
        return parsed;
    }

    return null;
}

/**
 * 매일 자동 실행 트리거 설정 (00:10 KST)
 * 이 함수를 한 번 수동 실행하면 트리거가 설치됩니다.
 */
function setupDailyStatusTrigger() {
    // 기존 트리거 제거
    removeDailyStatusTrigger();

    // 새 트리거 설정 (매일 00:00~01:00 사이 실행)
    ScriptApp.newTrigger('updateCustomerStatusByDate')
        .timeBased()
        .atHour(0)      // 00시
        .nearMinute(10) // 약 10분
        .everyDays(1)   // 매일
        .inTimezone('Asia/Seoul')
        .create();

    console.log('✅ 상태 자동 갱신 트리거가 설치되었습니다. (매일 00:10 KST)');
    return '트리거 설치 완료';
}

/**
 * 상태 자동 갱신 트리거 제거
 */
function removeDailyStatusTrigger() {
    var triggers = ScriptApp.getProjectTriggers();
    var removed = 0;

    triggers.forEach(function (trigger) {
        if (trigger.getHandlerFunction() === 'updateCustomerStatusByDate') {
            ScriptApp.deleteTrigger(trigger);
            removed++;
        }
    });

    if (removed > 0) {
        console.log('🗑️ 기존 트리거 ' + removed + '개 제거됨');
    }
    return removed + '개 제거됨';
}

/**
 * 수동 테스트용 함수 - 상태 갱신 결과 확인
 */
function testStatusUpdate() {
    var result = updateCustomerStatusByDate();
    console.log('테스트 결과:', JSON.stringify(result));

    if (result.error) {
        SpreadsheetApp.getUi().alert('오류 발생: ' + result.error);
    } else {
        SpreadsheetApp.getUi().alert(
            '상태 자동 갱신 완료!\n' +
            '- 확인: ' + result.checked + '건\n' +
            '- 업데이트: ' + result.updated + '건'
        );
    }
    return result;
}

// ==========================================
// 작업 기록 (Action Log) 관리
// ==========================================

/**
 * 작업 기록 저장 (POST)
 */
function handleLogUserAction(payload) {
    var lock = LockService.getScriptLock();
    // 로깅은 중요하지만 메인 프로세스를 막으면 안 되므로 짧게 대기
    try {
        if (!lock.tryLock(3000)) {
            // 락 획득 실패 시 에러보다는 그냥 패스하거나 에러 로그
            console.error('Lock failed for logging');
            return ContentService.createTextOutput(JSON.stringify({ result: "error", error: "Lock failed" })).setMimeType(ContentService.MimeType.JSON);
        }

        var sheet = getOrCreateLogSheet();

        var timestamp = Utilities.formatDate(new Date(), "GMT+9", "yyyy-MM-dd HH:mm");
        var adminId = payload.adminId || 'Unknown';
        var actionType = payload.actionType || 'Unknown';
        var detail = payload.detail || '';

        // 데이터 추가: [일시, 작업자ID, 구분, 상세내용]
        sheet.appendRow([timestamp, adminId, actionType, detail]);

        return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({ result: "error", error: e.toString() })).setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}

/**
 * 작업 기록 조회 (GET)
 * 최근 50건 반환 (역순)
 */
function handleGetActionLogs(e) {
    try {
        var sheet = getOrCreateLogSheet();
        var lastRow = sheet.getLastRow();

        if (lastRow < 2) {
            return ContentService.createTextOutput(JSON.stringify({ success: true, logs: [] })).setMimeType(ContentService.MimeType.JSON);
        }

        // 최근 50건만 가져오기
        var limit = 50;
        var startRow = Math.max(2, lastRow - limit + 1);
        var numRows = lastRow - startRow + 1;

        if (numRows <= 0) {
            return ContentService.createTextOutput(JSON.stringify({ success: true, logs: [] })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getRange(startRow, 1, numRows, 4).getValues();

        // 역순 정렬 (최신순)
        data.reverse();

        // 객체 배열로 변환
        var logs = data.map(function (row) {
            const date = new Date(row[0]);
            // 날짜 객체인 경우 포맷팅
            const ts = (row[0] instanceof Date)
                ? Utilities.formatDate(row[0], "GMT+9", "yyyy-MM-dd HH:mm")
                : row[0];

            return {
                timestamp: ts,
                adminId: row[1],
                actionType: row[2],
                detail: row[3]
            };
        });

        return ContentService.createTextOutput(JSON.stringify({ success: true, logs: logs })).setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: e.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * 작업기록 시트 가져오기 또는 생성
 */
function getOrCreateLogSheet() {
    var ss = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
    var sheet = ss.getSheetByName(LOG_SHEET_NAME);

    if (!sheet) {
        sheet = ss.insertSheet(LOG_SHEET_NAME);
        // 헤더 설정
        sheet.getRange(1, 1, 1, 4).setValues([['일시', '작업자', '구분', '상세내용']]);
        sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#f3f3f3');
        sheet.setColumnWidth(1, 150); // 일시
        sheet.setColumnWidth(2, 100); // 작업자
        sheet.setColumnWidth(3, 120); // 구분
        sheet.setColumnWidth(4, 400); // 상세내용
        sheet.setFrozenRows(1);
    }

    return sheet;
}

/**
 * [DISABLED] 공정별 체크리스트 마스터 데이터 업데이트
 * 마스터 데이터 정합성을 위해 API를 통한 쓰기 권한이 제거되었습니다.
 */
function handleChecklistUpdate(payload) {
    return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Master DB (Checklist) is read-only via API.'
    })).setMimeType(ContentService.MimeType.JSON);
}

// 원본 로직 보존
/*
function handleChecklistUpdate_ORIGINAL(payload) {
    try {
        Logger.log('[Checklist Update] Started');
        Logger.log('Admin ID: ' + (payload.adminId || 'unknown'));

        var newData = payload.data;
        if (!newData || !Array.isArray(newData)) {
            throw new Error('유효한 데이터가 아닙니다.');
        }

        var ss = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = ss.getSheetByName('공정별체크리스트');

        // 시트가 없으면 생성 (헤더 포함)
        if (!sheet) {
            sheet = ss.insertSheet('공정별체크리스트');
        }

        // 헤더 정의
        var headers = ['번호', '항목', '내용', '진행단계', '분류', '비고'];

        // 기존 데이터 클리어 (헤더 제외하고 데이터만 교체하거나, 전체 교체)
        // 안전하게 전체 클리어 후 다시 쓰기
        sheet.clear();

        // 2D 배열로 변환
        var values = [headers];
        newData.forEach(function (item) {
            var row = [
                item.번호 || item.no || '',
                item.항목 || item.title || '',
                item.내용 || item.content || '',
                item.진행단계 || item.stage || '',
                item.분류 || item.category || '',
                item.비고 || item.note || ''
            ];
            values.push(row);
        });

        // 데이터 쓰기
        if (values.length > 0) {
            sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
        }

        // 서식 적용 (옵션)
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#efefef');
        sheet.setFrozenRows(1);

        Logger.log('[Checklist Update] Saved ' + (values.length - 1) + ' rows.');

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            result: 'success',
            count: values.length - 1,
            sheetName: '공정별체크리스트',
            updatedAt: new Date().toISOString()
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        // ...
    }
}
*/

// ==========================================
// 15. Excel Export (Read-Only Report)
// ==========================================

/**
 * Excel 데이터 내보내기 핸들러
 * Google Sheets 데이터를 읽어 Excel 형식으로 반환
 * @param {Object} e - 요청 파라미터
 */
function handleExcelExport(e) {
    try {
        var customerId = e.parameter.customerId; // 특정 고객 또는 'all'
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var customerSheet = spreadsheet.getSheetByName('고객관리_견적서');

        if (!customerSheet || customerSheet.getLastRow() < 2) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: '고객 데이터가 없습니다.'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // 고객 데이터 로드
        var customerData = customerSheet.getDataRange().getValues();
        var customers = [];

        for (var i = 1; i < customerData.length; i++) {
            var row = customerData[i];
            if (!row[0]) continue;

            var customer = buildCustomerFromRow(row);

            // JSON 데이터가 있으면 파싱
            if (row[17]) {
                try {
                    var jsonData = JSON.parse(row[17]);
                    customer = Object.assign(customer, jsonData);
                } catch (err) { }
            }

            // 특정 고객만 필터링
            if (customerId && customerId !== 'all' && customer.customerId !== customerId) {
                continue;
            }

            customers.push(customer);
        }

        if (customers.length === 0) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: '해당 고객을 찾을 수 없습니다.'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // 임시 스프레드시트 생성
        var today = Utilities.formatDate(new Date(), 'GMT+9', 'yyyyMMdd');
        var tempSpreadsheet = SpreadsheetApp.create('디자인지그_고객데이터_' + today);
        var tempFile = DriveApp.getFileById(tempSpreadsheet.getId());

        try {
            // 기본 시트 삭제 (나중에 실제 시트 추가 후)
            var sheets = tempSpreadsheet.getSheets();

            // 각 고객별 시트 생성
            customers.forEach(function (cust, idx) {
                // 시트 이름 생성: 디자인지그_고객명_현장명_계약일
                var contractDateStr = '';
                if (cust.contractDate) {
                    try {
                        var d = new Date(cust.contractDate);
                        if (!isNaN(d.getTime())) {
                            contractDateStr = Utilities.formatDate(d, 'GMT+9', 'yyyyMMdd');
                        }
                    } catch (e) { }
                }
                var sheetName = ('디자인지그_' + (cust.clientName || '고객') + '_' + (cust.projectName || '') + (contractDateStr ? '_' + contractDateStr : ''))
                    .replace(/[\\/:*?\[\]]/g, '')
                    .substring(0, 31) || ('고객' + (idx + 1));

                var sheet = tempSpreadsheet.insertSheet(sheetName);
                var rowNum = 1;

                // ========== 1. 고객 기본 정보 ==========
                sheet.getRange(rowNum, 1).setValue('【 고객 기본 정보 】').setFontWeight('bold').setBackground('#e8f0fe');
                rowNum++;
                var basicInfo = [
                    ['고객ID', cust.customerId || '-'],
                    ['고객명', cust.clientName || '-'],
                    ['연락처', cust.clientPhone || '-'],
                    ['이메일', cust.clientEmail || '-'],
                    ['현장명', cust.projectName || '-'],
                    ['현장주소', cust.siteAddress || cust.clientAddress || '-'],
                    ['계약일', cust.contractDate || '-'],
                    ['공사기간', cust.constructionPeriod || '-'],
                    ['상태', cust.status || '-'],
                    ['담당자', cust.manager || '-']
                ];
                sheet.getRange(rowNum, 1, basicInfo.length, 2).setValues(basicInfo);
                // 첫 번째 열 (라벨) 스타일링
                sheet.getRange(rowNum, 1, basicInfo.length, 1).setFontWeight('bold').setBackground('#f8f9fa');
                rowNum += basicInfo.length + 1;

                // ========== 2. 공정별 체크리스트 (필수) ==========
                sheet.getRange(rowNum, 1).setValue('【 공정별 체크리스트 】').setFontWeight('bold').setBackground('#e8f0fe');
                rowNum++;
                var checklistHeaders = ['공정명', '체크여부', '메모', '완료일'];
                sheet.getRange(rowNum, 1, 1, checklistHeaders.length).setValues([checklistHeaders]).setFontWeight('bold').setBackground('#f8f9fa');
                rowNum++;

                var checklist = cust.checklist || cust.checklistItems || [];
                if (checklist.length > 0) {
                    checklist.forEach(function (item) {
                        var checkStatus = item.checked === true || item.checked === 'true' || item.status === 'completed' ? 'O' : 'X';
                        sheet.getRange(rowNum, 1, 1, 4).setValues([[
                            item.name || item.stepName || item.process || '-',
                            checkStatus,
                            item.memo || item.note || item.remarks || '-',
                            item.completedDate || item.endDate || item.date || '-'
                        ]]);
                        rowNum++;
                    });
                } else {
                    // 데이터 없음 표시
                    sheet.getRange(rowNum, 1, 1, 4).setValues([['(데이터 없음)', '-', '-', '-']]).setFontColor('#999999');
                    rowNum++;
                }
                rowNum++;

                // ========== 3. 공사 스케줄 ==========
                sheet.getRange(rowNum, 1).setValue('【 공사 스케줄 】').setFontWeight('bold').setBackground('#e8f0fe');
                rowNum++;
                var scheduleHeaders = ['공정', '세부공정', '시작일', '종료일', '상태'];
                sheet.getRange(rowNum, 1, 1, scheduleHeaders.length).setValues([scheduleHeaders]).setFontWeight('bold').setBackground('#f8f9fa');
                rowNum++;

                var schedules = cust.schedules || cust.schedule || [];
                if (schedules.length > 0) {
                    schedules.forEach(function (s) {
                        sheet.getRange(rowNum, 1, 1, 5).setValues([[
                            s.category || s.process || '-',
                            s.name || s.stepName || s.detail || '-',
                            s.start || s.startDate || '-',
                            s.end || s.endDate || '-',
                            s.status || '-'
                        ]]);
                        rowNum++;
                    });
                } else {
                    sheet.getRange(rowNum, 1, 1, 5).setValues([['(데이터 없음)', '-', '-', '-', '-']]).setFontColor('#999999');
                    rowNum++;
                }
                rowNum++;

                // ========== 4. A/S 관리 기록 ==========
                sheet.getRange(rowNum, 1).setValue('【 A/S 관리 기록 】').setFontWeight('bold').setBackground('#e8f0fe');
                rowNum++;
                var asHeaders = ['카테고리', '브랜드', '품목', '보증기간', '비고'];
                sheet.getRange(rowNum, 1, 1, asHeaders.length).setValues([asHeaders]).setFontWeight('bold').setBackground('#f8f9fa');
                rowNum++;

                var asList = cust.as_list || cust.asList || cust.asItems || [];
                if (asList.length > 0) {
                    asList.forEach(function (a) {
                        sheet.getRange(rowNum, 1, 1, 5).setValues([[
                            a.category || '-',
                            a.brand || '-',
                            a.item || a.itemName || '-',
                            a.warranty || a.warrantyPeriod || '-',
                            a.note || a.remarks || '-'
                        ]]);
                        rowNum++;
                    });
                } else {
                    sheet.getRange(rowNum, 1, 1, 5).setValues([['(데이터 없음)', '-', '-', '-', '-']]).setFontColor('#999999');
                    rowNum++;
                }

                // 컬럼 너비 자동 조정
                sheet.autoResizeColumns(1, 5);
            });

            // 기본 빈 시트 삭제
            var allSheets = tempSpreadsheet.getSheets();
            if (allSheets.length > 1 && allSheets[0].getName() === 'Sheet1') {
                tempSpreadsheet.deleteSheet(allSheets[0]);
            }

            // xlsx로 변환 (export URL 사용)
            var exportUrl = 'https://docs.google.com/spreadsheets/d/' + tempSpreadsheet.getId() + '/export?format=xlsx';

            // 다운로드 URL 반환 (직접 다운로드용)
            // 또는 base64로 반환
            var xlsxBlob = UrlFetchApp.fetch(exportUrl, {
                headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() }
            }).getBlob();

            var base64Data = Utilities.base64Encode(xlsxBlob.getBytes());
            var fileName = 'designjig_고객데이터_' + today + '.xlsx';

            // 임시 파일 삭제
            tempFile.setTrashed(true);

            return ContentService.createTextOutput(JSON.stringify({
                result: 'success', // User request strict key
                success: true,     // Backward compatibility
                fileName: fileName,
                customerCount: customers.length,
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                data: base64Data
            })).setMimeType(ContentService.MimeType.JSON);

        } catch (innerErr) {
            // 에러 시 임시 파일 정리
            try { tempFile.setTrashed(true); } catch (e) { }
            throw innerErr;
        }

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: err.toString(),
            stack: err.stack
        })).setMimeType(ContentService.MimeType.JSON);
    }
}



/**
 * [추가] 공정별 체크리스트 마스터 데이터 업데이트 (순서 저장)
 */
function handleChecklistMasterUpdate(payload) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: 'Server busy'
        })).setMimeType(ContentService.MimeType.JSON);
    }

    try {
        var items = payload.data; // [{번호:1, 항목:..., 내용:..., 진행단계:..., category:...}, ...]
        if (!items || !Array.isArray(items)) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                message: 'Invalid data format'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var spreadsheet = getTargetSpreadsheet(CUSTOMER_SHEET_ID);

        // 1. [메인] 유저가 지정한 이름: '공정 체크리스트'
        var sheet = spreadsheet.getSheetByName('공정 체크리스트');
        // Fallbacks
        if (!sheet) sheet = spreadsheet.getSheetByName('공정체크리스트');
        if (!sheet) sheet = spreadsheet.getSheetByName('공정별 체크리스트');
        if (!sheet) sheet = spreadsheet.getSheetByName('checklist');

        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                message: '공정 체크리스트 시트를 찾을 수 없습니다.'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // 2. 기존 데이터 클리어 (헤더 제외)
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        }

        // 3. 새 데이터 준비
        // 헤더 순서: 번호, 항목, 내용, 진행단계, 분류, 비고 (시트 헤더와 일치해야 함)
        // [주의] 'category' 필드는 '분류' 컬럼에 매핑됨 (또는 헤더가 'category'라면 그대로 사용)

        // 헤더 확인
        var headerValues = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

        var newRows = items.map(function (item) {
            var rowData = [];
            headerValues.forEach(function (header) {
                var key = header;
                var val = item[key] || '';

                // key mapping fallback
                if (!val) {
                    if ((header === '분류' || header === '카테고리') && item['category']) val = item['category'];
                }

                rowData.push(val);
            });
            return rowData;
        });

        // 4. 데이터 쓰기
        if (newRows.length > 0) {
            sheet.getRange(2, 1, newRows.length, newRows[0].length).setValues(newRows);
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: '체크리스트 순서가 저장되었습니다.',
            count: newRows.length
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: '저장 실패: ' + error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}
