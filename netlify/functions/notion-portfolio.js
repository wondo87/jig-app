// Netlify Function: Notion 포트폴리오 데이터 가져오기
// 경로: /.netlify/functions/notion-portfolio

const NOTION_API_KEY = 'ntn_W60962876671zXOYqiYKtlhW1IS8ort8H9fAhUekkeF3JY';
const DATABASE_ID = '2d016b5df7b380d2a974c5f07b6ebf82';

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // OPTIONS 요청 처리 (CORS)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // Notion API 호출
        const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sorts: [{ property: '생성일', direction: 'descending' }]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Notion API Error:', errorData);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ error: 'Notion API 오류', details: errorData })
            };
        }

        const data = await response.json();
        
        // Notion 데이터를 포트폴리오 형식으로 변환
        const projects = data.results.map((page, index) => {
            const props = page.properties;
            
            // 제목 추출
            const title = props['이름']?.title?.[0]?.plain_text || 
                         props['Name']?.title?.[0]?.plain_text ||
                         props['제목']?.title?.[0]?.plain_text ||
                         '제목 없음';
            
            // URL (이미지들) 추출
            const imageUrls = props['URL']?.files?.map(f => f.file?.url || f.external?.url) || [];
            
            // 카테고리 추출
            const categoryRaw = props['카테고리']?.multi_select?.map(s => s.name).join(' ') ||
                               props['카테고리']?.select?.name || '';
            
            // 카테고리 매핑
            let category = 'apartment';
            if (categoryRaw.includes('빌라') || categoryRaw.includes('주택')) category = 'villa';
            if (categoryRaw.includes('부분') || categoryRaw.includes('주방') || categoryRaw.includes('욕실')) category = 'partial';
            
            // 면적 추출
            const size = props['면적']?.select?.name || 
                        props['면적']?.rich_text?.[0]?.plain_text || '';
            
            // 가구 추출
            const furniture = props['가구']?.select?.name || 
                             props['가구']?.rich_text?.[0]?.plain_text || '';
            
            // 바닥 추출
            const floor = props['바닥']?.select?.name || 
                         props['바닥']?.rich_text?.[0]?.plain_text || '';
            
            // 위치 추출 (제목에서 추출 시도)
            let location = props['위치']?.rich_text?.[0]?.plain_text || '';
            if (!location && title) {
                // 제목에서 지역명 추출 (예: "반포 자이" -> "반포")
                const match = title.match(/^([가-힣]+)/);
                if (match) location = match[1];
            }
            
            // 설명 생성
            const description = `${categoryRaw} 인테리어. ${furniture ? '가구: ' + furniture + '. ' : ''}${floor ? '바닥: ' + floor : ''}`.trim();
            
            return {
                id: index + 1,
                notionId: page.id,
                title: title,
                category: category,
                categoryRaw: categoryRaw,
                location: location,
                size: size.replace('py', '평'),
                duration: '',
                year: new Date(page.created_time).getFullYear().toString(),
                description: description || title,
                furniture: furniture,
                floor: floor,
                thumbnail: imageUrls[0] || '',
                images: imageUrls
            };
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                projects: projects,
                total: projects.length 
            })
        };

    } catch (error) {
        console.error('Function Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
