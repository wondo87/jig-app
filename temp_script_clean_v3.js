        (function () {
            // 페이지는 열람 모드로 볼 수 있음
            // 관리자 로그인은 헤더의 로그인 버튼 통해 진행
            sessionStorage.setItem('dz_admin_page_auth', 'true');
        })();
        const CUSTOMER_SYNC_URL = 'https://script.google.com/macros/s/AKfycbxrbmUDfHYanKtlqazwhgmBzyFTG4i7Cccm1mCTXiabkEtE9WzNOfR5hXoCfAAjhfR6Dg/exec';

        // 메인 관리자 계정 (초기값)
        const MAIN_ADMIN = {
            id: 'admin',
            password: 'admin'
        };

        const categories = [
            { no: '01', name: '가설공사' }, { no: '02', name: '철거공사' }, { no: '03', name: '설비/방수공사' },
            { no: '04', name: '확장/단열공사' }, { no: '05', name: '창호공사' }, { no: '06', name: '전기/조명공사' },
            { no: '07', name: '에어컨공사' }, { no: '08', name: '목공/도어공사' }, { no: '09', name: '필름공사' },
            { no: '10', name: '타일공사' }, { no: '11', name: '욕실공사' }, { no: '12', name: '도장공사' },
            { no: '13', name: '도배공사' }, { no: '14', name: '바닥재공사' }, { no: '15', name: '가구공사' },
            { no: '16', name: '마감공사' }, { no: '17', name: '기타공사' }
        ];

        // 단위 옵션
        const unitOptions = ['식', 'py', 'm²', 'm', 'ea', 'set', 'unit', '면', '자', '롤'];

        function getUnitSelectHTML(selectedValue = '') {
            const isCustom = selectedValue && !unitOptions.includes(selectedValue);
            if (isCustom) {
                // 직접입력된 값이면 input으로 표시
                return `<div class="unit-wrapper">
                    <input type="text" class="unit-input" value="${selectedValue}" placeholder="단위" onblur="onUnitInputBlur(this)">
                    <button class="unit-toggle-btn" onclick="toggleUnitToSelect(this)" title="목록에서 선택">▼</button>
                </div>`;
            }
            return `<select class="unit-select" onchange="onUnitChange(this)">${unitOptions.map(u =>
                `<option value="${u}" ${u === selectedValue ? 'selected' : ''}>${u}</option>`
            ).join('')}<option value="__custom__">✏️ 직접입력</option></select>`;
        }

        // 단위 드롭다운 변경 시
        function onUnitChange(select) {
            if (select.value === '__custom__') {
                const wrapper = document.createElement('div');
                wrapper.className = 'unit-wrapper';
                wrapper.innerHTML = `
                    <input type="text" class="unit-input" placeholder="단위 입력" autofocus onblur="onUnitInputBlur(this)">
                    <button class="unit-toggle-btn" onclick="toggleUnitToSelect(this)" title="목록에서 선택">▼</button>
                `;
                select.parentNode.replaceChild(wrapper, select);
                wrapper.querySelector('input').focus();
            }
        }

        // 직접입력 -> 드롭다운으로 전환
        function toggleUnitToSelect(btn) {
            const wrapper = btn.closest('.unit-wrapper');
            const currentValue = wrapper.querySelector('.unit-input').value || '식';
            const select = document.createElement('select');
            select.className = 'unit-select';
            select.setAttribute('onchange', 'onUnitChange(this)');
            select.innerHTML = unitOptions.map(u =>
                `<option value="${u}" ${u === currentValue ? 'selected' : ''}>${u}</option>`
            ).join('') + '<option value="__custom__">✏️ 직접입력</option>';
            wrapper.parentNode.replaceChild(select, wrapper);
        }

        // 단위 입력 블러 시 빈값이면 기본값
        function onUnitInputBlur(input) {
            if (!input.value.trim()) {
                input.value = '식';
            }
        }

        // 기본 원가 데이터 (가설공사)
        const defaultCostData = {
            '01': [
                { div: '보양', name: '승강기 하프보양', spec: '승강기 하프보양', unit: '식', qty: '1', price: '90000' },
                { div: '보양', name: '승강기 준보양', spec: '승강기 준보양', unit: '식', qty: '1', price: '120000' },
                { div: '보양', name: '승강기 올보양', spec: '승강기 올보양', unit: '식', qty: '1', price: '160000' },
                { div: '보양', name: '복도보양', spec: '플라베니아 (기본 12장)', unit: '식', qty: '1', price: '120000' },
                { div: '보양', name: '동선보양', spec: '추가항목', unit: '식', qty: '1', price: '6000' },
                { div: '보양', name: '현관문 보양', spec: '현관문 보양', unit: '식', qty: '1', price: '50000' },
                { div: '보양', name: '창호 보양', spec: '집 전체 창호', unit: '식', qty: '1', price: '300000' },
                { div: '보양', name: '실내 바닥 보양', spec: 'Floor Veneer 기본 12장', unit: '식', qty: '1', price: '120000' },
                { div: '보양', name: '실내 바닥 보양 (추가)', spec: 'Floor Veneer', unit: '식', qty: '1', price: '6000' },
                { div: '보양', name: '실내 바닥 보양', spec: '롤 골판지', unit: '롤', qty: '1', price: '90000' },
                { div: '보양', name: '비닐 보양', spec: '커버링 2.4', unit: '식', qty: '1', price: '50000' },
                { div: '동의서', name: '입주민 동의서', spec: '1~80 세대 (50%기준)', unit: '식', qty: '1', price: '160000' },
                { div: '동의서', name: '입주민 동의서', spec: '81~100 세대 (50%기준)', unit: '식', qty: '1', price: '190000' },
                { div: '동의서', name: '입주민 동의서', spec: '101~120 세대 (50%기준)', unit: '식', qty: '1', price: '210000' },
                { div: '동의서', name: '입주민 동의서', spec: '121~140 세대 (50%기준)', unit: '식', qty: '1', price: '230000' },
                { div: '동의서', name: '입주민 동의서', spec: '추가 20세대', unit: '식', qty: '1', price: '20000' },
                { div: '허가', name: '공동주택 행위허가', spec: '주택과', unit: '식', qty: '1', price: '440000' },
                { div: '허가', name: '공동주택 행위허가', spec: '건축과', unit: '식', qty: '1', price: '880000' },
                { div: '필증', name: '방화판', spec: '자재+시공 (1200*550)', unit: 'ea', qty: '1', price: '50000' },
                { div: '필증', name: '방화유리 (직선)', spec: '자재+시공', unit: 'm', qty: '1', price: '180000' },
                { div: '필증', name: '방화유리 (곡선)', spec: '자재+시공', unit: 'm', qty: '1', price: '200000' },
                { div: '필증', name: '갑종 방화문', spec: '자재+시공+시험성적서 (900*2000)', unit: 'ea', qty: '1', price: '1300000' },
                { div: '필증', name: '소방 감지기', spec: '건전지 방식', unit: 'ea', qty: '1', price: '20000' },
                { div: '용도변경', name: '상업공간 용도변경', spec: '구조·설비·위생·안전 기준 충족 여부에 따른 신고/허가', unit: '식', qty: '1', price: '0' }
            ],
            '02': [
                { div: '주방', name: '주방 철거 (소형)', spec: 'ㅡ자, ㄱ자 (3.5M 미만)', unit: 'set', qty: '1', price: '70000' },
                { div: '주방', name: '주방 철거 (중형)', spec: 'ㅡ자, ㄱ자 (5M 미만)', unit: 'set', qty: '1', price: '90000' },
                { div: '주방', name: '주방 철거 (대형)', spec: 'ㅡ자, ㄱ자 (5M 이상)', unit: 'set', qty: '1', price: '100000' },
                { div: '주방', name: '주방 철거 (특대)', spec: '12M 미만 ㄷ자, ㅁ자, 병렬형', unit: 'set', qty: '1', price: '130000' },
                { div: '주방', name: '주방 철거 (초특대)', spec: '12M 이상 ㄷ자, ㅁ자, 병렬형', unit: 'set', qty: '1', price: '160000' },
                { div: '주방', name: '싱크대 추가 (M당)', spec: '기본 세트 초과 물량', unit: 'M', qty: '1', price: '10000' },
                { div: '주방', name: '아일랜드 식탁', spec: '독립형 (카운터 타입 제외)', unit: 'set', qty: '1', price: '35000' },
                { div: '주방', name: '보조주방', spec: '발코니 보조주방', unit: 'set', qty: '1', price: '40000' },
                { div: '주방', name: '냉장고장/키큰장', spec: '자(30cm)당 단가', unit: '자', qty: '1', price: '10000' },
                { div: '주방', name: '키큰장 (유리장식)', spec: '대형평수 유리 장식장', unit: '자', qty: '1', price: '15000' },
                { div: '주방', name: '냉장고장 (신축 EP)', spec: '바닥/천장 재사용 시 (좌우 EP)', unit: '판', qty: '1', price: '50000' },
                { div: '주방', name: '빌트인 기기', spec: '식기세척기, 오븐, 세탁기 등', unit: 'ea', qty: '1', price: '20000' },
                { div: '주방', name: '수전(냉/온)', spec: '1m 미만 / 내림설비', unit: 'ea', qty: '1', price: '75000' },
                { div: '주방', name: '주방 타일 철거', spec: '1M 기준 (H1200 이하)', unit: 'M', qty: '1', price: '18000' },
                { div: '주방', name: '주방 타일+세라픽스', spec: '샌딩 작업 포함 (최고가 적용)', unit: 'py', qty: '1', price: '100000' },
                { div: '가구(수납)', name: '붙박이장/장롱', spec: '도어 1개 기준 (슬라이딩 x2)', unit: 'EA', qty: '1', price: '13000' },
                { div: '가구(수납)', name: '붙박이장 (자 단위)', spec: '자(30cm)당 계산 시', unit: '자', qty: '1', price: '10000' },
                { div: '가구(수납)', name: '현관장 (신발장)', spec: '도어 1개 기준', unit: 'ea', qty: '1', price: '11000' },
                { div: '가구(수납)', name: '벽박이장/창고장', spec: '문틀/문선/문짝 포함 (미장별도)', unit: 'ea', qty: '1', price: '16000' },
                { div: '가구(수납)', name: '벽박이장 (세트)', spec: '문4개+내부장 (대형)', unit: 'set', qty: '1', price: '120000' },
                { div: '가구(수납)', name: '거실장 (세트)', spec: '소2+중1 기준', unit: 'set', qty: '1', price: '30000' },
                { div: '가구(수납)', name: '빌트인 화장대', spec: '1.5M 이하', unit: 'ea', qty: '1', price: '35000' },
                { div: '가구(수납)', name: '베란다장 (창고)', spec: '내부 선반 포함', unit: 'ea', qty: '1', price: '30000' },
                { div: '가구(수납)', name: '침대+매트리스', spec: '폐기물 스티커 부착 권장', unit: 'ea', qty: '1', price: '60000' },
                { div: '바닥', name: '마루 철거 (본드식)', spec: '강마루, 합판, 원목 (기본샌딩)', unit: 'py', qty: '1', price: '25000' },
                { div: '바닥', name: '강화마루', spec: '조립식 (기본샌딩)', unit: 'py', qty: '1', price: '17000' },
                { div: '바닥', name: '데코타일', spec: '(기본샌딩)', unit: 'py', qty: '1', price: '20000' },
                { div: '바닥', name: '폴리싱 타일', spec: '타일+본드+샌딩', unit: 'py', qty: '1', price: '90000' },
                { div: '바닥', name: '대리석', spec: '대리석+사모래+몰탈미장(난방배관미포함)', unit: 'py', qty: '1', price: '250000' },
                { div: '바닥', name: '대리석', spec: '대리석+사모래+몰탈미장(난방배관재시공)', unit: 'py', qty: '1', price: '330000' },
                { div: '바닥', name: '장판 철거', spec: '방 1개 기준', unit: 'ea', qty: '1', price: '12000' },
                { div: '바닥', name: '한지 장판', spec: '샌딩', unit: 'py', qty: '1', price: '12000' },
                { div: '바닥', name: '바닥 샌딩', spec: '단차/평활도 불량시(문턱)', unit: 'ea', qty: '1', price: '60000' },
                { div: '창호', name: '거실 분합창', spec: '확장시 선철거', unit: 'set', qty: '1', price: '150000' },
                { div: '창호', name: '작은방 분합창', spec: '확장시 선철거', unit: 'set', qty: '1', price: '90000' },
                { div: '창호', name: '대형 샷시/폴딩', spec: '특대형 구분', unit: 'set', qty: '1', price: '250000' },
                { div: '도어', name: '도어 세트 철거', spec: '문틀+문짝+문선+인방', unit: 'set', qty: '1', price: '32000' },
                { div: '도어', name: '특수 문틀 (돌/ABS)', spec: '폐기물 포함시 (최고가)', unit: 'set', qty: '1', price: '50000' },
                { div: '도어', name: '문짝만 철거', spec: '', unit: 'ea', qty: '1', price: '30000' },
                { div: '도어', name: '문턱 제거', spec: '미장 포함', unit: 'ea', qty: '1', price: '50000' },
                { div: '도어', name: '중문 철거', spec: '3연동, ㄱ자등 종류 무관', unit: 'set', qty: '1', price: '100000' },
                { div: '도어', name: '방화문 철거', spec: '', unit: 'ea', qty: '1', price: '80000' },
                { div: '벽면', name: '벽면 철거', spec: '석고 (h:2400)', unit: 'm', qty: '1', price: '40000' },
                { div: '벽면', name: '단열벽 철거', spec: '목재+단열(스티로폴)+석고 (h:2400)', unit: 'm', qty: '1', price: '70000' },
                { div: '벽면', name: '단열벽 철거', spec: '목재+단열(유리섬유)+석고 (h:2400)', unit: 'm', qty: '1', price: '90000' },
                { div: '벽면', name: '가벽철거', spec: '목공+석고 (h:2400)', unit: 'm', qty: '1', price: '50000' },
                { div: '벽체', name: '가벽 철거', spec: '목공/석고/단열재 (H2400)', unit: 'M', qty: '1', price: '55000' },
                { div: '벽체', name: 'ALC 블럭 가벽', spec: '브라더 상세 항목', unit: 'M', qty: '1', price: '120000' },
                { div: '벽체', name: '조적벽 (부분/날개)', spec: '비내력 조적 1M', unit: 'M', qty: '1', price: '100000' },
                { div: '벽체', name: '조적벽 (두겹)', spec: '브라더 상세 항목', unit: 'M', qty: '1', price: '250000' },
                { div: '벽체', name: '아트월 (목공)', spec: 'H2400 이하', unit: 'M', qty: '1', price: '33000' },
                { div: '벽체', name: '아트월 (타일/석재)', spec: 'H2400 이하 (최고가 적용)', unit: 'M', qty: '1', price: '60000' },
                { div: '벽체', name: '옹벽 컷팅', spec: '장비(벽체15, 샤시하단부45, 하루65)', unit: '식', qty: '1', price: '650000' },
                { div: '천장', name: '우물천장 기본 철거', spec: '주변 몰딩만', unit: 'set', qty: '1', price: '30000' },
                { div: '천장', name: '등박스 철거 (대형)', spec: '철제/대형 등박스', unit: 'set', qty: '1', price: '200000' },
                { div: '천장', name: '등박스 철거 (일반)', spec: '일반 목공 등박스', unit: 'set', qty: '1', price: '50000' },
                { div: '천장', name: '천장 전체 철거', spec: '석고만(댄조 유지)', unit: 'py', qty: '1', price: '20000' },
                { div: '천장', name: '천장 전체 철거', spec: '우물천장 댄조포함 평당', unit: 'py', qty: '1', price: '40000' },
                { div: '천장', name: '몰딩/걸레받이', spec: '평당 기준', unit: 'py', qty: '1', price: '4000' },
                { div: '욕실', name: '욕실 기본 철거', spec: '도기/욕조/천장/액세서리', unit: 'set', qty: '1', price: '150000' },
                { div: '욕실', name: '욕실 기본 철거', spec: '도기/frp욕조/천장/액세서리', unit: 'set', qty: '1', price: '200000' },
                { div: '욕실', name: '욕실 전체 철거', spec: '타일+방수층 전체 (대형) - 난방배관 별도(10)', unit: 'set', qty: '1', price: '900000' },
                { div: '욕실', name: '욕실 전체 철거', spec: '타일+방수층 전체 (중형) - 난방배관 별도(7)', unit: 'set', qty: '1', price: '750000' },
                { div: '욕실', name: '욕실 전체 철거', spec: '타일+방수층 전체 (소형) - 난방배관 별도(5)', unit: 'set', qty: '1', price: '600000' },
                { div: '욕실', name: '욕실 바닥 철거', spec: '바닥 타일+액체방수 1차', unit: 'set', qty: '1', price: '400000' },
                { div: '욕실', name: 'UBR 욕실 철거', spec: '전체철거+설비+방수 1차 (조적벽 별도)', unit: 'set', qty: '1', price: '1200000' },
                { div: '욕실', name: 'UBR 욕실 조적', spec: '입구 벽면 (h:1500)', unit: '면', qty: '1', price: '200000' },
                { div: '욕실', name: '욕조 철거', spec: '아크릴 욕조 (개별 철거시)', unit: 'ea', qty: '1', price: '35000' },
                { div: '욕실', name: '욕조 철거', spec: '월풀 욕조 (개별 철거시)', unit: 'ea', qty: '1', price: '200000' },
                { div: '욕실', name: '욕조 철거 (조적)', spec: '조적/매립 형태', unit: 'ea', qty: '1', price: '100000' },
                { div: '욕실', name: '욕실 벽타일(1면)', spec: '덧방 불가시', unit: 'ea', qty: '1', price: '100000' },
                { div: '욕실', name: '라디에이터 철거', spec: '메꾸라/미장 포함', unit: 'EA', qty: '1', price: '100000' },
                { div: '타일', name: '현관 디딤석', spec: '한면', unit: '식', qty: '1', price: '50000' },
                { div: '타일', name: '현관 바닥', spec: '타일만', unit: 'py', qty: '1', price: '50000' },
                { div: '타일', name: '현관 바닥', spec: '원바닥(타일 시공시 쭈꾸미비용 평당 5만원 별도)', unit: 'py', qty: '1', price: '100000' },
                { div: '타일', name: '발코니 바닥타일 철거', spec: '타일만 0.5평(1.3M×1.3M)', unit: '식', qty: '1', price: '50000' },
                { div: '타일', name: '발코니 바닥타일 철거', spec: '타일+압착본드 0.5평(1.3M×1.3M)', unit: '식', qty: '1', price: '70000' },
                { div: '타일', name: '발코니 바닥타일 철거', spec: '원 바닥까지(방수별도) 0.5평(1.3M×1.3M)', unit: '식', qty: '1', price: '150000' },
                { div: '조명', name: '방등', spec: '', unit: 'ea', qty: '1', price: '5000' },
                { div: '조명', name: '거실등', spec: '', unit: 'ea', qty: '1', price: '15000' },
                { div: '조명', name: '매입등', spec: '', unit: 'ea', qty: '1', price: '2000' },
                { div: '조명', name: '스위치/콘센트', spec: '', unit: '평', qty: '1', price: '4000' },
                { div: '화단', name: '화단', spec: '흙 (쓰레기 별도)', unit: '식', qty: '1', price: '100000' },
                { div: '화단', name: '화단', spec: '조적 (h:600 기준)', unit: 'm', qty: '1', price: '100000' },
                { div: '화단', name: '화단', spec: '옹벽 (h:600 기준)', unit: 'm', qty: '1', price: '150000' },
                { div: '화단', name: '화단', spec: '옹벽 (h:600 기준-크라샤 작업)', unit: 'm', qty: '1', price: '250000' },
                { div: '가스', name: '가스배관 부분철거', spec: '가스배관 내부 (계량기 유지)', unit: '식', qty: '1', price: '100000' },
                { div: '가스', name: '가스배관 전체철거', spec: '가스배관 전체 철거 (외부에서 마감 - 계량기 현장에 보관)', unit: '식', qty: '1', price: '200000' },
                { div: '폐기물', name: '1톤 트럭 (만차)', spec: '혼합폐기물 (정리및 이동비 포함)', unit: '대', qty: '1', price: '550000' },
                { div: '폐기물', name: '1톤 트럭 (3/4)', spec: '혼합폐기물 (정리및 이동비 포함)', unit: '대', qty: '1', price: '520000' },
                { div: '폐기물', name: '1톤 트럭 (1/2)', spec: '혼합폐기물 (정리및 이동비 포함)', unit: '대', qty: '1', price: '320000' },
                { div: '폐기물', name: '1톤 트럭 (1/4)', spec: '혼합폐기물 (정리및 이동비 포함)', unit: '대', qty: '1', price: '250000' },
                { div: '폐기물', name: '1톤 트럭 (적재함반차)', spec: '혼합폐기물 (정리및 이동비 포함)', unit: '대', qty: '1', price: '150000' },
                { div: '폐기물', name: '소량 폐기물', spec: '혼합폐기물 (정리및 이동비 포함)', unit: '식', qty: '1', price: '100000' }
            ],
            '03': [
                { div: '방수', name: '2차 액체 방수', spec: '전체 바닥/벽(h:1000이상) 방수몰탈', unit: '칸', qty: '1', price: '120000' },
                { div: '방수', name: '욕조 방수', spec: '욕조부만 방수', unit: 'ea', qty: '1', price: '60000' },
                { div: '방수', name: '3차 도막 방수 코너만 (2회)', spec: '마페이/아덱스(프라이머+방수제)-취약부위', unit: '칸', qty: '1', price: '200000' },
                { div: '방수', name: '3차 도막 방수 전체 (2회)', spec: '마페이/아덱스(프라이머+방수제)-(h:1000이상)', unit: '칸', qty: '1', price: '400000' },
                { div: '난방배관', name: '라지에이터', spec: '철거 후 엑셀 마감+미장 포함', unit: 'ea', qty: '1', price: '100000' },
                { div: '난방배관', name: '화장실 난방배관 연장', spec: '화장실 바닥 난방배관 연장 - 기본', unit: 'ea', qty: '1', price: '100000' },
                { div: '난방배관', name: '화장실 난방배관 연장', spec: '화장실 바닥 난방배관 연장 - 특대', unit: 'ea', qty: '1', price: '150000' },
                { div: '수도', name: '급수관 신설 (노출-1면)', spec: '냉/온수 1조 신설 (1면 꺾음 기준) - 노출', unit: 'ea', qty: '1', price: '150000' },
                { div: '수도', name: '급수관 신설 (노출-2면)', spec: '냉/온수 1조 신설 (2면 꺾음 기준) - 노출', unit: 'ea', qty: '1', price: '200000' },
                { div: '수도', name: '급수관 신설 (매립)', spec: '냉/온수 1조 신설 (옹벽의 경우) - 매립', unit: 'ea', qty: '1', price: '350000' },
                { div: '수도', name: '급수관 이동', spec: '기존면 이동 (세면부 모음, 샤워부 높이 조절 등)', unit: 'ea', qty: '1', price: '100000' },
                { div: '하수', name: 'P트랩 전환', spec: '바닥 배수 → 벽 배수 전환 (철거, 매립 포함)', unit: 'ea', qty: '1', price: '100000' },
                { div: '하수', name: '하수관 이동', spec: '바닥 배수 이동', unit: 'ea', qty: '1', price: '150000' },
                { div: '오수', name: '오수 배관', spec: '200~250mm 이동', unit: 'ea', qty: '1', price: '200000' },
                { div: '수도', name: '수도 막음', spec: '기존 수도 냉/온수 1조', unit: 'ea', qty: '1', price: '100000' },
                { div: '수도', name: '매립수전', spec: '샤워/세면대 (젠다이 필수-포함)', unit: 'ea', qty: '1', price: '600000' },
                { div: '조적', name: '조적 젠다이 (숏)', spec: '세면대부 조적 젠다이 시공 (h:1100)', unit: '식', qty: '1', price: '200000' },
                { div: '조적', name: '조적 젠다이 (롱)', spec: '세면대+샤워 전체 조적 젠다이 시공 (h:1100)', unit: '식', qty: '1', price: '250000' },
                { div: '분배기', name: '분배기 교체 - 기본', spec: '기존 분배기 교체 - 일반 (이동 없음, 시스템 구동기 별도)', unit: '식', qty: '1', price: '1300000' },
                { div: '분배기', name: '분배기 교체 - 매립형', spec: '기존 분배기 교체 -매립형 (이동 없음, 시스템 구동기 별도)', unit: '식', qty: '1', price: '1500000' },
                { div: '분배기', name: '분배기 이동', spec: '기존 분배기 위치에서 2m 이내 이동 (기존 분배기 재사용)', unit: '식', qty: '1', price: '1600000' },
                { div: '가스배관 철거', name: '가스배관 철거', spec: '기본 철거 (부분 철거, 계량기 유지상태)', unit: '식', qty: '1', price: '200000' },
                { div: '가스배관 철거', name: '가스배관 철거', spec: '전체 철거 (외부에서 마감, 계량기 세대보관)', unit: '식', qty: '1', price: '250000' },
                { div: '가스배관 연장', name: '가스배관 연장 (기존유지)', spec: '가스배관 이동 기존 유지하는 상태에서', unit: '식', qty: '1', price: '300000' },
                { div: '가스배관 연장', name: '가스배관 연장 (부분철거)', spec: '가스배관 이동 부분 철거', unit: '식', qty: '1', price: '350000' },
                { div: '가스배관 신설', name: '가스배관 신설 (상가)-기본', spec: '기존 건물에서 배관 연장+안전검사+승인', unit: '식', qty: '1', price: '2000000' },
                { div: '가스배관 신설', name: '가스배관 신설 (상가)-중상', spec: '기존 건물에서 배관 연장+복잡한구조+안전검사+승인', unit: '식', qty: '1', price: '3500000' },
                { div: '가스배관 신설', name: '가스배관 신설 (상가)-최상', spec: '기존 건물에서 배관 연장+복잡한구조+안전검사+승인(매립-장비)', unit: '식', qty: '1', price: '5000000' },
                { div: '누수탐지', name: '누수탐지 수도 배관', spec: '집 내부 수도배관(냉/온)', unit: '식', qty: '1', price: '300000' },
                { div: '누수탐지', name: '누수탐지 난방 배관', spec: '집 내부 난방배관 점검', unit: '식', qty: '1', price: '300000' },
                { div: '누수탐지', name: '누수탐지 수도/난방 배관', spec: '집 내부 수도배관(냉/온) 및 난방배관 점검', unit: '식', qty: '1', price: '500000' }
            ],
            '04': [
                { div: '확장', name: '거실 확장', spec: '철거+단열(아이소핑크)+엑샐 (특대-통바닥)', unit: '식', qty: '1', price: '1100000' },
                { div: '확장', name: '거실 확장', spec: '철거+단열(아이소핑크)+엑샐 (대형)', unit: '식', qty: '1', price: '900000' },
                { div: '확장', name: '거실 확장', spec: '철거+단열(아이소핑크)+엑샐 (기본)', unit: '식', qty: '1', price: '800000' },
                { div: '확장', name: '방/주방 확장', spec: '철거+단열(아이소핑크)+엑샐 (통바닥)', unit: '식', qty: '1', price: '800000' },
                { div: '확장', name: '방/주방 확장', spec: '철거+단열(아이소핑크)+엑샐 (기본)', unit: '식', qty: '1', price: '700000' },
                { div: '확장단열', name: '거실 확장부 단열', spec: '벽단열(아이소핑크)+천장단열(온도리)-기본', unit: '식', qty: '1', price: '1100000' },
                { div: '확장단열', name: '방/주방 확장부 단열', spec: '벽단열(아이소핑크)+천장단열(온도리)-기본', unit: '식', qty: '1', price: '900000' },
                { div: '확장단열', name: '거실 확장부 단열', spec: '벽단열(아이소핑크)+천장단열(온도리)-대형(단열기준)', unit: '식', qty: '1', price: '1500000' },
                { div: '확장단열', name: '방/주방 확장부 단열', spec: '벽단열(아이소핑크)+천장단열(온도리)-대형(단열기준)', unit: '식', qty: '1', price: '1200000' },
                { div: '단열', name: '안방 외벽 단열', spec: '아이소핑크(50t+50t)+석고1p-기본', unit: '면', qty: '1', price: '800000' },
                { div: '단열', name: '안방 외벽 단열', spec: '아이소핑크(50t+50t)+다루끼+기밀(듀폰투습)_석고2p-고급', unit: '면', qty: '1', price: '1100000' },
                { div: '단열', name: '방 외벽 단열', spec: '아이소핑크(50t+50t)+석고1p-기본', unit: '면', qty: '1', price: '500000' },
                { div: '단열', name: '방 외벽 단열', spec: '아이소핑크(50t+50t)+다루끼+기밀(듀폰투습)_석고2p-고급', unit: '면', qty: '1', price: '800000' },
                { div: '단열', name: '화장실 벽면 단열', spec: '아이소핑크(30t)+석고1p', unit: '면', qty: '1', price: '300000' }
            ],
            '05': [
                { div: '창호', name: 'kcc 창호', spec: '20평 이하 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '6000000' },
                { div: '창호', name: 'kcc 창호', spec: '21~25평 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '8000000' },
                { div: '창호', name: 'kcc 창호', spec: '26~30평 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '9000000' },
                { div: '창호', name: 'kcc 창호', spec: '31~35평 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '10000000' },
                { div: '창호', name: 'kcc 창호', spec: '36~40평 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '13000000' },
                { div: '창호', name: 'kcc 창호', spec: '41~45평 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '16000000' },
                { div: '창호', name: 'kcc 창호', spec: '46~50평 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '19000000' },
                { div: '창호', name: 'kcc 창호', spec: '51평 이상 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '22000000' },
                { div: '창호', name: 'LX 지인 창호 뷰프레임', spec: '20평 이하 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '7000000' },
                { div: '창호', name: 'LX 지인 창호 뷰프레임', spec: '21~25평 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '8000000' },
                { div: '창호', name: 'LX 지인 창호 뷰프레임', spec: '26~30평 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '11000000' },
                { div: '창호', name: 'LX 지인 창호 뷰프레임', spec: '31~35평 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '13000000' },
                { div: '창호', name: 'LX 지인 창호 뷰프레임', spec: '36~40평 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '16000000' },
                { div: '창호', name: 'LX 지인 창호 뷰프레임', spec: '41~45평 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '19000000' },
                { div: '창호', name: 'LX 지인 창호 뷰프레임', spec: '46~50평 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '22000000' },
                { div: '창호', name: 'LX 지인 창호 뷰프레임', spec: '51평 이상 예상견적가 - 실측 완료 후 재안내.', unit: '식', qty: '1', price: '25000000' },
                { div: '방충망', name: '미세 방충망', spec: '큰 창', unit: 'ea', qty: '1', price: '70000' },
                { div: '방충망', name: '미세 방충망', spec: '작은 창', unit: 'ea', qty: '1', price: '50000' },
                { div: '크리센트', name: '크리센트 교체', spec: '', unit: 'ea', qty: '1', price: '10000' },
                { div: '폴딩도어', name: '폴딩도어(짝)', spec: '', unit: 'ea', qty: '1', price: '470000' }
            ],
            '06': [
                { div: '배선', name: '전기 배선 (기본)', spec: '전기 배선 비용(2.5SQ-HIV)', unit: 'py', qty: '1', price: '60000' },
                { div: '배선', name: '단독배선(차단기포함)', spec: '인덕션 (4SQ-HIV)', unit: 'ea', qty: '1', price: '300000' },
                { div: '배선', name: '단독배선(차단기포함)', spec: '주방(보조주방, 정수기 등)-차단기 가구로 숨김', unit: 'ea', qty: '1', price: '250000' },
                { div: '배선', name: '일괄소등', spec: '일괄 소등 포함 기계식(전자식 별도)', unit: 'ea', qty: '1', price: '300000' },
                { div: '배선', name: '스위치 증설/이설', spec: '신설 위치가 가벽의 경우', unit: 'ea', qty: '1', price: '100000' },
                { div: '배선', name: '3로 스위치 증설/이설', spec: '신설 위치가 가벽의 경우', unit: 'ea', qty: '1', price: '120000' },
                { div: '배선', name: '스위치 증설/이설', spec: '신설 위치가 옹벽의 경우', unit: 'ea', qty: '1', price: '170000' },
                { div: '배선', name: '3로 스위치 증설/이설', spec: '신설 위치가 옹벽의 경우', unit: 'ea', qty: '1', price: '190000' },
                { div: '배선', name: '콘센트 증설/이설', spec: '신설 위치가 가벽의 경우', unit: 'ea', qty: '1', price: '30000' },
                { div: '배선', name: '콘센트 증설/이설', spec: '신설 위치가 옹벽의 경우', unit: 'ea', qty: '1', price: '70000' },
                { div: '배선', name: '콘센트 및 스위치 증설/이설', spec: '침대 헤더 좌/우 신설 (일괄소등 안됨)', unit: 'ea', qty: '1', price: '100000' },
                { div: '비디오폰', name: '비디오선 배선 연장', spec: '1m 이내', unit: '식', qty: '1', price: '100000' },
                { div: '비디오폰', name: '비디오폰 배선 연장', spec: '1m 이상', unit: '식', qty: '1', price: '200000' },
                { div: '온도조절기', name: '온도조절기 배선 추가', spec: '각방 온도 조절기 배선 각실 기준 (폭스타공 별도)', unit: 'ea', qty: '1', price: '50000' },
                { div: '차단기', name: '차단기 교체', spec: '기본 6회로 차단기만 교체', unit: '식', qty: '1', price: '300000' },
                { div: '차단기', name: '차단기 교체', spec: '차단기 추가 (벽면 철거+차단기 추가)', unit: '식', qty: '1', price: '500000' },
                { div: '현관', name: '현관 조명', spec: '현관 3인치 or 2인치 (히든센서+띄움 신발장 간접 T5)', unit: '식', qty: '1', price: '250000' },
                { div: '조명', name: '조명-방등', spec: 'led 엣지등 (640*640) - 시공비 별도', unit: 'ea', qty: '1', price: '70000' },
                { div: '조명', name: '조명-방등', spec: 'led 스마트 엣지등 (640*640) - 시공비 별도', unit: 'ea', qty: '1', price: '150000' },
                { div: '조명', name: '조명-주방등', spec: 'led 엣지등 (640*220) - 시공비 별도', unit: 'ea', qty: '1', price: '50000' },
                { div: '조명', name: '조명-주방등', spec: 'led 스마트 엣지 (635*320) - 시공비 별도', unit: 'ea', qty: '1', price: '120000' },
                { div: '조명', name: '조명-주방등', spec: 'led 엣지등 (1280*320) - 시공비 별도', unit: 'ea', qty: '1', price: '110000' },
                { div: '조명', name: '조명-주방등', spec: 'led 스마트 엣지 (1280*320) - 시공비 별도', unit: 'ea', qty: '1', price: '130000' },
                { div: '조명', name: '조명-매입등', spec: '호른 2인치 led 확산 COB(5w) - 시공비 별도', unit: 'ea', qty: '1', price: '17000' },
                { div: '조명', name: '조명-매입등', spec: '호른 3인치 led 확산 COB(8w) - 시공비 별도', unit: 'ea', qty: '1', price: '17000' },
                { div: '조명', name: '조명-매입등', spec: '움푹 2인치 led (5w) - 시공비 별도', unit: 'ea', qty: '1', price: '5000' },
                { div: '조명', name: '조명-매입등', spec: '움푹 3인치 led (5w) - 시공비 별도', unit: 'ea', qty: '1', price: '6000' },
                { div: '조명', name: '조명-트림리스', spec: '레일 4m 이내 205길이 6개(목공별도)', unit: 'ea', qty: '1', price: '600000' },
                { div: '조명', name: '조명-간접등', spec: 't3 led (27mm)', unit: 'm', qty: '1', price: '7000' },
                { div: '조명', name: '조명-간접등', spec: 't5 led (35mm)', unit: 'm', qty: '1', price: '7500' },
                { div: '조명', name: '조명-간접등', spec: 'led 바 - 주문제작', unit: '식', qty: '1', price: '0' },
                { div: '조명', name: '조명-직부등', spec: '8인치 led (원형/사각)', unit: 'ea', qty: '1', price: '12000' },
                { div: '조명', name: '조명-센서등', spec: '8인치 led (원형/사각)', unit: 'ea', qty: '1', price: '12000' },
                { div: '스위치콘센트', name: '스위치콘센트 - 기본형', spec: '제일 디아트 20평대', unit: '식', qty: '1', price: '400000' },
                { div: '스위치콘센트', name: '스위치콘센트 - 기본형', spec: '제일 디아트 30평대', unit: '식', qty: '1', price: '550000' },
                { div: '스위치콘센트', name: '스위치콘센트 - 기본형', spec: '제일 디아트 40평대', unit: '식', qty: '1', price: '700000' },
                { div: '스위치콘센트', name: '스위치콘센트 - 르그랑', spec: '아테오 20평대', unit: '식', qty: '1', price: '650000' },
                { div: '스위치콘센트', name: '스위치콘센트 - 르그랑', spec: '아테오 30평대', unit: '식', qty: '1', price: '850000' },
                { div: '스위치콘센트', name: '스위치콘센트 - 르그랑', spec: '아테오 40평대', unit: '식', qty: '1', price: '1000000' },
                { div: '스위치콘센트', name: '스위치콘센트 - 유럽형융', spec: '20평대', unit: '식', qty: '1', price: '800000' },
                { div: '스위치콘센트', name: '스위치콘센트 - 유럽형융', spec: '30평대', unit: '식', qty: '1', price: '1100000' },
                { div: '스위치콘센트', name: '스위치콘센트 - 유럽형융', spec: '40평대', unit: '식', qty: '1', price: '1600000' },
                { div: '감지기', name: '감지기', spec: '차동식/정온식', unit: 'ea', qty: '1', price: '5000' },
                { div: '인건비', name: '전기 기술자 1품', spec: '경비/식대/장비 포함.', unit: 'ea', qty: '1', price: '400000' },
                { div: '실링팬', name: '실링팬', spec: '보강및 시공비 포함(자재 별도)', unit: '식', qty: '1', price: '150000' },
                { div: '개별스위치콘센트', name: '르그랑 아틀라스 화이트', spec: '1구 스위치 (기본)', unit: 'ea', qty: '1', price: '1880' },
                { div: '개별스위치콘센트', name: '르그랑 아틀라스 화이트', spec: '2구 스위치 (기본)', unit: 'ea', qty: '1', price: '2640' },
                { div: '개별스위치콘센트', name: '르그랑 아틀라스 화이트', spec: '3구 스위치 (기본)', unit: 'ea', qty: '1', price: '3450' },
                { div: '개별스위치콘센트', name: '르그랑 아틀라스 화이트', spec: '4구 스위치 (기본)', unit: 'ea', qty: '1', price: '4240' },
                { div: '개별스위치콘센트', name: '르그랑 아틀라스 화이트', spec: '방불/방등 스위치', unit: 'ea', qty: '1', price: '5350' },
                { div: '개별스위치콘센트', name: '르그랑 아틀라스 마그네틱', spec: '1구 스위치', unit: 'ea', qty: '1', price: '3100' },
                { div: '개별스위치콘센트', name: '르그랑 아틀라스 마그네틱', spec: '2구 스위치', unit: 'ea', qty: '1', price: '3740' },
                { div: '개별스위치콘센트', name: '르그랑 아틀라스 마그네틱', spec: '3구 스위치', unit: 'ea', qty: '1', price: '4200' },
                { div: '개별스위치콘센트', name: '르그랑 아틀라스 마그네틱', spec: '방불/방등 스위치', unit: 'ea', qty: '1', price: '4950' },
                { div: '개별스위치콘센트', name: '융 LS990 / LS 시리즈', spec: '1구 스위치 (1모듈, 화이트/아이보리)', unit: 'ea', qty: '1', price: '10000' },
                { div: '개별스위치콘센트', name: '융 LS990 / LS 시리즈', spec: '2구 스위치 (2모듈, 화이트/아이보리)', unit: 'ea', qty: '1', price: '18000' },
                { div: '개별스위치콘센트', name: '융 LS990 / LS 시리즈', spec: '3구 스위치 (3모듈, 화이트/아이보리)', unit: 'ea', qty: '1', price: '43000' },
                { div: '개별스위치콘센트', name: '융 LS990 콘센트류', spec: '1구 콘센트 (기본)', unit: 'ea', qty: '1', price: '5300' },
                { div: '개별스위치콘센트', name: '융 LS990 콘센트류', spec: '2구 콘센트 (기본)', unit: 'ea', qty: '1', price: '11000' },
                { div: '개별스위치콘센트', name: '융 LS990 콘센트류', spec: '3구 콘센트 (기본)', unit: 'ea', qty: '1', price: '16500' },
                { div: '개별스위치콘센트', name: '융 LS990 콘센트류', spec: '4구 콘센트 (기본)', unit: 'ea', qty: '1', price: '27000' },
                { div: '개별스위치콘센트', name: '융 LS990 콘센트류', spec: '5구 콘센트 (기본)', unit: 'ea', qty: '1', price: '39000' },
                { div: '개별스위치콘센트', name: '융 LS990 프레임', spec: '1구 프레임 (WHITE/BLACK 등 구수별)', unit: 'ea', qty: '1', price: '5200' },
                { div: '개별스위치콘센트', name: '융 LS990 프레임', spec: '2구 프레임 (WHITE/BLACK 등 구수별)', unit: 'ea', qty: '1', price: '11000' },
                { div: '개별스위치콘센트', name: '융 LS990 프레임', spec: '3구 프레임 (WHITE/BLACK 등 구수별)', unit: 'ea', qty: '1', price: '16000' },
                { div: '개별스위치콘센트', name: '융 LS990 프레임', spec: '4구 프레임 (WHITE/BLACK 등 구수별)', unit: 'ea', qty: '1', price: '27000' },
                { div: '개별스위치콘센트', name: '융 LS990 프레임', spec: '5구 프레임 (WHITE/BLACK 등 구수별)', unit: 'ea', qty: '1', price: '39000' },
                { div: '개별스위치콘센트', name: 'VEKO 베코노 시리즈', spec: '1구 스위치', unit: 'ea', qty: '1', price: '3100' },
                { div: '개별스위치콘센트', name: 'VEKO 베코노 시리즈', spec: '2구 스위치', unit: 'ea', qty: '1', price: '4400' },
                { div: '개별스위치콘센트', name: 'VEKO 베코노 시리즈', spec: '3구 스위치', unit: 'ea', qty: '1', price: '5400' },
                { div: '개별스위치콘센트', name: 'VEKO 베코노 시리즈', spec: '4구 스위치', unit: 'ea', qty: '1', price: '6800' },
                { div: '개별스위치콘센트', name: 'VEKO 베코노 시리즈', spec: '5구 스위치', unit: 'ea', qty: '1', price: '8200' },
                { div: '개별스위치콘센트', name: 'VEKO 베코노 시리즈', spec: '1구 콘센트', unit: 'ea', qty: '1', price: '4650' },
                { div: '개별스위치콘센트', name: 'VEKO 베코노 시리즈', spec: '2구 콘센트', unit: 'ea', qty: '1', price: '7450' },
                { div: '개별스위치콘센트', name: 'VEKO 베코노 시리즈', spec: '3구 콘센트', unit: 'ea', qty: '1', price: '10000' },
                { div: '개별스위치콘센트', name: 'VEKO 베코노 시리즈', spec: 'TV/통합', unit: 'ea', qty: '1', price: '8600' },
                { div: '개별스위치콘센트', name: 'TILINS 티린스 T1 TRIICO', spec: '1구 스위치', unit: 'ea', qty: '1', price: '3100' },
                { div: '개별스위치콘센트', name: 'TILINS 티린스 T1 TRIICO', spec: '2구 스위치', unit: 'ea', qty: '1', price: '4200' },
                { div: '개별스위치콘센트', name: 'TILINS 티린스 T1 TRIICO', spec: '3구 스위치', unit: 'ea', qty: '1', price: '5000' },
                { div: '개별스위치콘센트', name: 'TILINS 티린스 T1 TRIICO', spec: '1구 콘센트', unit: 'ea', qty: '1', price: '4000' },
                { div: '개별스위치콘센트', name: 'TILINS 티린스 T1 TRIICO', spec: '2구 콘센트', unit: 'ea', qty: '1', price: '5500' },
                { div: '개별스위치콘센트', name: 'TILINS 티린스 T14 시리즈', spec: '1구 스위치', unit: 'ea', qty: '1', price: '4300' },
                { div: '개별스위치콘센트', name: 'TILINS 티린스 T14 시리즈', spec: '2구 스위치', unit: 'ea', qty: '1', price: '5300' },
                { div: '개별스위치콘센트', name: 'TILINS 티린스 T14 시리즈', spec: '3구 스위치', unit: 'ea', qty: '1', price: '6300' },
                { div: '개별스위치콘센트', name: 'TILINS 티린스 T14 시리즈', spec: '1구 콘센트', unit: 'ea', qty: '1', price: '4200' },
                { div: '개별스위치콘센트', name: 'TILINS 티린스 T14 시리즈', spec: '2구 콘센트', unit: 'ea', qty: '1', price: '5300' },
                { div: '개별스위치콘센트', name: '진흥전기 J 시리즈', spec: '1구 스위치', unit: 'ea', qty: '1', price: '2000' },
                { div: '개별스위치콘센트', name: '진흥전기 J 시리즈', spec: '2구 스위치', unit: 'ea', qty: '1', price: '3100' },
                { div: '개별스위치콘센트', name: '진흥전기 J 시리즈', spec: '3구 스위치', unit: 'ea', qty: '1', price: '4000' },
                { div: '개별스위치콘센트', name: '진흥전기 J 시리즈', spec: '4구 스위치', unit: 'ea', qty: '1', price: '5000' },
                { div: '개별스위치콘센트', name: '진흥전기 J 시리즈', spec: 'TV/전화/통합', unit: 'ea', qty: '1', price: '8000' },
                { div: '개별스위치콘센트', name: 'NANO 나노전기 오뎀세이/아트', spec: '1구 스위치', unit: 'ea', qty: '1', price: '2300' },
                { div: '개별스위치콘센트', name: 'NANO 나노전기 오뎀세이/아트', spec: '2구 스위치', unit: 'ea', qty: '1', price: '3500' },
                { div: '개별스위치콘센트', name: 'NANO 나노전기 오뎀세이/아트', spec: '3구 스위치', unit: 'ea', qty: '1', price: '4700' },
                { div: '개별스위치콘센트', name: 'NANO 나노전기 오뎀세이/아트', spec: '1구 콘센트', unit: 'ea', qty: '1', price: '3600' },
                { div: '개별스위치콘센트', name: 'NANO 나노전기 오뎀세이/아트', spec: '2구 콘센트', unit: 'ea', qty: '1', price: '4900' },
                { div: '개별스위치콘센트', name: 'NANO 나노전기 오뎀세이/아트', spec: '3구 콘센트', unit: 'ea', qty: '1', price: '6200' },
                { div: '개별스위치콘센트(평균)', name: '국내 브랜드 스위치', spec: '1구 (2,000 ~ 4,000원대 평균)', unit: 'ea', qty: '1', price: '3000' },
                { div: '개별스위치콘센트(평균)', name: '국내 브랜드 스위치', spec: '2구 (3,000 ~ 5,000원대 평균)', unit: 'ea', qty: '1', price: '4000' },
                { div: '개별스위치콘센트(평균)', name: '국내 브랜드 스위치', spec: '3구 (4,000 ~ 7,000원대 평균)', unit: 'ea', qty: '1', price: '5500' },
                { div: '개별스위치콘센트(평균)', name: '국내 브랜드 스위치', spec: '4구 (6,000 ~ 9,000원대 평균)', unit: 'ea', qty: '1', price: '7500' },
                { div: '개별스위치콘센트(평균)', name: '국내 브랜드 스위치', spec: '5구 (7,000 ~ 12,000원대 평균)', unit: 'ea', qty: '1', price: '9500' },
                { div: '개별스위치콘센트(평균)', name: '국내 브랜드 스위치', spec: '6구 (8,000 ~ 14,000원대 평균)', unit: 'ea', qty: '1', price: '11000' },
                { div: '개별스위치콘센트(평균)', name: '르그랑/융 프리미엄군', spec: '1구 기준 (8,000 ~ 12,000원부터 시작)', unit: 'ea', qty: '1', price: '10000' }
            ],
            '07': [
                { div: '엘지 에어컨', name: 'LG 시스템 에어컨 2대', spec: '프리미엄 일반형(단배관: 18/6) - 실외비 3마력/냉방', unit: '식', qty: '1', price: '3900000' },
                { div: '엘지 에어컨', name: 'LG 시스템 에어컨 3대', spec: '프리미엄 일반형(단배관: 18/6/5) - 실외비 4마력/냉방', unit: '식', qty: '1', price: '5200000' },
                { div: '엘지 에어컨', name: 'LG 시스템 에어컨 4대', spec: '프리미엄 일반형(단배관: 18/6/5/5) - 실외비 4마력/냉방', unit: '식', qty: '1', price: '6200000' },
                { div: '엘지 에어컨', name: 'LG 시스템 에어컨 5대', spec: '프리미엄 일반형(단배관: 18/6/5/5) - 실외비 4마력/냉방', unit: '식', qty: '1', price: '7800000' },
                { div: '엘지 에어컨', name: 'LG 시스템 에어컨 6대', spec: '프리미엄 일반형(단배관: 18/6/5/5/5) - 실외비 5마력/냉방', unit: '식', qty: '1', price: '8900000' },
                { div: '삼성 에어컨', name: 'SAMSUNG 에어컨 2대', spec: '무풍 와이파이 내장형(단배관: 18/6) - 실외기 3마력/냉방', unit: '식', qty: '1', price: '3400000' },
                { div: '삼성 에어컨', name: 'SAMSUNG 에어컨 3대', spec: '무풍 와이파이 내장형(단배관: 18/6/5) - 실외기 4마력/냉방', unit: '식', qty: '1', price: '4500000' },
                { div: '삼성 에어컨', name: 'SAMSUNG 에어컨 4대', spec: '무풍 와이파이 내장형(단배관: 18/6/5/5) - 실외기 4마력/냉방', unit: '식', qty: '1', price: '5300000' },
                { div: '삼성 에어컨', name: 'SAMSUNG 에어컨 5대', spec: '무풍 와이파이 내장형(단배관: 18/6/5/5) - 실외기 5마력/냉방', unit: '식', qty: '1', price: '6700000' },
                { div: '삼성 에어컨', name: 'SAMSUNG 에어컨 6대', spec: '무풍 와이파이 내장형(단배관: 18/8/6/5/5/5) - 실외기 5마력/냉방', unit: '식', qty: '1', price: '7800000' },
                { div: '삼성 에어컨', name: 'SAMSUNG 에어컨 7대', spec: '무풍 와이파이 내장형(단배관: 10/10/8/6/6/6/6) - 실외기 6마력/냉방', unit: '식', qty: '1', price: '8200000' },
                { div: '삼성 에어컨', name: 'SAMSUNG 에어컨 7대', spec: '무풍 와이파이 내장형(단배관: 18/8/8/6/6/6/6) - 실외기 6마력/냉방', unit: '식', qty: '1', price: '8500000' },
                { div: '기타 추가 항목', name: '실외기 앵글 (1단)', spec: '알루미늄 바닥용 1단', unit: '식', qty: '1', price: '70000' },
                { div: '기타 추가 항목', name: '실외기 앵글 (행어용)', spec: '알루미늄 1050~1150', unit: '식', qty: '1', price: '150000' },
                { div: '기타 추가 항목', name: '실외기 받침대', spec: '발통 (주거용)', unit: '식', qty: '1', price: '30000' },
                { div: '기타 추가 항목', name: '실외기 에어가드', spec: '바람막이 (알루미늄)', unit: '식', qty: '1', price: '50000' },
                { div: '기타 추가 항목', name: '단상 차단기', spec: '누전 220V', unit: '식', qty: '1', price: '50000' }
            ],
            '08': [
                { div: '벽체', name: '벽면 석고 시공', spec: '벽면 석고 면맞춤 떠붙임 1p (h:2400)', unit: 'm', qty: '1', price: '70000' },
                { div: '가벽', name: '주방 가벽 신설', spec: '다루끼 가벽 (냉장고) - 1m이내 두께60mm', unit: 'ea', qty: '1', price: '150000' },
                { div: '가벽', name: '중문 가벽 신설', spec: '투바이 가벽 (중문) - 1m이내 두께90mm - 공틀', unit: 'ea', qty: '1', price: '350000' },
                { div: '가벽', name: '직각 게이트 공틀 MD', spec: '측면 MD 마감', unit: '틀', qty: '1', price: '100000' },
                { div: '가벽', name: '아치 게이트 공틀 MD', spec: '측면 MD 마감', unit: '틀', qty: '1', price: '150000' },
                { div: '가벽', name: '가벽 신설', spec: '공간 분리를 위한 투바이 가벽 신설', unit: '식', qty: '1', price: '350000' },
                { div: '몰딩', name: '천장 몰딩', spec: '계단 몰딩 (25*15)', unit: 'py', qty: '1', price: '22000' },
                { div: '몰딩', name: '걸레 받이', spec: '직각 평 몰딩 (30mm or 40mm)', unit: 'py', qty: '1', price: '20000' },
                { div: '천장', name: '가구자리 수평 맞춤', spec: '가구자리 수평 맞춤 (부분 철거 후 맞춤)', unit: '식', qty: '1', price: '300000' },
                { div: '천장', name: '우물 천장 평시공', spec: '전실/현관 (기본), (대형 추가 10만원)', unit: '식', qty: '1', price: '150000' },
                { div: '천장', name: '우물 천장 평시공', spec: '주방 (기본), (대형 추가 10만원)', unit: '식', qty: '1', price: '250000' },
                { div: '천장', name: '우물 천장 평시공', spec: '거실 (기본), (대형 추가 10만원)', unit: '식', qty: '1', price: '350000' },
                { div: '천장', name: '우물 천장 몰딩', spec: '9mm 몰딩 시공', unit: '식', qty: '1', price: '150000' },
                { div: '천장', name: '우물 천장 신설', spec: '정사각, 직사각 형태 (기본), (대형 추가 10만원)', unit: '식', qty: '1', price: '700000' },
                { div: '천장', name: '우물 천장 신설', spec: '라운드 형태 (기본), (대형 추가 10만원)', unit: '식', qty: '1', price: '800000' },
                { div: '천장', name: '매립 등박스 신설 (라인조명)', spec: '철거+재시공 (라인 일자 조명) - 조명별도', unit: 'm', qty: '1', price: '70000' },
                { div: '천장', name: '매립 등박스 신설 (라인조명)', spec: '철거+재시공 (라인 사각 조명) - 조명별도', unit: '식', qty: '1', price: '500000' },
                { div: '천장', name: '복도 측면 상부 간접등 박스', spec: '철거+간접등박스 - 조명별도', unit: 'm', qty: '1', price: '100000' },
                { div: '벽체', name: '복도 끝벽 벽 간접등', spec: '철거+간접등박스 (w:1200,h:2400 기준) - 조명별도', unit: '식', qty: '1', price: '200000' },
                { div: '벽체', name: '알판 - 템바보드', spec: '포인트 벽면 템바보드', unit: '식', qty: '1', price: '450000' },
                { div: '벽체', name: '코너 라운드 벽체', spec: '날개벽 또는 코너 벽면 라운드 시공', unit: '식', qty: '1', price: '400000' },
                { div: '벽체', name: '거실 TV 매립형 가벽', spec: 'TV 고정 벽면 합판 보강', unit: '식', qty: '1', price: '600000' },
                { div: '벽체', name: '히든도어 벽면 마감', spec: '히든도어 양쪽 벽면 알판 (석고+MD)', unit: '식', qty: '1', price: '200000' },
                { div: '벽체', name: '벽체 막음 (기존 도어자리)', spec: '기존 도어 자리 벽체 마감 (내부 단열재-방음)', unit: '식', qty: '1', price: '250000' },
                { div: '벽체', name: '주방 타일 철거자리 마감', spec: '기존 주방자리 타일 철거 후 석고 마감', unit: '식', qty: '1', price: '250000' },
                { div: '알판', name: '알판 - 벽면 MD', spec: '벽면 알판 (석고+MD) (1000*2400)', unit: 'm', qty: '1', price: '90000' },
                { div: '알판', name: '알판 - 벽면 MD', spec: '천장 알판 (석고+MD) (1000*2400)', unit: 'm', qty: '1', price: '120000' },
                { div: '천장', name: '철거 후 댄조 마감 평 - 현관', spec: '전체 철거 후 천장 마감 (다루끼+석고) 평마감', unit: '식', qty: '1', price: '600000' },
                { div: '천장', name: '철거 후 댄조 마감 우물 - 현관', spec: '전체 철거 후 천장 마감 (다루끼+석고) 우물 마감 (간접시-조명별도)', unit: '식', qty: '1', price: '700000' },
                { div: '천장', name: '철거 후 댄조 마감 평 - 거실', spec: '전체 철거 후 천장 마감 (다루끼+석고) 평마감', unit: '식', qty: '1', price: '800000' },
                { div: '천장', name: '철거 후 댄조 마감 우물 - 거실', spec: '전체 철거 후 천장 마감 (다루끼+석고) 우물 마감 (간접시-조명별도)', unit: '식', qty: '1', price: '900000' },
                { div: '천장', name: '철거 후 댄조 마감 평 - 방or주방', spec: '전체 철거 후 천장 마감 (다루끼+석고) 평마감', unit: '식', qty: '1', price: '700000' },
                { div: '천장', name: '철거 후 댄조 마감 우물 - 거실or주방', spec: '전체 철거 후 천장 마감 (다루끼+석고) 우물 마감 (간접시-조명별도)', unit: '식', qty: '1', price: '800000' },
                { div: '에어컨', name: '시스템 에어컨 천장 단내림', spec: '시스템 에어컨 설비층 확보를 위한 천장 단내림 (h:190)', unit: '식', qty: '1', price: '300000' },
                { div: '에어컨', name: '시스템 에어컨 천장 마감', spec: '시스템 에어컨 선배관 후 기계자리 보강 및 배관 자리 타공부분 막음', unit: '식', qty: '1', price: '400000' },
                { div: '보강', name: '합판 보강 벽면 - 거울', spec: '거울/액자 등 벽면 보강 (1000*600 기준)', unit: 'm', qty: '1', price: '70000' },
                { div: '보강', name: '합판 보강 천정 - 가구', spec: '옷봉 or 상부장 or 띄움 장 합판 보강 (1000*600 기준)', unit: 'm', qty: '1', price: '90000' },
                { div: '도어', name: '도어 재사용 - 필름', spec: '도어 재사용+필름 시공을 위한 도어 대패 작업.', unit: 'set', qty: '1', price: '20000' },
                { div: '도어', name: '도어 하드웨어만 교체시 (문재사용)', spec: '철거+경첩/댐퍼형 도어스토퍼/손잡이(30,000)', unit: 'set', qty: '1', price: '70000' },
                { div: '도어', name: '도어 하드웨어만 교체시 (문재사용)', spec: '철거+경첩/자석형 도어스토퍼/손잡이(30,000)', unit: 'set', qty: '1', price: '80000' },
                { div: '도어', name: '도어 하드웨어 (신설)', spec: '경첩/댐퍼형 도어스토퍼/손잡이(30,000)', unit: 'set', qty: '1', price: '60000' },
                { div: '도어', name: '도어 하드웨어 (신설)', spec: '경첩/자석형 도어스토퍼/손잡이(30,000)', unit: 'set', qty: '1', price: '70000' },
                { div: '도어', name: '여닫이 도어', spec: '영림 ABS 여닫이 도어 (문짝만) - 손잡이별도', unit: 'ea', qty: '1', price: '220000' },
                { div: '도어', name: '여닫이 도어', spec: '영림 ABS 여닫이 도어 (틀/문짝/가스켓) - 손잡이별도', unit: 'set', qty: '1', price: '400000' },
                { div: '도어', name: '포켓 도어', spec: '목공+슬라이드형 도어 (양뎀퍼) - 손잡이별도', unit: 'set', qty: '1', price: '500000' },
                { div: '도어', name: '스텝 도어', spec: '목공+ABS 여닫이 도어(어깨가공) - 인방철거/손잡이별도', unit: 'set', qty: '1', price: '500000' },
                { div: '도어', name: '슬림 와이드 여닫이 도어', spec: '12mm 문선 슬림형 여닫이 도어 (벽면 석고/도어다리 필름 별도)', unit: 'ea', qty: '1', price: '420000' },
                { div: '도어', name: '히든도어', spec: '알루미늄문틀/ABS히든도어/손잡이 (벽면 마감 석고+MD 별도)', unit: 'ea', qty: '1', price: '950000' },
                { div: '도어', name: '피봇도어 45T', spec: '180도 여닫이 (부속포함)', unit: 'ea', qty: '1', price: '1200000' },
                { div: '터닝도어', name: '터닝도어', spec: 'LX 터닝도어 (세탁실or거실발코니)', unit: 'ea', qty: '1', price: '800000' },
                { div: '침대헤드', name: '침대헤드(알판)', spec: '침대 헤드 알판 (석고+MD)', unit: '식', qty: '1', price: '300000' },
                { div: '침대헤드', name: '침대헤드(알판)+젠다이(알판)', spec: '침대헤드 상부 알판(포인트)+하부젠다이 알판', unit: '식', qty: '1', price: '500000' },
                { div: '침대헤드', name: '침대헤드(알판)+젠다이(알판)+조명', spec: '침대헤드 상부 알판(포인트)+하부젠다이 알판 -조명 별도', unit: '식', qty: '1', price: '700000' },
                { div: '침대헤드', name: '침대헤드(루버)+젠다이(알판)+조명', spec: '침대헤드 상부 루버(포인트)+하부젠다이 알판 -조명 별도', unit: '식', qty: '1', price: '900000' },
                { div: '현관문', name: '현관문 여닫이 모던전창', spec: '여딛이 180도 편개 도어 (모던) - 문틀 없음. (1000*2400)', unit: '식', qty: '1', price: '1500000' },
                { div: '현관문', name: '현관문 여닫이 간살 - 비대칭', spec: '여딛이 180도 편개 도어 (전체간살) - 문틀 없음. (1100*2400)', unit: '식', qty: '1', price: '1900000' },
                { div: '현관문', name: '현관문 여닫이 양개 비대칭-모던', spec: '여닫이 비대칭 양개 180도 (모던) - 문틀 없음. (1200*2400)', unit: '식', qty: '1', price: '1400000' },
                { div: '현관문', name: '현관문 여닫이 양개 비대칭-백유리', spec: '여닫이 비대칭 양개 180도(전창백유리)-문틀 없음.(1300*2400)', unit: '식', qty: '1', price: '1500000' },
                { div: '현관문', name: '현관문 슬라이드(1도어)-브론즈샤틴', spec: '슬라이도 1도어 (모던) - 상부/하부 매립형 레일 (900*2400)', unit: '식', qty: '1', price: '800000' },
                { div: '현관문', name: '현관문 슬라이드 (1도어)', spec: '슬라이도 1도어 (간살6개) - 상부/하부 매립형 레일 (1200*2400)', unit: '식', qty: '1', price: '1600000' },
                { div: '현관문', name: '현관문 슬라이딩 (2도어)', spec: '슬라이도 2도어 (모던) - 상부/하부 매립형 레일 (1800*2400)', unit: '식', qty: '1', price: '1400000' },
                { div: '현관문', name: '현관문 슬라이드 (개별 4도어)', spec: '슬라이드 4도어 (간살) - 상부/하부 매립형 레일 (3000*2200)', unit: '식', qty: '1', price: '5500000' },
                { div: '현관문', name: '현관문 3연동 슬림형 (4도어)', spec: '알루미늄 3연동 4도어 슬라이드 도어 (모던) (2000*2300)', unit: '식', qty: '1', price: '1600000' },
                { div: '현관문', name: '현관문 3연동 슬림형 (3도어)', spec: '알루미늄 3연동 4도어 슬라이드 도어 (모던) (2000*2300)', unit: '식', qty: '1', price: '1100000' },
                { div: '현관문', name: '현관문 신설 (방화도어) 양개도어', spec: '현관문 방화문 신설 양개 도어 (철거 및 도어락 별도)', unit: '식', qty: '1', price: '1500000' },
                { div: '현관문', name: '현관문 신설 (방화도어) 편개도어', spec: '현관문 방화문 신설 양개 도어 (철거 및 도어락 별도)', unit: '식', qty: '1', price: '1200000' },
                { div: '선반', name: '무지주 선반 시공', spec: 'D:200 이내 선반 시공', unit: '식', qty: '1', price: '150000' },
                { div: '화장실', name: '화장실 측면 간접', spec: '세면대 자리 측면 간접을 위한 목공 (하부 조적)', unit: '식', qty: '1', price: '300000' },
                { div: '화장실', name: '화장실 벽면 공간박스', spec: '측면 공간 박스 및 간접', unit: '식', qty: '1', price: '350000' },
                { div: '액자레일', name: '액자레일 - 매립', spec: '철거 후 액자레일 매립 한면', unit: '식', qty: '1', price: '200000' }
            ],
            '09': [
                { div: '기본 (단품)', name: '기본 시공비 (현관문/공틀)', spec: '현관문 틀/문짝(내부만), 공틀1', unit: '식', qty: '1', price: '500000' },
                { div: '기본 (단품)', name: '기본 시공비 (부분시공)', spec: '부분 시공일 때 1품(35) - 자재 1m(추가:2만원)', unit: '식', qty: '1', price: '350000' },
                { div: '창호 단품', name: '창호 (거실) - 단품', spec: '30평대 기준 거실 창호', unit: '식', qty: '1', price: '1200000' },
                { div: '창호 단품', name: '창호 (거실) - 단품', spec: '40평대 기준 거실 창호', unit: '식', qty: '1', price: '1500000' },
                { div: '창호 단품', name: '창호 (대) - 단품', spec: '이중창 기준. 단창의 경우 (90)', unit: 'ea', qty: '1', price: '1000000' },
                { div: '창호 단품', name: '창호 (중) - 단품', spec: '이중창 기준. 단창의 경우 (80)', unit: 'ea', qty: '1', price: '800000' },
                { div: '창호 단품', name: '창호 (소) - 단품', spec: '이중창 기준. 단창의 경우 (50)', unit: 'ea', qty: '1', price: '600000' },
                { div: '가구/수납장', name: '붙박이장/신발장', spec: '외측(눈이 보이는 곳) 틀/문짝', unit: '자', qty: '1', price: '100000' },
                { div: '가구/수납장', name: '하프장', spec: 'h: 1200 이내', unit: '자', qty: '1', price: '70000' },
                { div: '창고장', name: '창고장', spec: 'w: 1200 이내', unit: '식', qty: '1', price: '200000' },
                { div: '도어', name: '현관문 or 방화문 or 터닝도어', spec: '내측 기준', unit: 'ea', qty: '1', price: '200000' },
                { div: '도어', name: '방화문 or 터닝도어 앞뒤 전체', spec: '앞뒤 전체 필름.', unit: 'ea', qty: '1', price: '250000' },
                { div: '도어(set)', name: '문틀/문짝 (기본)', spec: '민자 도어/틀의 경우', unit: 'set', qty: '1', price: '280000' },
                { div: '도어(set)', name: '문틀/문짝 (골/페인트/무늬목)', spec: '문짝에 무늬 또는 골, 샌딩 및 핸디(페인트/무늬목) 필요한 경우', unit: 'set', qty: '1', price: '310000' },
                { div: '도어(단품)', name: '문틀/도어다리/문선', spec: '문틀 전체 해당부분', unit: 'ea', qty: '1', price: '120000' },
                { div: '도어(단품)', name: '문짝 (민자도어)', spec: '문짝 기본 (민자도어)', unit: 'ea', qty: '1', price: '170000' },
                { div: '도어(단품)', name: '문짝 (문양도어)', spec: '문짝 핸디작업 2회', unit: 'ea', qty: '1', price: '200000' },
                { div: '공틀', name: '공틀 사각 게이트', spec: '9mm or 12mm 공틀 MD', unit: 'ea', qty: '1', price: '120000' },
                { div: '공틀', name: '공틀 아치 게이트', spec: '공틀 아치 게이트 (핸디 작업 2회)', unit: 'ea', qty: '1', price: '150000' },
                { div: '등박스 몰딩', name: '등박스 몰딩', spec: '사각형 구조 라운드 형태 (끊김없이 1회시 시공시 자재비 추가 1m 2만원)', unit: 'ea', qty: '1', price: '200000' },
                { div: '알판', name: '현관 or 전실 알판', spec: '34평 기준 현관문 포함, 신발장 및 중문 별', unit: 'ea', qty: '1', price: '500000' },
                { div: '알판', name: '침대 헤드 (디자인)', spec: '침대 헤드 목공 작업 이후 필름시공', unit: '식', qty: '1', price: '400000' },
                { div: '알판', name: '거실/주방 알판', spec: '민자 형태 알판 MD', unit: 'm', qty: '1', price: '80000' },
                { div: '전체필름(창호/도어)', name: '전체 필름', spec: '방화문/문틀짝/중문/공틀/창호', unit: 'py', qty: '1', price: '120000' },
                { div: '전체 창호 필름', name: '전체 창호 필름', spec: '전체 창호만 시공', unit: 'py', qty: '1', price: '80000' },
                { div: '전체 문틀짝 필름', name: '전체 문틀짝 필름', spec: '전체 문틀짝 시공 (30평기준)', unit: 'py', qty: '1', price: '40000' }
            ],
            '10': [
                { div: '현관', name: '현관 바닥 (덧방)', spec: '타일 600*600 덧방 기준 : 34평 이내', unit: '식', qty: '1', price: '350000' },
                { div: '현관', name: '현관 바닥 철거 후 타일', spec: '타일 600*600 (쭈꾸미+타일) : 34평 이내 (철거 별도)', unit: '식', qty: '1', price: '400000' },
                { div: '현관/전실', name: '현관/전실 바닥 (덧방)', spec: '타일 600*600 덧방 기준 : 34평 기준', unit: '식', qty: '1', price: '550000' },
                { div: '현관/전실', name: '현관/전실 철거 후 타일', spec: '타일 600*600 (쭈꾸미+타일) : 34평 기준 (철거/방수 별도)', unit: '식', qty: '1', price: '650000' },
                { div: '세탁실', name: '세탁실 바닥 (덧방)', spec: '타일 600*600 덧방 기준 : 34평 기준', unit: '식', qty: '1', price: '300000' },
                { div: '세탁실', name: '세탁실 바닥 철거 후 시공', spec: '타일 600*600 (쭈꾸미+타일) : 34평 기준 (철거/방수 별도)', unit: '식', qty: '1', price: '400000' },
                { div: '발코니', name: '발코니 바닥 (덧방)', spec: '타일 600*600 덧방 기준 : 34평 기준', unit: '식', qty: '1', price: '700000' },
                { div: '발코니', name: '발코니 바닥 철거 후 시공', spec: '타일 600*600 (쭈꾸미+타일) : 34평 기준 (철거/방수 별도)', unit: '식', qty: '1', price: '850000' },
                { div: '거실/주방/방', name: '포세린 타일 600*600', spec: '기본 바닥 수평+자재비+시공비 - 600*600 (줄눈 별도)', unit: 'py', qty: '1', price: '270000' },
                { div: '거실/주방/방', name: '포세린 타일 800*800', spec: '기본 바닥 수평+자재비+시공비 - 800*800 (줄눈 별도)', unit: 'py', qty: '1', price: '310000' },
                { div: '거실/주방/방', name: '폴리싱 타일 600*600', spec: '기본 바닥 수평+자재비+시공비 - 600*600 (줄눈 별도)', unit: 'py', qty: '1', price: '265000' },
                { div: '거실/주방/방', name: '폴리싱 타일 800*800', spec: '기본 바닥 수평+자재비+시공비 - 800*800 (줄눈 별도)', unit: 'py', qty: '1', price: '300000' }
            ],
            '11': [],
            '12': [
                { div: '도장', name: '뿜칠 도장 마감 (벽/천정)', spec: '줄퍼티+올퍼티+2회칠 (삼화 - 아이생각 4L 당 30헤베 2.9) - 국산', unit: 'm2', qty: '1', price: '50000' },
                { div: '도장', name: '뿜칠 도장 마감 (벽/천정)', spec: '줄퍼티+올퍼티+2회칠 (KCC - 숲으로 4L 당 30헤베 4.9) - 국산', unit: 'm2', qty: '1', price: '55000' },
                { div: '도장', name: '뿜칠 도장 마감 (벽/천정)', spec: '줄퍼티+올퍼티+2회칠 (노루 - 친환경 프리미엄 팬톤 5.1) - 국산', unit: 'm2', qty: '1', price: '55000' },
                { div: '도장', name: '뿜칠 도장 마감 (벽/천정)', spec: '줄퍼티+올퍼티+2회칠 (벤자민무어 4L 당 30헤베 12) - 수입', unit: 'm2', qty: '1', price: '80000' },
                { div: '도장', name: '뿜칠 도장 마감 (벽/천정)', spec: '줄퍼티+올퍼티+2회칠 (던에드워드 4L 당 30헤베 12) - 수입', unit: 'm2', qty: '1', price: '80000' },
                { div: '탄성', name: '세라믹코트', spec: '기능성 마감 도장 (전실 또는 현관 적합) 칸 추가 12만원', unit: '칸', qty: '1', price: '300000' },
                { div: '탄성', name: '월드클래스', spec: '결로에 취약한 부분 (발코니에 적합) 칸 추가 17만원', unit: '칸', qty: '1', price: '350000' },
                { div: '탄성', name: '제로스탑', spec: '습도 조절 및 유지 냄새 공기정화 기능 (세탁샐에 적합) 칸 추가 22만원', unit: '칸', qty: '1', price: '470000' },
                { div: '참고', name: '도장 참고사항', spec: '도장 기본 평당 15만원(수입산페인트 별도)', unit: 'py', qty: '1', price: '150000' }
            ],
            '13': [
                { div: '합지도배', name: '합지도배', spec: '(LX Z:IN,개나리,신화,제일)택 1. 벽벽지/천장지 통일시 자재비 추가.', unit: 'py', qty: '1', price: '100000' },
                { div: '실크도배 (기본)', name: '실크도배', spec: '(LX Z:IN,개나리,신화,제일)택 1. 벽벽지/천장지 통일시 자재비 추가.', unit: 'py', qty: '1', price: '120000' },
                { div: '실크프리미엄 (고급)', name: '실크프리미엄', spec: '(LX Z:IN,개나리,신화,제일)택 1. 벽벽지/천장지 통일시 자재비 추가.', unit: 'py', qty: '1', price: '140000' },
                { div: '무몰딩', name: '무몰딩 밑작업', spec: '무몰딩 밑작업', unit: '식', qty: '1', price: '400000' },
                { div: '무걸레받이', name: '무걸레받이 밑작업', spec: '무걸레받이 밑작업', unit: '식', qty: '1', price: '400000' },
                { div: '합지(일반) - 참고', name: '개나리벽지 (합지)', spec: '(LX Z:IN,개나리,신화,제일)택 1. 벽벽지/천장지 통일시 자재비 추가.', unit: 'py', qty: '1', price: '100000' },
                { div: '합지(일반) - 참고', name: '신화벽지 (합지 / 아이리스 / 파인하임)', spec: '(LX Z:IN,개나리,신화,제일)택 1. 벽벽지/천장지 통일시 자재비 추가.', unit: 'py', qty: '1', price: '100000' },
                { div: '합지(일반) - 참고', name: '제일벽지 (해피데이 / 센스)', spec: '(LX Z:IN,개나리,신화,제일)택 1. 벽벽지/천장지 통일시 자재비 추가.', unit: 'py', qty: '1', price: '100000' },
                { div: '합지(일반) - 참고', name: 'LX Z:IN (휘앙세)', spec: '(LX Z:IN,개나리,신화,제일)택 1. 벽벽지/천장지 통일시 자재비 추가.', unit: 'py', qty: '1', price: '100000' },
                { div: '실크 (기본) - 참고', name: '개나리 로하스+', spec: '(LX Z:IN,개나리,신화,제일)택 1. 벽벽지/천장지 통일시 자재비 추가.', unit: 'py', qty: '1', price: '120000' },
                { div: '실크 (기본) - 참고', name: '제일 베이직플러스', spec: '(LX Z:IN,개나리,신화,제일)택 1. 벽벽지/천장지 통일시 자재비 추가.', unit: 'py', qty: '1', price: '120000' },
                { div: '실크 (기본) - 참고', name: 'LX Z:IN 베스띠', spec: '(LX Z:IN,개나리,신화,제일)택 1. 벽벽지/천장지 통일시 자재비 추가.', unit: 'py', qty: '1', price: '120000' },
                { div: '실크 (고급) - 참고', name: '개나리 프리미엄 / 아트북 / 에비뉴', spec: '(LX Z:IN,개나리,신화,제일)택 1. 벽벽지/천장지 통일시 자재비 추가.', unit: 'py', qty: '1', price: '140000' },
                { div: '실크 (고급) - 참고', name: '신화 에상스 / 파사드', spec: '(LX Z:IN,개나리,신화,제일)택 1. 벽벽지/천장지 통일시 자재비 추가.', unit: 'py', qty: '1', price: '140000' },
                { div: '실크 (고급) - 참고', name: '제일 나무플러스 / 제이플래티넘', spec: '(LX Z:IN,개나리,신화,제일)택 1. 벽벽지/천장지 통일시 자재비 추가.', unit: 'py', qty: '1', price: '140000' },
                { div: '실크 (고급) - 참고', name: 'LX Z:IN 디아망', spec: '(LX Z:IN,개나리,신화,제일)택 1. 벽벽지/천장지 통일시 자재비 추가.', unit: 'py', qty: '1', price: '140000' }
            ],
            '14': [
                { div: '원목마루', name: '원목마루', spec: '', unit: 'py', qty: '1', price: '280000' },
                { div: '강마루', name: '동화 합판마루', spec: '10T 600*600', unit: 'py', qty: '1', price: '150000' },
                { div: '동화', name: '나투스진 그란데 / 이모션블랑(JG2012)', spec: '7T*325*810', unit: 'py', qty: '1', price: '110000' },
                { div: '강마루', name: '노바 플로', spec: '', unit: 'py', qty: '1', price: '140000' },
                { div: '노배', name: '노배 블랙라벨', spec: '7.5T*165*1200', unit: 'py', qty: '1', price: '120000' },
                { div: '동화', name: '비움190', spec: '', unit: 'py', qty: '1', price: '260000' },
                { div: 'LX 지인 에디톤', name: 'lx 에디톤 스톤', spec: '5t*450*900 - 솔티크림(EDT7725)', unit: 'py', qty: '1', price: '99000' },
                { div: '데코타일', name: 'LX 지인 데코타일', spec: 'LX 지인 보타닉 사각 600각 (3T*600*600)', unit: 'py', qty: '1', price: '45000' },
                { div: '장판', name: '장판', spec: '2.2T', unit: 'py', qty: '1', price: '60000' },
                { div: '장판', name: '장판', spec: '2.2T', unit: 'py', qty: '1', price: '70000' },
                { div: '장판', name: 'lx 컴포트', spec: '', unit: 'py', qty: '1', price: '150000' }
            ],
            '15': [],
            '16': [
                { div: '실리콘', name: '실리콘 마감', spec: '아덱스 실리콘 - 색맞춤 시공', unit: 'py', qty: '1', price: '13000' },
                { div: '빨래건조대', name: '빨래건조대 - 수동', spec: '스테인레스 봉 - 수동', unit: 'ea', qty: '1', price: '110000' },
                { div: '빨래건조대', name: '빨래건조대 - 전동', spec: '스테인레스 봉 - 수동', unit: 'ea', qty: '1', price: '300000' },
                { div: '준공청소', name: '준공청소', spec: '', unit: 'py', qty: '1', price: '20000' }
            ],
            '17': []
        };

        // 기본 메모 데이터
        const defaultCostMemos = {
            '01': '1. 행위허가가 필요한 경우는 구조나 외관, 설비 등에 영향을 주는 공사를 할 때 지자체에 사전 허가를 받아야 합니다.\n2. 행위허가 증명서 (필증) 발급시 반드시 승인에 따른 조건(갑종 방화문, 방화판 및 방화유리, 감지기)을 충족해야 합니다.\n3. 입주민 동의서를 받는 이유는 공사로 인해 발생할 수 있는 소음·진동·먼지·동선 제한 등의 불편을 사전에 알리고, 주변 거주자의 공식적인 \'동의\'를 받아 분쟁을 예방하기 위해입니다.\n4. 공사를 위해 엘리베이터 이용료(보증금) 및 주차 요금이 부담합니다.\n5. 공사 과정에서 발생하는 전기·수도 등의 공과금은 고객이 부담합니다.\n6. 엘리베이터 이용이 불가 또는 없는 세대는 추가 비용이 발생합니다.\n7. 유지 되는 항목(가구, 바닥재 등)은 보양이 필수이며 비용이 발생합니다.',
            '02': '1. 철거 전 재사용 항목에 대하여 사전에 문제(작동안됨, 찍힘, 오염 등) 부분이 필요합니다.\n2. 철거 항목에 없는 부분은 임의로 철거하지 않습니다. 철거 추가시 비용이 산출되어 추가금이 발생됩니다.\n3. 구조체(내력벽, 보, 기둥)는 임의 철거가 불가하며, 구조검토 없이 철거 시 안전사고 및 법적 책임이 발생합니다.\n4. 철거 시 발생하는 폐기물은 법적 기준에 따라 분리·처리해야 하며, 폐기물 처리 비용이 별도로 발생합니다.\n5. 층간 소음 및 진동이 심한 작업은 관리사무소 사전에 고지하며 지정 시간 내에 진행합니다.',
            '03': '1. 기존 배관 사용을 원칙으로 합니다.\n2. 배관(오수, 하수, 수도) 위치 변경 시 구배가 확보 되지 않으면 신발이 문에 걸릴 수 있습니다.\n3. 기존 배관 상태에 따라 교체가 권장될 수 있으며, 이때 반드시 공정 중간에 누수탐지를 실시합니다.\n4. 방수는 바닥뿐 아니라 벽체 일정 높이(H:1100이상)까지 시공해야 하며, 3차 방수까지 권장 드립니다.\n5. 방수 후 충분한 양생 기간(최소 24~48시간)을 확보 후 타일 시공을 진행 합니다.\n6. 외벽이 맞닿는 부분에 수도 배관 신설 시 동파 방지 및 단열 처리가 반드시 필요합니다.\n7. 가스 철거 및 신설은 면허 보유자가 진행 해야 합니다.',
            '04': '1. 발코니 확장은 행위허가 대상이며, 허가 조건(방화문, 단열 기준 등)을 충족해야 합니다.\n2. 확장 시 외부 노출면에 대한 단열 시공이 필수이며, 미흡 시 결로·곰팡이 발생의 원인이 됩니다.\n3. 단열재 종류 및 두께에 따라 시공비가 달라지며, 에너지 효율과 직결됩니다.\n4. 단열은 격자 방식으로 열교현상을 최소화 하며 이음부위는 반드시 테이핑 처리로 마감합니다.',
            '05': '1. 창호 교체는 외관 변경에 해당하여 아파트의 경우 관리규약 확인 및 동의 절차가 필요할 수 있습니다.\n2. 기존 창호 규격과 신규 창호 규격이 다를 경우 추가 마감 공사가 발생합니다.\n3. 창호 제작 기간(2~3주)을 공정에 반영해야 하며, 현장 실측 후 제작 진행합니다.\n4. 하자 발생 시 각 제조사 A/S 기준이 적용됩니다.\n5. 모든 창호 시공은 시방서에 준하여 시공됩니다.',
            '06': '1. 분전반 용량 및 차단기 구성을 확인하고, 필요시 증설 또는 교체를 진행합니다.\n2. 전선 규격은 사용 용량에 맞게 선정하며 노후 전선은 화재 위험이 있어 교체를 권장합니다.\n3. 조명 위치 변경 및 추가 시 천장 구조(콘크리트/석고보드)에 따라 시공 방법이 달라집니다.\n4. 매립 콘센트 및 스위치 위치는 도면 확정 후 변경이 어려우므로 사전 확정이 중요합니다.\n5. 욕실 등 습기 노출 공간은 방수형 콘센트 및 접지 시공을 필수로 진행합니다.',
            '07': '1. 시스템 에어컨 설치 시 천장 내부 공간 확보 여부를 사전에 확인해야 합니다.\n2. 배관 경로에 따라 에어컨 단내림 또는 배관 길(천장 박스 및 몰딩)의 시공에 따른 추가 비용이 발생할 수 있습니다.\n3. 배관 시공에 따른 철거 후 마감 및 에어컨 자리 보강에 따른 추가 비용이 발생할 수 있습니다.\n4. 실외기 설치 위치는 아파트 관리규약 및 구조적 제약을 확인 후 시공 여부를 결정합니다.\n5. 실외기실 신설시 별도 비용이 추가 됩니다.(루버창, 칸막이:단열-차음)\n6. 전기 용량 확인 후 전용 회로 배선이 필요할 수 있으며 추가 비용이 발생 됩니다.\n7. 에어컨 시공시 배관은 반드시 정품을 사용합니다.',
            '08': '1. 천장 및 벽체 목공 작업은 후속 공정(전기, 단열, 도장)과 연계되므로 정확한 순서 관리가 필요합니다.\n2. 도어 종류에 따라 제작 기간과 비용이 달라집니다.\n3. 도어 방향(열림/닫힘, 좌/우) 및 손잡이 위치는 시공 전 확정하며 도면 기준으로 시공합니다.\n4. 수축, 뒤틀림, 갈라짐을 방지하기 위해 목자재는 함수율 8~12% 기준의 자재만 사용합니다.\n5. 현장 제작 가구의 경우 합판 및 마감재 종류에 따라 품질 차이가 있습니다.\n6. 목자재는 절대 재사용품을 사용하지 않습니다.',
            '09': '1. 기존 가구나 도어에 필름 시공 시 표면 상태(들뜸, 손상)에 따라 결과물 품질이 달라집니다.\n2. 표면 상태가 좋지 않으면 필름 시공이 불가합니다.\n3. 필름 종류(무광, 유광, 우드, 메탈 등)에 따라 내구성 및 단가가 상이합니다.\n4. 모서리, 곡면, 모양 부위는 시간 경과에 따라 들뜸이 발생할 수 있습니다.\n5. 도어의 경우 문양 부분을 없애고 민자모양을 만들기 위해 핸디작업은 필수이며 사용자의 환경에 따라 문제가 발생할 수 있습니다.\n6. 기존 필름 자리가 페인트나 무늬목의 경우 밑작업 비용이 발생합니다.\n7. 상업공간의 경우 반드시 방화필름을 사용해야 합니다.',
            '10': '1. 타일 규격 및 패턴에 따라 시공 난이도와 비용이 달라지며, 대형 타일은 할증이 적용됩니다.\n2. 바닥 타일 시공 시 구배 방향을 확인하고, 배수구 방향으로 물 흐름이 원활하도록 시공합니다.\n3. 줄눈 색상 타일과 함께 선정하며 시멘트 줄눈을 기본으로 사용하며 백화현상은 자연스러운 현상입니다.\n4. 우레탄 또는 케라폭시 줄눈은 별도 비용이 발생됩니다.\n5. 벽타일과 바닥타일 접합부, 코너 방식(ㄱ자, 몰딩 등) 또는 졸리컷 방식 중 마감을 사전에 결정 후 진행합니다.\n6. 모든 타일은 크기가 균일하지 않고 불균형하며 오차범위에 따른 불량 자재가 아닙니다.',
            '11': '',
            '12': '1. 도장 전 하지 처리(퍼티, 샌딩)가 품질을 좌우하며, 크랙 및 요철 부위는 보수 후 진행합니다.\n2. 도장 횟수(초벌, 중벌, 정벌)에 따라 마감 품질이 달라지며, 최소 2회 이상 진행합니다.\n3. 페인트 종류(수성, 유성, 친환경)에 따라 건조 시간, 냄새, 내구성이 상이합니다.\n4. 도장 작업 중에는 환기를 충분히 하고, 타 공정 작업자 및 고객의 출입을 제한합니다.\n5. 천장, 벽체 등 적합한 도료를 선정 하며, 색상은 샘플 확인 후 결정 후 도면에 표기합니다.',
            '13': '1. 도배 전 벽면 상태(곰팡이, 크랙, 습기)를 확인하고, 필요시 보수 곰팡이 제거제를 실행하며 상황에 따라 추가비용이 발생할 수 있습니다.\n2. 벽지 종류(실크, 합지, 천연)에 따라 시공 방법 및 단가가 달라집니다.\n3. 도배 후 24~48시간 환기를 자제하고 급격한 온도 변화를 피해야 벽지 들뜸을 방지합니다. 고객님 현장방문을 자제 바랍니다.\n4. 곰팡이 이력이 있는 벽면은 단순 도배로 해결되지 않으며, 원인(결로, 누수) 해결(단열)이 선행되어야 합니다.\n5. 에어컨, 조명 설치 부위는 도배 전 확정하여 마감 손상을 방지합니다.',
            '14': '1. 바닥재 종류(강마루, 강화마루, 온돌마루, 데코타일, 장판 등)에 따라 시공 방법과 하지 조건이 다릅니다.\n2. 기존 바닥재 위 덧방 시공은 하지 않습니다. 이는 레벨 상승 및 문턱 간섭 또는 하자를 유발시킵니다.\n3. 바닥재 시공 전 바닥 레벨(평활도)을 확인하고, 불량 시 셀프 레벨링 작업을 진행해야하며 이때 추가 비용이 발생할 수 있습니다.\n4. 공용부 바닥이랑 내부 방 바닥 레벨 높이가 다를 경우 샌딩작업으로 면 맞춤으로 진행하며 이때 추가금 이발생 됩니다.\n5. 데코타일 및 장판 시공의 경우 무거운 물건에 의한 눌림 자국 및 찍힘으로 가구공사 이후에 진행 합니다.',
            '15': '1. 제작 가구와 시스템 가구의 특성을 이해하고, 공간 및 예산에 맞게 선택 진행합니다.\n2. 가구 제작 기간은 보통 1~2주 제작 기간이 필요하며, 무늬목 또는 도장의 경우 2~4주 공정에 반영해야 합니다.\n3. 가구도면이 완성되고 실측이후 제작이 실행되면 도면 변경이 불가하면 고객님 요청에 의한 변경은 추가금이 발생될 수 있습니다.\n4. 붙박이장, 신발장 등 설치 시 벽체 보강 여부를 확인하고, 필요시 합판 보강에 따른 비용이 발생할 수 있습니다.\n5. 가구 도어 종류(여닫이, 슬라이딩)에 따라 레일 및 손잡이 등 부자재가 종류 달라지며 부자재 브랜드에 따라 비용이 변경됩니다.\n6. 주방 가구는 가전 규격(냉장고, 빌트인 기기)과 설비 위치를 사전(공사 이전)에 확정해야 공사가 원활하며 문제 발생을 차단됩니다.',
            '16': '1. 인터폰, 손잡이, 현관 중문, 발코니 빨래건조대 등 부자재 설치는 최종 마감 단계에서 진행합니다.\n2. 전체 공간 청소(입주 청소)는 공사 완료 후 진행하며, 별도 비용이 발생합니다.\n3. 실리콘 마감 부위(욕실, 주방, 창호 주변)는 청소 이후 시행되며 완전히 경화가 완료된 이후 사용이 가능합니다.\n4. 하자 점검은 입주 전 시행하며, 발견된 하자는 보수 완료 후 인수인계를 진행합니다.',
            '17': '1. 공사 중 예상치 못한 추가 공사(배관 누수 발견, 마감재 손상 등)가 발생할 수 있으며, 별도 협의 후 진행합니다.\n2. 고객 요청에 의한 설계 변경은 공정 지연 및 추가 비용의 원인이 됩니다.\n3. 고객님 별도 공사로 인하여 잔재물 처리 및 폐기물 발생시 반출에 따른 비용이 발생합니다.\n4. 공사 완료 후 하자 보수 기간 및 범위는 계약서에 명시된 조건에 따릅니다.\n5. A/S 접수 및 처리 절차는 계약 시 안내드리며, 하자와 사용자 과실을 구분하여 처리합니다.'
        };

        const statusLabels = {
            consulting: '상담중',
            hold: '보류(고민중)',
            budget_over: '예산초과(미계약)',
            other_company: '타업체선정(미계약)',
            contracted: '계약완료',
            in_progress: '공사중',
            completed: '공사완료',
            as_done: 'A/S'
        };

        let customers = JSON.parse(localStorage.getItem('dz_customers') || '[]');
        let currentCustomerId = null;
        let currentData = {};
        let currentStatusFilter = 'all';
        let cachedCloudCount = customers.length; // 클라우드 고객 수 캐시 (동기화 시 업데이트)

        // ========== 다중 관리자 시스템 ==========
        // ========== 다중 관리자 시스템 ==========
        // 설정값은 admin_config.js 에서 로드됨


        // 일반관리자 목록 (localStorage + 클라우드 동기화)
        function getRegularAdmins() {
            return JSON.parse(localStorage.getItem('dz_regular_admins') || '[]');
        }

        function saveRegularAdmins(admins) {
            localStorage.setItem('dz_regular_admins', JSON.stringify(admins));
        }

        // 관리자 클라우드 동기화 - 불러오기
        async function syncAdminsFromCloud() {
            try {
                const response = await fetch(CUSTOMER_SYNC_URL + '?sheet=관리자');
                if (response.ok) {
                    const cloudAdmins = await response.json();
                    if (Array.isArray(cloudAdmins) && cloudAdmins.length > 0) {
                        saveRegularAdmins(cloudAdmins);
                        console.log('✅ [Admin Sync] 관리자 동기화 완료:', cloudAdmins.length + '명');
                        return cloudAdmins;
                    }
                }
            } catch (e) {
                console.warn('관리자 동기화 실패:', e);
            }
            return getRegularAdmins();
        }

        // 관리자 클라우드 동기화 - 저장
        async function syncAdminToCloud(adminData) {
            try {
                const response = await fetch(CUSTOMER_SYNC_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain 사용 (CORS 회피)
                    body: JSON.stringify({
                        action: 'admin',
                        data: adminData
                    })
                });
                const result = await response.json();
                console.log('✅ [Admin Sync] 관리자 저장 완료:', result);
                return result;
            } catch (e) {
                console.error('관리자 저장 실패:', e);
                return null;
            }
        }

        // 관리자 클라우드 삭제
        async function deleteAdminFromCloud(adminId) {
            try {
                const response = await fetch(CUSTOMER_SYNC_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'deleteAdmin',
                        adminId: adminId
                    })
                });
                return await response.json();
            } catch (e) {
                console.error('관리자 삭제 실패:', e);
                return null;
            }
        }

        // 현재 로그인한 관리자
        let currentAdmin = null; // { id, role: 'main' | 'regular' }

        // 권한 체크 함수
        function isLoggedIn() {
            return currentAdmin !== null;
        }

        function isMainAdmin() {
            return currentAdmin && currentAdmin.role === 'main';
        }

        function isCreator(customer) {
            if (!currentAdmin) return false;
            // Legacy support: if no createdBy, default to Main Admin
            if (!customer.createdBy) return isMainAdmin();
            return customer.createdBy === currentAdmin.id;
        }

        function canEdit(customer) {
            if (!customer) customer = currentData;
            if (!currentAdmin) return false;
            if (isMainAdmin()) return true;
            if (customer.isLocked && !customer.unlockedForSession) return false;
            return isCreator(customer);
        }

        function canDelete(customer) {
            return canEdit(customer);
        }

        function isCustomerLocked() {
            if (!currentData || !currentData.isLocked) return false;
            if (isMainAdmin()) return false;
            if (currentData.unlockedForSession) return false;
            return true;
        }

        function unlockCustomerAccess() {
            const pw = document.getElementById('lockedPasswordInput').value;
            if (pw === '6454') {
                currentData.unlockedForSession = true;
                document.getElementById('accessDeniedOverlay').style.display = 'none';
                showToast('접근이 허용되었습니다', 'success');
                document.getElementById('lockedPasswordInput').value = '';
            } else {
                showToast('비밀번호가 일치하지 않습니다', 'error');
            }
        }

        function showTrashModal() {
            if (!isMainAdmin()) {
                showToast('메인관리자만 접근 가능합니다', 'error');
                return;
            }
            const trashItems = customers.filter(c => c.status === 'trash');
            const listEl = document.getElementById('trashList');
            listEl.innerHTML = '';
            if (trashItems.length === 0) {
                listEl.innerHTML = '<div style="padding:20px; text-align:center; color:#86868b;">휴지통이 비었습니다</div>';
            } else {
                trashItems.forEach(c => {
                    const div = document.createElement('div');
                    div.className = 'trash-item';
                    div.innerHTML = `
                        <div>
                            <div style="font-weight:600;">${c.clientName || '(이름없음)'}</div>
                            <div style="font-size:11px; color:#86868b;">
                                삭제: ${c.deletedAt?.split('T')[0] || '-'} (${c.deletedBy || '?'})
                            </div>
                        </div>
                        <div class="trash-actions">
                            <button onclick="restoreCustomer('${c.customerId}')" style="padding:4px 8px; border:1px solid #ddd; background:#fff; border-radius:4px; font-size:11px; cursor:pointer;">복원</button>
                            <button onclick="permanentDeleteCustomer('${c.customerId}')" style="padding:4px 8px; border:1px solid #ff3b30; background:#ff3b30; color:#fff; border-radius:4px; font-size:11px; cursor:pointer;">영구삭제</button>
                        </div>
                    `;
                    listEl.appendChild(div);
                });
            }
            document.getElementById('trashModal').classList.add('show');
        }

        function closeTrashModal() {
            document.getElementById('trashModal').classList.remove('show');
        }

        function restoreCustomer(id) {
            const index = customers.findIndex(c => c.customerId === id);
            if (index !== -1) {
                customers[index].status = 'consulting';
                delete customers[index].deletedAt;
                delete customers[index].deletedBy;
                saveCustomers();
                showToast('고객이 복원되었습니다', 'success');
                showTrashModal();
                updateCustomerList();
            }
        }

        function permanentDeleteCustomer(id) {
            if (!confirm('정말로 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
            const index = customers.findIndex(c => c.customerId === id);
            if (index !== -1) {
                customers.splice(index, 1);
                saveCustomers();
                showToast('영구 삭제되었습니다', 'success');
                showTrashModal();
            }
        }

        function canWrite() {
            return currentAdmin !== null;
        }

        function canManageAdmins() {
            return currentAdmin?.role === 'main';
        }

        // Google Sheets GAS URL


        // 관리자 모달 표시
        function showAdminModal() {
            document.getElementById('adminModal').classList.add('show');
            document.getElementById('adminId').value = '';
            document.getElementById('adminPassword').value = '';
            document.getElementById('adminId').focus();
        }

        function closeAdminModal() {
            document.getElementById('adminModal').classList.remove('show');
        }

        function closePasswordModal() {
            document.getElementById('passwordModal').classList.remove('show');
        }

        // 삭제 비밀번호 모달 표시
        function showDeletePasswordModal(callback) {
            window.pendingDeleteCallback = callback;
            document.getElementById('deletePasswordModal').classList.add('show');
            document.getElementById('deletePassword').value = '';
            document.getElementById('deletePassword').focus();
        }

        function closeDeletePasswordModal() {
            document.getElementById('deletePasswordModal').classList.remove('show');
            window.pendingDeleteCallback = null;
        }

        function confirmDeletePassword() {
            const inputPw = document.getElementById('deletePassword').value;
            if (inputPw === DELETE_PASSWORD) {
                closeDeletePasswordModal();
                if (window.pendingDeleteCallback) {
                    window.pendingDeleteCallback();
                }
            } else {
                showToast('삭제 비밀번호가 틀렸습니다', 'error');
                document.getElementById('deletePassword').value = '';
                document.getElementById('deletePassword').focus();
            }
        }

        // 관리자 관리 모달
        function showAdminManagerModal() {
            if (!isMainAdmin()) {
                showToast('메인관리자만 접근 가능합니다', 'error');
                return;
            }
            document.getElementById('adminManagerModal').classList.add('show');
            renderRegularAdminList();
        }

        function closeAdminManagerModal() {
            document.getElementById('adminManagerModal').classList.remove('show');
        }

        function renderRegularAdminList() {
            const admins = getRegularAdmins();
            const container = document.getElementById('regularAdminList');
            if (admins.length === 0) {
                container.innerHTML = '<div style="color:#86868b;text-align:center;padding:20px;">등록된 일반관리자가 없습니다</div>';
            } else {
                container.innerHTML = admins.map((admin, i) => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #e8e8ed;">
                        <span>👤 ${admin.id}</span>
                        <button class="btn btn-secondary btn-sm" onclick="removeRegularAdmin(${i})" style="color:#ff3b30;">삭제</button>
                    </div>
                `).join('');
            }
        }

        async function addRegularAdmin() {
            const id = document.getElementById('newAdminId').value.trim();
            const pw = document.getElementById('newAdminPw').value;

            if (!id || !pw) {
                showToast('아이디와 비밀번호를 입력하세요', 'error');
                return;
            }

            if (id === MAIN_ADMIN.id) {
                showToast('메인관리자 ID는 사용할 수 없습니다', 'error');
                return;
            }

            const admins = getRegularAdmins();
            if (admins.some(a => a.id === id)) {
                showToast('이미 존재하는 아이디입니다', 'error');
                return;
            }

            const newAdmin = {
                id,
                password: pw,
                name: id,
                createdAt: new Date().toISOString()
            };

            admins.push(newAdmin);
            saveRegularAdmins(admins);

            // 클라우드 동기화
            syncAdminToCloud(newAdmin);

            document.getElementById('newAdminId').value = '';
            document.getElementById('newAdminPw').value = '';
            renderRegularAdminList();
            showToast(`일반관리자 '${id}' 추가됨 (클라우드 동기화)`, 'success');
        }

        async function removeRegularAdmin(index) {
            if (!confirm('이 관리자를 삭제하시겠습니까?')) return;
            const admins = getRegularAdmins();
            const removed = admins.splice(index, 1)[0];
            saveRegularAdmins(admins);

            // 클라우드에서도 삭제
            deleteAdminFromCloud(removed.id);

            renderRegularAdminList();
            showToast(`관리자 '${removed.id}' 삭제됨 (클라우드 동기화)`, 'success');
        }

        // 오버레이 로그인 처리
        function performLogin() {
            const inputId = document.getElementById('loginId').value.trim();
            const inputPw = document.getElementById('loginPw').value;

            // 메인관리자 확인
            console.log('Login Attempt:', inputId, inputPw);
            console.log('Expected:', MAIN_ADMIN);
            if (inputId === MAIN_ADMIN.id && inputPw === MAIN_ADMIN.password) {
                currentAdmin = { id: MAIN_ADMIN.id, role: 'main' };
                document.getElementById('loginOverlay').style.display = 'none';
                activateAdminMode();
                showToast('메인관리자로 로그인되었습니다', 'success');
                return;
            }

            // 일반관리자 확인
            const admins = getRegularAdmins();
            const found = admins.find(a => a.id === inputId && a.password === inputPw);
            if (found) {
                currentAdmin = { id: found.id, role: 'regular' };
                document.getElementById('loginOverlay').style.display = 'none';
                activateAdminMode();
                showToast('관리자로 로그인되었습니다', 'success');
                return;
            }

            showToast('아이디 또는 비밀번호가 틀렸습니다', 'error');
            document.getElementById('loginPw').value = '';
            document.getElementById('loginPw').focus();
        }

        // 관리자 로그인
        function loginAdmin() {
            const inputId = document.getElementById('adminId').value.trim();
            const inputPw = document.getElementById('adminPassword').value;

            // 메인관리자 확인
            if (inputId === MAIN_ADMIN.id && inputPw === MAIN_ADMIN.password) {
                currentAdmin = { id: MAIN_ADMIN.id, role: 'main' };
                closeAdminModal();
                activateAdminMode();
                showToast('메인관리자로 로그인되었습니다', 'success');
                return;
            }

            // 일반관리자 확인
            const admins = getRegularAdmins();
            const found = admins.find(a => a.id === inputId && a.password === inputPw);
            if (found) {
                currentAdmin = { id: found.id, role: 'regular' };
                closeAdminModal();
                activateAdminMode();
                showToast('관리자로 로그인되었습니다', 'success');
                return;
            }

            showToast('아이디 또는 비밀번호가 틀렸습니다', 'error');
            document.getElementById('adminPassword').value = '';
            document.getElementById('adminPassword').focus();
        }

        // 관리자 모드 활성화
        function activateAdminMode() {
            const roleLabel = isMainAdmin() ? '🔑 메인관리자' : '👤 관리자';
            const adminId = currentAdmin?.id || '';

            // UI 업데이트
            document.getElementById('adminBadge').className = 'admin-badge admin';
            document.getElementById('adminBadge').innerHTML = `${roleLabel}: ${adminId}`;

            let statusHTML = `
                <span class="admin-badge admin" id="adminBadge">${roleLabel}: ${adminId}</span>
                <button class="admin-login-btn" onclick="logoutAdmin()">로그아웃</button>
            `;

            // 메인관리자만 관리자 관리 버튼 표시
            if (isMainAdmin()) {
                statusHTML += `<button class="admin-login-btn" onclick="showAdminManagerModal()" style="margin-left:5px;">👥 관리자 관리</button>`;
            }

            document.getElementById('adminStatus').innerHTML = statusHTML;

            // 휴지통 버튼 (메인관리자 전용)
            const trashBtn = document.getElementById('trashBtn');
            if (trashBtn) {
                trashBtn.style.display = isMainAdmin() ? 'flex' : 'none';
            }

            // 원가관리표 잠금 해제
            document.getElementById('costLockOverlay').style.display = 'none';
            document.getElementById('costCategoriesWrapper').classList.remove('cost-locked');
            document.getElementById('adminSettings').style.display = 'block';

            // 역할에 따른 탭 가시성 업데이트
            updateTabVisibility();
        }

        // 역할에 따른 탭 가시성 업데이트
        function updateTabVisibility() {
            const mainOnly = isMainAdmin();

            // 메인관리자만 볼 수 있는 탭 처리 (원가관리표, 통계)
            document.querySelectorAll('.customer-tab[data-main-only="true"]').forEach(tab => {
                tab.style.display = mainOnly ? '' : 'none';
            });

            // 통계 패널도 숨기기
            const statsPanel = document.getElementById('panel-stats');
            if (statsPanel) {
                statsPanel.style.display = mainOnly ? '' : 'none';
            }

            // 원가관리표 패널도 숨기기
            const costPanel = document.getElementById('panel-cost');
            if (costPanel) {
                costPanel.style.display = mainOnly ? '' : 'none';
            }

            // 일반관리자가 숨겨진 탭을 보고 있다면 고객정보 탭으로 이동
            if (!mainOnly) {
                const activeTab = document.querySelector('.customer-tab.active');
                if (activeTab && activeTab.dataset.mainOnly === 'true') {
                    showCustomerTab('info');
                }
            }
        }

        // 관리자 로그아웃
        function logoutAdmin() {
            currentAdmin = null;

            // 로그인 오버레이 표시
            const overlay = document.getElementById('loginOverlay');
            if (overlay) {
                overlay.style.display = 'flex';
                document.getElementById('loginId').value = '';
                document.getElementById('loginPw').value = '';
                document.getElementById('loginId').focus();
            }

            // UI 초기화 (필요시)
            document.getElementById('adminStatus').innerHTML = '';

            // 원가관리표 잠금
            document.getElementById('costLockOverlay').style.display = 'flex';
            document.getElementById('costCategoriesWrapper').classList.add('cost-locked');
            document.getElementById('adminSettings').style.display = 'none';

            // 탭 가시성 업데이트
            updateTabVisibility();

            showToast('로그아웃되었습니다', 'success');
        }

        // 비밀번호 변경 (기능 비활성화)
        function changeAdminPassword() {
            showToast('비밀번호 변경은 관리자 관리 메뉴에서 가능합니다.', 'error');
        }

        // 관리자 모드 체크 (저장 시)
        function checkAdminForSave() {
            if (!isLoggedIn()) {
                // 원가관리표는 저장하지 않음 (전역 데이터이므로)
                return false;
            }
            return true;
        }

        // 잠금 상태 체크
        // 잠금 UI 업데이트
        function updateLockUI() {
            const lockBtn = document.getElementById('lockToggleBtn');
            const createdBySpan = document.getElementById('headerCreatedBy');

            if (lockBtn) {
                const isLocked = currentData && currentData.isLocked;
                lockBtn.className = 'lock-toggle-btn ' + (isLocked ? 'locked' : 'unlocked');
                lockBtn.innerHTML = isLocked ? '🔒 잠금' : '🔓 열림';
                lockBtn.title = isLocked ? '잠금 해제' : '잠금 설정';
            }

            if (createdBySpan) {
                createdBySpan.textContent = `📝 ${currentData?.createdBy || '-'}`;
            }
        }

        // 잠금 토글
        function toggleCustomerLock() {
            if (!currentCustomerId) return;

            // Only Main Admin can toggle
            if (!isMainAdmin()) {
                showToast('메인관리자만 잠금 상태를 변경할 수 있습니다', 'error');
                return;
            }

            currentData.isLocked = !currentData.isLocked;
            // Clear session unlock if re-locking
            if (currentData.isLocked) {
                delete currentData.unlockedForSession;
            }

            // Sync back to customers array
            const idx = customers.findIndex(c => c.customerId === currentCustomerId);
            if (idx !== -1) {
                customers[idx].isLocked = currentData.isLocked;
            }

            saveCustomers();
            updateLockUI();
            showToast(currentData.isLocked ? '고객 정보가 잠금 처리되었습니다' : '잠금이 해제되었습니다', 'success');
        }


        // 글씨 크기 조절
        function changeFontSize(size) {
            document.documentElement.style.setProperty('--font-size-base', size + 'px');
            document.getElementById('fontSizeValue').textContent = size + 'px';
            localStorage.setItem('designzig_fontsize', size);
        }

        function loadFontSize() {
            const savedSize = localStorage.getItem('designzig_fontsize') || '12';
            document.getElementById('fontSizeSlider').value = savedSize;
            document.getElementById('fontSizeValue').textContent = savedSize + 'px';
            document.documentElement.style.setProperty('--font-size-base', savedSize + 'px');
        }

        document.addEventListener('DOMContentLoaded', async function () {
            loadFontSize();
            createCostCategories();
            createEstimateCategories();
            createCoverTable();
            initYearFilter();
            updateCustomerList();

            // 관리자 계정 클라우드 동기화 (백그라운드)
            syncAdminsFromCloud().then(() => {
                console.log('✅ 관리자 계정 동기화 완료');
            });
        });

        // 토스트 알림
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            const icon = document.getElementById('toastIcon');
            const msg = document.getElementById('toastMessage');

            toast.className = 'toast show ' + type;
            icon.textContent = type === 'success' ? '✓' : '✕';
            msg.textContent = message;

            setTimeout(() => { toast.classList.remove('show'); }, 2500);
        }

        // 상태 필터
        function setStatusFilter(status) {
            currentStatusFilter = status;
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.status === status);
            });
            updateCustomerList();
        }

        function showCustomerTab(tabId) {
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.customer-tab').forEach(t => t.classList.remove('active'));

            const panel = document.getElementById('panel-' + tabId);
            if (panel) panel.classList.add('active');

            // Find the button and add active class
            const buttons = document.querySelectorAll('.customer-tab');
            buttons.forEach(btn => {
                if (btn.getAttribute('onclick').includes(`'${tabId}'`)) {
                    btn.classList.add('active');
                }
            });

            syncAllFields();
            if (tabId === 'estimate') updateEstimateFromCost();
            if (tabId === 'schedule') loadScheduleForCustomer();
        }

        let scheduleRows = [];
        const defaultScheduleSteps = [
            { name: "디자인 상담 및 설계", inCharge: "" },
            { name: "민원 접수 및 보양", inCharge: "" },
            { name: "보존 상태 확인", inCharge: "" },
            { name: "가구 철거", inCharge: "" },
            { name: "마루 철거", inCharge: "" },
            { name: "일반 철거", inCharge: "" },
            { name: "설비", inCharge: "" },
            { name: "1차 방수", inCharge: "" },
            { name: "창호", inCharge: "" },
            { name: "2차 방수", inCharge: "" },
            { name: "시스템 에어컨 선배관", inCharge: "" },
            { name: "전기 배선", inCharge: "" },
            { name: "3차 방수", inCharge: "" },
            { name: "목공/도어", inCharge: "" },
            { name: "현장정리", inCharge: "" },
            { name: "타일", inCharge: "" },
            { name: "화장실 천장 돔", inCharge: "" },
            { name: "필름", inCharge: "" },
            { name: "도어락 설치", inCharge: "" },
            { name: "바닥재 시공", inCharge: "" },
            { name: "도배", inCharge: "" },
            { name: "인터폰 설치", inCharge: "" },
            { name: "도장(탄성)", inCharge: "" },
            { name: "가구(주방)", inCharge: "" },
            { name: "가구(붙박이장/신발장)", inCharge: "" },
            { name: "전기(조명/스위치/콘센트/실링팬)", inCharge: "" },
            { name: "온도조절기", inCharge: "" },
            { name: "도기/수전", inCharge: "" },
            { name: "시스템 에어컨 기계 설치", inCharge: "" },
            { name: "중문", inCharge: "" },
            { name: "최종마감/검수", inCharge: "" },
            { name: "준공청소", inCharge: "" },
            { name: "최종 마감", inCharge: "" },
            { name: "인수인계", inCharge: "" }
        ];

        function loadScheduleForCustomer() {
            // Notion 통합 제거됨

            if (currentData.schedules && currentData.schedules.length > 0) {
                scheduleRows = [...currentData.schedules];
            } else {
                scheduleRows = defaultScheduleSteps.map(s => ({
                    id: Date.now() + Math.random(),
                    name: s.name,
                    start: '',
                    end: '',
                    inCharge: s.inCharge || '',
                    memo: ''
                }));
            }
            renderScheduleTable();

            // 모든 연동 필드 업데이트
            syncAllFields();
        }

        // fetchNotionProjects 함수 제거됨 (Notion 통합 제거)

        function renderScheduleTable() {
            const tbody = document.getElementById('scheduleTableBody');
            const empty = document.getElementById('scheduleEmptyState');
            if (!tbody) return;

            if (scheduleRows.length === 0) {
                tbody.innerHTML = '';
                empty.style.display = 'block';
                return;
            }

            empty.style.display = 'none';
            tbody.innerHTML = scheduleRows.map((row, index) => `
                <tr draggable="true" 
                    ondragstart="handleDragStart(event, ${index})" 
                    ondragover="handleDragOver(event)" 
                    ondrop="handleDrop(event, ${index})" 
                    ondragend="handleDragEnd(event)"
                    style="cursor:move; transition: background 0.2s;">
                    <td style="text-align:center; padding:10px; border:1px solid #d2d2d7; font-size:12px;">${index + 1}</td>
                    <td style="padding:5px; border:1px solid #d2d2d7;">
                        <input type="text" value="${row.name}" class="customer-field" style="width:100%; border:none; background:transparent; font-size:12px; padding:5px;" onchange="updateScheduleRow(${index}, 'name', this.value)">
                    </td>
                    <td style="padding:5px; border:1px solid #d2d2d7;">
                        <input type="date" value="${row.start || ''}" class="customer-field" style="width:100%; border:none; background:transparent; font-size:12px; padding:5px;" onchange="handleStartDateChange(${index}, this.value)">
                    </td>
                    <td style="padding:5px; border:1px solid #d2d2d7;">
                        <input type="date" value="${row.end || ''}" class="customer-field" style="width:100%; border:none; background:transparent; font-size:12px; padding:5px;" onchange="updateScheduleRow(${index}, 'end', this.value)">
                    </td>
                    <td style="padding:5px; border:1px solid #d2d2d7;">
                        <input type="text" value="${row.inCharge || ''}" class="customer-field" style="width:100%; border:none; background:transparent; font-size:12px; padding:5px;" onchange="updateScheduleRow(${index}, 'inCharge', this.value)" placeholder="담당자">
                    </td>
                    <td style="padding:5px; border:1px solid #d2d2d7;">
                        <input type="text" value="${row.memo || ''}" class="customer-field" style="width:100%; border:none; background:transparent; font-size:12px; padding:5px;" onchange="updateScheduleRow(${index}, 'memo', this.value)" placeholder="비고 항목">
                    </td>
                    <td style="text-align:center; padding:5px; border:1px solid #d2d2d7;">
                        <button class="btn btn-secondary btn-sm" onclick="moveScheduleRow(${index}, -1)" style="padding:2px 4px;">▲</button>
                        <button class="btn btn-secondary btn-sm" onclick="moveScheduleRow(${index}, 1)" style="padding:2px 4px;">▼</button>
                        <button class="btn btn-secondary btn-sm" onclick="removeScheduleRow(${index})" style="padding:2px 4px; color:#ff3b30;">✕</button>
                    </td>
                </tr>
            `).join('');
        }

        function addScheduleRow() {
            scheduleRows.push({
                id: Date.now() + Math.random(),
                name: '',
                start: '',
                end: '',
                inCharge: '',
                memo: ''
            });
            renderScheduleTable();
            saveScheduleToCustomer();
        }

        function removeScheduleRow(index) {
            if (!confirm('기록을 삭제하시겠습니까?')) return;
            scheduleRows.splice(index, 1);
            renderScheduleTable();
            saveScheduleToCustomer();
        }

        function updateScheduleRow(index, field, value) {
            scheduleRows[index][field] = value;
            saveScheduleToCustomer();
        }

        // 시작일 변경 시 종료일 자동 채우기
        function handleStartDateChange(index, value) {
            scheduleRows[index]['start'] = value;

            // 종료일이 비어있으면 시작일과 동일하게 설정
            if (!scheduleRows[index]['end'] && value) {
                scheduleRows[index]['end'] = value;
                renderScheduleTable(); // 테이블 다시 렌더링하여 종료일 표시
            }

            saveScheduleToCustomer();
        }

        function moveScheduleRow(index, delta) {
            const newIndex = index + delta;
            if (newIndex < 0 || newIndex >= scheduleRows.length) return;
            const item = scheduleRows.splice(index, 1)[0];
            scheduleRows.splice(newIndex, 0, item);
            renderScheduleTable();
            saveScheduleToCustomer();
        }

        function saveScheduleToCustomer() {
            currentData.schedules = [...scheduleRows];
            syncAllFields();
        }

        // syncScheduleToNotion 함수 제거됨 (Notion 통합 제거)

        // Drag & Drop
        let draggedIndex = null;
        function handleDragStart(e, index) {
            draggedIndex = index;
            e.target.style.opacity = '0.4';
        }
        function handleDragEnd(e) {
            e.target.style.opacity = '1';
            draggedIndex = null;
        }
        function handleDragOver(e) {
            e.preventDefault();
        }
        function handleDrop(e, index) {
            e.preventDefault();
            if (draggedIndex === null || draggedIndex === index) return;
            const item = scheduleRows.splice(draggedIndex, 1)[0];
            scheduleRows.splice(index, 0, item);
            renderScheduleTable();
            saveScheduleToCustomer();
        }


        function syncAllFields() {
            document.querySelectorAll('.synced-input').forEach(field => {
                field.value = currentData[field.dataset.sync] || '';
            });
            document.querySelectorAll('.synced-display').forEach(field => {
                field.textContent = currentData[field.dataset.sync] || '-';
            });
            const rep = document.getElementById('companyRep');
            if (rep) {
                document.querySelectorAll('.company-sync').forEach(f => f.value = rep.value);
            }
        }

        function saveCustomers() {
            localStorage.setItem('dz_customers', JSON.stringify(customers));
        }

        function newCustomer() {
            if (!isLoggedIn()) {
                showToast('관리자 로그인이 필요합니다', 'error');
                showAdminModal();
                return;
            }
            const name = prompt('고객명을 입력하세요:');
            if (!name) {
                showToast('고객명을 입력해주세요', 'error');
                return;
            }

            // 캐시된 고객 수 사용 (동기화 시 업데이트됨)
            // API 호출 없이 즉시 ID 생성
            const cloudCount = cachedCloudCount;

            const now = new Date();
            const yy = now.getFullYear().toString().slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');

            // Google Sheets 고객 수 + 1
            const seq = String(cloudCount + 1).padStart(3, '0');
            currentCustomerId = `${yy}${mm}${dd}-${seq}`;
            currentData = {
                customerId: currentCustomerId,
                clientName: name,  // 입력받은 고객명 저장
                projectName: '',   // 현장명은 비워둠 (요청 사항)
                status: 'consulting',
                createdAt: new Date().toISOString().split('T')[0],
                profitRate: '15%',
                createdBy: currentAdmin?.id || 'unknown',  // 작성자 관리자 ID
                isLocked: false  // 잠금 상태
            };

            // 고객 목록에 즉시 추가
            customers.push({ ...currentData });
            cachedCloudCount++; // 캐시 업데이트
            localStorage.setItem('dz_customers', JSON.stringify(customers));
            document.querySelectorAll('.customer-field').forEach(f => {
                f.value = f.dataset.field === 'profitRate' ? '15%' : '';
            });
            document.getElementById('customerStatus').value = 'consulting';
            document.getElementById('asEndDateDisplay').style.display = 'none';
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('customerView').style.display = 'block';
            document.getElementById('headerCustomerName').textContent = '신규 고객';
            document.getElementById('headerCustomerId').textContent = currentCustomerId;
            // 이미 customers에 추가되었으므로 고객명 필드에도 설정
            const clientNameField = document.querySelector('.customer-field[data-field="clientName"]');
            if (clientNameField) clientNameField.value = name;
            const projectNameField = document.querySelector('.customer-field[data-field="projectName"]');
            if (projectNameField) projectNameField.value = '';
            document.getElementById('headerCustomerName').textContent = name;
            clearCostData();
            // 견적 데이터 초기화 (메모는 undefined로 설정해서 원가관리표 메모 사용)
            currentData.estimateData = {};
            currentData.estimateProfitRate = 15;
            // 견적서 메모를 원가관리표 메모로 초기화
            categories.forEach(cat => {
                delete currentData[`estMemo_${cat.no}`]; // undefined로 설정
            });
            loadEstimateData();
            initYearFilter();
            updateCustomerList();
            syncAllFields();
        }

        function selectCustomer(customerId) {
            const customer = customers.find(c => c.customerId === customerId);
            if (!customer) return;
            currentCustomerId = customerId;

            // Legacy Data Compatibility (Cloud Compatibility Fix)
            // Ensure old keys (pyeong, estimateProfitRate) map to new inputs (area, profitRate) if new keys are missing
            if (!customer.area && customer.pyeong) customer.area = customer.pyeong;
            if (!customer.profitRate && customer.estimateProfitRate) {
                // Format estimateProfitRate if it's just a number
                let rate = String(customer.estimateProfitRate);
                if (/^\d+$/.test(rate)) rate += '%';
                customer.profitRate = rate;
            }

            currentData = { ...customer };

            // 접근 제한 확인
            if (document.getElementById('accessDeniedOverlay')) {
                const isLocked = isCustomerLocked();
                document.getElementById('accessDeniedOverlay').style.display = isLocked ? 'flex' : 'none';
                if (isLocked) {
                    document.getElementById('lockedPasswordInput').value = '';
                }
            }

            // 권한에 따른 입력 비활성화 (본인 작성 건만 수정 가능)
            const editable = canEdit();
            document.querySelectorAll('.customer-field, #customerStatus').forEach(el => {
                el.disabled = !editable;
            });
            const delBtn = document.querySelector('.delete-btn');
            if (delBtn) delBtn.style.visibility = (editable && !isCustomerLocked()) ? 'visible' : 'hidden';

            document.querySelectorAll('.customer-field').forEach(f => {
                f.value = currentData[f.dataset.field] || '';
            });
            document.getElementById('customerStatus').value = currentData.status || 'consulting';

            // A/S 기간 표시
            const asDisplay = document.getElementById('asEndDateDisplay');
            if (currentData.status === 'as_done' && currentData.asEndDate) {
                asDisplay.textContent = `A/S ~${currentData.asEndDate}`;
                asDisplay.style.display = 'block';
            } else {
                asDisplay.style.display = 'none';
            }

            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('customerView').style.display = 'block';
            document.getElementById('headerCustomerName').textContent = currentData.projectName || currentData.clientName || '고객명 없음';
            document.getElementById('headerCustomerId').textContent = currentCustomerId;
            loadCostData();
            loadEstimateData();
            updateCustomerList();
            syncAllFields();
            updateLockUI();  // 잠금 상태 및 작성자 표시

            // [DATE FIX] input[type="date"] requires YYYY-MM-DD format.
            // Convert any stored dots (YYYY.MM.DD) to dashes.
            ['movingDate', 'contractDate', 'finalPaymentDate'].forEach(field => {
                const el = document.querySelector(`.customer-field[data-field="${field}"]`);
                if (el && currentData[field]) {
                    el.value = currentData[field].replace(/\./g, '-');
                }
            });

            // [CONSTRUCTION PERIOD FIX] Split string into two date inputs
            if (currentData.constructionPeriod) {
                const parts = currentData.constructionPeriod.split('~');
                if (parts.length > 0) document.getElementById('constructionStartInput').value = parts[0].replace(/\./g, '-').trim();
                if (parts.length > 1) document.getElementById('constructionEndInput').value = parts[1].replace(/\./g, '-').trim();
            } else {
                document.getElementById('constructionStartInput').value = '';
                document.getElementById('constructionEndInput').value = '';
            }
        }

        function updateConstructionPeriod() {
            const start = document.getElementById('constructionStartInput').value;
            const end = document.getElementById('constructionEndInput').value;
            const hiddenInput = document.getElementById('hiddenConstructionPeriod');

            if (start && end) {
                // Store as Dots for consistency with legacy/placeholder text
                hiddenInput.value = `${start.replace(/-/g, '.')} ~ ${end.replace(/-/g, '.')}`;
            } else if (start) {
                hiddenInput.value = `${start.replace(/-/g, '.')}`;
            } else {
                hiddenInput.value = '';
            }
            // Trigger standard update
            updateCustomerField(hiddenInput);
        }

        // Phone Number Auto-format (Same logic as quote.html)
        function autoFormatPhone(el) {
            let value = el.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);

            if (value.length <= 3) {
                el.value = value;
            } else if (value.length <= 7) {
                el.value = value.slice(0, 3) + '-' + value.slice(3);
            } else {
                el.value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7);
            }
        }

        // Area Auto-format (add 'py')
        function autoFormatArea(el) {
            let value = el.value.trim();
            if (!value) return;
            // If it's just numbers, add py
            if (/^\d+$/.test(value)) {
                el.value = value + 'py';
            }
        }

        // Profit Rate Auto-format (add '%')
        function autoFormatProfit(el) {
            let value = el.value.trim();
            if (!value) return;
            // If it's just numbers, add %
            if (/^\d+$/.test(value)) {
                el.value = value + '%';
            }
        }

        function updateCustomerField(el) {
            currentData[el.dataset.field] = el.value;
            if (el.dataset.field === 'clientName' || el.dataset.field === 'projectName') {
                const displayName = currentData.projectName || currentData.clientName || '고객명 없음';
                document.getElementById('headerCustomerName').textContent = displayName;
            }
            syncAllFields();
        }

        function updateStatus() {
            const status = document.getElementById('customerStatus').value;
            currentData.status = status;

            // Auto-fill Contract Date if status is 'contracted'
            if (status === 'contracted' && !currentData.contractDate) {
                const today = new Date().toISOString().split('T')[0];
                currentData.contractDate = today;
                const contractField = document.querySelector('.customer-field[data-field="contractDate"]');
                if (contractField) contractField.value = today;
                showToast('계약일이 오늘 날짜로 자동 설정되었습니다');
            }

            // Auto-calculate A/S End Date if status is 'as_done'
            if (status === 'as_done') {
                calculateAsEndDate();
            }

            const asDisplay = document.getElementById('asEndDateDisplay');
            if (status === 'as_done' && currentData.asEndDate) {
                asDisplay.textContent = `A/S ~${currentData.asEndDate}`;
                asDisplay.style.display = 'block';
            } else {
                asDisplay.style.display = 'none';
            }
            updateCustomerList();
        }

        function updateAsDate() {
            // A/S 날짜는 잔금일 기준 자동 계산으로 변경됨
        }

        function calculateAsEndDate() {
            const finalPaymentDate = currentData.finalPaymentDate;
            if (finalPaymentDate) {
                const date = new Date(finalPaymentDate);
                date.setMonth(date.getMonth() + 12);
                // Input type="date" expects YYYY-MM-DD
                const endDate = date.toISOString().split('T')[0];
                currentData.asEndDate = endDate;
                const asEndField = document.querySelector('.customer-field[data-field="asEndDate"]');
                if (asEndField) asEndField.value = endDate;
                syncAllFields();
            }
        }

        function deleteCurrentCustomer() {
            if (!currentCustomerId) return;

            // 1. Permission check
            if (!canDelete()) {
                showToast('삭제 권한이 없습니다 (본인 작성 건만 삭제 가능)', 'error');
                return;
            }

            // 2. Lock check
            if (isCustomerLocked()) {
                showToast('잠금 설정된 고객입니다. 메인관리자에게 문의하세요.', 'error');
                return;
            }

            // 3. Confirm Soft Delete
            if (!confirm('휴지통으로 이동하시겠습니까? (복구는 메인관리자만 가능합니다)')) return;

            // 4. Perform Soft Delete (Trash)
            const index = customers.findIndex(c => c.customerId === currentCustomerId);
            if (index !== -1) {
                customers[index].status = 'trash';
                customers[index].deletedAt = new Date().toISOString();
                customers[index].deletedBy = currentAdmin.id;

                saveCustomers();
                showToast('휴지통으로 이동되었습니다', 'success');

                // Reset View
                currentCustomerId = null;
                currentData = {};
                document.getElementById('emptyState').style.display = 'block';
                document.getElementById('customerView').style.display = 'none';
                updateCustomerList();
            }
        }

        function updateCustomerList() {
            const container = document.getElementById('customerList');
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const yearFilter = document.getElementById('yearFilter').value;
            const monthFilter = document.getElementById('monthFilter').value;

            let filtered = customers.filter(c => {
                // 휴지통 항목 제외
                if (c.status === 'trash') return false;

                const matchSearch = [c.clientName, c.clientPhone, c.siteAddress, c.projectName].join(' ').toLowerCase().includes(searchTerm);
                const matchStatus = currentStatusFilter === 'all' || c.status === currentStatusFilter;

                // 년/월 필터 (customerId 기준: YYMMDD-XXX)
                let matchDate = true;
                if (yearFilter || monthFilter) {
                    const idParts = c.customerId.split('-')[0];
                    if (idParts && idParts.length >= 4) {
                        const year = '20' + idParts.substring(0, 2);
                        const month = idParts.substring(2, 4);
                        if (yearFilter && year !== yearFilter) matchDate = false;
                        if (monthFilter && month !== monthFilter) matchDate = false;
                    }
                }

                return matchSearch && matchStatus && matchDate;
            });

            // 최신순 정렬 (customerId 기준: YYMMDD-XXX)
            filtered.sort((a, b) => {
                // createdAt이 있으면 우선 사용
                if (a.createdAt && b.createdAt) {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                }
                // customerId로 정렬 (내림차순)
                return (b.customerId || '').localeCompare(a.customerId || '');
            });

            if (filtered.length === 0) {
                container.innerHTML = '<div style="padding:30px 16px;text-align:center;color:#86868b;font-size:12px;">해당 조건의 고객이 없습니다.</div>';
            } else {
                container.innerHTML = filtered.map(c => {
                    let statusKey = (c.status || '').trim(); // Remove potential whitespace
                    // Try to match exact key, or lowercase if not found
                    if (!statusLabels[statusKey] && statusLabels[statusKey.toLowerCase()]) {
                        statusKey = statusKey.toLowerCase();
                    }
                    let statusText = statusLabels[statusKey] || c.status;
                    if (c.status === 'as_done' && c.asEndDate) {
                        statusText = `A/S ~${c.asEndDate}`;
                    }
                    const displayName = c.projectName || '현장명 미지정';
                    const subInfo = (c.clientName || '') + (c.clientName && c.clientPhone ? ' / ' : '') + (c.clientPhone || '');
                    const lockIcon = c.isLocked ? '🔒' : '';
                    const creatorInfo = c.createdBy ? `<div class="customer-item-creator">📝 ${c.createdBy}</div>` : '';

                    return `
                    <div class="customer-item ${c.customerId === currentCustomerId ? 'active' : ''}" onclick="selectCustomer('${c.customerId}')">
                        <div class="customer-item-header">
                            <span class="customer-item-id">${lockIcon} ${c.customerId}</span>
                            <span class="status-badge ${c.status}">${statusText}</span>
                        </div>
                        <div class="customer-item-name" style="font-weight: 700;">${displayName}</div>
                        <div class="customer-item-info">${subInfo}</div>
                        ${creatorInfo}
                    </div>
                `}).join('');
            }
        }

        // 년도 필터 옵션 초기화
        function initYearFilter() {
            const yearFilter = document.getElementById('yearFilter');
            const years = new Set();

            customers.forEach(c => {
                const idParts = c.customerId.split('-')[0];
                if (idParts && idParts.length >= 2) {
                    years.add('20' + idParts.substring(0, 2));
                }
            });

            // 현재 년도도 추가
            const currentYear = new Date().getFullYear().toString();
            years.add(currentYear);

            // 정렬 후 옵션 추가
            const sortedYears = [...years].sort().reverse();
            yearFilter.innerHTML = '<option value="">전체 년도</option>' +
                sortedYears.map(y => `<option value="${y}">${y}년</option>`).join('');
        }

        function filterCustomers() { updateCustomerList(); }

        // ==========================================
        // [클라우드 동기화] Google Sheets에서 고객 데이터 불러오기
        // ==========================================
        async function syncFromCloud() {
            if (!confirm('클라우드에서 고객 데이터를 불러옵니다.\n\n기존 로컬 데이터와 병합됩니다.\n진행하시겠습니까?')) {
                return;
            }

            showToast('클라우드에서 데이터 불러오는 중...', 'info');

            try {
                // Google Apps Script GET 요청 (고객 데이터 조회)
                const response = await fetch(CUSTOMER_SYNC_URL + '?sheet=고객관리', {
                    method: 'GET'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const cloudCustomers = await response.json();
                console.log('☁️ [Cloud Sync] Received data:', cloudCustomers);

                if (!Array.isArray(cloudCustomers)) {
                    if (cloudCustomers.error) {
                        throw new Error(cloudCustomers.error);
                    }
                    throw new Error('잘못된 응답 형식');
                }

                if (cloudCustomers.length === 0) {
                    if (confirm('클라우드에 저장된 고객 데이터가 없습니다.\n\n로컬 데이터도 모두 삭제할까요?')) {
                        localStorage.setItem('dz_customers', '[]');
                        customers = [];
                        updateCustomerList();
                        initYearFilter();
                        showToast('모든 고객 데이터가 삭제되었습니다.', 'info');
                    }
                    return;
                }

                // 완전 동기화: 클라우드 데이터로 로컬 데이터 교체
                // (클라우드에 없는 데이터는 삭제됨)
                const cloudMap = new Map(cloudCustomers.map(c => [c.customerId, c]));
                const localCustomers = JSON.parse(localStorage.getItem('dz_customers') || '[]');

                let addedCount = 0;
                let updatedCount = 0;
                let deletedCount = 0;

                // 로컬에만 있고 클라우드에 없는 데이터 카운트
                localCustomers.forEach(local => {
                    if (!cloudMap.has(local.customerId)) {
                        deletedCount++;
                    }
                });

                // 클라우드 데이터 기준으로 업데이트/추가 카운트
                const localMap = new Map(localCustomers.map(c => [c.customerId, c]));
                cloudCustomers.forEach(cloud => {
                    if (localMap.has(cloud.customerId)) {
                        updatedCount++;
                    } else {
                        addedCount++;
                    }
                });

                // 클라우드 데이터로 완전 교체
                localStorage.setItem('dz_customers', JSON.stringify(cloudCustomers));

                // UI 업데이트
                customers = cloudCustomers;
                cachedCloudCount = cloudCustomers.length; // 캐시 업데이트
                updateCustomerList();
                initYearFilter();

                showToast(`클라우드 동기화 완료! 추가: ${addedCount}명, 업데이트: ${updatedCount}명, 삭제: ${deletedCount}명`, 'success');
                console.log(`✅ [Cloud Sync] Complete. Added: ${addedCount}, Updated: ${updatedCount}, Deleted: ${deletedCount}`);

            } catch (error) {
                console.error('❌ [Cloud Sync] Error:', error);
                showToast('클라우드 동기화 실패: ' + error.message, 'error');
            }
        }

        async function syncToGoogleSheets(data) {
            console.log('📤 [Google Sheets Sync] Starting sync process...');
            console.log('📋 [Google Sheets Sync] Customer Data:', data);

            try {
                const statusKey = (data.status || '').trim();
                let koreanStatus = statusLabels[statusKey] || statusLabels[statusKey.toLowerCase()] || data.status;

                const payload = {
                    sheetName: '고객관리_견적서',
                    data: {
                        customerId: data.customerId || '',
                        clientName: data.clientName || '',
                        clientPhone: data.clientPhone || '',
                        clientEmail: data.clientEmail || '',
                        status: koreanStatus, // Send Korean status
                        createdAt: data.createdAt || new Date().toISOString(),
                        clientAddress: data.clientAddress || '',
                        projectName: data.projectName || '',
                        siteAddress: data.siteAddress || '',
                        constructionPeriod: data.constructionPeriod || '',
                        contractDate: data.contractDate || '', // Explicitly send Contract Date
                        warrantyPeriod: data.asEndDate ? (data.asEndDate) : '', // Send A/S End Date
                        // Note: For 'A/S 기간' (Warranty Period), if you want "YYYY.MM.DD ~ YYYY.MM.DD", construct it here.
                        // Assuming the sheet just wants the end date or whatever is in 'asEndDate' data.
                        // The user said "A/S Period not entered", screenshot shows column M "A/S 기간".
                        // In `initializeCustomerSheet` of backend, column 13 is 'A/S 기간'.

                        pyeong: data.area || '',
                        totalAmount: data.totalAmount || '',
                        estimateProfitRate: data.profitRate || (data.estimateProfitRate ? data.estimateProfitRate + '%' : '15%'),
                        jsonData: JSON.stringify(data)
                    }
                };

                console.log('📦 [Google Sheets Sync] Payload:', payload);
                console.log('🌐 [Google Sheets Sync] Target URL:', CUSTOMER_SYNC_URL);

                // no-cors 모드 제거하여 실제 응답 확인 가능
                const response = await fetch(CUSTOMER_SYNC_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify(payload)
                });

                console.log('📡 [Google Sheets Sync] Response status:', response.status);
                console.log('📡 [Google Sheets Sync] Response headers:', [...response.headers.entries()]);

                // 응답 본문 확인
                const responseText = await response.text();
                console.log('📄 [Google Sheets Sync] Response text:', responseText);

                let result;
                try {
                    result = JSON.parse(responseText);
                    console.log('✅ [Google Sheets Sync] Parsed response:', result);
                } catch (e) {
                    console.warn('⚠️ [Google Sheets Sync] Response is not JSON:', responseText);
                }

                if (response.ok || response.status === 200) {
                    console.log('✅ [Google Sheets Sync] Request completed successfully');
                    showToast('구글 시트 동기화 완료!', 'success');
                } else {
                    throw new Error(`HTTP ${response.status}: ${responseText}`);
                }

            } catch (error) {
                console.error('❌ [Google Sheets Sync] Error:', error);
                console.error('❌ [Google Sheets Sync] Error name:', error.name);
                console.error('❌ [Google Sheets Sync] Error message:', error.message);
                console.error('❌ [Google Sheets Sync] Error stack:', error.stack);

                // CORS 에러인 경우 특별 처리
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    showToast('구글 시트 동기화: CORS 에러. GAS 배포를 확인하세요.', 'error');
                    console.error('💡 [Google Sheets Sync] Hint: Apps Script가 "모든 사용자(익명 사용자 포함)" 권한으로 배포되었는지 확인하세요.');
                } else {
                    showToast('구글 시트 동기화 실패: ' + error.message, 'error');
                }
            }
        }

        async function saveData() {
            if (!currentCustomerId) return showToast('먼저 고객을 등록하세요', 'error');

            if (!isLoggedIn()) {
                showToast('관리자 로그인이 필요합니다 (열람 모드에서는 저장할 수 없습니다)', 'error');
                showAdminModal();
                return;
            }

            // 잠금된 고객은 비밀번호 필요
            if (isCustomerLocked()) {
                showDeletePasswordModal(() => {
                    performSaveData();
                });
                return;
            }

            performSaveData();
        }

        function performSaveData() {
            // 관리자 모드일 때만 원가관리표 저장
            if (isLoggedIn()) {
                saveCostData();
            }

            // 고객별 견적 데이터는 항상 저장
            saveEstimateData();
            const idx = customers.findIndex(c => c.customerId === currentCustomerId);

            // FUNDAMENTAL LOCK CHECK
            if (idx >= 0) {
                const original = customers[idx];
                // If it was locked, and we are not just unlocking it (i.e. isLocked is still true in currentData or original logic), BLOCK.
                // Wait, toggleCustomerLock modifies customers array directly.
                // Here we are potentially overwriting it from currentData.
                // If original is locked, we must NOT overwrite it unless we are Main Admin unlocking it?
                // But toggleCustomerLock handles the unlock.
                // This function is "Save Data" button.
                // If Locked, Save should be REJECTED for content changes.

                if (original.isLocked) {
                    // Check if we are trying to change isLocked status?
                    // No, toggleCustomerLock handles that separately.
                    // Here we are saving content.
                    // If Locked, Content Save is FORBIDDEN.
                    showToast('잠금 상태에서는 저장할 수 없습니다.', 'error');
                    return;
                }

                customers[idx] = { ...currentData };
            } else {
                customers.push({ ...currentData });
            }
            localStorage.setItem('dz_customers', JSON.stringify(customers));

            if (isLoggedIn()) {
                showToast('저장되었습니다 (원가관리표 포함)', 'success');
            } else {
                showToast('저장되었습니다', 'success');
            }

            // Google Sheets 동기화 (백그라운드)
            syncToGoogleSheets({ ...currentData });

            // 저장 후 고객 목록으로 이동
            currentCustomerId = null;
            currentData = {};
            document.getElementById('emptyState').style.display = 'block';
            document.getElementById('customerView').style.display = 'none';
            initYearFilter();
            updateCustomerList();
        }

        function createCoverTable() {
            const tbody = document.getElementById('coverTableBody');
            let html = categories.map((cat, i) => `
                <tr><td class="no">${i + 1}</td><td>${cat.name}</td><td class="amount" id="coverCat${cat.no}">₩ 0</td></tr>
            `).join('');
            html += `
                <tr class="subtotal"><td></td><td>소계 (공급가액)</td><td class="amount" id="coverSubtotal">₩ 0</td></tr>
                <tr style="background:#f0f7ff;"><td></td><td>기업이윤 (<span id="coverProfitRate">0</span>%)</td><td class="amount" id="coverProfit">₩ 0</td></tr>
                <tr class="vat"><td></td><td>부가가치세 (VAT 10%)</td><td class="amount" id="coverVat">₩ 0</td></tr>
                <tr class="total"><td></td><td>총 계약금액</td><td class="amount" id="coverTotal">₩ 0</td></tr>
            `;
            tbody.innerHTML = html;
        }

        function createCostCategories() {
            const container = document.getElementById('costCategories');
            container.innerHTML = categories.map(cat => `
                <div class="category-section">
                    <div class="category-header">
                        <h3><span class="cat-no">${cat.no}</span> ${cat.name}</h3>
                        <div class="subtotal">₩ <span id="costSubtotal${cat.no}">0</span></div>
                    </div>
                    <table class="data-table">
                        <colgroup>
                            <col style="width:22px;"><!-- No -->
                            <col style="width:50px;"><!-- 구분 -->
                            <col style="width:160px;"><!-- 품명 -->
                            <col style="width:auto;"><!-- 상세내용 (나머지 공간) -->
                            <col style="width:40px;"><!-- 단위 -->
                            <col style="width:40px;"><!-- 수량 -->
                            <col style="width:65px;"><!-- 단가 -->
                            <col style="width:75px;"><!-- 합계 -->
                        </colgroup>
                        <thead><tr><th>No</th><th>구분</th><th>품명</th><th>상세내용</th><th>단위</th><th>수량</th><th>단가</th><th>합계</th></tr></thead>
                        <tbody id="costBody${cat.no}">
                            <tr><td class="col-no">1</td><td class="col-div"><input type="text" placeholder="구분"></td><td class="col-name"><input type="text" placeholder="품명"></td><td class="col-spec"><input type="text" placeholder="상세"></td><td class="col-unit">${getUnitSelectHTML()}</td><td class="col-qty"><input type="text" placeholder="수량" oninput="calcCostRow(this)"></td><td class="col-price"><input type="text" placeholder="단가" oninput="calcCostRow(this)"></td><td class="col-total">0</td></tr>
                        </tbody>
                    </table>
                    <div class="category-memo"><label>MEMO</label><textarea id="costMemo${cat.no}" placeholder="메모 입력..." oninput="autoResizeTextarea(this); syncCostMemoToEstimate()"></textarea></div>
                    <button class="add-row-btn no-print" onclick="addCostRow('${cat.no}')">+ 항목 추가</button>
                </div>
            `).join('');
        }

        function addCostRow(catNo) {
            const tbody = document.getElementById(`costBody${catNo}`);
            const n = tbody.querySelectorAll('tr').length + 1;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td class="col-no">${n}</td><td class="col-div"><input type="text"></td><td class="col-name"><input type="text"></td><td class="col-spec"><input type="text"></td><td class="col-unit">${getUnitSelectHTML()}</td><td class="col-qty"><input type="text" oninput="calcCostRow(this)"></td><td class="col-price"><input type="text" oninput="calcCostRow(this)"></td><td class="col-total">0</td>`;
            tbody.appendChild(tr);
        }

        // 원가관리표는 전역 데이터로 관리 (모든 고객에게 동일)
        // 계약견적서는 고객별로 독립 관리

        // 계약견적서에서 상세내용 드롭다운 선택 시


        // 원가관리표 행별 합계 계산
        function calcCostRow(input) {
            const row = input.closest('tr');
            const inputs = row.querySelectorAll('input');
            const qty = parseNumber(inputs[3]?.value) || 0;
            const price = parseNumber(inputs[4]?.value) || 0;
            const total = qty * price;

            const totalCell = row.querySelector('.col-total');
            if (totalCell) {
                totalCell.textContent = formatNumber(total);
            }

            // 카테고리 소계 업데이트
            const tbody = row.closest('tbody');
            if (tbody && tbody.id) {
                const catNo = tbody.id.replace('costBody', '');
                updateCostCategorySubtotal(catNo);
            }
        }

        // 원가관리표 카테고리별 소계 계산
        function updateCostCategorySubtotal(catNo) {
            const tbody = document.getElementById(`costBody${catNo}`);
            const subtotalSpan = document.getElementById(`costSubtotal${catNo}`);
            if (!tbody || !subtotalSpan) return;

            let subtotal = 0;
            tbody.querySelectorAll('tr').forEach(row => {
                const inputs = row.querySelectorAll('input');
                const qty = parseNumber(inputs[3]?.value) || 0;
                const price = parseNumber(inputs[4]?.value) || 0;
                subtotal += qty * price;
            });

            subtotalSpan.textContent = formatNumber(subtotal);
        }

        function createEstimateCategories() {
            const container = document.getElementById('estimateCategories');
            container.innerHTML = categories.map(cat => `
                <div class="category-section">
                    <div class="category-header">
                        <h3><span class="cat-no">${cat.no}</span> ${cat.name}</h3>
                        <div class="subtotal">₩ <span id="estSubtotal${cat.no}">0</span></div>
                    </div>
                    <table class="estimate-table">
                        <colgroup>
                            <col style="width:25px;"><!-- No -->
                            <col style="width:60px;" class="col-div"><!-- 구분 (인쇄시 숨김) -->
                            <col style="width:auto;"><!-- 품명 (나머지 공간) -->
                            <col style="width:100px;"><!-- 상세내용 -->
                            <col style="width:40px;"><!-- 단위 -->
                            <col style="width:40px;"><!-- 수량 -->
                            <col style="width:65px;"><!-- 단가 -->
                            <col style="width:75px;"><!-- 금액 -->
                            <col style="width:30px;" class="no-print"><!-- 삭제 -->
                        </colgroup>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th class="col-div">구분</th>
                                <th>품명</th>
                                <th>상세내용</th>
                                <th>단위</th>
                                <th>수량</th>
                                <th>단가</th>
                                <th>금액</th>
                                <th class="no-print"></th>
                            </tr>
                        </thead>
                        <tbody id="estBody${cat.no}">
                            <tr>
                                <td>1</td>
                                <td class="col-div"><select class="div-select" onchange="onEstDivChange(this, '${cat.no}')"><option value="">선택</option></select></td>
                                <td><select class="name-select" onchange="onEstNameChange(this, '${cat.no}')" disabled><option value="">구분 먼저 선택</option></select></td>
                                <td class="spec-cell">-</td>
                                <td class="unit-cell">-</td>
                                <td><input type="number" class="qty-input" value="1" min="0" onchange="onEstQtyChange(this, '${cat.no}')"></td>
                                <td class="price-cell" data-price="0">-</td>
                                <td class="amount-cell">-</td>
                                <td class="no-print"><button class="del-btn" onclick="deleteEstimateRow(this, '${cat.no}')" title="삭제">✕</button></td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="estimate-memo" id="estMemo${cat.no}">
                        <div style="color:#0071e3; font-weight:600; margin-bottom:6px;">📝 메모</div>
                        <textarea class="memo-textarea" id="estMemoText${cat.no}" placeholder="메모 입력..." oninput="autoResizeTextarea(this); saveEstimateData()"></textarea>
                    </div>
                    <button class="add-row-btn no-print" onclick="addEstimateRowTo('${cat.no}')">+ 항목 추가</button>
                </div>
            `).join('');

            // 각 카테고리별 구분 옵션 초기화
            categories.forEach(cat => {
                updateDivOptions(cat.no);
            });
        }

        // 해당 카테고리의 구분 옵션 업데이트
        function updateDivOptions(catNo) {
            const items = getCostItemsByCategory(catNo);
            const divs = [...new Set(items.map(i => i.div).filter(d => d))].sort();

            const tbody = document.getElementById(`estBody${catNo}`);
            if (!tbody) return;

            tbody.querySelectorAll('.div-select').forEach(select => {
                const currentVal = select.value;
                select.innerHTML = '<option value="">선택</option>' + divs.map(d =>
                    `<option value="${d}" ${d === currentVal ? 'selected' : ''}>${d}</option>`
                ).join('');
            });
        }

        // 특정 카테고리의 원가 항목 가져오기 (전역 원가관리표 데이터 사용)
        function getCostItemsByCategory(catNo) {
            // 전역 원가관리표 데이터에서 가져오기
            const globalCostData = JSON.parse(localStorage.getItem('dz_global_cost') || '{}');
            let data = globalCostData[`cost_${catNo}`] || [];

            // 전역 데이터가 없으면 기본 데이터 사용
            if (data.length === 0 && defaultCostData[catNo]) {
                data = defaultCostData[catNo];
            }

            const items = [];
            data.forEach(item => {
                if (item.name) {
                    // price 필드 우선, 없으면 material+labor+expense 합산 (기존 데이터 호환)
                    const unitPrice = parseNumber(item.price) || ((parseNumber(item.material) || 0) + (parseNumber(item.labor) || 0) + (parseNumber(item.expense) || 0));
                    items.push({
                        div: item.div || '',
                        name: item.name,
                        spec: item.spec || '',
                        unit: item.unit || '',
                        unitPrice: unitPrice
                    });
                }
            });
            return items;
        }

        // 구분별 품명 목록
        function getItemsByDivInCat(catNo, div) {
            const items = getCostItemsByCategory(catNo);
            return items.filter(i => i.div === div);
        }

        // 견적 행 추가
        function addEstimateRowTo(catNo) {
            const tbody = document.getElementById(`estBody${catNo}`);
            const rowCount = tbody.querySelectorAll('tr').length + 1;
            const items = getCostItemsByCategory(catNo);
            const divs = [...new Set(items.map(i => i.div).filter(d => d))].sort();
            const divOptions = divs.map(d => `<option value="${d}">${d}</option>`).join('');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${rowCount}</td>
                <td class="col-div"><select class="div-select" onchange="onEstDivChange(this, '${catNo}')"><option value="">선택</option>${divOptions}</select></td>
                <td><select class="name-select" onchange="onEstNameChange(this, '${catNo}')" disabled><option value="">구분 먼저 선택</option></select></td>
                <td class="spec-cell">-</td>
                <td class="unit-cell">-</td>
                <td><input type="number" class="qty-input" value="1" min="0" onchange="onEstQtyChange(this, '${catNo}')"></td>
                <td class="price-cell" data-price="0">-</td>
                <td class="amount-cell">-</td>
                <td class="no-print"><button class="del-btn" onclick="deleteEstimateRow(this, '${catNo}')" title="삭제">✕</button></td>
            `;
            tbody.appendChild(tr);
        }

        // 견적 행 삭제
        function deleteEstimateRow(btn, catNo) {
            const row = btn.closest('tr');
            const tbody = row.closest('tbody');
            row.remove();

            // 번호 재정렬
            tbody.querySelectorAll('tr').forEach((tr, i) => {
                tr.querySelector('td:first-child').textContent = i + 1;
            });

            updateCategorySubtotal(catNo);
            updateEstimateTotals();
            saveEstimateData();
        }

        // 구분 선택 변경
        function onEstDivChange(select, catNo) {
            const row = select.closest('tr');
            const nameSelect = row.querySelector('.name-select');
            const div = select.value;

            if (!div) {
                nameSelect.innerHTML = '<option value="">구분 먼저 선택</option>';
                nameSelect.disabled = true;
                resetEstRowValues(row);
                return;
            }

            const items = getItemsByDivInCat(catNo, div);
            nameSelect.innerHTML = '<option value="">품명 선택</option>' + items.map((item, i) =>
                `<option value="${i}" data-spec="${item.spec}" data-unit="${item.unit}" data-price="${item.unitPrice}">${item.name}</option>`
            ).join('');
            nameSelect.disabled = false;
            resetEstRowValues(row);
        }

        // 품명 선택 변경
        function onEstNameChange(select, catNo) {
            const row = select.closest('tr');
            const option = select.selectedOptions[0];

            if (!option || !option.value) {
                resetEstRowValues(row);
                return;
            }

            const selectedName = option.textContent; // 선택된 품명
            const divSelect = row.querySelector('.div-select');
            const div = divSelect ? divSelect.value : '';

            // 같은 구분 내에서 같은 품명을 가진 항목들 찾기
            const items = getItemsByDivInCat(catNo, div);
            const sameNameItems = items.filter(item => item.name === selectedName);

            if (sameNameItems.length > 1) {
                // 같은 품명이 여러 개 있으면 상세내용 드롭다운 표시
                const specCell = row.querySelector('.spec-cell');
                const specOptions = sameNameItems.map((item, i) =>
                    `<option value="${i}" data-spec="${item.spec}" data-unit="${item.unit}" data-price="${item.unitPrice}">${item.spec || '(없음)'}</option>`
                ).join('');

                specCell.innerHTML = `
                    <select class="spec-select" onchange="onEstSpecSelect(this)" style="width:100%; padding:4px; border:1px solid #0071e3; border-radius:4px; font-size:11px; background:#f0f7ff;">
                        <option value="">상세 선택</option>
                        ${specOptions}
                        <option value="__custom__">✏️ 직접입력</option>
                    </select>
                `;

                // 단위/단가/금액은 아직 선택 안 됨
                row.querySelector('.unit-cell').textContent = '-';
                row.querySelector('.price-cell').textContent = '-';
                row.querySelector('.price-cell').dataset.price = '0';
                row.querySelector('.amount-cell').textContent = '-';
            } else {
                // 같은 품명이 하나만 있으면 기존처럼 자동 입력
                const spec = option.dataset.spec || '-';
                const unit = option.dataset.unit || '-';
                const price = parseInt(option.dataset.price) || 0;
                const qty = parseInt(row.querySelector('.qty-input').value) || 1;
                const amount = price * qty;

                row.querySelector('.spec-cell').textContent = spec;
                row.querySelector('.unit-cell').textContent = unit;
                row.querySelector('.price-cell').textContent = formatNumber(price);
                row.querySelector('.price-cell').dataset.price = price;
                row.querySelector('.amount-cell').textContent = formatNumber(amount);
            }

            updateCategorySubtotal(catNo);
            updateEstimateTotals();
            saveEstimateData();
        }

        // 계약견적서 상세내용 드롭다운 선택 시
        function onEstSpecSelect(select) {
            const row = select.closest('tr');
            const option = select.selectedOptions[0];

            if (select.value === '__custom__') {
                const specCell = row.querySelector('.spec-cell');
                specCell.innerHTML = `<input type="text" class="spec-input" placeholder="상세 입력" style="width:100%; padding:4px; border:1px solid #0071e3; border-radius:4px; font-size:11px; background:#f0f7ff;">`;
                specCell.querySelector('input').focus();
                return;
            }

            if (!option || !option.value) {
                row.querySelector('.unit-cell').textContent = '-';
                row.querySelector('.price-cell').textContent = '-';
                row.querySelector('.price-cell').dataset.price = '0';
                row.querySelector('.amount-cell').textContent = '-';
                return;
            }

            // 선택된 상세내용의 단위, 단가 적용
            const unit = option.dataset.unit || '-';
            const price = parseInt(option.dataset.price) || 0;
            const qty = parseInt(row.querySelector('.qty-input').value) || 1;
            const amount = price * qty;

            row.querySelector('.unit-cell').textContent = unit;
            row.querySelector('.price-cell').textContent = formatNumber(price);
            row.querySelector('.price-cell').dataset.price = price;
            row.querySelector('.amount-cell').textContent = formatNumber(amount);

            // 소계 업데이트
            const catNo = row.closest('tbody').id.replace('estBody', '');
            updateCategorySubtotal(catNo);
            updateEstimateTotals();
            saveEstimateData();
        }

        // 계약견적서 행 계산
        function calcEstimateRow(row) {
            const price = parseInt(row.querySelector('.price-cell')?.dataset.price) || 0;
            const qty = parseInt(row.querySelector('.qty-input')?.value) || 1;
            const amount = price * qty;
            row.querySelector('.amount-cell').textContent = formatNumber(amount);
        }

        // 수량 변경
        function onEstQtyChange(input, catNo) {
            const row = input.closest('tr');
            const price = parseInt(row.querySelector('.price-cell').dataset.price) || 0;
            const qty = parseInt(input.value) || 0;
            const amount = price * qty;

            row.querySelector('.amount-cell').textContent = formatNumber(amount);
            updateCategorySubtotal(catNo);
            updateEstimateTotals();
            saveEstimateData();
        }

        // 행 값 초기화
        function resetEstRowValues(row) {
            row.querySelector('.spec-cell').textContent = '-';
            row.querySelector('.unit-cell').textContent = '-';
            row.querySelector('.price-cell').textContent = '-';
            row.querySelector('.price-cell').dataset.price = '0';
            row.querySelector('.amount-cell').textContent = '-';
        }

        // 카테고리 소계 업데이트
        function updateCategorySubtotal(catNo) {
            const tbody = document.getElementById(`estBody${catNo}`);
            let subtotal = 0;

            tbody.querySelectorAll('tr').forEach(row => {
                const price = parseInt(row.querySelector('.price-cell')?.dataset.price) || 0;
                const qty = parseInt(row.querySelector('.qty-input')?.value) || 0;
                subtotal += price * qty;
            });

            document.getElementById(`estSubtotal${catNo}`).textContent = formatNumber(subtotal);
            return subtotal;
        }

        // 전체 합계 계산
        function updateEstimateTotals() {
            let grandTotal = 0;
            const categoryTotals = {};

            categories.forEach(cat => {
                const catTotal = updateCategorySubtotal(cat.no);
                categoryTotals[cat.no] = catTotal;
                grandTotal += catTotal;
            });

            const profitRate = parseFloat(document.getElementById('estimateProfitRate')?.value) || 0;
            const profit = Math.round(grandTotal * profitRate / 100);
            const subtotalWithProfit = grandTotal + profit;
            const vat = Math.round(subtotalWithProfit * 0.1);
            const total = subtotalWithProfit + vat;

            document.getElementById('estimateSubtotal').textContent = '₩ ' + formatNumber(grandTotal);
            document.getElementById('estimateProfit').textContent = '₩ ' + formatNumber(profit);
            document.getElementById('estimateVat').textContent = '₩ ' + formatNumber(vat);
            document.getElementById('estimateTotal').textContent = '₩ ' + formatNumber(total);

            // 고객정보에 총 계약금액 반영
            const totalAmountField = document.querySelector('.customer-field[data-field="totalAmount"]');
            if (totalAmountField) {
                totalAmountField.value = '₩ ' + formatNumber(total);
                currentData.totalAmount = '₩ ' + formatNumber(total);
            }

            currentData.estimateProfitRate = profitRate;

            // 표지계약서 연동
            updateCoverFromEstimate(categoryTotals, grandTotal, profitRate, profit, vat, total);

            // 도급계약서 대금지급 연동
            updateContractPayments(total);
        }

        // 표지계약서 금액 업데이트
        function updateCoverFromEstimate(categoryTotals, subtotal, profitRate, profit, vat, total) {
            // 각 카테고리별 금액 업데이트
            categories.forEach(cat => {
                const el = document.getElementById(`coverCat${cat.no}`);
                if (el) {
                    const amount = categoryTotals[cat.no] || 0;
                    el.textContent = amount > 0 ? '₩ ' + formatNumber(amount) : '-';
                }
            });

            // 소계, 기업이윤, VAT, 총액 업데이트
            const coverSubtotal = document.getElementById('coverSubtotal');
            const coverProfitRate = document.getElementById('coverProfitRate');
            const coverProfit = document.getElementById('coverProfit');
            const coverVat = document.getElementById('coverVat');
            const coverTotal = document.getElementById('coverTotal');

            if (coverSubtotal) coverSubtotal.textContent = '₩ ' + formatNumber(subtotal);
            if (coverProfitRate) coverProfitRate.textContent = profitRate;
            if (coverProfit) coverProfit.textContent = '₩ ' + formatNumber(profit);
            if (coverVat) coverVat.textContent = '₩ ' + formatNumber(vat);
            if (coverTotal) coverTotal.textContent = '₩ ' + formatNumber(total);
        }

        // 도급계약서 대금지급 자동 계산
        function updateContractPayments(total) {
            // 대금 지급 비율: 1차 27%, 2차 23%, 3차 23%, 4차 23%, 잔금 4%
            const payment1 = Math.round(total * 0.27);
            const payment2 = Math.round(total * 0.23);
            const payment3 = Math.round(total * 0.23);
            const payment4 = Math.round(total * 0.23);
            const payment5 = total - payment1 - payment2 - payment3 - payment4; // 나머지 잔금

            // currentData에 저장
            currentData.payment1 = '₩ ' + formatNumber(payment1) + ' (27%)';
            currentData.payment2 = '₩ ' + formatNumber(payment2) + ' (23%)';
            currentData.payment3 = '₩ ' + formatNumber(payment3) + ' (23%)';
            currentData.payment4 = '₩ ' + formatNumber(payment4) + ' (23%)';
            currentData.payment5 = '₩ ' + formatNumber(payment5) + ' (4%)';

            // synced-input 업데이트
            document.querySelectorAll('.synced-input[data-sync="payment1"]').forEach(el => el.value = currentData.payment1);
            document.querySelectorAll('.synced-input[data-sync="payment2"]').forEach(el => el.value = currentData.payment2);
            document.querySelectorAll('.synced-input[data-sync="payment3"]').forEach(el => el.value = currentData.payment3);
            document.querySelectorAll('.synced-input[data-sync="payment4"]').forEach(el => el.value = currentData.payment4);
            document.querySelectorAll('.synced-input[data-sync="payment5"]').forEach(el => el.value = currentData.payment5);

            // 도급계약서 총 계약금액 업데이트
            document.querySelectorAll('.synced-input[data-sync="totalAmount"]').forEach(el => {
                el.value = '₩ ' + formatNumber(total);
            });
        }

        // 견적 데이터 저장
        function saveEstimateData() {
            const estimateData = {};
            const estimateMemos = {};

            categories.forEach(cat => {
                const tbody = document.getElementById(`estBody${cat.no}`);
                const memoTextarea = document.getElementById(`estMemoText${cat.no}`);
                if (!tbody) return;

                const rows = [];
                tbody.querySelectorAll('tr').forEach(row => {
                    const divSelect = row.querySelector('.div-select');
                    const nameSelect = row.querySelector('.name-select');
                    const qtyInput = row.querySelector('.qty-input');
                    const specCell = row.querySelector('.spec-cell');

                    // spec-cell이 select나 input인 경우 값 가져오기
                    let specValue = '-';
                    if (specCell) {
                        const specSelect = specCell.querySelector('select');
                        const specInput = specCell.querySelector('input');
                        if (specSelect) {
                            const selectedOpt = specSelect.selectedOptions[0];
                            specValue = selectedOpt?.dataset?.spec || selectedOpt?.textContent || '-';
                        } else if (specInput) {
                            specValue = specInput.value || '-';
                        } else {
                            specValue = specCell.textContent || '-';
                        }
                    }

                    rows.push({
                        div: divSelect?.value || '',
                        nameIndex: nameSelect?.value || '',
                        name: nameSelect?.selectedOptions[0]?.textContent || '',
                        spec: specValue,
                        unit: row.querySelector('.unit-cell')?.textContent || '-',
                        qty: qtyInput?.value || '1',
                        price: row.querySelector('.price-cell')?.dataset.price || '0'
                    });
                });

                estimateData[cat.no] = rows;

                // 메모 저장
                if (memoTextarea) {
                    currentData[`estMemo_${cat.no}`] = memoTextarea.value;
                }
            });

            currentData.estimateData = estimateData;
            currentData.estimateProfitRate = document.getElementById('estimateProfitRate')?.value || 15;
        }

        // 견적 데이터 로드
        function loadEstimateData() {
            const profitRateInput = document.getElementById('estimateProfitRate');

            // 기업이윤율 로드
            if (currentData.estimateProfitRate !== undefined) {
                profitRateInput.value = currentData.estimateProfitRate;
            } else {
                profitRateInput.value = 15;
            }

            // 저장된 견적 데이터가 있으면 로드
            if (currentData.estimateData) {
                categories.forEach(cat => {
                    const tbody = document.getElementById(`estBody${cat.no}`);
                    if (!tbody) return;

                    const savedRows = currentData.estimateData[cat.no];
                    if (!savedRows || savedRows.length === 0) {
                        // 기본 빈 행 유지
                        updateDivOptions(cat.no);
                        return;
                    }

                    tbody.innerHTML = '';
                    const items = getCostItemsByCategory(cat.no);
                    const divs = [...new Set(items.map(i => i.div).filter(d => d))].sort();
                    const divOptions = divs.map(d => `<option value="${d}">${d}</option>`).join('');

                    savedRows.forEach((item, i) => {
                        const nameItems = item.div ? getItemsByDivInCat(cat.no, item.div) : [];
                        const nameOptions = nameItems.map((it, idx) =>
                            `<option value="${idx}" data-spec="${it.spec}" data-unit="${it.unit}" data-price="${it.unitPrice}" ${idx == item.nameIndex ? 'selected' : ''}>${it.name}</option>`
                        ).join('');

                        const price = parseInt(item.price) || 0;
                        const qty = parseInt(item.qty) || 0;
                        const amount = price * qty;

                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${i + 1}</td>
                            <td class="col-div"><select class="div-select" onchange="onEstDivChange(this, '${cat.no}')"><option value="">선택</option>${divOptions.replace(`"${item.div}"`, `"${item.div}" selected`)}</select></td>
                            <td><select class="name-select" onchange="onEstNameChange(this, '${cat.no}')" ${item.div ? '' : 'disabled'}>${item.div ? '<option value="">품명 선택</option>' + nameOptions : '<option value="">구분 먼저 선택</option>'}</select></td>
                            <td class="spec-cell">${item.spec || '-'}</td>
                            <td class="unit-cell">${item.unit || '-'}</td>
                            <td><input type="number" class="qty-input" value="${item.qty || 1}" min="0" onchange="onEstQtyChange(this, '${cat.no}')"></td>
                            <td class="price-cell" data-price="${price}">${price > 0 ? formatNumber(price) : '-'}</td>
                            <td class="amount-cell">${amount > 0 ? formatNumber(amount) : '-'}</td>
                            <td class="no-print"><button class="del-btn" onclick="deleteEstimateRow(this, '${cat.no}')" title="삭제">✕</button></td>
                        `;
                        tbody.appendChild(tr);
                    });
                });
            } else {
                // 구분 옵션만 초기화
                categories.forEach(cat => {
                    updateDivOptions(cat.no);
                });
            }

            // 메모 로드
            categories.forEach(cat => {
                const memoTextarea = document.getElementById(`estMemoText${cat.no}`);
                if (memoTextarea && currentData[`estMemo_${cat.no}`] !== undefined) {
                    memoTextarea.value = currentData[`estMemo_${cat.no}`];
                    autoResizeTextarea(memoTextarea);
                }
            });

            updateEstimateTotals();
            syncCostMemoToEstimate(); // 원가관리표 메모를 견적서에 동기화
        }

        // textarea 자동 높이 조절
        function autoResizeTextarea(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }

        // 원가관리표 메모를 계약견적서에 동기화
        function syncCostMemoToEstimate() {
            // 고객별 메모가 저장되어 있으면 그것을 사용
            // 저장된 메모가 없으면 현재 화면의 원가관리표 메모를 사용

            categories.forEach(cat => {
                const estMemoTextarea = document.getElementById(`estMemoText${cat.no}`);
                const costMemoTextarea = document.getElementById(`costMemo${cat.no}`);

                if (estMemoTextarea) {
                    // 고객별 저장된 메모가 있으면 사용
                    const customerMemo = currentData[`estMemo_${cat.no}`];

                    if (customerMemo !== undefined) {
                        // 고객별로 저장된 메모가 있으면 그것 사용
                        estMemoTextarea.value = customerMemo;
                    } else {
                        // 저장된 메모가 없으면 현재 화면의 원가관리표 메모 사용
                        const costMemo = costMemoTextarea ? costMemoTextarea.value : '';
                        estMemoTextarea.value = costMemo;
                    }
                    autoResizeTextarea(estMemoTextarea);
                }
            });
        }

        // 기존 함수들 제거/교체
        function updateEstimateFromCost() { }
        function getAllCostItems() { return []; }
        function loadAllCostItems() { }
        function clearEstimateRows() { }
        function onCheckChange() { }
        function onQtyChange() { }

        // 원가관리표 저장 (전역 데이터로 저장 - 모든 고객에게 동일하게 적용)
        function saveCostData() {
            const globalCostData = {};

            categories.forEach(cat => {
                const tbody = document.getElementById(`costBody${cat.no}`);
                const memo = document.getElementById(`costMemo${cat.no}`);
                if (!tbody) return;
                globalCostData[`cost_${cat.no}`] = [];
                tbody.querySelectorAll('tr').forEach(row => {
                    const inputs = row.querySelectorAll('.col-div input, .col-name input');
                    const specCell = row.querySelector('.col-spec');
                    const unitCell = row.querySelector('.col-unit');
                    const qtyInput = row.querySelector('.col-qty input');
                    const priceInput = row.querySelector('.col-price input');

                    // 상세내용: select 또는 input에서 값 가져오기
                    let specValue = '';
                    if (specCell) {
                        const specSelect = specCell.querySelector('select');
                        const specInput = specCell.querySelector('input');
                        specValue = specSelect ? specSelect.value : (specInput ? specInput.value : '');
                    }

                    // 단위: select 또는 input에서 값 가져오기
                    let unitValue = '';
                    if (unitCell) {
                        const unitSelect = unitCell.querySelector('.unit-select');
                        const unitInput = unitCell.querySelector('.unit-input');
                        unitValue = unitSelect ? unitSelect.value : (unitInput ? unitInput.value : '');
                    }

                    if (inputs.length >= 2 && inputs[1].value) {
                        globalCostData[`cost_${cat.no}`].push({
                            div: inputs[0].value,
                            name: inputs[1].value,
                            spec: specValue,
                            unit: unitValue,
                            qty: qtyInput ? qtyInput.value : '',
                            price: priceInput ? priceInput.value : ''
                        });
                    }
                });
                // MEMO 저장
                if (memo) {
                    globalCostData[`costMemo_${cat.no}`] = memo.value;
                }
            });

            // 전역 원가관리표 데이터 저장
            localStorage.setItem('dz_global_cost', JSON.stringify(globalCostData));
        }

        // 원가관리표 데이터 로드 (전역 데이터)
        function loadCostData() {
            // 전역 원가관리표 데이터 로드
            const globalCostData = JSON.parse(localStorage.getItem('dz_global_cost') || '{}');

            categories.forEach(cat => {
                const tbody = document.getElementById(`costBody${cat.no}`);
                const memo = document.getElementById(`costMemo${cat.no}`);
                if (!tbody) return;

                // 전역 데이터가 있으면 사용, 없으면 기본 데이터 사용
                let data = globalCostData[`cost_${cat.no}`] || [];
                if (data.length === 0 && defaultCostData[cat.no]) {
                    data = defaultCostData[cat.no];
                }

                if (data.length === 0) {
                    tbody.innerHTML = `<tr><td class="col-no">1</td><td class="col-div"><input type="text"></td><td class="col-name"><input type="text"></td><td class="col-spec"><input type="text"></td><td class="col-unit">${getUnitSelectHTML()}</td><td class="col-qty"><input type="text" oninput="calcCostRow(this)"></td><td class="col-price"><input type="text" oninput="calcCostRow(this)"></td><td class="col-total">0</td></tr>`;
                } else {
                    tbody.innerHTML = data.map((item, i) => {
                        const price = item.price || ((parseNumber(item.material) || 0) + (parseNumber(item.labor) || 0) + (parseNumber(item.expense) || 0)) || '';
                        const qty = parseNumber(item.qty) || 0;
                        const priceNum = parseNumber(price) || 0;
                        const total = qty * priceNum;
                        return `<tr><td class="col-no">${i + 1}</td><td class="col-div"><input type="text" value="${item.div || ''}"></td><td class="col-name"><input type="text" value="${item.name || ''}"></td><td class="col-spec"><input type="text" value="${item.spec || ''}"></td><td class="col-unit">${getUnitSelectHTML(item.unit || '식')}</td><td class="col-qty"><input type="text" value="${item.qty || ''}" oninput="calcCostRow(this)"></td><td class="col-price"><input type="text" value="${price}" oninput="calcCostRow(this)"></td><td class="col-total">${formatNumber(total)}</td></tr>`;
                    }).join('');
                }
                // MEMO 로드 (저장된 메모가 없으면 기본 메모 사용)
                if (memo) {
                    memo.value = globalCostData[`costMemo_${cat.no}`] || defaultCostMemos[cat.no] || '';
                    autoResizeTextarea(memo);
                }
                // 소계 업데이트
                updateCostCategorySubtotal(cat.no);
            });
            // 메모를 계약견적서에 동기화
            syncCostMemoToEstimate();
        }

        function clearCostData() {
            // 전역 원가관리표 데이터 로드
            const globalCostData = JSON.parse(localStorage.getItem('dz_global_cost') || '{}');

            categories.forEach(cat => {
                const tbody = document.getElementById(`costBody${cat.no}`);
                const memo = document.getElementById(`costMemo${cat.no}`);

                // 전역 데이터가 있으면 사용, 없으면 기본 데이터
                let data = globalCostData[`cost_${cat.no}`] || [];
                if (data.length === 0) {
                    data = defaultCostData[cat.no] || [];
                }

                if (tbody) {
                    if (data.length > 0) {
                        tbody.innerHTML = data.map((item, i) => {
                            const price = item.price || ((parseNumber(item.material) || 0) + (parseNumber(item.labor) || 0) + (parseNumber(item.expense) || 0)) || '';
                            const qty = parseNumber(item.qty) || 0;
                            const priceNum = parseNumber(price) || 0;
                            const total = qty * priceNum;
                            return `<tr><td class="col-no">${i + 1}</td><td class="col-div"><input type="text" value="${item.div || ''}"></td><td class="col-name"><input type="text" value="${item.name || ''}"></td><td class="col-spec"><input type="text" value="${item.spec || ''}"></td><td class="col-unit">${getUnitSelectHTML(item.unit || '식')}</td><td class="col-qty"><input type="text" value="${item.qty || ''}" oninput="calcCostRow(this)"></td><td class="col-price"><input type="text" value="${price}" oninput="calcCostRow(this)"></td><td class="col-total">${formatNumber(total)}</td></tr>`;
                        }).join('');
                    } else {
                        tbody.innerHTML = `<tr><td class="col-no">1</td><td class="col-div"><input type="text"></td><td class="col-name"><input type="text"></td><td class="col-spec"><input type="text"></td><td class="col-unit">${getUnitSelectHTML()}</td><td class="col-qty"><input type="text" oninput="calcCostRow(this)"></td><td class="col-price"><input type="text" oninput="calcCostRow(this)"></td><td class="col-total">0</td></tr>`;
                    }
                }
                if (memo) {
                    memo.value = globalCostData[`costMemo_${cat.no}`] || defaultCostMemos[cat.no] || '';
                    autoResizeTextarea(memo);
                }
                // 소계 업데이트
                updateCostCategorySubtotal(cat.no);
            });
        }

        function downloadPDF(elementId, filename) {
            const element = document.getElementById(elementId);
            if (!element) {
                showToast('문서를 찾을 수 없습니다', 'error');
                return;
            }

            const customerName = currentData.clientName || '고객';
            const today = new Date().toISOString().split('T')[0];
            const pdfFilename = `${customerName}_${filename}_${today}`;

            // 새 창에서 인쇄
            const printWindow = window.open('', '_blank');

            if (!printWindow) {
                showToast('팝업이 차단되었습니다. 팝업을 허용해주세요.', 'error');
                return;
            }

            // 스타일 복사
            const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
            let styleHTML = '';
            styles.forEach(s => styleHTML += s.outerHTML);

            // element 복제
            const clonedElement = element.cloneNode(true);

            // 모든 input을 텍스트로 변환
            clonedElement.querySelectorAll('input').forEach(input => {
                const span = document.createElement('span');
                span.textContent = input.value || '-';
                span.style.cssText = 'display:inline-block; padding:3px 0; font-size:inherit;';
                input.parentNode.replaceChild(span, input);
            });

            // 모든 textarea를 텍스트로 변환 (스크롤 없이 전체 표시)
            clonedElement.querySelectorAll('textarea').forEach(textarea => {
                const div = document.createElement('div');
                div.textContent = textarea.value || '';
                div.style.cssText = 'white-space:pre-wrap; padding:6px 0; font-size:inherit; line-height:1.5;';
                textarea.parentNode.replaceChild(div, textarea);
            });

            // 모든 select를 텍스트로 변환
            clonedElement.querySelectorAll('select').forEach(select => {
                const span = document.createElement('span');
                const selectedOption = select.options[select.selectedIndex];
                span.textContent = selectedOption ? selectedOption.text : '-';
                span.style.cssText = 'display:inline-block; padding:3px 0; font-size:inherit;';
                select.parentNode.replaceChild(span, select);
            });

            // 견적서인 경우 추가 처리
            if (elementId === 'estimateDoc') {
                // 품명이 선택되지 않은 행 제거 (금액이 '-'인 행)
                clonedElement.querySelectorAll('.estimate-table tbody tr').forEach(tr => {
                    const amountCell = tr.querySelector('.amount-cell');
                    if (amountCell && (amountCell.textContent === '-' || amountCell.textContent === '0')) {
                        tr.remove();
                    }
                });

                // 각 카테고리별 번호 재정렬
                clonedElement.querySelectorAll('.estimate-table tbody').forEach(tbody => {
                    tbody.querySelectorAll('tr').forEach((tr, i) => {
                        const cells = tr.querySelectorAll('td');
                        if (cells[0]) cells[0].textContent = i + 1;
                    });
                });

                // 빈 카테고리 숨기기 (항목이 없는 카테고리)
                clonedElement.querySelectorAll('.category-section').forEach(section => {
                    const tbody = section.querySelector('.estimate-table tbody');
                    if (tbody && tbody.querySelectorAll('tr').length === 0) {
                        section.style.display = 'none';
                    }
                });
            }

            // 인쇄용 HTML 생성
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${pdfFilename}</title>
                    ${styleHTML}
                    <style>
                        @page {
                            size: A4;
                            margin: 8mm 5mm 10mm 5mm; /* 좌우 최소화 */
                        }
                        
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        
                        html, body { 
                            margin: 0 !important; 
                            padding: 0 !important; 
                            width: 100% !important;
                            background: white !important;
                        }
                        
                        .document-wrapper {
                            box-shadow: none !important;
                            border: none !important;
                            margin: 0 !important;
                            padding: 10px !important;
                            width: 100% !important;
                            max-width: none !important;
                        }
                        
                        .doc-content {
                            padding: 0 !important;
                        }
                        
                        .pdf-btn, .no-print, .add-row-btn, .estimate-actions { display: none !important; }
                        
                        /* 테이블 전체 너비 */
                        .data-table, .estimate-table, .summary-table, .estimate-select-table {
                            width: 100% !important;
                            table-layout: fixed !important;
                            font-size: 10px !important;
                        }
                        
                        /* 테이블 헤더 */
                        .data-table th, .estimate-table th, .summary-table th {
                            padding: 5px 3px !important;
                            font-size: 9px !important;
                            white-space: nowrap !important;
                        }
                        
                        /* 테이블 셀 */
                        .data-table td, .estimate-table td, .summary-table td {
                            padding: 4px 3px !important;
                            font-size: 10px !important;
                            white-space: nowrap !important;
                            overflow: hidden !important;
                            text-overflow: ellipsis !important;
                        }
                        
                        /* 품명/규격 열은 줄바꿈 허용 및 자동 확장 */
                        .data-table .col-name, .estimate-table td:nth-child(2) {
                            white-space: normal !important;
                            word-break: keep-all !important;
                            width: auto !important;
                        }
                        
                        /* 원가관리표 컬럼 너비 */
                        .data-table colgroup col:nth-child(1) { width: 18px; } /* No */
                        .data-table colgroup col:nth-child(2) { width: 32px; } /* 구분 */
                        .data-table colgroup col:nth-child(3) { width: auto; } /* 품명 */
                        .data-table colgroup col:nth-child(4) { width: 70px; } /* 규격 */
                        .data-table colgroup col:nth-child(5) { width: 28px; } /* 단위 */
                        .data-table colgroup col:nth-child(6) { width: 28px; } /* 수량 */
                        .data-table colgroup col:nth-child(7) { width: 50px; } /* 단가 */
                        .data-table colgroup col:nth-child(8) { width: 60px; } /* 금액 */
                        .data-table colgroup col:nth-child(9) { width: 45px; } /* 비고 */
                        
                        /* 견적서 컬럼 너비 */
                        .estimate-table colgroup col:nth-child(1) { width: 18px; } /* No */
                        .estimate-table colgroup col:nth-child(2) { width: auto; } /* 품명 */
                        .estimate-table colgroup col:nth-child(3) { width: 70px; } /* 규격 */
                        .estimate-table colgroup col:nth-child(4) { width: 28px; } /* 단위 */
                        .estimate-table colgroup col:nth-child(5) { width: 28px; } /* 수량 */
                        .estimate-table colgroup col:nth-child(6) { width: 50px; } /* 단가 */
                        .estimate-table colgroup col:nth-child(7) { width: 60px; } /* 금액 */
                        
                        /* 구분 열 숨기기 */
                        .col-div, th.col-div { display: none !important; }
                        
                        /* 체크박스 숨기기 */
                        input[type="checkbox"] { display: none !important; }
                        
                        /* 행 스타일 정리 */
                        tr { opacity: 1 !important; text-decoration: none !important; }
                        
                        /* 카테고리 헤더 */
                        .category-header { padding: 5px 8px !important; }
                        .category-header h3 { font-size: 10px !important; }
                        .category-header .subtotal { font-size: 10px !important; }
                        
                        /* 총합계 */
                        .grand-total { padding: 8px !important; margin-top: 6px !important; }
                        .total-row { padding: 3px 0 !important; }
                        .total-row label { font-size: 9px !important; }
                        .total-row .amount { font-size: 10px !important; }
                        .total-row.main .amount { font-size: 12px !important; }
                        
                        /* 정보 그리드 */
                        .info-grid { gap: 5px !important; }
                        .info-item { padding: 5px 6px !important; }
                        .info-item label { font-size: 7px !important; }
                        .info-item input, .info-item select, .info-item span { font-size: 9px !important; }
                        
                        /* 메모 전체 표시 */
                        .estimate-memo, .category-memo {
                            overflow: visible !important;
                            max-height: none !important;
                        }
                        .estimate-memo .memo-content, .category-memo textarea {
                            white-space: pre-wrap !important;
                            word-break: break-word !important;
                            font-size: 8px !important;
                        }
                        
                        /* 서명 영역 */
                        .signature-card h4 { font-size: 9px !important; }
                        .sig-field label { font-size: 7px !important; }
                        .sig-field input, .sig-field span { font-size: 8px !important; }
                        
                        /* 조항 */
                        .clause { padding: 6px !important; margin-bottom: 3px !important; }
                        .clause-title { font-size: 9px !important; }
                        .clause-content { font-size: 8px !important; line-height: 1.4 !important; }
                        
                        /* 대금지급 */
                        .payment-item { padding: 5px !important; }
                        .payment-item label { font-size: 7px !important; }
                        .payment-item input, .payment-item span { font-size: 9px !important; }
                        
                        /* 페이지 번호 */
                        .page-number {
                            position: fixed;
                            bottom: 3mm;
                            left: 0;
                            right: 0;
                            text-align: center;
                            font-size: 8px;
                            color: #86868b;
                        }
                        .page-number::after { content: counter(page); }
                        
                        @media screen { .page-number { display: none; } }
                        @media print { .page-number { display: block; } }
                    </style>
                </head>
                <body>
                    ${clonedElement.outerHTML}
                    <div class="page-number"></div>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.onafterprint = function() { window.close(); };
                            }, 500);
                        };
                    <\/script>
                </body>
                </html>
            `);

            printWindow.document.close();
            showToast('인쇄 옵션에서 "머리글/바닥글" 해제 후 PDF 저장', 'success');
        }

        function exportAllData() {
            const blob = new Blob([JSON.stringify({ customers, exportDate: new Date().toISOString() }, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `디자인지그_데이터_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            showToast('데이터 내보내기 완료', 'success');
        }

        function importData() {
            if (!isLoggedIn()) {
                showToast('관리자 로그인이 필요합니다', 'error');
                showAdminModal();
                return;
            }
            document.getElementById('importFile').click();
        }
        function handleImport(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.customers) {
                        customers = data.customers;
                        localStorage.setItem('dz_customers', JSON.stringify(customers));
                        updateCustomerList();
                        showToast('데이터를 불러왔습니다', 'success');
                    }
                } catch { showToast('파일을 읽을 수 없습니다', 'error'); }
            };
            reader.readAsText(file);
        }

        function parseNumber(str) {
            if (typeof str === 'number') return str;
            return parseInt((String(str || '')).replace(/[^0-9-]/g, '')) || 0;
        }
        function formatNumber(num) { return num.toLocaleString('ko-KR'); }

        // 통계 모달
        let chartInstances = {};

        function openStatsModal() {
            document.getElementById('statsModal').classList.add('show');
            renderAllStats();
        }

        function closeStatsModal(event) {
            if (event && event.target !== event.currentTarget) return;
            document.getElementById('statsModal').classList.remove('show');
            // 차트 인스턴스 정리
            Object.values(chartInstances).forEach(chart => chart.destroy());
            chartInstances = {};
        }

        function renderAllStats() {
            const data = customers;

            // 요약 통계
            const totalCustomers = data.length;
            const contractedCustomers = data.filter(c => ['contracted', 'in_progress', 'completed', 'as_done'].includes(c.status));
            const totalContracts = contractedCustomers.length;
            const totalRevenue = contractedCustomers.reduce((sum, c) => sum + parseNumber(c.totalAmount), 0);
            const avgContract = totalContracts > 0 ? Math.round(totalRevenue / totalContracts) : 0;

            document.getElementById('totalCustomers').textContent = totalCustomers;
            document.getElementById('totalContracts').textContent = totalContracts;
            document.getElementById('totalRevenue').textContent = '₩' + formatNumber(totalRevenue);
            document.getElementById('avgContract').textContent = '₩' + formatNumber(avgContract);

            // 차트 렌더링
            renderMonthlyChart(data);
            renderStatusChart(data);
            renderSourceChart(data);
            renderBuildingChart(data);
            renderConversionRate(data);
        }

        function renderMonthlyChart(data) {
            const ctx = document.getElementById('monthlyChart').getContext('2d');

            // 월별 데이터 집계
            const monthlyData = {};
            data.forEach(c => {
                const date = c.createdAt || c.contractDate;
                if (date) {
                    const month = date.substring(0, 7); // YYYY-MM
                    if (!monthlyData[month]) {
                        monthlyData[month] = { count: 0, revenue: 0 };
                    }
                    monthlyData[month].count++;
                    if (['contracted', 'in_progress', 'completed', 'as_done'].includes(c.status)) {
                        monthlyData[month].revenue += parseNumber(c.totalAmount);
                    }
                }
            });

            const sortedMonths = Object.keys(monthlyData).sort();
            const labels = sortedMonths.map(m => {
                const [y, mo] = m.split('-');
                return `${y.slice(2)}년 ${parseInt(mo)}월`;
            });

            if (chartInstances.monthly) chartInstances.monthly.destroy();

            chartInstances.monthly = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels.length ? labels : ['데이터 없음'],
                    datasets: [{
                        label: '고객 등록',
                        data: sortedMonths.map(m => monthlyData[m].count),
                        backgroundColor: 'rgba(102, 126, 234, 0.8)',
                        borderRadius: 6,
                        yAxisID: 'y'
                    }, {
                        label: '계약금액 (만원)',
                        data: sortedMonths.map(m => Math.round(monthlyData[m].revenue / 10000)),
                        type: 'line',
                        borderColor: '#34c759',
                        backgroundColor: 'rgba(52, 199, 89, 0.1)',
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { intersect: false, mode: 'index' },
                    plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
                    scales: {
                        y: { position: 'left', beginAtZero: true, title: { display: true, text: '고객 수', font: { size: 10 } } },
                        y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: '금액 (만원)', font: { size: 10 } } }
                    }
                }
            });
        }

        function renderStatusChart(data) {
            const ctx = document.getElementById('statusChart').getContext('2d');

            const statusCount = {};
            data.forEach(c => {
                const status = c.status || 'consulting';
                statusCount[status] = (statusCount[status] || 0) + 1;
            });

            const statusColors = {
                consulting: '#ff9500',
                hold: '#8e8e93',
                budget_over: '#ff3b30',
                other_company: '#5856d6',
                contracted: '#34c759',
                in_progress: '#ff9500',
                completed: '#30d158',
                as_done: '#00c7be'
            };

            if (chartInstances.status) chartInstances.status.destroy();

            chartInstances.status = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(statusCount).map(s => statusLabels[s] || s),
                    datasets: [{
                        data: Object.values(statusCount),
                        backgroundColor: Object.keys(statusCount).map(s => statusColors[s] || '#86868b'),
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { font: { size: 10 }, padding: 8 } }
                    }
                }
            });
        }

        function renderSourceChart(data) {
            const ctx = document.getElementById('sourceChart').getContext('2d');

            const sourceCount = {};
            data.forEach(c => {
                const source = c.clientSource || '미지정';
                sourceCount[source] = (sourceCount[source] || 0) + 1;
            });

            const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#fa709a'];

            if (chartInstances.source) chartInstances.source.destroy();

            chartInstances.source = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: Object.keys(sourceCount),
                    datasets: [{
                        data: Object.values(sourceCount),
                        backgroundColor: colors.slice(0, Object.keys(sourceCount).length),
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { font: { size: 10 }, padding: 8 } }
                    }
                }
            });
        }

        function renderBuildingChart(data) {
            const ctx = document.getElementById('buildingChart').getContext('2d');

            const buildingCount = {};
            data.forEach(c => {
                const building = c.buildingType || '미지정';
                buildingCount[building] = (buildingCount[building] || 0) + 1;
            });

            if (chartInstances.building) chartInstances.building.destroy();

            chartInstances.building = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(buildingCount),
                    datasets: [{
                        label: '건수',
                        data: Object.values(buildingCount),
                        backgroundColor: [
                            'rgba(102, 126, 234, 0.8)',
                            'rgba(118, 75, 162, 0.8)',
                            'rgba(240, 147, 251, 0.8)',
                            'rgba(245, 87, 108, 0.8)',
                            'rgba(79, 172, 254, 0.8)'
                        ],
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: { x: { beginAtZero: true } }
                }
            });
        }

        function renderConversionRate(data) {
            const contracted = data.filter(c => ['contracted', 'in_progress', 'completed', 'as_done'].includes(c.status)).length;
            const notContracted = data.filter(c => ['budget_over', 'other_company'].includes(c.status)).length;
            const consulting = data.filter(c => ['consulting', 'hold'].includes(c.status)).length;

            const total = contracted + notContracted;
            const rate = total > 0 ? Math.round((contracted / total) * 100) : 0;

            document.getElementById('conversionRate').textContent = rate + '%';
            document.getElementById('contractedCount').textContent = contracted;
            document.getElementById('notContractedCount').textContent = notContracted;
            document.getElementById('consultingCount').textContent = consulting;

            // 원형 그래프 업데이트
            const circle = document.getElementById('conversionCircle');
            circle.style.background = `conic-gradient(#34c759 0%, #34c759 ${rate}%, #e8e8ed ${rate}%, #e8e8ed 100%)`;
        }
