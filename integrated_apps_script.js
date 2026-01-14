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
        if (sheetParam === '관리자' || sheetParam === '고객관리' || sheetParam === '고객관리_견적서' || sheetParam === '계약완료고객' || sheetParam === '계약완료') {
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
        customerData.jsonData || JSON.stringify(customerData)
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
        var jsonData = row[15]; // JSON데이터 열 (0부터 시작하니 16번째 열은 인덱스 15)

        if (jsonData) {
            try {
                customers.push(JSON.parse(jsonData));
            } catch (e) {
                // 파싱 실패 시 기본 구조로 생성
                customers.push(buildCustomerFromRow(row));
            }
        } else if (row[0]) {
            // JSON데이터가 없어도 customerId가 있으면 기본 컬럼에서 구성
            customers.push(buildCustomerFromRow(row));
        }
    }
    return ContentService.createTextOutput(JSON.stringify(customers)).setMimeType(ContentService.MimeType.JSON);
}

// Helper: Build customer object from sheet row
function buildCustomerFromRow(row) {
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
        inflowPath: row[10] || '',       // 유입경로
        buildingType: row[11] || '',     // 건물유형
        contractDate: row[12] || '',
        constructionPeriod: row[13] || '',
        warrantyPeriod: row[14] || '',
        totalAmount: row[15] || '',
        estimateProfitRate: row[16] || ''
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

function initializeCustomerSheet(sheet) {
    var headers = [
        '고객ID', '상태', '생성일', '성명', '연락처', '이메일', '주소', '공사명', '현장주소',
        '평수', '유입경로', '건물유형',
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
        rowValues[8] || '',             // 평형 (Q3.평수) - I열(인덱스8)
        rowValues[6] || '',             // 유입경로 (Q1.유입경로) - G열(인덱스6)
        rowValues[7] || '',             // 건물유형 (Q2.건물유형) - H열(인덱스7)
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


    // 중복 체크 (같은 연락처가 이미 있는지)
    var clientPhone = rowValues[3];
    for (var j = 1; j < existingData.length; j++) {
        if (existingData[j][4] === clientPhone) {
            spreadsheet.toast('이미 등록된 고객입니다: ' + rowValues[2], '중복 알림');
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

// [트리거] 시간 기반 (일 1회) - 기본 A/S 및 화장실 A/S 완료 이메일 자동 발송
function sendWarrantyExpirationEmails() {
    var targetSheetName = '사후관리_A/S';
    var spreadsheet = SpreadsheetApp.openById(CONSULTING_SHEET_ID);
    var sheet = spreadsheet.getSheetByName(targetSheetName);

    if (!sheet) {
        console.log('[' + targetSheetName + '] 시트를 찾을 수 없습니다.');
        return;
    }

    var data = sheet.getDataRange().getValues();
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // 컬럼 인덱스 (0부터 시작)
    // NO(0), 고객명(1), 연락처(2), 이메일(3), 현장주소(4), 기본A/S상태(5), 화장실A/S상태(6),
    // 공사기간(7), 잔금일(8), A/S기간(9), A/S완료일(10), 화장실보증기간(11), 화장실보증일(12), 담당자(13), 비고(14)
    var NAME_COL = 1;
    var EMAIL_COL = 3;
    var BASIC_AS_END_COL = 10;      // A/S 완료일
    var BATHROOM_AS_END_COL = 12;   // 화장실 누수 보증일

    var basicSentCount = 0;
    var bathroomSentCount = 0;

    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var name = row[NAME_COL];
        var email = row[EMAIL_COL];
        var basicAsEndDate = row[BASIC_AS_END_COL];
        var bathroomAsEndDate = row[BATHROOM_AS_END_COL];

        if (!email) continue;

        // 1. 기본 A/S 완료일 체크
        if (basicAsEndDate) {
            var basicDate = (basicAsEndDate instanceof Date) ? basicAsEndDate : new Date(basicAsEndDate);
            if (!isNaN(basicDate.getTime())) {
                basicDate.setHours(0, 0, 0, 0);
                if (basicDate.getTime() === today.getTime()) {
                    sendBasicAsExpirationEmail(email, name);
                    basicSentCount++;
                }
            }
        }

        // 2. 화장실 누수 보증일 체크
        if (bathroomAsEndDate) {
            var bathDate = (bathroomAsEndDate instanceof Date) ? bathroomAsEndDate : new Date(bathroomAsEndDate);
            if (!isNaN(bathDate.getTime())) {
                bathDate.setHours(0, 0, 0, 0);
                if (bathDate.getTime() === today.getTime()) {
                    sendBathroomAsExpirationEmail(email, name);
                    bathroomSentCount++;
                }
            }
        }
    }
    console.log('기본 A/S 완료 메일: ' + basicSentCount + '건, 화장실 A/S 완료 메일: ' + bathroomSentCount + '건 발송');
}

// 기본 A/S 보증 기간 완료 이메일
function sendBasicAsExpirationEmail(email, name) {
    var subject = '[디자인지그] 기본 A/S 보증 기간 완료 안내';
    var customerName = name || '고객';

    var body = 'DESIGN JIG\n\n' +
        '안녕하세요, ' + customerName + ' 고객님.\n' +
        '디자인지그입니다.\n\n' +
        '고객님 공간의 기본 A/S 보증 기간이 완료되어 안내드립니다.\n\n' +
        '보증 기간 동안 불편함 없이 잘 사용하고 계셨는지,\n' +
        '혹시 미처 말씀하지 못하신 부분은 없으셨는지\n' +
        '한 번 더 여쭙고 싶어 연락드렸습니다.\n\n' +
        '보증 기간이 종료되더라도\n' +
        '디자인지그가 시공한 공간에 대한 책임은 계속됩니다.\n\n' +
        '사용 중 불편하신 점이나 궁금한 사항이 있으시면\n' +
        '언제든지 편하게 연락 주시기 바랍니다.\n\n' +
        '감사합니다.\n\n' +
        '디자인지그 드림\n\n' +
        '────────────────\n' +
        'DESIGN JIG\n' +
        '기본이 탄탄해야 아름다움도 오래갑니다.\n' +
        'designjig.com';

    try {
        MailApp.sendEmail({
            to: email,
            subject: subject,
            body: body,
            name: SENDER_NAME
        });
        console.log('기본 A/S 완료 메일 발송: ' + email);
    } catch (e) {
        console.log('메일 발송 에러 (' + email + '): ' + e.toString());
    }
}

// 화장실 누수 보증 기간 완료 이메일
function sendBathroomAsExpirationEmail(email, name) {
    var subject = '[디자인지그] 화장실 누수 보증 기간 완료 안내';
    var customerName = name || '고객';

    var body = 'DESIGN JIG\n\n' +
        '안녕하세요, ' + customerName + ' 고객님.\n' +
        '디자인지그입니다.\n\n' +
        '고객님 공간의 화장실 누수 보증 기간(30개월)이 완료되어 안내드립니다.\n\n' +
        '그동안 화장실 사용에 불편함은 없으셨는지,\n' +
        '혹시 누수나 이상 징후가 있으셨다면\n' +
        '편하게 연락 주시기 바랍니다.\n\n' +
        '보증 기간이 종료되더라도\n' +
        '저희가 시공한 공간에 대한 책임감은 변함없습니다.\n\n' +
        '언제든지 문의해 주세요.\n\n' +
        '감사합니다.\n\n' +
        '디자인지그 드림\n\n' +
        '────────────────\n' +
        'DESIGN JIG\n' +
        '기본이 탄탄해야 아름다움도 오래갑니다.\n' +
        'designjig.com';

    try {
        MailApp.sendEmail({
            to: email,
            subject: subject,
            body: body,
            name: SENDER_NAME
        });
        console.log('화장실 A/S 완료 메일 발송: ' + email);
    } catch (e) {
        console.log('메일 발송 에러 (' + email + '): ' + e.toString());
    }
}
