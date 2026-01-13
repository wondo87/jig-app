import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// 메모리 캐시 (5분 TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5분

// 하위 블록을 병렬로 가져오는 함수 (깊이 제한 적용)
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

        // 하위 블록이 있는 블록들을 필터링
        const blocksWithChildren = response.results.filter(
            block => block.has_children && depth < maxDepth
        );

        // 병렬로 모든 하위 블록 가져오기
        if (blocksWithChildren.length > 0) {
            const childrenPromises = blocksWithChildren.map(block =>
                getBlockWithChildren(block.id, depth + 1, maxDepth)
            );
            const childrenResults = await Promise.all(childrenPromises);

            // 각 블록에 children 할당
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

export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Page ID is required' });
    }

    // CDN 캐시 헤더 강화 (5분 캐시, 1일 백그라운드 재검증)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');

    // 메모리 캐시 확인
    const cached = cache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(cached.data);
    }

    try {
        const allBlocks = await getBlockWithChildren(id);

        // 캐시에 저장
        cache.set(id, { data: allBlocks, timestamp: Date.now() });

        res.setHeader('X-Cache', 'MISS');
        res.status(200).json(allBlocks);
    } catch (error) {
        console.error('Notion Content API Error:', error);
        res.status(500).json({ error: error.message });
    }
}
