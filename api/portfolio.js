// Vercel Serverless Function: Notion 포트폴리오 데이터 가져오기
// 경로: /api/portfolio

const NOTION_API_KEY = 'ntn_W60962876671zXOYqiYKtlhW1IS8ort8H9fAhUekkeF3JY';
const DATABASE_ID = '2d016b5df7b380d2a974c5f07b6ebf82';

export default async function handler(req, res) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Notion API Error:', errorData);
            return res.status(response.status).json({ error: 'Notion API 오류', details: errorData });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Function Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
