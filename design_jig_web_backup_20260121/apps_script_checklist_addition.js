// ====================================
// 공정별 체크리스트 처리 로직
// 기존 doGet 함수에 추가할 내용
// ====================================

// doGet 함수 내부의 switch 문 또는 if-else 문에 추가:

if (sheetParam === '공정별체크리스트' || sheetParam === '공정별_체크리스트') {
  return handleChecklistGet();
}

// 아래 함수를 doGet 함수 밖에 추가:

/**
 * 공정별 체크리스트 데이터 가져오기
 */
function handleChecklistGet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('공정별 체크리스트'); // 실제 시트 이름에 맞게 수정

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: '공정별 체크리스트 시트를 찾을 수 없습니다.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();

    // 첫 번째 행은 헤더 (체크, 번호, 항목, 내용, 비고, 진행단계, 분류)
    const headers = data[0];
    const rows = data.slice(1); // 2행부터 데이터

    // 데이터를 객체 배열로 변환
    const checklistItems = rows.map(row => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] || '';
      });
      return item;
    }).filter(item => item.번호); // 번호가 있는 항목만 포함

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

// ====================================
// 전체 doGet 함수 예시 구조
// ====================================

/*
function doGet(e) {
  const params = e.parameter;
  const sheetParam = params.sheet || '';

  // 기존 처리 로직들...
  if (sheetParam === '관리자') {
    return handleAdminGet();
  } else if (sheetParam === 'schedule_template') {
    return handleScheduleTemplateGet();
  } else if (sheetParam === 'as_list') {
    return handleASListGet();
  } else if (sheetParam === 'settlement') {
    const action = params.action;
    if (action === 'getSettlementOptions') {
      return handleSettlementOptionsGet();
    }
    return handleSettlementGet(params.customerId);
  }

  // 👇 여기에 체크리스트 처리 추가
  else if (sheetParam === '공정별체크리스트' || sheetParam === '공정별_체크리스트') {
    return handleChecklistGet();
  }

  // 기본 응답 (상담 관리 등)
  else {
    return handleDefaultGet();
  }
}
*/
