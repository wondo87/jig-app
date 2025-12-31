import { Client } from "@notionhq/client";

const NOTION_API_KEY = "ntn_W60962876671zXOYqiYKtlhW1IS8ort8H9fAhUekkeF3JY";
const DATABASE_ID = "6b993a15bb2643979ceb382460ed7e77";

const notion = new Client({
    auth: NOTION_API_KEY,
});

export default async function handler(req, res) {
    // Enable CORS for local testing if needed
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    const { project, schedules } = req.body;

    if (!project || !schedules || !Array.isArray(schedules)) {
        return res.status(400).json({ message: "Missing project or schedules data" });
    }

    try {
        const results = [];

        for (const item of schedules) {
            // Create a new page in the construction schedule database
            const properties = {
                "공정명": {
                    title: [{ text: { content: item.name || "미상의 공정" } }]
                },
                "프로젝트": {
                    select: { name: project }
                },
                "시작-종료": item.start && item.end ? {
                    date: {
                        start: item.start,
                        end: item.end
                    }
                } : undefined,
                "담당자": {
                    rich_text: [{ text: { content: item.inCharge || "" } }]
                },
                "비고": {
                    rich_text: [{ text: { content: item.memo || "" } }]
                }
            };

            // Add photo if exists
            if (item.photoUrl) {
                properties["사진"] = {
                    files: [{
                        name: "Field_Photo",
                        type: "external",
                        external: { url: item.photoUrl }
                    }]
                };
            }

            const response = await notion.pages.create({
                parent: { database_id: DATABASE_ID },
                properties: properties
            });
            results.push(response.id);
        }

        return res.status(200).json({
            success: true,
            message: "Successfully synced to Notion",
            count: results.length,
            pageIds: results
        });

    } catch (error) {
        console.error("Notion Sync Error:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
}
