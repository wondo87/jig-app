/**
 * [추가] 공정별 체크리스트 마스터 데이터 업데이트 (순서 저장)
 */
function handleChecklistMasterUpdate(payload) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: 'Server busy'
        })).setMimeType(ContentService.MimeType.JSON);
    }

    try {
        var items = payload.data; // [{번호:1, 항목:..., 내용:..., 진행단계:..., category:...}, ...]
        if (!items || !Array.isArray(items)) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                message: 'Invalid data format'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var spreadsheet = getTargetSpreadsheet(CUSTOMER_SHEET_ID);

        // 1. [메인] 유저가 지정한 이름: '공정 체크리스트'
        var sheet = spreadsheet.getSheetByName('공정 체크리스트');
        // Fallbacks
        if (!sheet) sheet = spreadsheet.getSheetByName('공정체크리스트');
        if (!sheet) sheet = spreadsheet.getSheetByName('공정별 체크리스트');
        if (!sheet) sheet = spreadsheet.getSheetByName('checklist');

        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                message: '공정 체크리스트 시트를 찾을 수 없습니다.'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // 2. 기존 데이터 클리어 (헤더 제외)
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        }

        // 3. 새 데이터 준비
        // 헤더 순서: 번호, 항목, 내용, 진행단계, 분류, 비고 (시트 헤더와 일치해야 함)
        // [주의] 'category' 필드는 '분류' 컬럼에 매핑됨 (또는 헤더가 'category'라면 그대로 사용)

        // 헤더 확인
        var headerValues = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

        var newRows = items.map(function (item) {
            var rowData = [];
            headerValues.forEach(function (header) {
                var key = header;
                var val = item[key] || '';

                // key mapping fallback
                if (!val) {
                    if ((header === '분류' || header === '카테고리') && item['category']) val = item['category'];
                }

                rowData.push(val);
            });
            return rowData;
        });

        // 4. 데이터 쓰기
        if (newRows.length > 0) {
            sheet.getRange(2, 1, newRows.length, newRows[0].length).setValues(newRows);
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: '체크리스트 순서가 저장되었습니다.',
            count: newRows.length
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: '저장 실패: ' + error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}
