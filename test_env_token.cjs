const { Client } = require("@notionhq/client");

const TOKEN_ENV = "ntn_Z60962876671RUe2pR1vOcv1kPb3HretjAhTDWnwkHC7CZ"; // from .env
const DATABASE_ID = "6b993a15bb2643979ceb382460ed7e77";

const notion = new Client({ auth: TOKEN_ENV });

async function testAccess() {
    try {
        const response = await notion.databases.retrieve({ database_id: DATABASE_ID });
        console.log(`SUCCESS: Access granted with TOKEN_ENV. DB Title: ${response.title[0]?.plain_text}`);
    } catch (error) {
        console.error(`FAILED: ${error.message}`);
    }
}

testAccess();
