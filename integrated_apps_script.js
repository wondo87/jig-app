/**
 * [통합형] 디자인지그 웹사이트 & 관리자 동기화 스크립트
 * 
 * 1. 웹사이트 상담 문의 접수 및 이메일 발송
 * 2. 관리자 페이지(adminwonpro.html) 고객 데이터 동기화
 * 3. 트리거 기반 자동화 (상담 상태 변경 시 이동, A/S 만료 알림)
 * 
 * 마지막 업데이트: 2026-01-13
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
        // 1. 관리자 데이터 동기화 요청인지 확인
        // 조건: action 필드가 있거나, 데이터 내에 customerId가 있음 (관리자 기능)
        var isAdminAction = (payload.action === 'admin' || payload.action === 'deleteAdmin');
        var isCustomerSync = (payload.data && payload.data.customerId) || (payload.customerId);

        if (isAdminAction || isCustomerSync) {
            // -> 고객관리 로직 실행
            return handleCustomerSync(payload);
        }

        // 2. 그 외에는 상담 문의 접수로 간주
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
        var sheetParam = e.parameter.sheet; // '관리자', '고객관리' 등

        // 1. 고객관리/관리자 데이터 요청인 경우 (파라미터가 명시적인 경우)
        if (sheetParam === '관리자' || sheetParam === '고객관리' || sheetParam === '계약완료고객') {
            return handleCustomerGet(e);
        }

        // 2. 그 외(기본값)는 상담 목록 조회로 간주 (기존 웹사이트 호환)
        return handleConsultingGet(e);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}


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
        '설문발송',
        ''
    ]);

    // 이메일 발송
    if (data.email) {
        sendSurveyEmail(data);
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
        간단한 사전 설문을 요청드립니다.<br>
        설문 내용을 바탕으로 공간의 방향과 우선순위를 정리한 후,<br>
        그에 맞는 상담을 진행해 드리겠습니다.</p>
        <br>
        <p>아래 링크를 클릭하시면 <strong>기본 정보가 자동으로 입력되어 있습니다.</strong></p>
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
간단한 사전 설문을 요청드립니다.
설문 내용을 바탕으로 공간의 방향과 우선순위를 정리한 후,
그에 맞는 상담을 진행해 드리겠습니다.

아래 링크를 클릭하시면 기본 정보가 자동으로 입력되어 있습니다.

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
        MailApp.sendEmail({
            to: data.email,
            subject: subject,
            body: plainTextBody,
            htmlBody: htmlBody,
            name: SENDER_NAME
        });
        console.log('이메일 발송 성공: ' + data.email);
    } catch (error) {
        console.log('이메일 발송 실패: ' + error.toString());
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

    if (!mainSheet) { mainSheet = spreadsheet.insertSheet('고객관리_견적서'); initializeCustomerSheet(mainSheet); }
    if (!contractedSheet) { contractedSheet = spreadsheet.insertSheet('계약완료'); initializeCustomerSheet(contractedSheet); }
    if (mainSheet.getLastRow() === 0) initializeCustomerSheet(mainSheet);
    if (contractedSheet.getLastRow() === 0) initializeCustomerSheet(contractedSheet);

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
        customerData.contractDate || '',
        customerData.constructionPeriod || '',
        customerData.warrantyPeriod || '',
        customerData.totalAmount || '',
        customerData.estimateProfitRate || '',
        customerData.jsonData || JSON.stringify(customerData)
    ];

    // 기존 데이터 위치 검색
    var mainData = mainSheet.getDataRange().getValues();
    var mainRowIndex = -1;
    for (var i = 1; i < mainData.length; i++) {
        if (mainData[i][0] === customerId) {
            mainRowIndex = i + 1;
            break;
        }
    }

    var contractedData = contractedSheet.getDataRange().getValues();
    var contractedRowIndex = -1;
    for (var j = 1; j < contractedData.length; j++) {
        if (contractedData[j][0] === customerId) {
            contractedRowIndex = j + 1;
            break;
        }
    }

    var action = '';

    // [로직] 계약완료 시 -> '복사' (이동 아님)
    if (newStatus === 'contracted') {
        // 1. 고객관리 시트: 수정 or 추가 (삭제X)
        if (mainRowIndex > 0) {
            mainSheet.getRange(mainRowIndex, 1, 1, rowData.length).setValues([rowData]);
        } else {
            mainSheet.appendRow(rowData);
        }

        // 2. 계약완료고객 시트: 수정 or 추가
        if (contractedRowIndex > 0) {
            contractedSheet.getRange(contractedRowIndex, 1, 1, rowData.length).setValues([rowData]);
            action = 'copied_updated';
        } else {
            contractedSheet.appendRow(rowData);
            action = 'copied_to_contracted';
        }
    } else {
        // 계약완료 아님 (상담중 등)

        // 1. 고객관리 시트: 수정 or 추가
        if (mainRowIndex > 0) {
            mainSheet.getRange(mainRowIndex, 1, 1, rowData.length).setValues([rowData]);
            action = 'updated';
        } else {
            mainSheet.appendRow(rowData);
            action = 'created';
        }

        // 2. 계약완료고객 시트: 있으면 삭제
        if (contractedRowIndex > 0) {
            contractedSheet.deleteRow(contractedRowIndex);
        }
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
        var jsonData = row[15]; // JSON데이터 열 (0부터 시작하니 16번째 열은 인덱스 15)

        if (jsonData) {
            try {
                customers.push(JSON.parse(jsonData));
            } catch (e) {
                // 파싱 실패 시 기본 구조
                customers.push({ customerId: row[0], status: row[1] });
            }
        }
    }
    return ContentService.createTextOutput(JSON.stringify(customers)).setMimeType(ContentService.MimeType.JSON);
}

// --- Customer Sync Helpers ---

function initializeCustomerSheet(sheet) {
    var headers = [
        '고객ID', '상태', '생성일', '성명', '연락처',
        '이메일', '주소', '공사명', '현장주소', '평형',
        '계약일', '공사기간', 'A/S 기간', '계약금액', '이윤율', 'JSON데이터'
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
                password: row[1],
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

    var rowData = [
        adminData.id,
        adminData.password,
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
        if (data[i][0] === adminId) { sheet.deleteRow(i + 1); return true; }
    }
    return false;
}

// ==========================================
// 5. 트리거 관련 함수 (Triggers)
// ==========================================

// [트리거] onEdit (상담 시트용)
function processStatusChange(e) {
    if (!e) return;
    var range = e.range;
    var sheet = range.getSheet();

    // 상담용 시트에서만 동작 ('상담관리_마스터' 등 시트명 확인 필요)
    if (sheet.getName() !== '상담관리_마스터') return;
    if (range.getColumn() !== 8) return; // 상담상태 열
    if (e.value !== '계약완료') return;

    moveRowToAS(sheet, range.getRow());
}

function moveRowToAS(sourceSheet, rowNum) {
    var targetSheetName = '사후관리_A/S';
    var spreadsheet = sourceSheet.getParent();
    var targetSheet = spreadsheet.getSheetByName(targetSheetName);

    if (!targetSheet) {
        targetSheet = spreadsheet.insertSheet(targetSheetName);
        var headers = ['NO', '고객명', '연락처', '이메일', '현장주소', '기본 A/S 상태', '화장실 A/S 상태', '공사 완료일', '# 기본 보증 기간', 'A/S 완료일'];
        var headerRange = targetSheet.getRange(1, 1, 1, headers.length);
        headerRange.setValues([headers]);
        headerRange.setBackground('#4a7c59');
        headerRange.setFontColor('#ffffff');
        headerRange.setFontWeight('bold');
    }

    var rowValues = sourceSheet.getRange(rowNum, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
    // NO(0), 날짜(1), 이름(2), 연락처(3), 이메일(4), 주소(5)...
    // 타겟 매핑: NO, 고객명, 연락처, 이메일, 현장주소...

    var newRowData = [
        rowValues[0], // No
        rowValues[2], // 이름
        rowValues[3], // 연락처
        rowValues[4], // 이메일
        rowValues[5], // 주소
        '', '', '', '12', ''
    ];

    targetSheet.appendRow(newRowData);
    spreadsheet.toast('고객 정보를 [사후관리_A/S] 시트로 복사했습니다.', '복사 완료');
}

// [트리거] 시간 기반 (일 1회)
function sendWarrantyExpirationEmails() {
    var targetSheetName = '사후관리_A/S';
    // 이 함수는 '상담용 스프레드시트'를 기준으로 동작해야 함 (트리거 설정된 시트)
    // 따라서 getActiveSpreadsheet()가 안전할 수 있으나, 만약 스크립트가 독립형이라면 ID 지정 필수.
    // 여기서는 안전하게 ID 지정 권장
    var spreadsheet = SpreadsheetApp.openById(CONSULTING_SHEET_ID);
    var sheet = spreadsheet.getSheetByName(targetSheetName);

    if (!sheet) {
        console.log('[' + targetSheetName + '] 시트를 찾을 수 없습니다.');
        return;
    }

    var data = sheet.getDataRange().getValues();
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // 열 인덱스 (A=0, B=1 ...)
    var NAME_COL = 1;
    var EMAIL_COL = 3;
    var DATE_COL = 9; // J열

    var sentCount = 0;

    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var expirationDate = row[DATE_COL];
        var email = row[EMAIL_COL];
        var name = row[NAME_COL];

        if (expirationDate instanceof Date && email) {
            expirationDate.setHours(0, 0, 0, 0);
            if (expirationDate.getTime() === today.getTime()) {
                sendExpirationEmail(email, name); // 위쪽에 정의된 sendSurveyEmail과 구분하기 위해 이름 변경 권장
                // 여기서는 아래에 별도로 정의된 sendExpirationEmail 함수 호출
                sentCount++;
            }
        }
    }
    console.log('총 ' + sentCount + '건의 A/S 만료 안내 메일 발송');
}

function sendExpirationEmail(email, name) {
    var subject = '[디자인지그] A/S 보증 기간 완료 안내';
    var customerName = name || '고객';

    var body = `DESIGN JIG

안녕하세요, ${customerName} 고객님.
디자인지그입니다.

고객님 공간의 A/S 보증 기간이 완료되어 안내드립니다.

보증 기간 동안 불편함 없이 잘 사용하고 계셨는지,
혹시 미처 말씀하지 못하신 부분은 없으셨는지
한 번 더 여쭙고 싶어 연락드렸습니다.

보증 기간이 종료되더라도
디자인지그가 시공한 공간에 대한 책임은 계속됩니다.

사용 중 불편하신 점이나 궁금한 사항이 있으시면
언제든지 편하게 연락 주시기 바랍니다.

기본이 탄탄해야 아름다움도 오래가듯,
시공 이후의 관계도 오래 이어가겠습니다.

감사합니다.

디자인지그 드림

────────────────
DESIGN JIG
기본이 탄탄해야 아름다움도 오래갑니다.
designjig.com`;

    try {
        MailApp.sendEmail({
            to: email,
            subject: subject,
            body: body,
            name: SENDER_NAME
        });
    } catch (e) {
        console.log('메일 발송 에러 (' + email + '): ' + e.toString());
    }
}
