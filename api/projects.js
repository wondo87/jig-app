const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_API_KEY || "ntn_W60962876671zXOYqiYKtlhW1IS8ort8H9fAhUekkeF3JY" });
const PROJECT_DB_ID = "22bc2a12-1ce9-4ff2-8e17-1cf91bcdf3a8";

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const response = await notion.databases.query({
            database_id: PROJECT_DB_ID,
            sorts: [
                {
                    property: "현장명",
                    direction: "ascending",
                },
            ],
        });

        const projects = response.results.map(page => {
            const titleProperty = page.properties["현장명"];
            const name = titleProperty && titleProperty.title[0]
                ? titleProperty.title[0].plain_text
                : "이름 없음";
            return {
                id: page.id,
                name: name
            };
        }).filter(p => p.name !== "이름 없음" && !p.name.includes("템플릿"));

        res.status(200).json({ success: true, projects });
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
