import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export default async function handler(req, res) {
    // 환경변수 확인
    if (!process.env.NOTION_API_KEY) {
        return res.status(500).json({
            error: '환경변수가 설정되지 않았습니다.',
            missing: { NOTION_API_KEY: true }
        });
    }

    // 메인 페이지 데이터베이스 ID
    const databaseId = '2d216b5df7b38076b153e5642eb299df';

    // 카테고리 필터 파라미터 확인
    const { category } = req.query;

    try {
        const queryOptions = {
            database_id: databaseId,
        };

        // 카테고리 필터 추가 (선택 속성 이름이 '선택'일 수 있음)
        if (category) {
            queryOptions.filter = {
                or: [
                    {
                        property: '선택',
                        select: { equals: category }
                    },
                    {
                        property: '카테고리',
                        select: { equals: category }
                    }
                ]
            };
        }

        const response = await notion.databases.query(queryOptions);
        res.status(200).json(response.results);
    } catch (error) {
        console.error('Main Page API Error:', error);
        res.status(500).json({ error: error.message, details: error.body || 'No details' });
    }
}
