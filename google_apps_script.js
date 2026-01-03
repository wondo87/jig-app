/**
 * 디자인 지그 웹사이트 - 상담 문의 처리 + 자동 이메일 발송 + 시트 이동 스크립트 + A/S 만료 알림
 */

// ========== 설정 영역 ==========
const FORM_BASE_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdcsD1hjKMNezFTaPAZRlKovdRDfCW08cy4VfLHL_LJDcmbVw/viewform';

const ENTRY_IDS = {
    NAME: '2076163714',
    PHONE: '217138793',
    EMAIL: '916215270',
    ADDRESS: '840428259',
    MESSAGE: '1360575573'
};

const SENDER_NAME = '디자인지그';
// ================================

function doPost(e) {
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

        if (sheet.getLastRow() === 0) {
            setupSheet(sheet);
        }

        var data = JSON.parse(e.postData.contents);

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

        if (data.email) {
            sendSurveyEmail(data);
        }

        return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ result: "error", error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);

    } finally {
        lock.releaseLock();
    }
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

function setupSheet(sheet) {
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
    sheet.setColumnWidth(4, 120);
    sheet.setColumnWidth(5, 180);
    sheet.setColumnWidth(6, 200);
    sheet.setColumnWidth(7, 250);
    sheet.setColumnWidth(8, 100);
    sheet.setColumnWidth(9, 120);

    sheet.getRange(1, 1, 1, headers.length).createFilter();
}

function doGet(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById('1Yp9UjY37PlBgXdyC2_acwfa8prxo7yD_VKAOcnIQQVw');
        var sheet = spreadsheet.getActiveSheet();
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

        return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ==========================================
// [중요] 트리거 연결용 함수
// ==========================================
function processStatusChange(e) {
    if (!e) return;

    var range = e.range;
    var sheet = range.getSheet();

    if (sheet.getName() !== '상담관리_마스터') return;
    if (range.getColumn() !== 8) return; // 상담상태 열
    if (e.value !== '계약완료') return;

    moveRowToAS(sheet, range.getRow());
}

function moveRowToAS(sourceSheet, rowNum) {
    var targetSheetName = '계약완료고객_A/S';
    var spreadsheet = sourceSheet.getParent();
    var targetSheet = spreadsheet.getSheetByName(targetSheetName);

    // 타겟 시트가 없을 때만 생성 (헤더: 스크린샷 기준)
    if (!targetSheet) {
        targetSheet = spreadsheet.insertSheet(targetSheetName);
        var headers = ['NO', '고객명', '연락처', '이메일', '현장주소', '기본 A/S 상태', '화장실 A/S 상태', '공사 완료일', '# 기본 보증 기간', 'A/S 완료일'];
        var headerRange = targetSheet.getRange(1, 1, 1, headers.length);
        headerRange.setValues([headers]);
        headerRange.setBackground('#4a7c59');
        headerRange.setFontColor('#ffffff');
        headerRange.setFontWeight('bold');
        headerRange.setHorizontalAlignment('center');
        targetSheet.setColumnWidth(2, 80);
        targetSheet.setColumnWidth(3, 120);
        targetSheet.setColumnWidth(4, 180);
        targetSheet.setColumnWidth(5, 200);
    }

    // 1. 원본 데이터 가져오기
    var rowValues = sourceSheet.getRange(rowNum, 1, 1, sourceSheet.getLastColumn()).getValues()[0];

    // 데이터 매핑
    var no = rowValues[0];       // No.
    var name = rowValues[2];     // 이름 -> 고객명
    var phone = rowValues[3];    // 연락처 -> 연락처
    var email = rowValues[4];    // 이메일 -> 이메일
    var address = rowValues[5];  // 현장주소 -> 현장주소

    // 2. 타겟 시트용 배열 생성 (스크린샷 열 순서)
    // NO, 고객명, 연락처, 이메일, 현장주소, 기본 A/S 상태, 화장실 A/S 상태, 공사 완료일, # 기본 보증 기간, A/S 완료일
    var newRowData = [
        no,
        name,
        phone,
        email,
        address,
        '',          // 기본 A/S 상태 (공란)
        '',          // 화장실 A/S 상태 (공란)
        '',          // 공사 완료일 (공란)
        '12',        // # 기본 보증 기간 (기본 12개월)
        ''           // A/S 완료일 (공란 - 수식이나 자동입력 필요시 로직 추가 가능)
    ];

    // 3. 복사 (원본 유지)
    targetSheet.appendRow(newRowData); // [수정] 원본 데이터 삭제하지 않음 (유지-복사)

    spreadsheet.toast('고객 정보를 [계약완료고객_A/S] 시트로 복사했습니다.', '복사 완료');
}

// ==========================================
// [신규] A/S 만료 안내 메일 자동 발송 함수
// - 이 함수는 [트리거] -> [시간 기반] -> [일 단위]로 설정해야 함
// ==========================================
function sendWarrantyExpirationEmails() {
    var targetSheetName = '계약완료고객_A/S';
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetSheetName);

    if (!sheet) {
        console.log('[' + targetSheetName + '] 시트를 찾을 수 없습니다.');
        return;
    }

    var data = sheet.getDataRange().getValues();
    // 데이터가 2행부터 시작한다고 가정 (1행은 헤더)

    var today = new Date();
    today.setHours(0, 0, 0, 0); // 시간 제거 (날짜만 비교)

    // 스크린샷 기준 열 인덱스 (0부터 시작)
    // 0:NO, 1:고객명, 2:연락처, 3:이메일, 4:현장주소 ... 9:A/S 완료일
    var NAME_COL = 1;
    var EMAIL_COL = 3;
    var DATE_COL = 9;

    // 카운터
    var sentCount = 0;

    for (var i = 1; i < data.length; i++) { // 헤더 건너뛰고 1부터 시작
        var row = data[i];
        var expirationDate = row[DATE_COL];
        var email = row[EMAIL_COL];
        var name = row[NAME_COL];

        // 날짜 데이터가 있고, 이메일이 있는 경우만
        if (expirationDate instanceof Date && email) {
            expirationDate.setHours(0, 0, 0, 0); // 비교를 위해 시간 초기화

            // 오늘 날짜와 A/S 완료일이 정확히 같으면 발송
            if (expirationDate.getTime() === today.getTime()) {
                sendExpirationEmail(email, name);
                sentCount++;
                console.log('발송 대상 찾음: ' + name + '님 (' + email + ')');
            }
        }
    }

    console.log('총 ' + sentCount + '건의 A/S 만료 안내 메일을 발송했습니다.');
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
