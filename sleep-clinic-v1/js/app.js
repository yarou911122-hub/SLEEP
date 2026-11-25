/* 畫面、導覽與表單事件。無外部套件，支援直接開啟及 Go Live。 */
(() => {
  'use strict';
  const M = window.ClinicModel;
  const KEY = 'sleep-clinic-requirements-v1';
  let data = window.makeClinicSeed();
  let storageWarning = '';
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!M.validate(parsed)) throw Error('格式不符');
      data = parsed;
    }
  } catch (_) { storageWarning = '無法讀取本機資料，目前顯示預設示範。若要恢復保存，請由管理員重設示範資料。'; }
  let user = null;
  let search = '';
  let caseStatus = '';
  let taskType = 'all';
  let taskRange = 'due';
  let taskState = 'pending';
  let assessmentFilter = '';
  let currentTask = '';
  let toastTimer;
  let previousFocus;
  const app = document.querySelector('#app');
  const dialog = document.querySelector('#editor');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const button = (label, action, id = '', style = '') => `<button type="button" class="${style}" data-action="${action}" data-id="${esc(id)}">${label}</button>`;
  const link = (label, href, style = 'text-link') => `<a class="${style}" href="${href}">${label}</a>`;
  const badge = status => `<span class="badge ${['已處理', '已確認', '已完成', '追蹤中'].includes(status) ? 'positive' : ['待聯繫', '待填寫', '待初診'].includes(status) ? 'pending' : ''}">${esc(status)}</span>`;
  const options = (values, selected) => values.map(v => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(v)}</option>`).join('');
  const dateField = (name, title, value = data.referenceDate, required = true) => `<label>${title}${required ? ' <span class="required">必填</span>' : ''}<input type="date" name="${name}" value="${esc(value)}" ${required ? 'required' : ''}></label>`;
  const field = (name, title, value = '', extra = '') => `<label>${title}<input name="${name}" value="${esc(value)}" ${extra}></label>`;
  const textarea = (name, title, value = '', required = false) => `<label class="full">${title}<textarea name="${name}" rows="4" maxlength="2000" ${required ? 'required' : ''}>${esc(value)}</textarea></label>`;
  const select = (name, title, values, value) => `<label>${title}<select name="${name}">${options(values, value)}</select></label>`;
  const table = (headers, rows, empty = '目前沒有符合條件的資料。') => `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td class="empty" colspan="${headers.length}">${empty}</td></tr>`}</tbody></table></div>`;
  const panel = (title, content, action = '') => `<section class="panel"><div class="panel-heading"><h2>${title}</h2>${action}</div>${content}</section>`;
  const heading = (title, description, action = '') => `<div class="page-heading"><div><p class="eyebrow">睡眠門診個案管理</p><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
  const person = id => data.cases.find(c => c.id === id);
  const personLink = id => `${link(esc(person(id)?.name || '找不到個案'), `#detail/${encodeURIComponent(id)}/overview`)}<small class="cell-sub">${esc(id)}</small>`;
  const stamp = value => { const d = new Date(value); return Number.isNaN(+d) ? '—' : d.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }); };

  function toast(text) {
    const box = document.querySelector('#message');
    clearTimeout(toastTimer); box.textContent = text; box.classList.add('visible');
    toastTimer = setTimeout(() => box.classList.remove('visible'), 5500);
  }
  function persist(next) {
    if (!M.validate(next)) throw Error('資料檢核未通過，請確認日期與欄位。輸入內容已保留。');
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch (_) { throw Error('本機儲存失敗，可能是容量不足或瀏覽器禁止保存。輸入內容已保留，請處理後再按儲存。'); }
    data = next;
  }
  function openEditor(title, content, onSave, saveLabel = '儲存') {
    previousFocus = document.activeElement;
    dialog.innerHTML = `<form id="edit-form"><div class="dialog-heading"><div><p class="eyebrow">僅限虛構資料</p><h2 id="dialog-title">${title}</h2></div>${button('關閉', 'close', '', 'quiet')}</div><div class="form-grid">${content}</div><p class="form-error" id="form-error" role="alert"></p><div class="dialog-actions">${button('取消', 'close', '', 'secondary')}<button type="submit" class="primary">${saveLabel}</button></div></form>`;
    dialog.showModal();
    document.querySelector('#edit-form').addEventListener('submit', event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      try {
        const next = M.clone(data);
        const after = onSave(next, values);
        persist(next);
        dialog.close();
        if (typeof after === 'string' && location.hash !== after) location.hash = after;
        else render();
        toast('已儲存至此瀏覽器，相關清單與摘要已更新。');
      } catch (error) {
        const target = document.querySelector('#form-error'); target.textContent = error.message; target.scrollIntoView({ block: 'nearest' });
      }
    });
  }
  dialog.addEventListener('close', () => { if (previousFocus?.isConnected) previousFocus.focus(); else document.querySelector('#main')?.focus(); });

  function renderLogin() {
    app.innerHTML = `<main id="main" class="login-page"><div class="login-intro"><div class="brand"><span class="brand-mark">眠</span><div>睡眠門診<small>個案管理系統</small></div></div><p class="eyebrow">醫護工作台 / V1</p><h1>把每一次追蹤<br>接續得更清楚。</h1><p>從今天的待辦開始，集中管理個案、回診、評估與人工聯繫紀錄。</p><div class="login-note">前端示範原型<br>只使用虛構資料，未串接院內系統與 LINE。</div></div><section class="login-card"><h2>進入示範工作台</h2><p>選用以下示範帳號，體驗不同角色。</p><form id="login-form">${field('account', '帳號', 'demo_manager', 'required autocomplete="off"')}${field('password', '密碼', '', 'type="password" required autocomplete="off"')}<p id="login-error" class="form-error" role="alert"></p><button class="primary" type="submit">登入示範</button></form><div class="credentials"><p>個案管理員：<code>demo_manager</code></p><p>系統管理員：<code>demo_admin</code></p><p>共用示範密碼：<code>demo1234</code></p></div><p class="small">此為介面角色模擬，沒有伺服器身分驗證或真正的存取保護。</p></section></main>`;
    document.querySelector('#login-form').addEventListener('submit', e => {
      e.preventDefault();
      const form = e.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      if (!['demo_manager', 'demo_admin'].includes(values.account.trim()) || values.password !== 'demo1234') {
        document.querySelector('#login-error').textContent = '無法登入，請確認示範帳號與密碼。'; form.elements.password.value = ''; form.elements.password.focus(); return;
      }
      user = { name: values.account.trim() === 'demo_admin' ? '示範管理員' : '示範個管', role: values.account.trim() === 'demo_admin' ? '系統管理員' : '個案管理員' };
      render();
    });
  }
  function shell(page) {
    const nav = [['home', '工作首頁'], ['cases', '個案管理'], ['visits', '回診管理'], ['assessments', '評估表單'], ['notifications', 'LINE 聯繫與待辦']];
    if (user.role === '系統管理員') nav.push(['settings', '原型設定']);
    app.innerHTML = `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#home"><span class="brand-mark">眠</span><div>睡眠門診<small>個案管理系統</small></div></a><p class="nav-label">我的工作區</p><nav aria-label="主要導覽">${nav.map(([key, name]) => `<a href="#${key}" ${key === (page === 'detail' ? 'cases' : page) ? 'class="active" aria-current="page"' : ''}>${name}</a>`).join('')}</nav><div class="sidebar-bottom"><span class="version">V1 · 人工作業原型</span><p>查找個案、完成聯繫，<br>回系統留下處理紀錄。</p><div class="user-block"><strong>${user.name}</strong><span>${user.role}</span></div>${button('登出', 'logout', '', 'sidebar-button')}</div></aside><div class="workspace"><header class="topbar"><span>示範工作日 <strong>${data.referenceDate}</strong></span><span class="demo-label">假資料 · 本機保存</span></header><main id="main" tabindex="-1"></main><footer>僅供操作驗收。LINE 聯繫須在外部人工完成；「已處理」不代表已讀。<br>本機資料不跨電腦或瀏覽器同步，請勿輸入真實個資。</footer></div></div>`;
    if (storageWarning) document.querySelector('#main').insertAdjacentHTML('beforebegin', `<div class="storage-warning" role="alert">${storageWarning}</div>`);
  }
  function taskRows(tasks) {
    return tasks.map(t => [personLink(t.caseId), `<strong class="row-title">${esc(t.title)}</strong><small class="cell-sub">${esc(t.type)}</small>`, `<span class="${t.due < data.referenceDate && t.status !== '已處理' ? 'overdue' : ''}">${t.due}</span>`, badge(t.status), button(t.status === '已處理' ? '查看結果' : '處理待辦', 'task', t.id, 'secondary compact')]);
  }
  function home(main) {
    const pending = M.pending(data);
    const forms = data.assessments.filter(a => a.status !== '已確認').length;
    const contacts = data.tasks.filter(t => t.status !== '已處理').length;
    const month = data.referenceDate.slice(0, 7);
    const monthVisits = data.visits.filter(v => v.date.startsWith(month) && v.status !== '已取消').length;
    const recent = data.visits.filter(v => v.date >= data.referenceDate && v.status === '已安排').sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).slice(0, 5);
    const counts = ['追蹤中', '待初診', '已結案'].map(status => data.cases.filter(c => c.status === status).length);
    const total = data.cases.length;
    const first = total ? counts[0] / total * 100 : 0;
    const second = total ? (counts[0] + counts[1]) / total * 100 : 0;
    const chart = `<div class="case-chart"><div class="donut" role="img" aria-label="個案共 ${total} 人：追蹤中 ${counts[0]} 人、待初診 ${counts[1]} 人、已結案 ${counts[2]} 人" style="--segment-one:${first}%;--segment-two:${second}%"><div><strong>${total}</strong><span>個案總數</span></div></div><ul class="chart-legend">${['追蹤中', '待初診', '已結案'].map((name, i) => `<li><span class="legend-name"><i class="legend-color color-${i}"></i>${name}</span><strong>${counts[i]}</strong></li>`).join('')}</ul></div><p class="chart-note">依目前個案狀態統計，每位個案僅計一次。</p>`;
    main.innerHTML = heading(`您好，${esc(user.name)}`, `示範工作日 ${data.referenceDate} · ${user.role}`) + `<div class="stats dashboard-stats">${[['個案總數', total, '目前收案人數', '#cases'], ['本月回診', monthVisits, `${month}，不含取消`, '#visits'], ['待確認表單', forms, '尚未人工確認', '#assessments'], ['待辦事項', contacts, '含未來到期的待辦', '#notifications']].map(([label, count, hint, href]) => `<a class="stat" href="${href}"><span>${label}</span><strong>${count}</strong><span class="stat-hint">${hint}</span></a>`).join('')}</div><div class="dashboard-grid">${panel('近期回診名單', table(['回診日期', '個案', '狀態', '備註'], recent.map(v => [v.date + `<small class="cell-sub">${v.time}</small>`, personLink(v.caseId), badge(v.date === data.referenceDate ? '今日回診' : '即將回診'), esc(v.location)])), link('查看全部', '#visits'))}${panel('個案狀態統計', chart)}</div>` + panel('今日待辦（含逾期）', table(['個案', '待辦事項', '到期日', '狀態', '操作'], taskRows(pending)), link('查看待辦', '#notifications'));
  }
  function cases(main) {
    main.innerHTML = heading('個案管理', '以姓名或識別碼查詢，確認既有資料後再新增收案。') + panel('個案清單', `<div class="filters case-query"><label class="search-field">姓名／示範識別碼<input id="case-search" type="search" placeholder="輸入姓名或 DEMO-001" value="${esc(search)}"></label><label>個案狀態<select id="case-status"><option value="">全部狀態</option>${options(['待初診', '追蹤中', '已結案'], caseStatus)}</select></label><div class="query-buttons">${button('查詢', 'query-cases', '', 'primary')}${button('清除', 'clear-cases', '', 'secondary')}</div></div><div class="list-summary"><span id="result-count" aria-live="polite"></span><div id="new-case-entry"></div></div><div id="case-results"></div>`);
    function update() {
      search = document.querySelector('#case-search').value;
      caseStatus = document.querySelector('#case-status').value;
      const q = search.trim().toLowerCase();
      const found = data.cases.filter(c => `${c.id} ${c.name}`.toLowerCase().includes(q) && (!caseStatus || c.status === caseStatus));
      const matchesAny = data.cases.some(c => `${c.id} ${c.name}`.toLowerCase().includes(q));
      document.querySelector('#result-count').textContent = `共 ${found.length} 位個案`;
      document.querySelector('#new-case-entry').innerHTML = q && !matchesAny ? button('新增個案', 'new-case', '', 'primary compact') : '<span class="small">查無既有個案後，即可新增</span>';
      document.querySelector('#case-results').innerHTML = table(['個案', '狀態', '下次回診', '未完成待辦', '操作'], found.map(c => {
        const visit = M.nextVisit(data, c.id);
        return [personLink(c.id), badge(c.status), visit ? `${visit.date}<small class="cell-sub">${visit.time} · ${esc(visit.location)}</small>` : '尚未安排', `${data.tasks.filter(t => t.caseId === c.id && t.status !== '已處理').length} 件`, link('查看個案', `#detail/${c.id}/overview`, 'button secondary compact')];
      }), q && !matchesAny ? '查無個案。請確認查詢條件，或按「新增個案」收案。' : '沒有符合條件的個案，請調整搜尋或狀態。');
    }
    document.querySelector('#case-search').addEventListener('input', update);
    document.querySelector('#case-status').addEventListener('change', update);
    document.querySelector('[data-action="query-cases"]').addEventListener('click', update);
    document.querySelector('[data-action="clear-cases"]').addEventListener('click', () => {
      document.querySelector('#case-search').value = '';
      document.querySelector('#case-status').value = '';
      update();
      document.querySelector('#case-search').focus();
    });
    update();
  }
  function detail(main, id, requestedTab) {
    const c = person(id);
    if (!c) { main.innerHTML = heading('找不到個案', '此識別碼不存在，請返回清單重新搜尋。') + link('返回個案清單', '#cases'); return; }
    const tabs = [['overview', '基本資料與待辦'], ['followup', '追蹤與回診'], ['assessment', '評估表單'], ['contact', 'LINE 聯繫紀錄']];
    const tab = tabs.some(([key]) => key === requestedTab) ? requestedTab : 'overview';
    main.innerHTML = `<div class="breadcrumbs">${link('個案管理', '#cases')}<span>／</span><span>個案詳細資料</span></div>` + heading('個案詳細資料', `${esc(c.name)} · ${esc(c.id)}`, button('編輯資料', 'edit-case', id, 'primary')) + `<nav class="tabs" aria-label="個案資料分頁">${tabs.map(([key, title]) => `<a href="#detail/${c.id}/${key}" ${key === tab ? 'class="active" aria-current="page"' : ''}>${title}</a>`).join('')}</nav><div id="detail-content"></div>`;
    const content = document.querySelector('#detail-content');
    if (tab === 'overview') {
      const visit = M.nextVisit(data, id);
      content.innerHTML = `<div class="patient-layout">${panel('基本資料', `<dl class="patient-facts"><div><dt>示範識別碼</dt><dd>${esc(c.id)}</dd></div><div><dt>姓名</dt><dd>${esc(c.name)}</dd></div><div><dt>收案日期</dt><dd>${c.enrolled}</dd></div><div><dt>個案狀態</dt><dd>${badge(c.status)}</dd></div><div><dt>未完成待辦</dt><dd>${data.tasks.filter(t => t.caseId === id && t.status !== '已處理').length} 件</dd></div><div><dt>備註</dt><dd class="preserve">${esc(c.note || '尚無備註')}</dd></div></dl>`)}<div>${panel('下一次回診', visit ? `<div class="next-visit"><strong>${visit.date}</strong><p>${visit.time} · ${esc(visit.location)}</p>${button('登記回診紀錄', 'visit-record', id, 'primary')}</div>` : `<div class="next-visit"><p>尚未安排回診</p>${button('安排回診', 'new-visit', id, 'primary')}</div>`)}${panel('快速操作', `<div class="quick-links">${link('回診與追蹤紀錄', `#detail/${id}/followup`)}${link('評估表單', `#detail/${id}/assessment`)}${link('LINE 聯繫紀錄', `#detail/${id}/contact`)}${button('新增追蹤紀錄', 'new-record', id, 'quiet')}</div>`)}</div></div>` + panel('目前待辦', table(['個案', '待辦事項', '到期日', '狀態', '操作'], taskRows(data.tasks.filter(t => t.caseId === id && t.status !== '已處理'))));
    }
    if (tab === 'followup') content.innerHTML = panel('回診安排', visitTable(data.visits.filter(v => v.caseId === id)), button('安排回診', 'new-visit', id, 'secondary compact')) + panel('歷次追蹤與諮詢', recordList(id), button('新增追蹤紀錄', 'new-record', id, 'primary compact'));
    if (tab === 'assessment') content.innerHTML = `<p class="section-note">傳送連結不代表已填寫。請人工查閱回覆後，再登錄「已確認」。</p>` + panel('評估表單', assessmentTable(data.assessments.filter(a => a.caseId === id)), button('新增表單追蹤', 'new-assessment', id, 'secondary compact'));
    if (tab === 'contact') content.innerHTML = `<p class="section-note">請在官方 LINE 人工聯繫，再回到此處登錄；本系統不會發送訊息或判定已讀。</p>` + panel('聯繫紀錄', contactList(id), button('登錄聯繫結果', 'new-contact', id, 'primary compact'));
  }
  function visitTable(items) {
    return table(['個案', '回診日期／時間', '地點', '狀態', '操作'], [...items].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).map(v => [personLink(v.caseId), `${v.date}<small class="cell-sub">${v.time}</small>`, esc(v.location), badge(v.status), button('修改安排', 'edit-visit', v.id, 'secondary compact')]));
  }
  function recordList(id) {
    const rows = data.records.filter(r => r.caseId === id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    return `<div class="timeline">${rows.length ? rows.map(r => `<article><div class="record-heading"><strong>${r.date}</strong><span>${esc(r.kind)}</span></div><p class="preserve">${esc(r.content)}</p>${r.nextDate ? `<p>下次追蹤：${r.nextDate}</p>` : ''}<small>${esc(r.createdBy)} · 登錄於 ${stamp(r.createdAt)}</small></article>`).join('') : '<p class="empty">尚無追蹤紀錄，請新增第一筆。</p>'}</div>`;
  }
  function assessmentTable(items) {
    return table(['個案／表單', '狀態', '傳送／確認日期', '操作'], items.map(a => [personLink(a.caseId) + `<span class="cell-sub">${esc(a.name)}</span>`, badge(a.status), `傳送：${a.sentDate || '—'}<small class="cell-sub">確認：${a.confirmedDate || '—'}</small>`, `<div class="actions">${button('示範連結', 'copy-assessment', a.id, 'quiet compact')}${button('登錄確認', 'edit-assessment', a.id, 'secondary compact')}</div>`]));
  }
  function contactList(id) {
    const rows = data.contacts.filter(c => c.caseId === id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    return `<div class="timeline">${rows.length ? rows.map(r => `<article><div class="record-heading"><strong>${r.date} · ${esc(r.channel)}</strong>${badge(r.status)}</div><h3>${esc(r.type)}</h3><p class="preserve">${esc(r.note)}</p><small>${esc(r.createdBy)} · 登錄於 ${stamp(r.createdAt)}</small></article>`).join('') : '<p class="empty">尚無人工聯繫紀錄。</p>'}</div>`;
  }
  function notifications(main) {
    const filtered = data.tasks.filter(t => (taskState === 'all' || (taskState === 'done' ? t.status === '已處理' : t.status !== '已處理')) && (taskType === 'all' || (taskType === 'contact' ? !['表單確認', '回診提醒'].includes(t.type) : t.type === taskType)) && (taskRange === 'all' || (taskRange === 'today' ? t.due === data.referenceDate : t.due <= data.referenceDate))).sort((a, b) => a.due.localeCompare(b.due));
    main.innerHTML = heading('LINE 聯繫與待辦', '先核對個案與事項，人工聯繫後回填結果。') + `<div class="notice">人工流程：加入官方 LINE、傳看診資訊、確認時間、傳表單、查閱回覆、回診前一天提醒。原型不串接 LINE。</div>` + panel('待辦清單', `<div class="filters"><label>事項類型<select id="task-type"><option value="all">全部類型</option><option value="contact" ${taskType === 'contact' ? 'selected' : ''}>一般聯繫與回診確認</option>${options(['回診確認', '回診提醒', '表單確認', '一般聯繫'], taskType)}</select></label><label>日期範圍<select id="task-range"><option value="due" ${taskRange === 'due' ? 'selected' : ''}>已到期（含逾期）</option><option value="today" ${taskRange === 'today' ? 'selected' : ''}>示範當日到期</option><option value="all" ${taskRange === 'all' ? 'selected' : ''}>全部日期</option></select></label><label>處理狀態<select id="task-state"><option value="pending" ${taskState === 'pending' ? 'selected' : ''}>未完成</option><option value="done" ${taskState === 'done' ? 'selected' : ''}>已處理</option><option value="all" ${taskState === 'all' ? 'selected' : ''}>全部狀態</option></select></label></div><p class="result-count">共 ${filtered.length} 件</p>` + table(['個案', '待辦事項', '到期日', '狀態', '操作'], taskRows(filtered)));
    for (const [id, set] of [['task-type', v => taskType = v], ['task-range', v => taskRange = v], ['task-state', v => taskState = v]]) document.querySelector(`#${id}`).addEventListener('change', e => { set(e.target.value); render(); document.querySelector(`#${id}`).focus(); });
  }
  function settings(main) {
    if (user.role !== '系統管理員') { main.innerHTML = heading('此頁僅供管理員使用', '目前示範角色無法使用原型設定。') + link('返回工作首頁', '#home'); return; }
    main.innerHTML = heading('原型設定', '管理示範日期、資料重設與操作紀錄。') + panel('示範環境', `<div class="settings-copy"><p>工作日：<strong>${data.referenceDate}</strong></p><p>所有資料只保存在此瀏覽器。角色、登入與操作紀錄均為前端模擬。</p><div class="actions">${button('調整示範工作日', 'date', '', 'secondary')}${button('重設全部假資料', 'reset', '', 'danger')}</div></div>`) + panel('第二階段：尚未啟用', '<div class="panel-copy"><p>LINE API、身分綁定、院內介接、排程與重試均未啟用。</p><p>Django、Render 與 Neon 為後續架構規劃；目前網站沒有後端或資料庫。</p></div>') + panel('本機操作紀錄', table(['時間（台北）', '示範角色', '操作', '個案'], data.audit.slice(0, 50).map(a => [stamp(a.at), esc(a.actor), esc(a.action), esc(a.caseId || '—')]), '尚無操作紀錄。'));
  }
  function render() {
    if (!user) { renderLogin(); return; }
    const [raw, id, tab] = location.hash.slice(1).split('/');
    const page = ['home', 'cases', 'detail', 'visits', 'assessments', 'notifications', 'settings'].includes(raw) ? raw : 'home';
    const titles = { home: '工作首頁', cases: '個案管理', detail: '個案詳細資料', visits: '回診管理', assessments: '評估表單', notifications: 'LINE 聯繫與待辦', settings: '原型設定' };
    document.title = `${titles[page]}｜睡眠門診`;
    shell(page);
    const main = document.querySelector('#main');
    if (page === 'home') home(main);
    if (page === 'cases') cases(main);
    if (page === 'detail') detail(main, id, tab);
    if (page === 'notifications') notifications(main);
    if (page === 'settings') settings(main);
    if (page === 'visits') main.innerHTML = heading('回診管理', '由個管維護回診安排；修改時間或地點後，會重新開啟對應提醒。') + panel('所有回診安排', visitTable(data.visits), link('選取個案安排回診', '#cases', 'button secondary compact'));
    if (page === 'assessments') {
      main.innerHTML = heading('評估表單', '追蹤傳送與人工查閱結果，不自動匯入回覆或計分。') + panel('表單追蹤', `<div class="filters"><label>表單狀態<select id="assessment-filter"><option value="">全部狀態</option>${options(['待填寫', '待確認', '已確認'], assessmentFilter)}</select></label></div>` + assessmentTable(data.assessments.filter(a => !assessmentFilter || a.status === assessmentFilter)));
      document.querySelector('#assessment-filter').addEventListener('change', e => { assessmentFilter = e.target.value; render(); document.querySelector('#assessment-filter').focus(); });
    }
  }

  function caseEditor(id) {
    const c = id ? person(id) : { id: /^DEMO-[A-Z0-9-]{1,24}$/.test(search.trim().toUpperCase()) ? search.trim().toUpperCase() : '', name: '', enrolled: data.referenceDate, status: '追蹤中', note: '' };
    openEditor(id ? '編輯基本資料' : '新增個案', field('id', '示範識別碼（必填）', c.id, `required maxlength="29" placeholder="DEMO-005" ${id ? 'readonly' : ''}`) + field('name', '姓名（必填）', c.name, 'required maxlength="40" placeholder="請使用虛構姓名"') + dateField('enrolled', '收案日期', c.enrolled) + select('status', '個案狀態', ['待初診', '追蹤中', '已結案'], c.status) + textarea('note', '管理備註', c.note), (next, values) => `#detail/${M.saveCase(next, values, user.name, id)}/overview`);
  }
  function recordEditor(id) {
    openEditor('新增追蹤紀錄', `<p class="full form-context">${esc(person(id).name)} · ${esc(id)}</p>` + dateField('date', '諮詢日期') + select('kind', '紀錄類型', ['門診諮詢', '電話追蹤', 'LINE 追蹤', '其他'], '門診諮詢') + textarea('content', '諮詢內容（必填）', '', true) + dateField('nextDate', '下次追蹤日期（選填）', '', false) + '<p class="small">填寫下次追蹤日期後，會建立一筆一般聯繫待辦。</p>', (next, values) => { M.addRecord(next, { ...values, caseId: id }, user.name); return `#detail/${id}/followup`; });
  }
  function visitEditor(caseId, visitId) {
    const v = visitId ? data.visits.find(item => item.id === visitId) : { date: data.referenceDate, time: '09:00', location: '', status: '已安排' };
    openEditor(visitId ? '修改回診安排' : '安排回診', `<p class="full form-context">${esc(person(caseId).name)} · ${esc(caseId)}</p>` + dateField('date', '回診日期', v.date) + field('time', '回診時間（必填）', v.time, 'type="time" required') + field('location', '回診地點（必填）', v.location, 'required maxlength="80"') + select('status', '回診狀態', ['已安排', '已完成', '已取消'], v.status) + '<p class="full small">安排回診會建立前一天的提醒；時間或地點異動會重新開啟提醒。完成或取消回診會關閉對應提醒。</p>', (next, values) => { M.saveVisit(next, { ...values, caseId }, user.name, visitId); return `#detail/${caseId}/followup`; });
  }
  function assessmentEditor(id) {
    const a = data.assessments.find(item => item.id === id);
    openEditor('登錄表單人工確認', `<p class="full form-context">${esc(person(a.caseId).name)} · ${esc(a.name)}</p>` + select('status', '填寫／確認狀態', ['待填寫', '待確認', '已確認'], a.status) + dateField('sentDate', '人工傳送日期（選填）', a.sentDate, false) + dateField('confirmedDate', '人工確認日期（已確認時必填）', a.confirmedDate, false) + `<label class="checkbox full"><input type="checkbox" name="checked">我已人工查閱並核對回覆，才登錄為「已確認」</label>` + textarea('note', '確認備註', a.note), (next, values) => { M.saveAssessment(next, id, values, user.name); return `#detail/${a.caseId}/assessment`; });
  }
  function newAssessment(id) {
    openEditor('新增表單追蹤', `<p class="full form-context">${esc(person(id).name)} · ${esc(id)}</p>` + field('name', '表單名稱（必填）', '睡眠評估（示意）', 'required maxlength="80"') + dateField('due', '追蹤到期日'), (next, values) => {
      const name = values.name.trim();
      if (!name) throw Error('請填寫表單名稱。');
      if (next.assessments.some(a => a.caseId === id && a.name === name && a.status !== '已確認')) throw Error('已有同名未完成表單，請先處理既有追蹤。');
      const assessmentId = M.uid();
      next.assessments.push({ id: assessmentId, caseId: id, name, status: '待填寫', sentDate: '', confirmedDate: '', note: '' });
      next.tasks.push({ id: M.uid(), caseId: id, type: '表單確認', title: `追蹤${name}回覆`, due: values.due, status: '待聯繫', result: '', assessmentId });
      next.audit.unshift({ id: M.uid(), actor: user.name, action: '新增表單追蹤', caseId: id, at: new Date().toISOString() });
      return `#detail/${id}/assessment`;
    });
  }
  function contactEditor(caseId, taskId) {
    const task = taskId && data.tasks.find(t => t.id === taskId);
    const tasks = data.tasks.filter(t => t.caseId === caseId && t.status !== '已處理');
    openEditor('登錄聯繫結果', `<p class="full form-context">${esc(person(caseId).name)} · ${esc(caseId)}</p><label class="full">對應待辦<select name="taskId"><option value="">僅新增聯繫紀錄</option>${tasks.map(t => `<option value="${esc(t.id)}" ${t.id === taskId ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select></label>` + dateField('date', '聯繫日期') + select('channel', '聯繫管道', ['官方 LINE（人工）', '電話', '現場', '其他'], '官方 LINE（人工）') + select('type', '聯繫事項', ['回診確認', '回診提醒', '表單確認', '一般聯繫'], task?.type || '一般聯繫') + select('status', '處理結果', ['待聯繫', '等待回覆', '已處理'], task?.status || '待聯繫') + textarea('note', '聯繫內容與結果（必填）', '', true) + '<label class="checkbox full"><input type="checkbox" name="checked">我已完成實際聯繫與處理，才登錄為「已處理」</label><p class="full small">僅傳送訊息但仍需回覆時，請選「等待回覆」。表單待辦須至評估分頁人工確認後完成。</p>', (next, values) => { M.addContact(next, { ...values, caseId }, user.name); return `#detail/${caseId}/contact`; });
  }
  function taskEditor(id) {
    const t = data.tasks.find(task => task.id === id);
    if (!t) return;
    currentTask = id;
    previousFocus = document.activeElement;
    const a = t.assessmentId && data.assessments.find(a => a.id === t.assessmentId);
    const visit = t.visitId && data.visits.find(v => v.id === t.visitId);
    dialog.innerHTML = `<div class="dialog-heading"><div><p class="eyebrow">${esc(person(t.caseId).name)} · ${esc(t.caseId)}</p><h2 id="dialog-title">${esc(t.title)}</h2></div>${button('關閉', 'close', '', 'quiet')}</div><div class="task-detail"><dl class="details"><div><dt>到期日</dt><dd>${t.due}</dd></div><div><dt>處理狀態</dt><dd>${badge(t.status)}</dd></div></dl>${visit ? `<div class="notice">回診：${visit.date} ${visit.time}<br>地點：${esc(visit.location)}</div>` : ''}<p class="preserve">${esc(t.result || '尚未登錄處理結果。')}</p><p class="small">請人工核對後登錄。本機狀態不代表 LINE 已讀。</p></div><div class="dialog-actions">${link('查看個案', `#detail/${t.caseId}/${a ? 'assessment' : 'contact'}`, 'button secondary')}${t.status === '已處理' ? (a ? button('調整表單狀態', 'task-assessment', a.id, 'secondary') : button('重新開啟', 'reopen', t.id, 'secondary')) : (a ? button('登錄表單確認', 'task-assessment', a.id, 'primary') : button('登錄聯繫結果', 'task-contact', t.caseId, 'primary'))}</div>`;
    dialog.showModal();
  }

  document.addEventListener('click', event => {
    // 首頁摘要顯示所有未完成待辦，進入時同步清除舊篩選。
    const summary = event.target.closest('.dashboard-stats a');
    if (summary?.getAttribute('href') === '#notifications') {
      taskType = 'all'; taskRange = 'all'; taskState = 'pending';
    }
    if (summary?.getAttribute('href') === '#assessments') assessmentFilter = '';
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const { action, id } = target.dataset;
    if (action === 'close') { dialog.close(); return; }
    if (!user) return;
    if (action === 'logout') { dialog.close(); user = null; render(); return; }
    if (action === 'new-case') caseEditor();
    if (action === 'edit-case') caseEditor(id);
    if (action === 'new-record') recordEditor(id);
    if (action === 'visit-record') recordEditor(id);
    if (action === 'new-visit') visitEditor(id);
    if (action === 'edit-visit') { const v = data.visits.find(v => v.id === id); visitEditor(v.caseId, v.id); }
    if (action === 'new-assessment') newAssessment(id);
    if (action === 'edit-assessment') assessmentEditor(id);
    if (action === 'new-contact') contactEditor(id);
    if (action === 'task') taskEditor(id);
    if (action === 'task-contact') { dialog.close(); contactEditor(id, currentTask); }
    if (action === 'task-assessment') { dialog.close(); assessmentEditor(id); }
    if (action === 'home-filter') { taskType = id; taskRange = 'due'; taskState = 'pending'; location.hash = '#notifications'; }
    if (action === 'reopen') {
      dialog.close();
      openEditor('重新開啟待辦', textarea('reason', '重新開啟原因（必填）', '', true), (next, values) => M.reopenTask(next, id, values.reason, user.name));
    }
    if (action === 'copy-assessment') {
      const url = `https://example.invalid/sleep-form/${encodeURIComponent(id)}`;
      previousFocus = document.activeElement;
      dialog.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">表單連結示意</h2>${button('關閉', 'close', '', 'quiet')}</div><div class="task-detail"><p>這是無法填答的佔位連結，不含個案識別碼；正式表單尚待確認。</p><label>可選取複製<input readonly value="${url}" id="demo-url"></label><p class="small">複製不會更改傳送或填寫狀態。請勿傳給真實個案。</p></div><div class="dialog-actions">${button('複製示範連結', 'copy-url', '', 'primary')}</div>`;
      dialog.showModal();
    }
    if (action === 'copy-url') {
      const input = document.querySelector('#demo-url'); input.select();
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(input.value).then(() => toast('已複製示範連結，表單狀態沒有變更。')).catch(() => toast('請按 Ctrl+C 手動複製已選取的連結。'));
      else toast('請按 Ctrl+C 手動複製已選取的連結。');
    }
    if (user.role === '系統管理員' && action === 'date') openEditor('調整示範工作日', dateField('date', '工作日') + '<p class="full small">只改變首頁日期與到期判斷，既有紀錄日期不變。</p>', (next, values) => { next.referenceDate = values.date; });
    if (user.role === '系統管理員' && action === 'reset') {
      previousFocus = document.activeElement;
      dialog.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">重設全部假資料？</h2></div><div class="task-detail"><p>此操作會刪除本原型中新增、修改的本機示範紀錄，恢復預設四位個案。其他網站資料不受影響。</p><p id="reset-error" class="form-error" role="alert"></p></div><div class="dialog-actions">${button('取消', 'close', '', 'secondary')}${button('確認重設', 'confirm-reset', '', 'danger')}</div>`;
      dialog.showModal();
    }
    if (user.role === '系統管理員' && action === 'confirm-reset') {
      try { persist(window.makeClinicSeed()); storageWarning = ''; dialog.close(); render(); toast('已恢復預設假資料。'); }
      catch (error) { document.querySelector('#reset-error').textContent = error.message; }
    }
  });
  window.addEventListener('hashchange', () => { if (dialog.open) dialog.close(); render(); document.querySelector('#main')?.focus(); });
  render();
})();
