const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.setViewport({width:1280, height:800});
  const url = 'http://localhost:8000/adminwonpro.html';
  try {
    const resp = await page.goto(url, {waitUntil:'networkidle2', timeout:30000});
    console.log('HTTP_STATUS', resp && resp.status());

    // Wait for schedule table body to appear
    await page.waitForSelector('#scheduleTableBody', {timeout:5000});

    // give JS some time to render rows
    await page.waitForTimeout(500);

    // capture screenshot
    const shotPath = '/tmp/schedule_check.png';
    await page.screenshot({path: shotPath, fullPage: true});
    console.log('SCREENSHOT_SAVED', shotPath);

    // Evaluate scheduleRows and rendered selects for first 8 rows
    const result = await page.evaluate(() => {
      const rows = (window.scheduleRows || []).slice(0,8).map(r => ({category:r.category||'', name:r.name||'', checkPoint:r.checkPoint||''}));
      const rendered = [];
      const trs = document.querySelectorAll('#scheduleTableBody tr');
      for (let i=0;i<Math.min(trs.length,8);i++){
        const tr = trs[i];
        const catSel = tr.querySelector('.category-select');
        const procSel = tr.querySelector('.process-select');
        rendered.push({
          index: i,
          categorySelectValue: catSel ? catSel.value : null,
          processSelectValue: procSel ? procSel.value : null,
          processOptionsCount: procSel ? procSel.options.length : 0
        });
      }
      return {rows, rendered};
    });

    console.log('RESULT', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('ERROR', err && err.message);
  } finally {
    await browser.close();
  }
})();