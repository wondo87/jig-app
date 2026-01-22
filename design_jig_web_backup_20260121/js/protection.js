// 콘텐츠 보호 스크립트 - 메인/칼럼/포트폴리오 페이지용
// 문의 페이지(quote.html)에서는 이 스크립트를 포함하지 않음

(function () {
    'use strict';

    // 우클릭 방지
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    });

    // 텍스트 선택 방지
    document.addEventListener('selectstart', function (e) {
        e.preventDefault();
        return false;
    });

    // 드래그 방지
    document.addEventListener('dragstart', function (e) {
        e.preventDefault();
        return false;
    });

    // 키보드 단축키 방지
    document.addEventListener('keydown', function (e) {
        // Ctrl+C (복사), Ctrl+U (소스보기), Ctrl+S (저장), Ctrl+A (전체선택)
        if (e.ctrlKey && (e.key === 'c' || e.key === 'u' || e.key === 's' || e.key === 'a')) {
            e.preventDefault();
            return false;
        }
        // Cmd key for Mac
        if (e.metaKey && (e.key === 'c' || e.key === 'u' || e.key === 's' || e.key === 'a')) {
            e.preventDefault();
            return false;
        }
        // F12 (개발자도구)
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I (개발자도구)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+J (콘솔)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+C (요소 검사)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            return false;
        }
    });

    // CSS 보호 스타일 주입
    const style = document.createElement('style');
    style.textContent = `
        body {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
        }
        img {
            -webkit-user-drag: none !important;
            -khtml-user-drag: none !important;
            -moz-user-drag: none !important;
            -o-user-drag: none !important;
            pointer-events: none !important;
        }
        /* 링크와 버튼은 클릭 가능하도록 유지 */
        a, button, input, .btn, .nav-link, .column-card, .portfolio-card {
            pointer-events: auto !important;
        }
    `;
    document.head.appendChild(style);
})();
