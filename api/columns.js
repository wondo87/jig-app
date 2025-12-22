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

    // 환경변수 문제로 인해 임시로 ID 하드코딩
    const databaseId = '2d116b5df7b380dcb0ebc5e97f6f9332';

    // if (!databaseId) { ... } 체크 제거

    try {
        const response = await notion.databases.query({
            database_id: databaseId,
            sorts: [
                {
                    property: '작성일',
                    direction: 'descending',
                },
            ],
        });

        // 노션의 원본 데이터(results)를 그대로 클라이언트에 보냅니다.
        res.status(200).json(response.results);
    } catch (error) {
        console.error('Notion API Error (With Sort):', error);

        // 정렬 실패 시 (속성 이름 불일치 등) 정렬 없이 재시도
        try {
            const response = await notion.databases.query({
                database_id: databaseId,
            });
            return res.status(200).json(response.results);
        } catch (retryError) {
            console.error('Notion API Error (Retry):', retryError);
            res.status(500).json({ error: retryError.message, details: retryError.body || 'No details' });
        }
    }
}
