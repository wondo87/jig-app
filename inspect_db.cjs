const { Client } = require("@notionhq/client");

const NOTION_API_KEY = "ntn_W60962876671zXOYqiYKtlhW1IS8ort8H9fAhUekkeF3JY";
const DATABASE_ID = "2d716b5df7b380e4a414c492cb1a346b";

const notion = new Client({ auth: NOTION_API_KEY });

async function inspectDb() {
    try {
        const response = await notion.databases.retrieve({ database_id: DATABASE_ID });
        console.log("Database Properties:");
        for (const [name, prop] of Object.entries(response.properties)) {
            console.log(`- ${name}: ${prop.type}`);
        }

        const query = await notion.databases.query({ database_id: DATABASE_ID, page_size: 1 });
        if (query.results.length > 0) {
            console.log("\nSample Page Properties Values:");
            const page = query.results[0];
            for (const [name, value] of Object.entries(page.properties)) {
                console.log(`- ${name}: ${JSON.stringify(value).slice(0, 100)}...`);
            }
        } else {
            console.log("\nDatabase is empty.");
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

inspectDb();
