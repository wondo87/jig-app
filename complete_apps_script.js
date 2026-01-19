/**
 * [통합형] 디자인지그 웹사이트 & 관리자 동기화 스크립트
 *
 * 1. 웹사이트 상담 문의 접수 및 이메일 발송
 * 2. 관리자 페이지(adminwonpro.html) 고객 데이터 동기화
 * 3. 트리거 기반 자동화 (상담 상태 변경 시 이동, A/S 만료 알림)
 *
 * 마지막 업데이트: 2026-01-19 (공정별 체크리스트 추가)
 */

// ==========================================
// 1. 설정 및 상수 정의
// ==========================================

// [상담용] 스프레드시트 ID (기존 상담 문의가 쌓이는 시트)
const CONSULTING_SHEET_ID = '1Yp9UjY37PlBgXdyC2_acwfa8prxo7yD_VKAOcnIQQVw';

// [고객관리용] 스프레드시트 ID (관리자 페이지와 연동되는 시트)
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
const SENDER_EMAIL = 'designjig.office@gmail.com';

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
    if (!lock.tryLock(10000)) {
        return ContentService.createTextOutput(JSON.stringify({ result: "error", error: "Server busy" }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    try {
        var contents = e.postData.contents;
        var payload;

        try {
            payload = JSON.parse(contents);
        } catch (error) {
            payload = e.parameter || {};
        }

        if (payload.action === 'updateCost') {
            return handleCostUpdate(payload);
        }

        if (payload.action === 'updateSettlement') {
            return handleSettlementUpdate(payload);
        }

        if (payload.action === 'saveSampleEstimate') {
            return handleSaveSampleEstimate(payload);
        }
        if (payload.action === 'deleteSampleEstimate') {
            return handleDeleteSampleEstimate(payload);
        }
        if (payload.action === 'restoreCostDatabase') {
            return handleRestoreCostDatabase(payload);
        }

        var isAdminAction = (payload.action === 'admin' || payload.action === 'deleteAdmin');
        var isCustomerSync = (payload.data && payload.data.customerId) || (payload.customerId);

        if (isAdminAction || isCustomerSync) {
            return handleCustomerSync(payload);
        }

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
        var sheetParam = e.parameter.sheet;
        var actionParam = e.parameter.action;

        if (sheetParam === '원가관리표') {
            return handleCostGet(e);
        }

        if (sheetParam === 'settlement' || sheetParam === '정산관리대장' || sheetParam === '정산 관리 대장') {
            return handleSettlementGet(e);
        }

        if (sheetParam === '관리자' || sheetParam === '고객관리' || sheetParam === '고객관리_견적서' || sheetParam === '계약완료고객' || sheetParam === '계약완료') {
            return handleCustomerGet(e);
        }

        if (sheetParam === 'AS관리리스트' || sheetParam === 'as_list') {
            if (actionParam === 'getGuidelines') {
                return handleGetASGuidelines(e);
            }
            return handleASListGet(e);
        }

        if (sheetParam === 'schedule_template' || sheetParam === '공사스케줄관리' || sheetParam === '공사 스케줄 관리' || sheetParam === '공사_스케줄') {
            if (actionParam === 'getGuidelines') {
                return handleGetScheduleGuidelines(e);
            }
            return handleScheduleTemplateGet(e);
        }

        // [신규] 공정별 체크리스트
        if (sheetParam === '공정별체크리스트' || sheetParam === '공정별_체크리스트' || sheetParam === '공정별 체크리스트') {
            return handleChecklistGet(e);
        }

        if (actionParam === 'getSampleEstimates') {
            return handleGetSampleEstimates();
        }
        if (actionParam === 'getSampleEstimate') {
            return handleGetSampleEstimate(e.parameter.id);
        }

        return handleConsultingGet(e);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

