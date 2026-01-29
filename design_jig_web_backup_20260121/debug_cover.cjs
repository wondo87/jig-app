
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: 'ntn_Z60962876671RUe2pR1vOcv1kPb3HretjAhTDWnwkHC7CZ' });
const databaseId = '2d216b5df7b38076b153e5642eb299df';

async function checkCovers() {
    try {
        const response = await notion.databases.query({
            database_id: databaseId,
        });

        console.log('Total Results:', response.results.length);

        response.results.forEach(page => {
            const titleProp = page.properties['제목'];
            const title = titleProp && titleProp.title.length > 0 ? titleProp.title[0].plain_text : 'No Title';
            const category = page.properties['선택'] ? page.properties['선택'].select?.name : 'No Category';
            const cover = page.cover;

            console.log(`\nTitle: ${title}`);
            console.log(`Category: ${category}`);

            if (cover) {
                console.log('Cover Type:', cover.type);
                if (cover.type === 'external') {
                    console.log('Cover URL:', cover.external.url);
                } else if (cover.type === 'file') {
                    console.log('Cover URL:', cover.file.url);
                    console.log('Expiry:', cover.file.expiry_time);
                }
            } else {
                console.log('Cover: NONE');
            }
        });

    } catch (error) {
        console.error('Error:', error.body || error.message);
    }
}

checkCovers();
