import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const COLUMNS_DB_ID = process.env.NOTION_COLUMNS_ID;

// 하위 블록을 병렬로 가져오는 함수
async function getBlockWithChildren(blockId, depth = 0, maxDepth = 2) {
    let allBlocks = [];
    let cursor = undefined;
    let hasMore = true;

    while (hasMore) {
        const response = await notion.blocks.children.list({
            block_id: blockId,
            page_size: 100,
            start_cursor: cursor,
        });

        const blocksWithChildren = response.results.filter(
            block => block.has_children && depth < maxDepth
        );

        if (blocksWithChildren.length > 0) {
            const childrenPromises = blocksWithChildren.map(block =>
                getBlockWithChildren(block.id, depth + 1, maxDepth)
            );
            const childrenResults = await Promise.all(childrenPromises);
            blocksWithChildren.forEach((block, index) => {
                block.children = childrenResults[index];
            });
        }

        allBlocks = allBlocks.concat(response.results);
        hasMore = response.has_more;
        cursor = response.next_cursor;
    }

    return allBlocks;
}

async function buildContent() {
    console.log('🔄 Notion 콘텐츠 빌드 시작...');

    const outputDir = path.join(__dirname, '../public/data');

    // 디렉토리 생성
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        // 1. 칼럼 목록 가져오기
        console.log('📋 칼럼 목록 가져오는 중...');
        const columnsResponse = await notion.databases.query({
            database_id: COLUMNS_DB_ID,
            sorts: [{ property: '작성일', direction: 'descending' }],
        });

        const columns = columnsResponse.results;
        console.log(`   ✅ ${columns.length}개 칼럼 발견`);

        // 칼럼 목록 저장
        fs.writeFileSync(
            path.join(outputDir, 'columns.json'),
            JSON.stringify(columns, null, 2)
        );

        // 2. 각 칼럼의 콘텐츠 가져오기
        console.log('📄 각 칼럼 콘텐츠 가져오는 중...');
        const contentDir = path.join(outputDir, 'content');
        if (!fs.existsSync(contentDir)) {
            fs.mkdirSync(contentDir, { recursive: true });
        }

        for (let i = 0; i < columns.length; i++) {
            const column = columns[i];
            const title = column.properties?.제목?.title?.[0]?.plain_text ||
                column.properties?.이름?.title?.[0]?.plain_text ||
                'Untitled';

            console.log(`   ${i + 1}/${columns.length}: ${title}`);

            const blocks = await getBlockWithChildren(column.id);

            fs.writeFileSync(
                path.join(contentDir, `${column.id}.json`),
                JSON.stringify(blocks, null, 2)
            );
        }

        // 3. 빌드 타임스탬프 저장
        const buildInfo = {
            buildTime: new Date().toISOString(),
            totalColumns: columns.length,
        };
        fs.writeFileSync(
            path.join(outputDir, 'build-info.json'),
            JSON.stringify(buildInfo, null, 2)
        );

        console.log('✅ 빌드 완료!');
        console.log(`   📁 출력 디렉토리: ${outputDir}`);
        console.log(`   📊 총 ${columns.length}개 칼럼 생성`);

    } catch (error) {
        console.error('❌ 빌드 실패:', error);
        process.exit(1);
    }
}

buildContent();
