import { Client } from '@notionhq/client';

const token = 'ntn_Z60962876671RUe2pR1vOcv1kPb3HretjAhTDWnwkHC7CZ';
const notion = new Client({ auth: token });

async function test() {
    try {
        const response = await notion.users.me({});
        console.log('SUCCESS:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.error('FAILED:', error.message);
        if (error.body) {
            console.error('DETAILS:', error.body);
        }
    }
}

test();
