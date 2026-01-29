/**
 * 노션 프록시 API (카카오톡 OG 미리보기용)
 *
 * 사용법: https://www.designjig.com/api/notion?name=고객명&url=노션URL
 *
 * 카카오톡에서 공유 시:
 * - 이미지: 디자인지그 로고
 * - 제목: "고객명 고객님 공사 안내문"
 * - 설명: 공사 스케줄 안내
 */

export default function handler(req, res) {
    const { name = '고객', url = '' } = req.query;

    // User-Agent 확인 (크롤러인지 일반 사용자인지)
    const userAgent = req.headers['user-agent'] || '';
    const isCrawler = /kakaotalk|facebookexternalhit|twitterbot|slackbot|telegrambot|whatsapp|linkedinbot|discordbot|bot|crawler|spider/i.test(userAgent);

    // 크롤러가 아닌 경우 (실제 사용자) 즉시 노션으로 리다이렉트
    if (!isCrawler && url) {
        res.writeHead(302, { Location: url });
        res.end();
        return;
    }

    // OG 이미지: 원본 이미지 사용 (로고 + 텍스트)
    const ogImage = 'https://res.cloudinary.com/designjig/image/upload/c_fit,w_1200,h_630/v1769232218/sfugtbfiuyi8ehvtkzcs.png';

    // OG 메타 정보
    const ogTitle = `${name} 고객님 공사 안내문`;
    const ogDescription = '공사 스케줄·공정별 체크리스트·자재목록(A/S)정보·FAQ';

    // 노션 URL 이스케이프
    const safeUrl = url.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- OG 태그 (카카오톡 미리보기) -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDescription}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="${safeUrl}">

    <!-- 트위터 카드 -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${ogTitle}">
    <meta name="twitter:description" content="${ogDescription}">
    <meta name="twitter:image" content="${ogImage}">

    <title>${ogTitle}</title>

    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Noto Sans KR", sans-serif;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .loader {
            text-align: center;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(0, 0, 0, 0.1);
            border-top-color: #333;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .text {
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="loader">
        <div class="spinner"></div>
        <div class="text">페이지를 불러오는 중...</div>
    </div>

    <script>
        var notionUrl = "${safeUrl}";
        if (notionUrl) {
            window.location.replace(notionUrl);
        }
    </script>
</body>
</html>`;

    // HTML 응답
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(html);
}
