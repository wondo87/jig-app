import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// 메모리 캐시 (5분 TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5분

export default async function handler(req, res) {
    // 환경변수 확인
    if (!process.env.NOTION_API_KEY) {
        return res.status(500).json({
            error: '환경변수가 설정되지 않았습니다.',
            missing: { NOTION_API_KEY: true }
        });
    }

    // 환경변수 우선 사용, 없을 경우 기본값 구성
    const databaseId = process.env.NOTION_COLUMNS_ID || '2d116b5df7b380dcb0ebc5e97f6f9332';

    // 카테고리 필터 파라미터 확인
    const { category, limit } = req.query;
    const cacheKey = `columns_${category || 'all'}_${limit || 'all'}`;

    // CDN 캐시 헤더 강화 (5분 캐시, 1일 백그라운드 재검증)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');

    // 메모리 캐시 확인
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(cached.data);
    }

    try {
        const queryOptions = {
            database_id: databaseId,
            sorts: [
                {
                    property: '작성일',
                    direction: 'descending',
                },
            ],
        };

        // 카테고리 필터 추가
        if (category) {
            queryOptions.filter = {
                property: '카테고리',
                select: {
                    equals: category
                }
            };
        }

        // 결과 개수 제한
        if (limit) {
            queryOptions.page_size = parseInt(limit, 10);
        }

        const response = await notion.databases.query(queryOptions);

        // 캐시에 저장
        cache.set(cacheKey, { data: response.results, timestamp: Date.now() });

        res.setHeader('X-Cache', 'MISS');
        res.status(200).json(response.results);
    } catch (error) {
        console.error('Notion API Error (With Sort):', error);

        // 정렬 실패 시 (속성 이름 불일치 등) 정렬 없이 재시도
        try {
            const response = await notion.databases.query({
                database_id: databaseId,
            });

            // 캐시에 저장
            cache.set(cacheKey, { data: response.results, timestamp: Date.now() });

            return res.status(200).json(response.results);
        } catch (retryError) {
            console.error('Notion API Error (Retry):', retryError);
            res.status(500).json({ error: retryError.message, details: retryError.body || 'No details' });
        }
    }
}
