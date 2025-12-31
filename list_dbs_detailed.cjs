const { Client } = require("@notionhq/client");

const NOTION_API_KEY = "ntn_W60962876671zXOYqiYKtlhW1IS8ort8H9fAhUekkeF3JY";

const notion = new Client({ auth: NOTION_API_KEY });

async function listAllDbs() {
    try {
        const response = await notion.search({
            filter: { property: "object", value: "database" }
        });
        console.log("Databases Found:");
        for (const db of response.results) {
            const title = db.title[0]?.plain_text || "Untitled";
            console.log(`\n- ${title} (ID: ${db.id})`);
            console.log(`  Properties:`);
            for (const [name, prop] of Object.entries(db.properties)) {
                console.log(`    * ${name}: ${prop.type}`);
            }
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

listAllDbs();
