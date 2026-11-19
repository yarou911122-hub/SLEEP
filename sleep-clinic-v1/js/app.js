(() => {
  'use strict';
  const data = window.CLINIC_DEMO;
  const main = document.querySelector('#main');
  const titles = { home: '首頁', cases: '個案管理', detail: '個案詳細資料', visits: '回診管理', assessments: '評估表單狀態', notifications: 'LINE 通知狀態' };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const badge = value => `<span class="badge ${['已完成', '追蹤中', '已發送（模擬）'].includes(value) ? 'positive' : ['待填寫', '未綁定', '待初診'].includes(value) ? 'pending' : ''}">${escape(value)}</span>`;
  const caseLink = item => `<a class="text-link" href="#detail/${item.id}" aria-label="查看${item.name}詳細資料">${item.name}</a><small class="cell-sub">${item.id}</small>`;
  const table = (headers, rows, empty = '目前沒有符合條件的資料。') => `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('') : `<tr><td class="empty" colspan="${headers.length}">${empty}</td></tr>`}</tbody></table></div>`;
  const heading = (title, description, action = '') => `<div class="page-heading"><div><p class="eyebrow">SLEEP CLINIC / V1</p><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
  const panel = (title, content, extra = '') => `<section class="panel"><div class="panel-heading"><h2>${title}</h2>${extra}</div>${content}</section>`;
  const visitRows = cases => cases.map(c => [caseLink(c), escape(c.nextVisit), escape(c.time), badge(c.status), `<a class="text-link" href="#detail/${c.id}">查看個案</a>`]);

  function renderHome() {
    const today = data.cases.filter(c => c.nextVisit === data.referenceDate);
    const stats = [ ['收案總數', data.cases.length, '全部示範個案'], ['追蹤中', data.cases.filter(c => c.status === '追蹤中').length, '持續追蹤的個案'], ['當日回診', today.length, `示範基準日 ${data.referenceDate}`], ['待完成評估', data.cases.filter(c => c.assessment !== '已完成').length, '包含待填寫與填寫中'] ];
    main.innerHTML = heading('首頁', '掌握回診安排，接續今天的個案管理工作。') + `<div class="notice">第一步：基本架構已建立。可切換頁面、搜尋個案及查看詳細資料；新增與編輯將於下一步完成。</div><div class="stats">${stats.map(([title, count, hint]) => `<section class="stat"><h2>${title}</h2><strong>${count}<span>人</span></strong><p>${hint}</p></section>`).join('')}</div>` + panel('當日回診', table(['個案', '回診日期', '時間', '個案狀態', '操作'], visitRows(today)), '<a class="text-link" href="#visits">所有回診 →</a>') + `<div class="two-columns">${panel('待辦事項', '<ul class="task-list"><li><a href="#assessments">確認尚未完成的評估表單</a><span>2 件</span></li><li><a href="#notifications">查看通知與綁定狀態</a><span>模擬資料</span></li></ul>')}${panel('目前開發進度', '<p class="panel-copy">已完成頁面架構與導覽。接下來會依序加入個案新增／編輯、回診維護、評估與通知流程。</p>')}</div>`;
  }

  function renderCases() {
    main.innerHTML = heading('個案管理', '依個案姓名或編號查詢，進入詳細資料查看紀錄。', '<button disabled title="下一步實作">新增個案（下一步）</button>') + panel('個案清單', `<div class="filters"><label>搜尋姓名或編號<input id="case-search" type="search" placeholder="例如：示範個案甲、DEMO-001"></label><label>個案狀態<select id="status-filter"><option value="">全部狀態</option><option>待初診</option><option>追蹤中</option><option>已結案</option></select></label></div><p id="result-count" class="result-count" aria-live="polite"></p><div id="case-results"></div>`);
    function update() {
      const query = document.querySelector('#case-search').value.trim().toLowerCase();
      const status = document.querySelector('#status-filter').value;
      const found = data.cases.filter(c => (!status || c.status === status) && `${c.name} ${c.id}`.toLowerCase().includes(query));
      document.querySelector('#result-count').textContent = `共 ${found.length} 位個案`;
      document.querySelector('#case-results').innerHTML = table(['個案', '年齡', '個案狀態', '下次回診', '操作'], found.map(c => [caseLink(c), `${c.age} 歲`, badge(c.status), c.nextVisit || '—', `<a class="text-link" href="#detail/${c.id}">查看資料</a>`]));
    }
    document.querySelector('#case-search').addEventListener('input', update);
    document.querySelector('#status-filter').addEventListener('change', update);
    update();
  }

  function renderDetail(id) {
    const c = data.cases.find(item => item.id === id);
    if (!c) { main.innerHTML = heading('找不到個案', '此示範編號不存在。') + '<a class="text-link" href="#cases">返回個案清單</a>'; return; }
    main.innerHTML = `<a class="back-link" href="#cases">← 返回個案清單</a>` + heading(c.name, `${c.id} · 虛構示範個案`, '<button disabled title="下一步實作">編輯資料（下一步）</button>') + panel('基本資料', `<dl class="details"><div><dt>個案編號</dt><dd>${c.id}</dd></div><div><dt>姓名</dt><dd>${c.name}</dd></div><div><dt>年齡</dt><dd>${c.age} 歲</dd></div><div><dt>個案狀態</dt><dd>${badge(c.status)}</dd></div></dl>`) + `<div class="two-columns">${panel('回診安排', `<p class="panel-copy">${c.nextVisit ? `${c.nextVisit}　${c.time}` : '目前沒有回診安排'}</p><p class="muted">第一步僅顯示下一次安排，歷次回診紀錄待後續實作。</p>`)}${panel('表單與通知', `<dl class="status-list"><div><dt>評估表單</dt><dd>${badge(c.assessment)}</dd></div><div><dt>LINE 狀態</dt><dd>${badge(c.line)}</dd></div></dl>`)}</div>` + panel('管理備註', `<p class="panel-copy">${escape(c.note)}</p>`);
  }

  function render() {
    const [requested, id] = location.hash.slice(1).split('/');
    const page = Object.hasOwn(titles, requested) ? requested : 'home';
    document.querySelectorAll('nav a').forEach(a => {
      const active = a.dataset.page === (page === 'detail' ? 'cases' : page);
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = `${titles[page]}｜睡眠門診 V1`;
    if (page === 'home') renderHome();
    if (page === 'cases') renderCases();
    if (page === 'detail') renderDetail(id);
    if (page === 'visits') main.innerHTML = heading('回診管理', '依日期檢視目前已安排的回診。第一步僅提供清單瀏覽。') + panel('回診安排', table(['個案', '回診日期', '時間', '個案狀態', '操作'], visitRows(data.cases.filter(c => c.nextVisit).sort((a, b) => `${a.nextVisit} ${a.time}`.localeCompare(`${b.nextVisit} ${b.time}`)))));
    if (page === 'assessments') main.innerHTML = heading('評估表單狀態', '示範表單的填寫進度；表單內容與填寫功能將於後續步驟製作。') + panel('評估追蹤', table(['個案', '示範表單', '填寫狀態'], data.cases.map(c => [caseLink(c), '睡眠評估表（佔位名稱）', badge(c.assessment)])));
    if (page === 'notifications') main.innerHTML = heading('LINE 通知狀態', '僅呈現虛構通知狀態，不會實際發送任何訊息。') + '<div class="notice">此頁為展示資料；目前沒有綁定、排程或發送功能。</div>' + panel('通知追蹤', table(['個案', '通知項目', '狀態'], data.cases.map(c => [caseLink(c), c.nextVisit ? '回診提醒（模擬）' : '—', badge(c.line)])));
  }
  window.addEventListener('hashchange', () => { render(); main.focus(); });
  render();
})();
