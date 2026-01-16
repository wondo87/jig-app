import { Client } from '@notionhq/client';

// 하드코딩된 키 사용 (Vercel 환경변수 설정 어려움 해결용)
const notion = new Client({ auth: 'ntn_Z60962876671RUe2pR1vOcv1kPb3HretjAhTDWnwkHC7CZ' });
const MAINPAGE_DB_ID = '2d216b5df7b38076b153e5642eb299df';

export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=10'); // 빠른 갱신

    const { category } = req.query;

    try {
        let queryOptions = {
            database_id: MAINPAGE_DB_ID,
            // '작성일' 속성이 DB에 없을 경우 에러가 발생하므로, 안전하게 '생성일시(created_time)' 기준으로 정렬
            sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        };

        if (category) {
            queryOptions.filter = {
                property: '선택',
                select: { equals: category }
            };
        }

        let response = await notion.databases.query(queryOptions);

        // [Fallback Logic]
        // Notion API의 필터가 한글 인코딩 등으로 인해 정확하지 않을 수 있음
        // 결과가 0개이고 카테고리가 지정된 경우, 필터 없이 가져와서 JS에서 직접 찾음
        if (response.results.length === 0 && category) {
            console.log(`[Fallback] No results for category '${category}'. Fetching items manually...`);

            // 필터 제거 및 페이지 사이즈 조정
            delete queryOptions.filter;
            queryOptions.page_size = 50;

            const fallbackResponse = await notion.databases.query(queryOptions);

            // JS로 직접 필터링 (가장 확실한 방법)
            const filtered = fallbackResponse.results.filter(page => {
                const pageCategory = page.properties['선택']?.select?.name;
                return pageCategory === category;
            });

            console.log(`[Fallback] Found ${filtered.length} items after manual filtering.`);
            return res.status(200).json(filtered);
        }

        res.status(200).json(response.results);

    } catch (error) {
        console.error("Mainpage API Error:", error.message);
        res.status(500).json({
            error: error.message,
            details: error.body || 'No details',
            category: category
        });
    }
}
