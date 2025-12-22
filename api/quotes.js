// Google Sheets에서 견적 문의 데이터를 가져오는 API
// 스프레드시트 ID: 1Yp9UjY37PlBgXdyC2_acwfa8prxo7yD_VKAOcnIQQVw

export default async function handler(req, res) {
    // CORS 허용
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const SPREADSHEET_ID = '1Yp9UjY37PlBgXdyC2_acwfa8prxo7yD_VKAOcnIQQVw';
    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

    // API 키가 없으면 에러
    if (!API_KEY) {
        return res.status(500).json({
            error: 'Google Sheets API 키가 설정되지 않았습니다.',
            hint: 'Vercel 환경변수에 GOOGLE_SHEETS_API_KEY를 추가하세요.'
        });
    }

    try {
        // Google Sheets API v4로 데이터 가져오기
        const range = 'A:K'; // A~K열 (No. ~ 비고)
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            return res.status(500).json({
                error: 'Google Sheets API 오류',
                details: data.error.message
            });
        }

        const rows = data.values || [];

        // 첫 행이 헤더인지 확인
        if (rows.length === 0) {
            return res.status(200).json([]);
        }

        // 헤더 제외하고 데이터만 반환
        const headers = rows[0];
        const quotes = rows.slice(1).map((row, index) => ({
            no: row[0] || index + 1,
            date: row[1] || '',
            name: row[2] || '',
            phone: row[3] || '',
            email: row[4] || '',
            type: row[5] || '',
            size: row[6] || '',
            location: row[7] || '',
            budget: row[8] || '',
            message: row[9] || '',
            note: row[10] || ''
        }));

        // 최신순으로 정렬 (번호 큰 게 최신)
        quotes.reverse();

        res.status(200).json(quotes);

    } catch (error) {
        console.error('Error fetching from Google Sheets:', error);
        res.status(500).json({
            error: '데이터를 가져오는 중 오류가 발생했습니다.',
            details: error.message
        });
    }
}
