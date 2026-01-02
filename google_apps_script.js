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
const SURVEY_FORM_URL = 'https://forms.gle/여기에_실제_설문_링크';

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
            nextNum,
            new Date(),
            data.name || '',
            data.phone || '',
            data.email || '',
            data.type || '',
            data.size || '',
            data.location || '',
            data.budget || '',
            data.message || '설문 링크 발송 완료',
            ''
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
        body { font-family: 'Noto Sans KR', -apple-system, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #1a1a1a; }
        .content { background: #f8f6f3; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .highlight { color: #B4956F; font-weight: bold; }
        .btn { display: inline-block; background: #B4956F; color: #fff !important; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">DESIGN JIG</div>
            <p style="color: #666; font-size: 14px;">기준으로 완성하는, 오래 가는 인테리어</p>
        </div>
        
        <div class="content">
            <p>안녕하세요, <strong>${customerName || '고객'}</strong>님!</p>
            <p>디자인지그에 상담 문의해 주셔서 감사합니다.</p>
            <p>고객님께 맞는 <span class="highlight">맞춤 상담</span>을 위해<br>
            아래 설문을 작성해 주시면 더욱 정확한 상담이 가능합니다.</p>
            
            <div style="text-align: center;">
                <a href="${SURVEY_FORM_URL}" class="btn">📋 설문 작성하기</a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
                설문은 약 3분 정도 소요되며,<br>
                작성해 주신 내용을 바탕으로 순차적으로 상담을 도와드리겠습니다.
            </p>
        </div>
        
        <div class="footer">
            <p>디자인지그 | 경기도 용인시</p>
            <p>연락처: 031-000-0000 | 이메일: designjig.office@gmail.com</p>
            <p>© Design Jig. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;

    var plainTextBody = `
안녕하세요, ${customerName || '고객'}님!

디자인지그에 상담 문의해 주셔서 감사합니다.

고객님께 맞는 맞춤 상담을 위해 아래 설문을 작성해 주시면 
더욱 정확한 상담이 가능합니다.

👉 설문 링크: ${SURVEY_FORM_URL}

설문은 약 3분 정도 소요되며,
작성해 주신 내용을 바탕으로 순차적으로 상담을 도와드리겠습니다.

감사합니다.
디자인지그 드림
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
    var headers = ['No.', '접수일시', '이름', '연락처', '이메일', '공사유형', '예상평수', '공사위치', '예산', '문의내용', '상담 예약 날짜'];
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
    sheet.setColumnWidth(6, 100);
    sheet.setColumnWidth(7, 80);
    sheet.setColumnWidth(8, 200);
    sheet.setColumnWidth(9, 120);
    sheet.setColumnWidth(10, 250);
    sheet.setColumnWidth(11, 120);

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
                name: row[2] || '',
                phone: row[3] || '',
                email: row[4] || '',
                type: row[5] || '',
                size: row[6] || '',
                location: row[7] || '',
                budget: row[8] || '',
                message: row[9] || '',
                note: row[10] || ''
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
