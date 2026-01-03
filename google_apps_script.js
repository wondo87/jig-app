/**
 * 디자인 지그 웹사이트 - 상담 문의 처리 + 자동 이메일 발송 스크립트
 * 
 * [기능]
 * 1. 고객 문의 접수 → Google Sheets 저장
 * 2. 고객에게 자동으로 설문 링크 이메일 발송 (이름, 연락처, 이메일, 주소, 문의내용 자동 입력)
 */

// ========== 설정 영역 ==========
// 설문지 기본 주소 (viewform 이전까지)
const FORM_BASE_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdcsD1hjKMNezFTaPAZRlKovdRDfCW08cy4VfLHL_LJDcmbVw/viewform';

// 설문지 항목별 ID (자동 입력을 위해 필요)
const ENTRY_IDS = {
    NAME: '2076163714',
    PHONE: '217138793',
    EMAIL: '916215270',
    ADDRESS: '840428259',
    MESSAGE: '1360575573' // [추가됨] 문의내용 ID
};

// 발신자 이름
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

        // 시트에 데이터 추가 (문의내용 포함)
        sheet.appendRow([
            nextNum,
            new Date(),
            data.name || '',
            data.phone || '',
            data.email || '',
            data.location || '',
            data.message || '', // 문의내용이 시트에도 잘 들어가는지 확인
            '설문발송',
            ''
        ]);

        // ✅ 고객 맞춤형 이메일 발송
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

    // URL 파라미터 생성 (자동 입력)
    // viewform?usp=pp_url&entry.ID=VALUE...
    var params = [
        'usp=pp_url',
        'entry.' + ENTRY_IDS.NAME + '=' + encodeURIComponent(customerName),
        'entry.' + ENTRY_IDS.PHONE + '=' + encodeURIComponent(data.phone || ''),
        'entry.' + ENTRY_IDS.EMAIL + '=' + encodeURIComponent(data.email || ''),
        'entry.' + ENTRY_IDS.ADDRESS + '=' + encodeURIComponent(data.location || ''),
        'entry.' + ENTRY_IDS.MESSAGE + '=' + encodeURIComponent(data.message || '') // [확인필수] 문의내용 자동입력 로직
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
        <p>안녕하세요, <strong>\${customerName}</strong> 님.<br>
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
            <a href="\${finalSurveyUrl}">▶ 사전 설문 작성하기</a><br>
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

안녕하세요, \${customerName} 님.
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
\${finalSurveyUrl}
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
    // ... 스타일 설정 생략 ...
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
// [이동 로직 업데이트] 데이터 매핑 적용
// ==========================================
function processStatusChange(e) {
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

    // 타겟 시트가 없으면 생성 (헤더 자동 생성)
    if (!targetSheet) {
        targetSheet = spreadsheet.insertSheet(targetSheetName);
        var headers = ['NO', '고객명', '연락처', '이메일', '현장주소', '공사 완료일', '보증 기간 (개월)', '12개월차 점검 예정일', '12개월차 점검 상태', '담당자', '비고'];
        var headerRange = targetSheet.getRange(1, 1, 1, headers.length);
        headerRange.setValues([headers]);
        headerRange.setBackground('#4a7c59');
        headerRange.setFontColor('#ffffff');
        headerRange.setFontWeight('bold');
        headerRange.setHorizontalAlignment('center');

        // 열 너비 조정 (선택 사항)
        targetSheet.setColumnWidth(2, 100);
        targetSheet.setColumnWidth(3, 120);
        targetSheet.setColumnWidth(4, 180);
        targetSheet.setColumnWidth(5, 200);
    }

    // 1. 원본 데이터 가져오기 (No, 접수일시, 이름, 연락처, 이메일, 현장주소, 문의내용, 상담상태, 예약날짜)
    // 범위: 해당 행의 1열부터 끝까지
    var rowValues = sourceSheet.getRange(rowNum, 1, 1, sourceSheet.getLastColumn()).getValues()[0];

    // 원본 데이터 매핑 (인덱스는 0부터 시작)
    var no = rowValues[0];       // No.
    var name = rowValues[2];     // 이름
    var phone = rowValues[3];    // 연락처
    var email = rowValues[4];    // 이메일
    var address = rowValues[5];  // 현장주소
    // var message = rowValues[6];  // 문의내용 (비고에 넣으려면 사용)

    // 2. 타겟 시트에 넣을 데이터 배열 만들기 (순서 중요!)
    // ['NO', '고객명', '연락처', '이메일', '현장주소', '공사 완료일', '보증 기간', '점검 예정일', '점검 상태', '담당자', '비고']
    var newRowData = [
        no,          // NO
        name,        // 고객명
        phone,       // 연락처
        email,       // 이메일
        address,     // 현장주소
        '',          // 공사 완료일 (빈칸)
        '',          // 보증 기간 (개월) (빈칸)
        '',          // 12개월차 점검 예정일 (빈칸)
        '',          // 12개월차 점검 상태 (빈칸)
        '',          // 담당자 (빈칸)
        ''           // 비고 (빈칸, 필요 시 message 변수 할당)
    ];

    // 3. 타겟 시트에 데이터 추가
    targetSheet.appendRow(newRowData);

    // 4. 원본 시트에서 해당 행 삭제
    sourceSheet.deleteRow(rowNum);

    // 성공 메시지
    spreadsheet.toast('고객 정보를 [계약완료고객_A/S] 시트로 이동했습니다.', '이동 완료');
}
