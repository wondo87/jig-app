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

        if (sheetParam === '관리자' || sheetParam === '고객관리' || sheetParam === '고객관리_견적서' || sheetParam === '계약완료고객' || sheetParam === '계약완료') {
            return handleCustomerGet(e);
        }

        if (sheetParam === 'AS관리리스트' || sheetParam === 'as_list') {
            if (actionParam === 'getGuidelines') {
                return handleGetASGuidelines(e);
            }
            return handleASListGet(e);
        }

        // 공사 스케줄 템플릿 요청
        if (sheetParam === 'schedule_template' || sheetParam === '공사스케줄관리' || sheetParam === '공사 스케줄 관리' || sheetParam === '공사_스케줄') {
            if (actionParam === 'getGuidelines') {
                return handleGetScheduleGuidelines(e);
            }
            return handleScheduleTemplateGet(e);
        }

        // [수정] 공정별 체크리스트 요청 (이전 코드에서 중첩된 if문 수정)
        if (sheetParam === '공정별체크리스트' || sheetParam === '공정별_체크리스트' || sheetParam === '공정별 체크리스트') {
            return handleChecklistGet(e);
        }

        // 정산 관리 대장 옵션 데이터 요청
        if (sheetParam === '정산관리대장' || sheetParam === '정산 관리 대장' || sheetParam === 'SettlementOptions') {
            if (actionParam === 'getOptions') {
                return handleSettlementOptionsGet(e);
            }
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

// -------------------------------------------------------------
// [추가] 정산 관리 대장 옵션 불러오기 (Category, Process, Client etc.)
// -------------------------------------------------------------
function handleSettlementOptionsGet(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName('정산 관리 대장'); // 시트명 확인 필요

        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                result: 'success',
                options: []
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return ContentService.createTextOutput(JSON.stringify({
                result: 'success',
                options: []
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // Fetch 9 columns (A to I)
        var data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
        var options = [];

        var lastCategory = '';

        data.forEach(function (row) {
            // Fill-down (Merged cells logic) for Category (Column C -> index 2)
            // A=CustomerID, B=Date?, C=Category
            if (row[2] && String(row[2]).trim() !== '') {
                lastCategory = row[2];
            }

            // Collect data only if category exists
            // Columns: A(0), B(1), C(2)=Cat, D(3)=Proc, E(4)=Client, F(5)=CostType, G(6)=PayType, H(7)=BizID, I(8)=Bank
            if (lastCategory) {
                options.push({
                    category: lastCategory,
                    process: row[3] || '',
                    client: row[4] || '',
                    costType: row[5] || '',
                    payType: row[6] || '',
                    bizId: row[7] || '',
                    bankInfo: row[8] || ''
                });
            }
        });

        // Deduplicate options: Category + Process + Client 조합 유니크
        var uniqueOptions = [];
        var seen = {};
        options.forEach(function (opt) {
            var key = opt.category + '|' + opt.process + '|' + opt.client;
            if (!seen[key]) {
                seen[key] = true;
                uniqueOptions.push(opt);
            }
        });

        return ContentService.createTextOutput(JSON.stringify({
            result: 'success',
            options: uniqueOptions
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            result: 'error',
            message: err.message
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

// ----------------------------------------------------------------------
// [핸들러 함수들]
// ----------------------------------------------------------------------

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

        if (sheet.getLastRow() < 2) {
            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                guidelines: DEFAULT_SCHEDULE_GUIDELINES
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
        var guidelines = [];

        data.forEach(function (row) {
            if (row[0] && (row[0].toString().indexOf('공사 진행') !== -1 || row[0].toString().indexOf('유의사항') !== -1)) {
                var text = row[1];
                if (text) guidelines.push(text);
            }
        });

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

function handleGetASGuidelines(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName('AS 관리 리스트');
        if (!sheet) sheet = spreadsheet.getSheetByName('AS관리리스트');
        if (!sheet) sheet = spreadsheet.getSheetByName('as_list');

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
            if (row[0] && (row[0].toString().indexOf('A/S') !== -1 || row[0].toString().indexOf('유의사항') !== -1 || row[0].toString().indexOf('안내') !== -1)) {
                var text = row[1];
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

    if (!sheet) {
        sheet = spreadsheet.insertSheet('공사 스케줄 관리');
        var headers = ['카테고리', '세부 공정명', '핵심 체크포인트', '시작일', '종료일', '담당자', '비고'];
        sheet.appendRow(headers);
        sheet.setFrozenRows(1);
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
        if (DEFAULT_SCHEDULE_TEMPLATE.length > 0) {
            sheet.getRange(2, 1, DEFAULT_SCHEDULE_TEMPLATE.length, DEFAULT_SCHEDULE_TEMPLATE[0].length)
                .setValues(DEFAULT_SCHEDULE_TEMPLATE);
        }
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
            var text = row[1];
            if (text) notices.push(text);
        } else {
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

function handleConsultingInquiry(data) {
    var spreadsheet = SpreadsheetApp.openById(CONSULTING_SHEET_ID);
    var sheet = spreadsheet.getSheetByName('상담관리_마스터');
    if (!sheet) {
        sheet = spreadsheet.insertSheet('상담관리_마스터');
    }
    if (sheet.getLastRow() === 0) {
        setupConsultingSheet(sheet);
    }
    var lastRow = sheet.getLastRow();
    var nextNum = 1;
    if (lastRow > 1) {
        var lastNum = sheet.getRange(lastRow, 1).getValue();
        nextNum = (typeof lastNum === 'number') ? lastNum + 1 : lastRow;
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
    if (data.email) {
        var emailSent = sendSurveyEmail(data);
        var newRowIndex = sheet.getLastRow();
        sheet.getRange(newRowIndex, 8).setValue(emailSent ? '설문발송' : '발송실패');
    }
    return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
}

function handleConsultingGet(e) {
    var spreadsheet = SpreadsheetApp.openById(CONSULTING_SHEET_ID);
    var sheet = spreadsheet.getSheetByName('상담관리_마스터');
    if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues();
    var rows = data.slice(1);
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
    result.reverse();
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
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
}

function handleCustomerSync(payload) {
    var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);

    if (payload.action === 'admin') {
        var adminData = payload.data;
        var result = saveAdmin(spreadsheet, adminData);
        return ContentService.createTextOutput(JSON.stringify({
            result: 'success',
            action: result,
            adminId: adminData.id
        })).setMimeType(ContentService.MimeType.JSON);
    }
    if (payload.action === 'deleteAdmin') {
        var deleted = deleteAdmin(spreadsheet, payload.adminId);
        return ContentService.createTextOutput(JSON.stringify({
            result: deleted ? 'success' : 'not_found',
            action: 'deleted'
        })).setMimeType(ContentService.MimeType.JSON);
    }

    var customerData = payload.data || payload;
    if (!customerData || !customerData.customerId) {
        throw new Error('데이터 오류: 고객 ID(customerId)가 없습니다.');
    }
    var customerId = customerData.customerId;
    var newStatus = customerData.status;

    var mainSheet = spreadsheet.getSheetByName('고객관리_견적서') || spreadsheet.insertSheet('고객관리_견적서');
    var contractedSheet = spreadsheet.getSheetByName('계약완료') || spreadsheet.insertSheet('계약완료');
    var asSheet = spreadsheet.getSheetByName('사후관리_A/S') || spreadsheet.insertSheet('사후관리_A/S');

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
        customerData.inflowPath || '',
        customerData.buildingType || '',
        customerData.contractDate || '',
        customerData.constructionPeriod || '',
        customerData.warrantyPeriod || '',
        customerData.totalAmount || '',
        customerData.estimateProfitRate || '',
        customerData.jsonData || JSON.stringify(customerData),
        formatScheduleToString(customerData.schedules)
    ];

    updateOrAppendRow(mainSheet, customerId, rowData);

    if (newStatus === 'contracted' || newStatus === '계약완료') {
        updateOrAppendRow(contractedSheet, customerId, rowData);
        var asRowData = buildAsRowData(customerData);
        updateOrAppendRow(asSheet, customerId, asRowData);
    } else if (newStatus === 'as_done' || newStatus === 'A/S') {
        updateOrAppendRow(contractedSheet, customerId, rowData);
        var asRowData2 = buildAsRowData(customerData);
        updateOrAppendRow(asSheet, customerId, asRowData2);
    } else {
        deleteRowById(contractedSheet, customerId);
        deleteRowById(asSheet, customerId);
    }

    return ContentService.createTextOutput(JSON.stringify({
        result: 'success',
        customerId: customerId
    })).setMimeType(ContentService.MimeType.JSON);
}

function updateOrAppendRow(sheet, id, data) {
    var allData = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < allData.length; i++) {
        if (allData[i][0] === id) {
            rowIndex = i + 1;
            break;
        }
    }
    if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, data.length).setValues([data]);
    } else {
        sheet.appendRow(data);
    }
}

function deleteRowById(sheet, id) {
    var allData = sheet.getDataRange().getValues();
    for (var i = 1; i < allData.length; i++) {
        if (allData[i][0] === id) {
            sheet.deleteRow(i + 1);
            break;
        }
    }
}

function handleCustomerGet(e) {
    var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
    var sheetName = e.parameter.sheet || '고객관리_견적서';
    if (sheetName === '관리자') {
        return ContentService.createTextOutput(JSON.stringify(getAdmins(spreadsheet))).setMimeType(ContentService.MimeType.JSON);
    }
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

    var data = sheet.getDataRange().getValues();
    var customers = [];
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (!row[0]) continue;
        customers.push(buildCustomerFromRow(row));
    }
    return ContentService.createTextOutput(JSON.stringify(customers)).setMimeType(ContentService.MimeType.JSON);
}

function buildCustomerFromRow(row) {
    var jsonStr = row[17] || '{}';
    var jsonData = {};
    try { jsonData = JSON.parse(jsonStr); } catch (e) { }
    var customer = jsonData;
    if (!customer.customerId) customer.customerId = row[0];
    // 필수 필드 보완...
    return customer;
}

function buildAsRowData(customerData) {
    // ... (기존과 동일)
    return [customerData.customerId, customerData.clientName, /*...*/ ''];
}

function formatScheduleToString(schedules) {
    if (!schedules || !Array.isArray(schedules)) return '';
    return schedules.map((s, i) => (i + 1) + '. ' + s.name).join('\n');
}

function initializeCustomerSheet(sheet) {
    sheet.appendRow(['고객ID', '상태', '생성일', '성명', '연락처', '이메일', '주소', '공사명', '현장주소', '평수', '유입경로', '건물유형', '계약일', '공사기간', 'A/S 기간', '계약금액', '이윤율', 'JSON데이터', '공사 스케줄']);
}

function initializeAdminSheet(sheet) {
    sheet.appendRow(['아이디', '비밀번호', '이름', '생성일']);
}

function initializeAsSheet(sheet) {
    sheet.appendRow(['고객ID', '고객명', '연락처', '이메일', '현장주소', '기본 A/S 상태', '화장실 A/S 상태', '공사기간', '잔금일', '기본 A/S 보증일(개월)', '기본 A/S 기간', '화장실 A/S 보증일(개월)', '화장실 A/S 기간', '담당자', '비고']);
}

function getAdmins(spreadsheet) {
    var sheet = spreadsheet.getSheetByName('관리자');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    var admins = [];
    for (var i = 1; i < data.length; i++) {
        if (data[i][0]) admins.push({ id: data[i][0], passwordHash: data[i][1], name: data[i][2], createdAt: data[i][3] });
    }
    return admins;
}

function saveAdmin(spreadsheet, adminData) {
    var sheet = spreadsheet.getSheetByName('관리자');
    if (!sheet) { sheet = spreadsheet.insertSheet('관리자'); initializeAdminSheet(sheet); }
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
        if (data[i][0] === adminData.id) { rowIndex = i + 1; break; }
    }
    var rowData = [adminData.id, adminData.passwordHash || adminData.password, adminData.name, adminData.createdAt];
    if (rowIndex > 0) { sheet.getRange(rowIndex, 1, 1, 4).setValues([rowData]); return 'updated'; }
    sheet.appendRow(rowData); return 'created';
}

function deleteAdmin(spreadsheet, adminId) {
    var sheet = spreadsheet.getSheetByName('관리자');
    if (!sheet) return false;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(adminId)) { sheet.deleteRow(i + 1); return true; }
    }
    return false;
}

function handleASListGet(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName("AS관리대장");
        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({ result: "success", data: [] })).setMimeType(ContentService.MimeType.JSON);
        }
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        var rows = data.slice(1);
        var result = rows.map(function (row) {
            var obj = {};
            headers.forEach(function (header, index) {
                obj[header] = row[index];
            });
            return obj;
        });
        return ContentService.createTextOutput(JSON.stringify({ result: "success", data: result })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ result: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleCostGet(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName("원가관리데이터베이스");
        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({ result: "error", message: "Sheet not found" })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        var rows = data.slice(1);

        var result = rows.map(function (row) {
            var obj = {};
            headers.forEach(function (header, index) {
                obj[header] = row[index];
            });
            return obj;
        });

        return ContentService.createTextOutput(JSON.stringify({
            result: "success",
            data: result
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            result: "error",
            message: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleCostUpdate(payload) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName('원가관리데이터베이스');
        if (!sheet) {
            // 시트가 없으면 생성 및 헤더 추가
            sheet = spreadsheet.insertSheet('원가관리데이터베이스');
            sheet.appendRow(['category', 'process', 'client', 'costType', 'payType', 'bizId', 'bankInfo', 'updatedAt']);
        }

        var data = payload.data; // Array of objects

        // 기존 데이터 삭제 (헤더 제외)
        if (sheet.getLastRow() > 1) {
            sheet.deleteRows(2, sheet.getLastRow() - 1);
        }

        // 새 데이터 추가
        if (data && data.length > 0) {
            var rows = data.map(function (item) {
                return [
                    item.category,
                    item.process,
                    item.client,
                    item.costType,
                    item.payType,
                    item.bizId,
                    item.bankInfo,
                    new Date()
                ];
            });

            // 배치 처리로 성능 최적화
            sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
        }

        return ContentService.createTextOutput(JSON.stringify({
            result: 'success',
            count: data ? data.length : 0
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({
            result: 'error',
            message: e.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleSaveSampleEstimate(payload) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName('간편견적서_샘플');
        if (!sheet) {
            sheet = spreadsheet.insertSheet('간편견적서_샘플');
            sheet.appendRow(['Id', 'Name', 'CustomerName', 'ItemsJson', 'TotalAmount', 'VatAmount', 'FinalAmount', 'CreatedAt', 'UpdatedAt']);
        }

        var data = payload.data;
        var id = data.id || Utilities.getUuid();
        var now = new Date();

        // 검색 - 기존 ID가 있는지 확인
        var range = sheet.getDataRange();
        var values = range.getValues();
        var foundIndex = -1;

        for (var i = 1; i < values.length; i++) {
            if (values[i][0] == id) {
                foundIndex = i + 1; // 1-based index
                break;
            }
        }

        var rowData = [
            id,
            data.name,
            data.customerName,
            JSON.stringify(data.items),
            data.totalAmount,
            data.vatAmount,
            data.finalAmount,
            foundIndex > 0 ? values[foundIndex - 1][7] : now, // CreateAt
            now // UpdatedAt
        ];

        if (foundIndex > 0) {
            // Update
            sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
        } else {
            // Insert
            sheet.appendRow(rowData);
        }

        return ContentService.createTextOutput(JSON.stringify({
            result: 'success',
            id: id
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({
            result: 'error',
            message: e.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleGetSampleEstimates() {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName('간편견적서_샘플');
        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                result: 'success',
                data: []
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getDataRange().getValues();
        var output = [];

        // Skip header
        for (var i = 1; i < data.length; i++) {
            var row = data[i];
            output.push({
                id: row[0],
                name: row[1],
                customerName: row[2],
                totalAmount: row[4],
                finalAmount: row[6],
                updatedAt: row[8]
            });
        }

        return ContentService.createTextOutput(JSON.stringify({
            result: 'success',
            data: output
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({
            result: 'error',
            message: e.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleGetSampleEstimate(id) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName('간편견적서_샘플');
        if (!sheet) throw new Error('Sheet not found');

        var data = sheet.getDataRange().getValues();
        var foundData = null;

        for (var i = 1; i < data.length; i++) {
            if (data[i][0] == id) {
                var row = data[i];
                foundData = {
                    id: row[0],
                    name: row[1],
                    customerName: row[2],
                    items: JSON.parse(row[3]),
                    totalAmount: row[4],
                    vatAmount: row[5],
                    finalAmount: row[6],
                    createdAt: row[7],
                    updatedAt: row[8]
                };
                break;
            }
        }

        if (foundData) {
            return ContentService.createTextOutput(JSON.stringify({
                result: 'success',
                data: foundData
            })).setMimeType(ContentService.MimeType.JSON);
        } else {
            return ContentService.createTextOutput(JSON.stringify({
                result: 'error',
                message: 'Not found'
            })).setMimeType(ContentService.MimeType.JSON);
        }

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({
            result: 'error',
            message: e.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleDeleteSampleEstimate(payload) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sheet = spreadsheet.getSheetByName('간편견적서_샘플');
        if (!sheet) throw new Error('Sheet not found');

        var id = payload.id;
        var data = sheet.getDataRange().getValues();
        var deleted = false;

        for (var i = 1; i < data.length; i++) {
            if (data[i][0] == id) {
                sheet.deleteRow(i + 1);
                deleted = true;
                break;
            }
        }

        return ContentService.createTextOutput(JSON.stringify({
            result: deleted ? 'success' : 'error',
            message: deleted ? 'Deleted' : 'Not found'
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({
            result: 'error',
            message: e.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleRestoreCostDatabase(payload) {
    try {
        var spreadsheet = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
        var sourceSheet = spreadsheet.getSheetByName(SETTLEMENT_SHEET_NAME); // '정산 관리 대장'
        var targetSheet = spreadsheet.getSheetByName('원가관리데이터베이스');

        if (!sourceSheet) return errorOutput('Source sheet not found: ' + SETTLEMENT_SHEET_NAME);

        if (!targetSheet) {
            targetSheet = spreadsheet.insertSheet('원가관리데이터베이스');
            targetSheet.appendRow(['category', 'process', 'client', 'costType', 'payType', 'bizId', 'bankInfo', 'updatedAt']);
        }

        var options = [];

        // 1. 정산 관리 대장에서 데이터 읽기
        var lastRow = sourceSheet.getLastRow();
        if (lastRow > 1) {
            var data = sourceSheet.getRange(2, 1, lastRow - 1, 9).getValues();
            var lastCategory = '';

            data.forEach(function (row) {
                // Category Merged Cell Handling
                if (row[2] && String(row[2]).trim() !== '') {
                    lastCategory = row[2];
                }

                if (lastCategory && row[3] && row[4]) {
                    options.push({
                        category: lastCategory,
                        process: row[3],
                        client: row[4],
                        costType: row[5] || '',
                        payType: row[6] || '',
                        bizId: row[7] || '',
                        bankInfo: row[8] || '',
                        updatedAt: new Date()
                    });
                }
            });
        }

        // 2. 중복 제거
        var uniqueOptions = [];
        var seen = {};
        options.forEach(function (opt) {
            var key = opt.category + '|' + opt.process + '|' + opt.client;
            if (!seen[key]) {
                seen[key] = true;
                uniqueOptions.push(opt);
            }
        });

        // 3. 데이터베이스 초기화 및 저장
        if (targetSheet.getLastRow() > 1) {
            targetSheet.deleteRows(2, targetSheet.getLastRow() - 1);
        }

        if (uniqueOptions.length > 0) {
            var rows = uniqueOptions.map(function (item) {
                return [
                    item.category,
                    item.process,
                    item.client,
                    item.costType,
                    item.payType,
                    item.bizId,
                    item.bankInfo,
                    item.updatedAt
                ];
            });
            targetSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
        }

        return ContentService.createTextOutput(JSON.stringify({
            result: 'success',
            count: uniqueOptions.length
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({
            result: 'error',
            message: e.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}
