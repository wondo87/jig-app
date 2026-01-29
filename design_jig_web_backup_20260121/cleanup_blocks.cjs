const { Client } = require('@notionhq/client');
const notion = new Client({ auth: 'ntn_Z60962876671RUe2pR1vOcv1kPb3HretjAhTDWnwkHC7CZ' });
const pageId = '2da16b5d-f7b3-81d2-b8e6-d3b0a963aae9';

async function cleanup() {
  const { results } = await notion.blocks.children.list({ block_id: pageId });
  for (const block of results) {
    await notion.blocks.delete({ block_id: block.id });
    console.log('Deleted block:', block.id);
  }
}
cleanup();
