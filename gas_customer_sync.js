// ================================================
// 디자인지그 고객관리 - Google Apps Script (수정됨)
// ================================================
// 마지막 업데이트: 2026-01-01
// 용도: adminwonpro.html에서 고객 데이터를 Google Sheets로 동기화

// 올바른 스프레드시트 ID
var SPREADSHEET_ID = '12uGvZETy-_6Er6SYkzA0F1VQ8gMogKuESpSLY75yiF0';

/**
 * POST 요청 핸들러 - 단일 고객 데이터 저장/업데이트
 * adminwonpro.html의 syncToGoogleSheets에서 호출됨
 */
function doPost(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        var payload = JSON.parse(e.postData.contents);

        // sheetName이 있으면 사용, 없으면 기본값
        var sheetName = payload.sheetName || '고객관리';
        var sheet = spreadsheet.getSheetByName(sheetName);

        // 시트가 없으면 생성
        if (!sheet) {
            sheet = spreadsheet.insertSheet(sheetName);
            initializeSheet(sheet);
        }

        // 헤더가 없으면 초기화
        if (sheet.getLastRow() === 0) {
            initializeSheet(sheet);
        }

        var customerData = payload.data;
        var customerId = customerData.customerId;

        // 기존 고객 찾기 (customerId로 검색)
        var data = sheet.getDataRange().getValues();
        var rowIndex = -1;

        for (var i = 1; i < data.length; i++) {
            if (data[i][0] === customerId) {
                rowIndex = i + 1; // 1-indexed
                break;
            }
        }

        // 행 데이터 구성
        var rowData = [
            customerData.customerId || '',
            customerData.status || '',
            customerData.createdAt || new Date().toISOString(),
            customerData.clientName || '',
            customerData.clientPhone || '',
            customerData.clientEmail || '',
            customerData.clientAddress || '',
            customerData.projectName || '',
            customerData.siteAddress || '',
            customerData.constructionPeriod || '',
            customerData.pyeong || '',
            customerData.totalAmount || '',
            customerData.estimateProfitRate || '',
            customerData.jsonData || JSON.stringify(customerData)
        ];

        if (rowIndex > 0) {
            // 기존 고객 업데이트
            sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
        } else {
            // 새 고객 추가
            sheet.appendRow(rowData);
        }

        return ContentService.createTextOutput(JSON.stringify({
            result: 'success',
            action: rowIndex > 0 ? 'updated' : 'created',
            customerId: customerId
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            result: 'error',
            error: err.toString(),
            line: err.lineNumber
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * GET 요청 핸들러 - 전체 고객 데이터 불러오기
 */
function doGet(e) {
    try {
        var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        var sheetName = e.parameter.sheet || '고객관리';
        var sheet = spreadsheet.getSheetByName(sheetName);

        if (!sheet || sheet.getLastRow() < 2) {
            return ContentService.createTextOutput(JSON.stringify([]))
                .setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getDataRange().getValues();
        var customers = [];

        // 헤더 제외하고 데이터 읽기
        for (var i = 1; i < data.length; i++) {
            var row = data[i];
            var jsonData = row[13]; // JSON데이터 열

            if (jsonData) {
                try {
                    customers.push(JSON.parse(jsonData));
                } catch (e) {
                    // JSON 파싱 실패시 기본 데이터 사용
                    customers.push({
                        customerId: row[0],
                        status: row[1],
                        createdAt: row[2],
                        clientName: row[3],
                        clientPhone: row[4],
                        clientEmail: row[5],
                        clientAddress: row[6],
                        projectName: row[7],
                        siteAddress: row[8],
                        constructionPeriod: row[9],
                        area: row[10],
                        totalAmount: row[11],
                        profitRate: row[12]
                    });
                }
            }
        }

        return ContentService.createTextOutput(JSON.stringify(customers))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            error: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * 시트 초기화 함수 - 헤더 및 스타일 설정
 */
function initializeSheet(sheet) {
    var headers = [
        '고객ID', '상태', '생성일', '성명', '연락처',
        '이메일', '주소', '공사명', '현장주소', '공사기간',
        '평형', '계약금액', '이윤율', 'JSON데이터'
    ];

    sheet.appendRow(headers);

    // 헤더 스타일
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#B4956F');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);

    // 열 너비 자동 조정
    for (var i = 1; i <= headers.length; i++) {
        sheet.autoResizeColumn(i);
    }
}
