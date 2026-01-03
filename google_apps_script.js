/**
 * 디자인 지그 웹사이트 - 상담 문의 처리 + 자동 이메일 발송 스크립트
 * 
 * [기능]
 * 1. 고객 문의 접수 → Google Sheets 저장
 * 2. 고객에게 자동으로 설문 링크 이메일 발송
 * 
 * [설치 방법]
 * 1. Google Sheets에서 '확장 프로그램' → 'Apps Script' 메뉴 클릭
 * 2. 기존 코드를 지우고 이 코드를 전부 복사해서 붙여넣기
 * 3. SURVEY_FORM_URL 변수에 실제 설문 링크 입력
 * 4. '배포' → '배포 관리' → 새 버전 만들기 → '배포'
 */

// ========== 설정 영역 ==========
// 여기에 실제 설문 폼 URL을 입력하세요!
// 여기에 실제 설문 폼 URL을 입력하세요!
const SURVEY_FORM_URL = 'https://forms.gle/1LtYkX4evraSQtoA6';

// 발신자 이름 (이메일에 표시됨)
const SENDER_NAME = '디자인지그';
// ================================

// 데이터 저장 + 자동 이메일 발송 (POST 요청)
function doPost(e) {
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

        // 헤더가 없으면 생성 + 스타일 적용
        if (sheet.getLastRow() === 0) {
            setupSheet(sheet);
        }

        var data = JSON.parse(e.postData.contents);

        // 순차 번호 계산
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

        // 데이터 행 추가
        sheet.appendRow([
            nextNum,            // No
            new Date(),         // 접수일시
            '설문발송',          // 상담상태 (자동 설정)
            data.name || '',    // 이름
            data.phone || '',   // 연락처
            data.email || '',   // 이메일
            data.location || '',// 공사위치
            data.message || '', // 문의내용
            ''                  // 상담 예약 날짜 (공란)
        ]);

        // ✅ 고객에게 자동 이메일 발송
        if (data.email) {
            sendSurveyEmail(data.name, data.email);
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

// 설문 링크 이메일 발송 함수
function sendSurveyEmail(customerName, customerEmail) {
    var subject = '[디자인지그] 맞춤 상담 설문 안내';

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
        <p>안녕하세요, <strong>${customerName || '고객'}님의</strong>님.</p>
        <p>디자인지그에 문의 주셔서 감사합니다.</p>
        <br>
        <p>디자인지그는<br>
        공간을 단순히 꾸미는 것이 아니라,<br>
        그 공간에서 살아갈 사람의 생활 방식과 기준을<br>
        먼저 이해하는 것에서 설계를 시작합니다.</p>
        <br>
        <p>보다 정확한 상담을 위해<br>
        간단한 사전 설문을 요청드립니다.<br>
        설문을 통해 공간의 방향과 우선순위를 정리한 후,<br>
        그에 맞는 상담을 진행하고 있습니다.</p>
        <br>
        <p>아래 설문을 작성해 주시면,<br>
        확인 후 안내드리겠습니다.</p>
        <br>
        <p>
            <a href="${SURVEY_FORM_URL}">▶ 사전 설문 작성하기</a>
        </p>
        <br>
        <p>설문은 약 2~3분 정도 소요됩니다.</p>
        <br>
        <p>감사합니다.<br>
        DESIGN JIG 드림</p>

        <div class="footer">
            <strong style="color: #1a1a1a; font-size: 13px;">DESIGN JIG</strong><br>
            공간에 기준을 세우는 디자인<br>
            <span style="font-size: 11px; color: #999;">© Design Jig. All rights reserved.</span>
        </div>
    </div>
</body>
</html>
    `;

    var plainTextBody = `
안녕하세요, ${customerName || '고객'}님.
디자인지그에 문의 주셔서 감사합니다.

디자인지그는
공간을 단순히 꾸미는 것이 아니라,
그 공간에서 살아갈 사람의 생활 방식과 기준을
먼저 이해하는 것에서 설계를 시작합니다.

보다 정확한 상담을 위해
간단한 사전 설문을 요청드립니다.
설문을 통해 공간의 방향과 우선순위를 정리한 후,
그에 맞는 상담을 진행하고 있습니다.

아래 설문을 작성해 주시면,
확인 후 안내드리겠습니다.

▶ 사전 설문 작성하기: ${SURVEY_FORM_URL}

설문은 약 2~3분 정도 소요됩니다.

감사합니다.
DESIGN JIG 드림

────────────────
DESIGN JIG
공간에 기준을 세우는 디자인
© Design Jig. All rights reserved.
    `;

    try {
        MailApp.sendEmail({
            to: customerEmail,
            subject: subject,
            body: plainTextBody,
            htmlBody: htmlBody,
            name: SENDER_NAME
        });
        console.log('이메일 발송 성공: ' + customerEmail);
    } catch (error) {
        console.log('이메일 발송 실패: ' + error.toString());
    }
}

// 시트 초기 설정 (헤더 + 스타일)
function setupSheet(sheet) {
    var headers = ['No.', '접수일시', '상담상태', '이름', '연락처', '이메일', '공사위치', '문의내용', '상담 예약 날짜'];
    sheet.appendRow(headers);

    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4a7c59');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');

    sheet.setColumnWidth(1, 50);  // No
    sheet.setColumnWidth(2, 150); // Date
    sheet.setColumnWidth(3, 100); // Status
    sheet.setColumnWidth(4, 80);  // Name
    sheet.setColumnWidth(5, 120); // Phone
    sheet.setColumnWidth(6, 180); // Email
    sheet.setColumnWidth(7, 200); // Location
    sheet.setColumnWidth(8, 250); // Message
    sheet.setColumnWidth(9, 120); // Reservation Date

    sheet.getRange(1, 1, 1, headers.length).createFilter();
}

// 데이터 읽기 (GET 요청) - admin 페이지용
function doGet(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById('1Yp9UjY37PlBgXdyC2_acwfa8prxo7yD_VKAOcnIQQVw');
        var sheet = spreadsheet.getActiveSheet();
        var data = sheet.getDataRange().getValues();

        var headers = data[0];
        var rows = data.slice(1);

        var result = rows.map(function (row, index) {
            return {
                no: row[0] || index + 1,
                date: row[1] || '',
                status: row[2] || '신규문의', // 상담상태
                name: row[3] || '',
                phone: row[4] || '',
                email: row[5] || '',
                location: row[6] || '',
                message: row[7] || '',
                note: row[8] || '' // 상담 예약 날짜
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

// 테스트용 함수 (Apps Script 에디터에서 직접 실행 가능)
function testSendEmail() {
    sendSurveyEmail('테스트고객', 'your-email@example.com');
}
