/**
 * [통합형] 디자인지그 웹사이트 & 관리자 동기화 스크립트
 *
 * 1. 웹사이트 상담 문의 접수 및 이메일 발송
 * 2. 관리자 페이지(adminwonpro.html) 고객 데이터 동기화
 * 3. 트리거 기반 자동화 (상담 상태 변경 시 이동, A/S 만료 알림)
 *
 * 마지막 업데이트: 2026-01-19 (공사 스케줄 관리 시트 연동 수정)
 */

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
const COST_SHEET_ID = '1Yp9UjY37PlBgXdyC2_acwfa8prxo7yD_VKAOcnIQQVw';

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
    CHECKLIST: '6040d967e63e4268905739f2a8be436e'
};

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
        // 1. 원가관리표 업데이트 요청
        if (payload.action === 'updateCost') {
            return handleCostUpdate(payload);
        }

        // 1.5. 샘플 견적서 처리
        if (payload.action === 'saveSampleEstimate') {
            return handleSaveSampleEstimate(payload);
        }
        if (payload.action === 'deleteSampleEstimate') {
            return handleDeleteSampleEstimate(payload);
        }
        if (payload.action === 'restoreCostDatabase') {
            return handleRestoreCostDatabase(payload);
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
        if (sheetParam === '공정별체크리스트' || sheetParam === '공정별_체크리스트' || sheetParam === '공정별 체크리스트') {
            return handleChecklistGet(e);
        }


        // 2.5. 샘플 견적서 조회
        if (actionParam === 'getSampleEstimates') {
            return handleGetSampleEstimates();
        }
        if (actionParam === 'getSampleEstimate') {
            return handleGetSampleEstimate(e.parameter.id);
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
// 2.5 Notion Integration Logic
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
        } else {
            throw new Error('지원하지 않는 내보내기 유형입니다: ' + type);
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            notionUrl: result.url,
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

// 1. 고객 정보 내보내기
function exportCustomerToNotion(customerId, data) {
    // 디버깅 로그
    console.log('📤 Notion Export - Customer ID:', customerId);
    console.log('📤 Notion Export - Data:', JSON.stringify(data));

    // API 키 확인
    const notionApiKey = getNotionApiKey();
    if (!notionApiKey) {
        throw new Error('Notion API 키가 설정되지 않았습니다. setupNotionProperties() 함수를 실행해주세요.');
    }

    const customerName = data['성명'] || '이름없음';
    const projectName = data['공사명'] || data['프로젝트명'] || '';
    const contractDate = data['계약일'] || '';

    // 제목 형식: 이름_공사명_계약일 (예: 홍길동_강남아파트인테리어_2026-01-15)
    const titleParts = [customerName];
    if (projectName) titleParts.push(projectName);
    if (contractDate) titleParts.push(contractDate);
    const notionTitle = titleParts.join('_');

    console.log('📋 Notion Title:', notionTitle);

    // 1. 기존 페이지 검색 (고객ID로 검색 - 고유값)
    // 고객ID가 없으면 제목으로 검색
    const searchId = customerId || notionTitle;
    let searchResponse;
    try {
        // 먼저 고객ID로 검색 시도 (rich_text 속성)
        searchResponse = callNotionAPI('/databases/' + NOTION_DB_IDS.PROJECTS + '/query', 'POST', {
            filter: {
                property: '고객ID',
                rich_text: {
                    equals: customerId
                }
            }
        });
    } catch (e) {
        console.error('노션 검색 실패:', e.toString());
        throw new Error('노션 데이터베이스 검색 실패: ' + e.toString());
    }

    let pageId;
    let notionUrl;

    // 데이터 전처리 (숫자형 변환 등)
    const totalAmountStr = (data['총계약금액'] || '').toString().replace(/[^0-9.]/g, '');
    const totalAmount = parseFloat(totalAmountStr) || 0;

    const areaStr = (data['평수'] || '').toString().replace(/[^0-9.]/g, '');
    const area = parseFloat(areaStr) || 0;

    console.log('📊 Parsed values - Amount:', totalAmount, ' / Area:', area);

    // Notion Properties 구성 (스크린샷 기반)
    // 값이 없는 Date 타입은 아예 키를 빼야 에러가 안남
    const properties = {
        // 현장명이 Title 속성 (Aa 아이콘) - 이름_공사명_계약일 형식으로 저장
        '현장명': { title: [{ text: { content: notionTitle } }] },

        // 성명은 rich_text 속성
        '성명': { rich_text: [{ text: { content: customerName } }] },

        // 연락처는 phone_number 속성
        '연락처': { phone_number: data['연락처'] || null },

        '이메일': { email: data['이메일'] || null },

        '주소': { rich_text: [{ text: { content: data['주소'] || '' } }] },
        '현장주소': { rich_text: [{ text: { content: data['현장주소'] || '' } }] },

        // 배우자 정보
        '배우자 성명': { rich_text: [{ text: { content: data['배우자 성명'] || '' } }] },

        '공사 담당자': { rich_text: [{ text: { content: data['공사 담당자'] || '' } }] },
        '건물유형': { rich_text: [{ text: { content: data['건물유형'] || '' } }] },
        '유입경로': { rich_text: [{ text: { content: data['유입경로'] || '' } }] },

        '고객 요청사항': { rich_text: [{ text: { content: data['고객 요청사항'] || '' } }] },
        '내부 메모': { rich_text: [{ text: { content: data['내부 메모'] || '' } }] },
        '특약사항': { rich_text: [{ text: { content: data['특약사항'] || '' } }] },
        '고객ID': { rich_text: [{ text: { content: customerId || '' } }] },

        '총 계약금액 (VAT 포함)': { number: totalAmount },
        '평수': { number: area }
    };

    // 배우자 연락처 - Phone 속성은 빈 문자열이면 에러남
    if (data['배우자 연락처']) {
        properties['배우자 연락처'] = { phone_number: data['배우자 연락처'] };
    }

    // 날짜 필드들 - 값이 있을 때만 전송 (YYYY-MM-DD 형식 필요)
    if (data['이사날짜'] && data['이사날짜'].match(/^\d{4}-\d{2}-\d{2}/)) {
        properties['이사날짜'] = { date: { start: data['이사날짜'] } };
    }
    if (data['계약일'] && data['계약일'].match(/^\d{4}-\d{2}-\d{2}/)) {
        properties['계약일'] = { date: { start: data['계약일'] } };
    }
    if (data['착공일'] && data['착공일'].match(/^\d{4}-\d{2}-\d{2}/)) {
        properties['착공일'] = { date: { start: data['착공일'] } };
    }
    if (data['준공일'] && data['준공일'].match(/^\d{4}-\d{2}-\d{2}/)) {
        properties['준공일'] = { date: { start: data['준공일'] } };
    }
    if (data['잔금일'] && data['잔금일'].match(/^\d{4}-\d{2}-\d{2}/)) {
        properties['잔금일'] = { date: { start: data['잔금일'] } };
    }

    console.log('📝 Properties to send:', JSON.stringify(properties));

    try {
        if (searchResponse.results && searchResponse.results.length > 0) {
            // 업데이트
            pageId = searchResponse.results[0].id;
            notionUrl = searchResponse.results[0].url;
            console.log('🔄 Updating existing page:', pageId);
            callNotionAPI('/pages/' + pageId, 'PATCH', { properties: properties });
        } else {
            // 생성
            console.log('➕ Creating new page in database:', NOTION_DB_IDS.PROJECTS);
            const createResponse = callNotionAPI('/pages', 'POST', {
                parent: { database_id: NOTION_DB_IDS.PROJECTS },
                properties: properties
            });
            pageId = createResponse.id;
            notionUrl = createResponse.url;
        }

        // 스케줄 데이터가 있거나 특약사항이 있으면 페이지 본문에 추가
        if ((data.scheduleRows && data.scheduleRows.length > 0) || data['특약사항']) {
            addScheduleBlocksToPageV2(pageId, data.scheduleRows || [], data['특약사항'] || '');
        }

    } catch (e) {
        console.error('노션 페이지 생성/수정 실패:', e.toString());
        throw new Error('노션 페이지 저장 실패: ' + e.toString());
    }

    console.log('✅ Notion export successful:', notionUrl);
    return { url: notionUrl, pageId: pageId };
}

// 페이지에 스케줄 및 유의사항 블록 추가
function addScheduleBlocksToPage(pageId, scheduleRows, specialNote) {
    console.log('📅 Adding schedule/note blocks to page:', pageId);

    // 먼저 기존 블록 가져오기 (싹 지우고 다시 쓰는게 깔끔함)
    // 주의: 유저가 수동으로 작성한 다른 내용이 있을 수 있으므로, "공정 스케줄" 헤더 아래만 지우거나
    // 안전하게 구분선 아래를 지우는 방식을 사용
    try {
        const existingBlocks = callNotionAPI('/blocks/' + pageId + '/children', 'GET');

        let shouldDelete = false;
        if (existingBlocks.results) {
            for (const block of existingBlocks.results) {
                // 구분선(divider)이 있으면 그 아래는 자동 생성 영역으로 간주하고 삭제
                if (block.type === 'divider') {
                    shouldDelete = true;
                }

                // 또는 "📋 공정 스케줄" 헤더가 있으면 그 아래 삭제
                if (block.type === 'heading_2' && block.heading_2?.rich_text?.[0]?.plain_text?.includes('공정 스케줄')) {
                    shouldDelete = true;
                }

                if (shouldDelete) {
                    try {
                        callNotionAPI('/blocks/' + block.id, 'DELETE');
                    } catch (e) {
                        console.log('블록 삭제 실패 (무시):', e.toString());
                    }
                }
            }
        }
    } catch (e) {
        console.log('기존 블록 조회 실패:', e.toString());
    }

    // 새 블록 구성
    const blocks = [];

    // 1. 구분선 (자동 생성 영역 시작 표시)
    blocks.push({ type: 'divider', divider: {} });

    // 2. 유의사항 (특약사항) - 콜아웃 박스로 강조
    if (specialNote) {
        blocks.push({
            type: 'heading_3',
            heading_3: { rich_text: [{ text: { content: '🔔 유의사항 (특약사항)' } }] }
        });

        blocks.push({
            type: 'callout',
            callout: {
                rich_text: [{ text: { content: specialNote } }],
                icon: { emoji: '�' },
                color: 'gray_background'
            }
        });

        // 간격
        blocks.push({ type: 'paragraph', paragraph: { rich_text: [] } });
    }

    // 3. 스케줄 표
    if (scheduleRows && scheduleRows.length > 0) {
        blocks.push({
            type: 'heading_2',
            heading_2: { rich_text: [{ text: { content: '📋 공정 스케줄' } }] }
        });

        const tableRows = [];

        // 헤더 행
        tableRows.push({
            type: 'table_row',
            table_row: {
                cells: [
                    [{ type: 'text', text: { content: '공정명', annotations: { bold: true } } }],
                    [{ type: 'text', text: { content: '기간', annotations: { bold: true } } }],
                    [{ type: 'text', text: { content: '상태', annotations: { bold: true } } }],
                    [{ type: 'text', text: { content: '담당/비고', annotations: { bold: true } } }]
                ]
            }
        });

        // 데이터 행
        for (let i = 0; i < scheduleRows.length; i++) {
            const row = scheduleRows[i];
            const category = row.category || row['대분류'] || '';
            const process = row.process || row['공정명'] || '';
            const startDate = row.startDate || row['시작일'] || '';
            const endDate = row.endDate || row['종료일'] || '';
            const status = row.status || row['상태'] || '';
            const manager = row.manager || row['담당자'] || '';

            // 날짜 포맷
            const simpleStart = startDate.substring(5); // MM-DD
            const simpleEnd = endDate.substring(5);
            const dateStr = (simpleStart === simpleEnd) ? simpleStart : `${simpleStart}~${simpleEnd}`;
            const processName = (category ? `[${category}] ` : '') + process;

            // 상태 표현
            let statusText = status;
            if (status === '완료') statusText = '✅ 완료';
            else if (status === '진행중') statusText = '🔄 진행중';
            else if (status === '지연') statusText = '⚠️ 지연';
            else if (status === '예정') statusText = '🗓️ 예정';

            tableRows.push({
                type: 'table_row',
                table_row: {
                    cells: [
                        [{ type: 'text', text: { content: processName } }],
                        [{ type: 'text', text: { content: dateStr } }],
                        [{ type: 'text', text: { content: statusText } }],
                        [{ type: 'text', text: { content: manager } }]
                    ]
                }
            });
        }

        blocks.push({
            type: 'table',
            table: {
                table_width: 4,
                has_column_header: true,
                has_row_header: false,
                children: tableRows
            }
        });
    }

    // 블록 추가 요청
    if (blocks.length > 0) {
        try {
            callNotionAPI('/blocks/' + pageId + '/children', 'PATCH', {
                children: blocks
            });
            console.log('✅ Schedule/Note blocks added successfully');
        } catch (e) {
            console.error('블록 추가 실패:', e.toString());
        }
    }
}



// 2. 스케줄 내보내기 (개별 스케줄 항목을 데이터베이스에 추가)
function exportScheduleToNotion(customerId, data) {
    console.log('📅 Exporting schedule to Notion for customer:', customerId);

    // 1. 먼저 고객 페이지 찾기/생성 (pageId 필요)
    const customerResult = exportCustomerToNotion(customerId, {
        '성명': data['성명'] || data['고객명'],
        '현장주소': data['현장주소'] || ''
    });
    const customerPageId = customerResult.pageId;

    if (!customerPageId) {
        throw new Error('고객 페이지를 찾을 수 없습니다.');
    }

    console.log('👤 Customer page ID:', customerPageId);

    // 2. 기존 스케줄 모두 삭제 (고객ID 기준)
    try {
        const existingSchedules = callNotionAPI('/databases/' + NOTION_DB_IDS.SCHEDULE + '/query', 'POST', {
            filter: {
                property: '프로젝트 관리',
                relation: { contains: customerPageId }
            }
        });

        if (existingSchedules.results && existingSchedules.results.length > 0) {
            console.log('🗑️ Deleting existing schedules:', existingSchedules.results.length);
            for (const page of existingSchedules.results) {
                try {
                    callNotionAPI('/pages/' + page.id, 'PATCH', { archived: true });
                } catch (e) {
                    console.log('스케줄 삭제 실패 (무시):', e.toString());
                }
            }
        }
    } catch (e) {
        console.log('기존 스케줄 검색 실패 (무시):', e.toString());
    }

    // 3. 새 스케줄 항목들 생성
    const scheduleList = data.공정목록 || [];
    let createdCount = 0;

    for (const item of scheduleList) {
        const processName = item.공정 || item.process || '';
        const startDate = item.시작일 || item.startDate || '';
        const endDate = item.종료일 || item.endDate || '';
        const manager = item.담당자 || item.manager || '';
        const status = item.상태 || item.status || '';
        const memo = item.비고 || item.memo || '';

        const properties = {
            // 공정명이 Title 속성
            '공정명': { title: [{ text: { content: processName } }] },

            // 프로젝트 관리 - 관계형 (고객 페이지 연결)
            '프로젝트 관리': { relation: [{ id: customerPageId }] },

            // 담당자
            '담당자': { rich_text: [{ text: { content: manager } }] },

            // 비고
            '비고': { rich_text: [{ text: { content: memo } }] }
        };

        // 시작~종료 날짜 (Date Range)
        if (startDate && startDate.match(/^\d{4}-\d{2}-\d{2}/)) {
            const dateObj = { start: startDate };
            if (endDate && endDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                dateObj.end = endDate;
            }
            properties['시작~종료'] = { date: dateObj };
        }

        try {
            callNotionAPI('/pages', 'POST', {
                parent: { database_id: NOTION_DB_IDS.SCHEDULE },
                properties: properties
            });
            createdCount++;
        } catch (e) {
            console.error('스케줄 항목 생성 실패:', processName, e.toString());
        }
    }

    console.log('✅ Schedule export complete. Created:', createdCount, 'items');
    return { url: customerResult.url, createdCount: createdCount };
}

// 3. 체크리스트 내보내기
function exportChecklistToNotion(customerId, data) {
    const name = data['성명'] || data['고객명'] || '고객';
    const title = name + ' - 공정별 체크리스트';

    const properties = {
        '이름': { title: [{ text: { content: title } }] },
        '고객ID': { rich_text: [{ text: { content: customerId } }] },
        '현장': { rich_text: [{ text: { content: data.현장주소 || '' } }] },
        '진행율': { number: data.완료항목수 / data.전체항목수 || 0 }
    };

    const children = [
        {
            object: 'block',
            type: 'heading_2',
            heading_2: { rich_text: [{ text: { content: '현장 체크리스트' } }] }
        },
        {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ text: { content: `총 ${data.전체항목수}개 중 ${data.완료항목수}개 완료` } }] }
        }
    ];

    if (data.체크리스트 && Array.isArray(data.체크리스트)) {
        data.체크리스트.forEach(item => {
            children.push({
                object: 'block',
                type: 'to_do',
                to_do: {
                    rich_text: [{ text: { content: `[${item.분류}] ${item.항목}: ${item.내용}` } }],
                    checked: true // 이미 완료된 항목만 넘어옴 (프론트 로직상)
                }
            });
        });
    }

    // DB 검색 및 생성/업데이트
    const searchResponse = callNotionAPI('/databases/' + NOTION_DB_IDS.CHECKLIST + '/query', 'POST', {
        filter: { property: '고객ID', rich_text: { equals: customerId } }
    });

    let notionUrl;
    if (searchResponse.results.length > 0) {
        const pageId = searchResponse.results[0].id;
        notionUrl = searchResponse.results[0].url;
        callNotionAPI('/pages/' + pageId, 'PATCH', { properties: properties });
        callNotionAPI('/blocks/' + pageId + '/children', 'PATCH', { children: children });
    } else {
        const createResponse = callNotionAPI('/pages', 'POST', {
            parent: { database_id: NOTION_DB_IDS.CHECKLIST },
            properties: properties,
            children: children
        });
        notionUrl = createResponse.url;
    }

    return { url: notionUrl };
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
 * 원가관리표 데이터베이스 업데이트 (POST)
 * Google Sheets에 원가관리표 데이터를 저장합니다.
 * 새 구조: A열=카테고리, B열=NO/MEMO, C열=구분, D열=품명, E열=상세내용, F열=단위, G열=수량, H열=단가, I열=합계
 */
function handleCostUpdate(payload) {
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
        return ContentService.createTextOutput(JSON.stringify({
            error: err.toString(),
            stack: err.stack
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

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

// -------------------------------------------------------------
// [추가] 공정별 체크리스트 데이터 불러오기
// -------------------------------------------------------------
function handleChecklistGet(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName('공정별 체크리스트');

        // 띄어쓰기 유연성 제공
        if (!sheet) sheet = spreadsheet.getSheetByName('공정별체크리스트');

        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                message: '공정별 체크리스트 시트를 찾을 수 없습니다.'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getDataRange().getValues();
        if (data.length < 2) {
            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                data: [],
                count: 0
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var headers = data[0];
        var rows = data.slice(1);

        var checklistItems = rows.map(function (row) {
            var item = {};
            headers.forEach(function (header, index) {
                // 시트 헤더 이름을 그대로 키값으로 사용 ('번호', '항목', '내용', '진행단계', '분류', '비고')
                item[header] = row[index] || '';
            });
            return item;
        }).filter(function (item) {
            // 번호가 있는 행만 유효한 것으로 간주
            return item['번호'];
        });

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            data: checklistItems,
            count: checklistItems.length
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: '체크리스트 데이터 로드 실패: ' + error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

// 권한 요청용 테스트 함수 (한 번 실행하면 권한 팝업이 뜹니다)
function requestPermissions() {
    try {
        const response = UrlFetchApp.fetch('https://api.notion.com/v1/users/me', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + getNotionApiKey(),
                'Notion-Version': '2022-06-28'
            },
            muteHttpExceptions: true
        });
        Logger.log('✅ 권한 승인 완료! 응답: ' + response.getContentText());
    } catch (e) {
        Logger.log('❌ 에러: ' + e.toString());
    }
}

// [V2] 페이지에 스케줄 및 유의사항 블록 추가 (Robust Version)
function addScheduleBlocksToPageV2(pageId, scheduleRows, specialNote) {
    console.log('📅 Adding schedule/note blocks to page (V2):', pageId);

    // 1. 기존 블록 정리 (Bottom-up, 안전한 삭제)
    try {
        const existingBlocks = callNotionAPI('/blocks/' + pageId + '/children', 'GET');
        
        if (existingBlocks.results && existingBlocks.results.length > 0) {
            // 역순으로 탐색
            for (let i = existingBlocks.results.length - 1; i >= 0; i--) {
                const block = existingBlocks.results[i];
                let shouldDelete = false;

                // 자동 생성된 블록 식별 (구분선, 공정 스케줄 헤더, 유의사항 헤더 등)
                if (block.type === 'divider') shouldDelete = true;
                if (block.type === 'heading_2' && block.heading_2?.rich_text?.[0]?.plain_text?.includes('공정 스케줄')) shouldDelete = true;
                if (block.type === 'heading_3' && block.heading_3?.rich_text?.[0]?.plain_text?.includes('유의사항')) shouldDelete = true;
                
                // 만약 이 블록이 삭제 대상이라면
                if (shouldDelete) {
                    try {
                        callNotionAPI('/blocks/' + block.id, 'DELETE');
                    } catch (e) {
                        // 이미 삭제됨 등 무시
                    }
                }
            }
        }
    } catch (e) {
        console.log('기존 블록 조회 실패 (무시):', e.toString());
    }

    // 2. 유의사항(Callout) 추가
    try {
        const noteBlocks = [];
        noteBlocks.push({ type: 'divider', divider: {} }); // 구분선

        if (specialNote && String(specialNote).trim() !== '') {
            noteBlocks.push({
                type: 'heading_3',
                heading_3: { rich_text: [{ text: { content: '🔔 유의사항 (특약사항)' } }] }
            });
            
            noteBlocks.push({
                type: 'callout',
                callout: {
                    rich_text: [{ text: { content: String(specialNote) } }],
                    icon: { emoji: '💡' },
                    color: 'gray_background'
                }
            });
            
            // 여백
            noteBlocks.push({ type: 'paragraph', paragraph: { rich_text: [] } });
        }

        if (noteBlocks.length > 0) {
            callNotionAPI('/blocks/' + pageId + '/children', 'PATCH', { children: noteBlocks });
        }
    } catch (e) {
        console.error('유의사항 블록 추가 실패:', e.toString());
    }

    // 3. 스케줄 테이블 추가
    try {
        if (scheduleRows && scheduleRows.length > 0) {
            const tableBlocks = [];
            
            // 제목
            tableBlocks.push({
                type: 'heading_2',
                heading_2: { rich_text: [{ text: { content: '📋 공정 스케줄' } }] }
            });

            const tableRows = [];

            // [헤더 행]
            tableRows.push({
                type: 'table_row',
                table_row: {
                    cells: [
                        [{ type: 'text', text: { content: '공정명', annotations: { bold: true } } }],
                        [{ type: 'text', text: { content: '기간', annotations: { bold: true } } }],
                        [{ type: 'text', text: { content: '상태', annotations: { bold: true } } }],
                        [{ type: 'text', text: { content: '담당/비고', annotations: { bold: true } } }]
                    ]
                }
            });

            // [데이터 행]
            for (let i = 0; i < scheduleRows.length; i++) {
                const row = scheduleRows[i];
                
                // 데이터 정제 (undefined/null 방지)
                const process = (row.process || row['공정명'] || '공정 없음').toString();
                const category = (row.category || row['대분류'] || '').toString();
                const startDate = (row.startDate || row['시작일'] || '').toString();
                const endDate = (row.endDate || row['종료일'] || '').toString();
                const status = (row.status || row['상태'] || '').toString();
                const manager = (row.manager || row['담당자'] || '').toString();
                
                // 날짜 표시
                let dateStr = '';
                if (startDate) {
                    const s = startDate.length >= 10 ? startDate.substring(5) : startDate;
                    const e = endDate.length >= 10 ? endDate.substring(5) : endDate;
                    dateStr = (s === e || !e) ? s : `${s}~${e}`;
                }

                // 공정명 표시
                const processName = category ? `[${category}] ${process}` : process;

                // 상태 이모지
                let statusText = status;
                if (status === '완료') statusText = '✅ 완료';
                else if (status === '진행중') statusText = '🔄 진행중';
                else if (status === '지연') statusText = '⚠️ 지연';
                else if (status === '예정') statusText = '🗓️ 예정';

                tableRows.push({
                    type: 'table_row',
                    table_row: {
                        cells: [
                            [{ type: 'text', text: { content: processName || '-' } }],
                            [{ type: 'text', text: { content: dateStr || '-' } }],
                            [{ type: 'text', text: { content: statusText || '-' } }],
                            [{ type: 'text', text: { content: manager || '-' } }]
                        ]
                    }
                });
            }

            // 테이블 블록 감싸기
            tableBlocks.push({
                type: 'table',
                table: {
                    table_width: 4,
                    has_column_header: true,
                    has_row_header: false,
                    children: tableRows
                }
            });

            callNotionAPI('/blocks/' + pageId + '/children', 'PATCH', { children: tableBlocks });
            console.log('✅ Schedule table added successfully');
        }
    } catch (e) {
        console.error('스케줄 테이블 추가 실패:', e.toString());
    }
}
