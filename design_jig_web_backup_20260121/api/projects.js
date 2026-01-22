import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY || "ntn_W60962876671zXOYqiYKtlhW1IS8ort8H9fAhUekkeF3JY" });
const SCHEDULE_DB_ID = "6b993a15bb2643979ceb382460ed7e77";
const PORTFOLIO_DB_ID = "2d016b5df7b3804bb0e3f65399868e3d";
const PROJECT_MGMT_DB_ID = "22bc2a12-1ce9-4ff2-8e17-1cf91bcdf3a8";

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const projects = [];

        // 1. PROJECT_MGMT_DB_ID (① 프로젝트 관리) 에서 '현장명' 가져오기
        try {
            const mgmtResponse = await notion.databases.query({
                database_id: PROJECT_MGMT_DB_ID,
                page_size: 100
            });
            mgmtResponse.results.forEach(page => {
                const nameProp = page.properties["현장명"];
                const name = nameProp && nameProp.title[0] ? nameProp.title[0].plain_text : null;
                if (name && !name.includes("템플릿")) {
                    projects.push({ id: page.id, name });
                }
            });
        } catch (e) {
            console.warn("Failed to fetch from Project Management DB:", e.message);
        }

        // 2. 만약 프로젝트가 없다면 SCHEDULE_DB_ID 의 '프로젝트' select 옵션 가져오기
        if (projects.length === 0) {
            try {
                const scheduleResponse = await notion.databases.retrieve({ database_id: SCHEDULE_DB_ID });
                const projectProp = scheduleResponse.properties["프로젝트"];
                if (projectProp && projectProp.type === 'select') {
                    projectProp.select.options.forEach(opt => {
                        projects.push({ id: opt.id, name: opt.name });
                    });
                }
            } catch (e) {
                console.warn("Failed to fetch from Schedule DB options:", e.message);
            }
        }

        // 3. 마지막 Fallback: Portfolio DB
        if (projects.length === 0) {
            try {
                const portfolioResponse = await notion.databases.query({
                    database_id: PORTFOLIO_DB_ID,
                    page_size: 100
                });
                portfolioResponse.results.forEach(page => {
                    const nameProp = page.properties["이름"];
                    const name = nameProp && nameProp.title[0] ? nameProp.title[0].plain_text : null;
                    if (name && !name.includes("템플릿")) {
                        projects.push({ id: page.id, name });
                    }
                });
            } catch (e) {
                console.warn("Failed to fetch from Portfolio DB:", e.message);
            }
        }

        // 중복 제거 및 이름 정렬
        const uniqueProjects = Array.from(new Map(projects.map(p => [p.name, p])).values())
            .sort((a, b) => a.name.localeCompare(b.name));

        return res.status(200).json({ success: true, projects: uniqueProjects });
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}
