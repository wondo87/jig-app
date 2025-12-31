const { Client } = require('@notionhq/client');
const notion = new Client({ auth: 'ntn_Z60962876671RUe2pR1vOcv1kPb3HretjAhTDWnwkHC7CZ' });
const pageId = '2da16b5d-f7b3-81d2-b8e6-d3b0a963aae9';

async function write() {
  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        "object": "block",
        "type": "heading_1",
        "heading_1": {
          "rich_text": [{ "type": "text", "text": { "content": "오래 살수록 더 좋아지는 집, 디자인지그입니다." } }]
        }
      },
      {
        "object": "block",
        "type": "callout",
        "callout": {
          "rich_text": [{ "type": "text", "text": { "content": "우리는 단순히 화려한 마감에 그치지 않고, 보이지 않는 곳의 철저한 기본(단열, 구조, 설비)을 가장 우선시합니다.\n시간이 흐를수록 가치가 느껴지는 평온한 안식처를 선물합니다." } }],
          "icon": { "type": "emoji", "emoji": "🏠" },
          "color": "gray_background"
        }
      },
      {
        "object": "block",
        "type": "heading_2",
        "heading_2": {
          "rich_text": [{ "type": "text", "text": { "content": "1. 보이지 않는 기초의 힘" } }]
        }
      },
      {
        "object": "block",
        "type": "paragraph",
        "paragraph": {
          "rich_text": [{ "type": "text", "text": { "content": "인테리어의 본질은 눈에 보이는 화려함 이전에 ‘삶의 질’을 담보하는 기능에 있습니다. 디자인지그는 다음과 같은 기초 공정에 타협하지 않습니다." } }]
        }
      },
      {
        "object": "block",
        "type": "bulleted_list_item",
        "bulleted_list_item": {
          "rich_text": [{ "type": "text", "text": { "content": "공간의 온기를 지키는 철저한 단열 및 창호 시공" } }]
        }
      },
      {
        "object": "block",
        "type": "bulleted_list_item",
        "bulleted_list_item": {
          "rich_text": [{ "type": "text", "text": { "content": "10년 뒤에도 하자가 발생하지 않는 견고한 구조 보강" } }]
        }
      },
      {
        "object": "block",
        "type": "bulleted_list_item",
        "bulleted_list_item": {
          "rich_text": [{ "type": "text", "text": { "content": "사용자의 동선과 라이프스타일을 배려한 맞춤형 설계" } }]
        }
      },
      {
        "object": "block",
        "type": "divider",
        "divider": {}
      },
      {
        "object": "block",
        "type": "quote",
        "quote": {
          "rich_text": [{ "type": "text", "text": { "content": "DESIGN JIG: 일관된 기준으로 완성도를 높이는 디자인 도구" }, "annotations": { "bold": true } }]
        }
      },
      {
        "object": "block",
        "type": "paragraph",
        "paragraph": {
          "rich_text": [{ "type": "text", "text": { "content": "‘지그(Jig)’는 가공 시 위치를 정하거나 안내하기 위해 사용하는 정밀 도구를 의미합니다.\n\n디자인지그는 작업의 전 과정에서 흔들리지 않는 기준을 제공합니다. 이는 단순한 효율을 넘어, 모든 현장에서 동일하게 높은 품질의 결과물을 만들어내는 핵심 원동력입니다.\n\n보이지 않지만, 모든 결과물의 한계를 결정짓는 것은 바로 이 ‘기준’의 차이입니다." } }]
        }
      },
      {
        "object": "block",
        "type": "heading_3",
        "heading_3": {
          "rich_text": [{ "type": "text", "text": { "content": "당신만의 안식처를 디자인합니다." } }]
        }
      },
      {
        "object": "block",
        "type": "paragraph",
        "paragraph": {
          "rich_text": [{ "type": "text", "text": { "content": "디자인지그는 당신의 집이 단순한 주거 공간을 넘어, 세상에서 가장 안전하고 평온한 안식처가 되기를 바랍니다.\n우리는 오늘도 그 기준을 지키기 위해 현장의 보이지 않는 곳에서 가장 치열하게 고민합니다." } }]
        }
      }
    ]
  });
  console.log('Article written successfully');
}
write();
