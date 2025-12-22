/**
 * 디자인 지그 웹사이트 - 견적 문의 처리 스크립트
 * 
 * [설치 방법]
 * 1. 구글 스프레드시트 새 문서 생성 (이름: '디자인지그 견적문의')
 * 2. '확장 프로그램' -> 'Apps Script' 메뉴 클릭
 * 3. 기존 코드를 지우고 이 코드를 전부 복사해서 붙여넣기
 * 4. '배포' -> '새 배포' 클릭
 * 5. 유형 선택: '웹 앱'
 * 6. 설명: '견적 문의 API'
 * 7. 다음 사용자 등을 대신하여 실행: '나(자신)'
 * 8. 액세스 권한이 있는 사용자: '모든 사용자' (중요! 그래야 홈페이지에서 접속 가능)
 * 9. '배포' 버튼 클릭 후 생성된 '웹 앱 URL'을 복사
 * 10. 복사한 URL을 quote.html 파일의 GOOGLE_SCRIPT_URL 변수 값으로 넣으세요.
 */

function doPost(e) {
    // CORS 문제 해결을 위한 Lock 서비스 사용
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        // 스프레드시트 열기
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

        // 헤더가 없으면 생성
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(['접수일시', '이름', '연락처', '이메일', '공사 유형', '예상 평수', '공사 위치', '예산', '문의 내용']);
        }

        // 전송된 데이터 파싱
        var data = JSON.parse(e.postData.contents);

        // 데이터 행 추가
        sheet.appendRow([
            new Date(), // 접수일시 (현재 시간)
            data.name,
            data.phone,
            data.email,
            data.type,
            data.size,
            data.location,
            data.budget,
            data.message
        ]);

        // 성공 응답 반환
        return ContentService
            .createTextOutput(JSON.stringify({ "result": "success" }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        // 에러 응답 반환
        return ContentService
            .createTextOutput(JSON.stringify({ "result": "error", "error": e.toString() }))
            .setMimeType(ContentService.MimeType.JSON);

    } finally {
        lock.releaseLock();
    }
}
