import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.setViewport({width:1280, height:800});
  const url = 'http://localhost:8000/adminwonpro.html';
  try {
    const resp = await page.goto(url, {waitUntil:'networkidle2', timeout:30000});
    console.log('HTTP_STATUS', resp && resp.status());

    // Ensure schedule template is loaded and schedule tab is opened so JS populates scheduleRows and renders rows
    await page.evaluate(async () => {
      try {
        // Ensure there is a fallback defaultScheduleSteps available in page scope
        if (typeof defaultScheduleSteps === 'undefined' || !defaultScheduleSteps || defaultScheduleSteps.length === 0) {
          defaultScheduleSteps = [
            { category: '기획·현장 사전 준비', name: '디자인 상담 및 설계', checkPoint: '설계 도면 확정 여부', inCharge: 'DESIGN JIG' },
            { category: '기획·현장 사전 준비', name: '현장 실측', checkPoint: '실측 완료 여부', inCharge: '원프로 소장 (010-4650-7013)' },
            { category: '기획·현장 사전 준비', name: '철거 및 폐기물 처리', checkPoint: '철거 완료 및 폐기물 반출', inCharge: '원프로 소장 (010-4650-7013)' },
            { category: '목공·천장·벽체', name: '목공 작업', checkPoint: '구조물 설치 완료', inCharge: '목공팀' },
            { category: '목공·천장·벽체', name: '천장 마감', checkPoint: '천장 마감재 시공', inCharge: '목공팀' },
            { category: '목공·천장·벽체', name: '벽체 마감', checkPoint: '벽체 마감재 시공', inCharge: '목공팀' },
            { category: '전기·조명', name: '전기 배선', checkPoint: '배선 완료 및 점검', inCharge: '전기팀' },
            { category: '전기·조명', name: '조명 설치', checkPoint: '조명 설치 및 점등 확인', inCharge: '전기팀' },
            { category: '도배·장판', name: '도배 작업', checkPoint: '도배 완료', inCharge: '도배팀' },
            { category: '도배·장판', name: '장판 시공', checkPoint: '장판 시공 완료', inCharge: '장판팀' },
            { category: '주방·욕실', name: '주방 가구 설치', checkPoint: '주방 가구 설치 완료', inCharge: '주방팀' },
            { category: '주방·욕실', name: '욕실 타일', checkPoint: '타일 시공 완료', inCharge: '타일팀' },
            { category: '주방·욕실', name: '욕실 기구 설치', checkPoint: '위생기구 설치 완료', inCharge: '설비팀' },
            { category: '창호·유리', name: '창호 설치', checkPoint: '창호 설치 및 밀폐 확인', inCharge: '창호팀' },
            { category: '창호·유리', name: '유리 시공', checkPoint: '유리 시공 완료', inCharge: '창호팀' },
            { category: '마감·정리', name: '최종 청소', checkPoint: '청소 완료', inCharge: '원프로 소장 (010-4650-7013)' },
            { category: '마감·정리', name: '하자 점검', checkPoint: '하자 확인 및 보수', inCharge: '원프로 소장 (010-4650-7013)' },
            { category: '마감·정리', name: '준공 및 인계', checkPoint: '고객 인수 확인', inCharge: '원프로 소장 (010-4650-7013)' }
          ];
        }
        // debug: expose defaultScheduleSteps info
        // (will be read back by node script)
        window.__dbg_defaultSchedule = { type: typeof defaultScheduleSteps, len: (defaultScheduleSteps||[]).length };
        if (typeof fetchScheduleTemplate === 'function') await fetchScheduleTemplate().catch(() => {});
        if (typeof showCustomerTab === 'function') {
          showCustomerTab('schedule');
        } else if (typeof loadScheduleForCustomer === 'function') {
          loadScheduleForCustomer();
        }
        // Force visible the customer view / schedule panel for reliable layout measurement
        try {
          const cv = document.getElementById('customerView');
          if (cv && window.getComputedStyle(cv).display === 'none') cv.style.display = 'block';
          const ps = document.getElementById('panel-schedule');
          if (ps && window.getComputedStyle(ps).display === 'none') ps.style.display = 'block';
          // Also ensure any tab-panel ancestors are visible
          document.querySelectorAll('.tab-panel').forEach(el => { if (window.getComputedStyle(el).display === 'none') el.style.display = 'block'; });
        } catch (e) {}
      } catch (e) {
        // ignore
      }
    });
    const dbg = await page.evaluate(() => window.__dbg_defaultSchedule || null);
    console.log('DBG_DEFAULT_TEMPLATE', JSON.stringify(dbg));
    await page.waitForSelector('#scheduleTableBody', {timeout:5000});
    await page.waitForFunction(() => document.querySelectorAll('#scheduleTableBody tr').length > 0, {timeout:5000}).catch(() => {});
    await new Promise(r => setTimeout(r, 500));

    const shotPath = '/tmp/schedule_check.png';
    await page.screenshot({path: shotPath, fullPage: true});
    console.log('SCREENSHOT_SAVED', shotPath);

    const result = await page.evaluate(() => {
      const rows = (window.scheduleRows || []).slice(0,8).map(r => ({category:r.category||'', name:r.name||'', checkPoint:r.checkPoint||''}));
      const rendered = [];
      const trs = document.querySelectorAll('#scheduleTableBody tr');
      for (let i=0;i<Math.min(trs.length,8);i++){
        const tr = trs[i];
        const catSel = tr.querySelector('.category-select');
        const procSel = tr.querySelector('.process-select');
        const getStyles = (el) => {
          if (!el) return null;
          const cs = window.getComputedStyle(el);
          return {
            display: cs.display,
            visibility: cs.visibility,
            opacity: cs.opacity,
            pointerEvents: cs.pointerEvents,
            appearance: cs.appearance || cs.webkitAppearance || null,
            width: cs.width,
            height: cs.height
          };
        };
        rendered.push({
          index: i,
          categorySelectValue: catSel ? catSel.value : null,
          categorySelectOuter: catSel ? catSel.outerHTML : null,
          categorySelectStyles: getStyles(catSel),
          processSelectValue: procSel ? procSel.value : null,
          processSelectOuter: procSel ? procSel.outerHTML : null,
          processSelectStyles: getStyles(procSel),
          processOptionsCount: procSel ? procSel.options.length : 0,
          processFirstOptionText: procSel && procSel.options.length>0 ? procSel.options[0].text : null,
          processDisabled: procSel ? procSel.disabled : null
        });
      }
      return {rows, rendered};
    });
    // 추가: 테이블/컬럼 너비 정보 수집
    const tableMetrics = await page.evaluate(() => {
      const tbl = document.querySelector('#panel-schedule .data-table');
      if (!tbl) return null;
      const cols = Array.from(tbl.querySelectorAll('col')).map(c => c.getAttribute('style') || c.style.width || null);
      const ths = Array.from(tbl.querySelectorAll('thead th')).map(th => th.offsetWidth);
      const firstRowTds = (() => {
        const tr = tbl.querySelector('tbody tr');
        return tr ? Array.from(tr.querySelectorAll('td')).map(td => td.offsetWidth) : [];
      })();
      const cs = window.getComputedStyle(tbl);
      const rect = tbl.getBoundingClientRect();
      // find nearest ancestor with display none (if any)
      let hiddenAncestor = null;
      let el = tbl;
      while (el) {
        const s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity)===0) {
          hiddenAncestor = { tag: el.tagName.toLowerCase(), id: el.id || null, classes: el.className || null, display: s.display, visibility: s.visibility, opacity: s.opacity };
          break;
        }
        el = el.parentElement;
      }
      return {
        tableOffsetWidth: tbl.offsetWidth,
        tableOffsetHeight: tbl.offsetHeight,
        theadOffsetWidth: (tbl.querySelector('thead') && tbl.querySelector('thead').offsetWidth) || null,
        firstRowOffsetWidth: (tbl.querySelector('tbody tr') && tbl.querySelector('tbody tr').offsetWidth) || null,
        colStyles: cols,
        theadThWidths: ths,
        firstRowTdWidths: firstRowTds,
        computedStyle: { display: cs.display, visibility: cs.visibility, opacity: cs.opacity, position: cs.position },
        boundingClientRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, top: rect.top, left: rect.left },
        hiddenAncestor
      };
    });
    const final = { debug: result, tableMetrics };
    console.log('RESULT', JSON.stringify(final, null, 2));

    console.log('RESULT', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('ERROR', err && err.message);
  } finally {
    await browser.close();
  }
})();