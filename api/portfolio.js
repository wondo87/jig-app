const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  try {
    // 노션 데이터베이스에 쿼리를 날려 결과를 가져옵니다.
    const response = await notion.databases.query({
      database_id: databaseId,
    });

    // 가공하지 않고 노션의 원본 데이터(results)를 그대로 클라이언트에 보냅니다.
    // 이렇게 해야 portfolio.html의 p.properties... 코드가 작동합니다.
    res.status(200).json(response.results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}