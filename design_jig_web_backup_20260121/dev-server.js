import express from 'express';
import cors from 'cors';
import { Client } from "@notionhq/client";
import path from 'path';

const app = express();
const port = 3001;

// Serve static files from the current directory
app.use(express.static('.'));

// Provided by user
const NOTION_API_KEY = "ntn_Z60962876671RUe2pR1vOcv1kPb3HretjAhTDWnwkHC7CZ";
const DATABASE_ID = "6b993a15bb2643979ceb382460ed7e77";
const MAINPAGE_DB_ID = '2d216b5df7b38076b153e5642eb299df';

const notion = new Client({ auth: NOTION_API_KEY });

app.use(cors());
app.use(express.json());

app.get('/api/mainpage', async (req, res) => {
    const { category } = req.query;
    try {
        const queryOptions = {
            database_id: MAINPAGE_DB_ID,
            sorts: [{ property: '작성일', direction: 'descending' }],
        };

        if (category) {
            queryOptions.filter = {
                property: '선택',
                select: { equals: category }
            };
        }

        const response = await notion.databases.query(queryOptions);
        res.status(200).json(response.results);
    } catch (error) {
        console.error("Mainpage API Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/projects', async (req, res) => {
    try {
        const PROJECT_DB_ID = "22bc2a12-1ce9-4ff2-8e17-1cf91bcdf3a8";

        const response = await notion.databases.query({
            database_id: PROJECT_DB_ID,
            sorts: [{ property: "현장명", direction: "ascending" }],
        });

        const projects = response.results.map(page => {
            const titleProperty = page.properties["현장명"];
            const name = titleProperty && titleProperty.title[0]
                ? titleProperty.title[0].plain_text
                : "이름 없음";
            return { id: page.id, name: name };
        }).filter(p => p.name !== "이름 없음" && !p.name.includes("템플릿"));

        res.status(200).json({ success: true, projects });
    } catch (error) {
        console.error("Fetch Projects Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/sync-schedule', async (req, res) => {
    const { project, schedules } = req.body;
    console.log(`Syncing project: ${project} with ${schedules.length} rows...`);

    try {
        const results = [];
        for (const item of schedules) {
            const response = await notion.pages.create({
                parent: { database_id: DATABASE_ID },
                properties: {
                    "공정명": { title: [{ text: { content: item.name || "미상의 공정" } }] },
                    "프로젝트": { select: { name: project } },
                    "시작-종료": item.start && item.end ? {
                        date: { start: item.start, end: item.end }
                    } : undefined,
                    "담당자": { rich_text: [{ text: { content: item.inCharge || "" } }] },
                    "비고": { rich_text: [{ text: { content: item.memo || "" } }] }
                }
            });
            results.push(response.id);
        }
        res.status(200).json({ message: "Success", count: results.length });
    } catch (error) {
        console.error("Notion Error:", error.message);
        res.status(500).json({ message: error.message });
    }
});

app.listen(port, () => {
    console.log(`Local Dev Server running at http://localhost:${port}`);
});
