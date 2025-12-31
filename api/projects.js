import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY || "ntn_W60962876671zXOYqiYKtlhW1IS8ort8H9fAhUekkeF3JY" });
const SCHEDULE_DB_ID = "6b993a15bb2643979ceb382460ed7e77";
const PORTFOLIO_DB_ID = "2d016b5df7b3804bb0e3f65399868e3d";

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Fetch database to get property options
        const response = await notion.databases.retrieve({ database_id: SCHEDULE_DB_ID });

        const projectProp = response.properties["프로젝트"];
        if (projectProp && projectProp.type === 'select') {
            const projects = projectProp.select.options.map(opt => ({
                id: opt.id,
                name: opt.name
            }));
            return res.status(200).json({ success: true, projects });
        } else {
            // Fallback: search in Portfolio database
            const portfolioResponse = await notion.databases.query({
                database_id: PORTFOLIO_DB_ID,
                page_size: 100
            });

            const projects = portfolioResponse.results.map(page => {
                const nameProp = page.properties["이름"];
                const name = nameProp && nameProp.title[0] ? nameProp.title[0].plain_text : "이름 없음";
                return { id: page.id, name };
            }).filter(p => p.name !== "이름 없음" && !p.name.includes("템플릿"));

            return res.status(200).json({ success: true, projects });
        }
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}
