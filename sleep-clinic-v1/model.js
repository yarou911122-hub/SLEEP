/* 資料操作集中在此；所有異動先做於副本，保存成功後才更新畫面。 */
(() => {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const statuses = ['待聯繫', '等待回覆', '已處理'];
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  const requireText = (value, label) => { if (typeof value !== 'string' || !value.trim()) throw Error(`請填寫${label}。`); return value.trim(); };
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const caseExists = (data, id) => { if (!data.cases.some(c => c.id === id)) throw Error('找不到個案，請重新選取。'); };
  const audit = (data, actor, action, caseId) => data.audit.unshift({ id: uid(), actor, action, caseId, at: new Date().toISOString() });

  function validate(data) {
    if (!data || data.version !== 1 || !validDate(data.referenceDate)) return false;
    const arrays = ['cases', 'visits', 'tasks', 'assessments', 'records', 'contacts', 'audit'];
    if (!arrays.every(key => Array.isArray(data[key]) && data[key].every(item => item && typeof item === 'object' && typeof item.id === 'string'))) return false;
    if (!arrays.every(key => new Set(data[key].map(x => x.id)).size === data[key].length)) return false;
    if (!data.cases.every(c => /^DEMO-[A-Z0-9-]{1,24}$/.test(c.id) && typeof c.name === 'string' && validDate(c.enrolled) && ['待初診', '追蹤中', '已結案'].includes(c.status))) return false;
    if (!['visits', 'tasks', 'assessments', 'records', 'contacts'].every(key => data[key].every(x => data.cases.some(c => c.id === x.caseId)))) return false;
    return data.tasks.every(t => statuses.includes(t.status) && validDate(t.due) && typeof t.title === 'string') && data.visits.every(v => validDate(v.date) && /^\d{2}:\d{2}$/.test(v.time)) && data.assessments.every(a => ['待填寫', '待確認', '已確認'].includes(a.status)) && data.records.every(r => validDate(r.date) && typeof r.content === 'string');
  }
  const pending = (data, filter = 'all', range = 'due') => data.tasks.filter(t => t.status !== '已處理' && (filter === 'all' || t.type === filter) && (range === 'all' || (range === 'today' ? t.due === data.referenceDate : t.due <= data.referenceDate))).sort((a, b) => a.due.localeCompare(b.due));
  const nextVisit = (data, caseId) => data.visits.filter(v => v.caseId === caseId && v.status === '已安排' && v.date >= data.referenceDate).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];

  function saveCase(data, values, actor, existingId) {
    const id = existingId || requireText(values.id, '示範識別碼').toUpperCase();
    if (!/^DEMO-[A-Z0-9-]{1,24}$/.test(id)) throw Error('識別碼請使用 DEMO- 開頭及英文字母、數字或連字號。');
    const name = requireText(values.name, '姓名');
    if (!validDate(values.enrolled)) throw Error('請填寫有效的收案日期。');
    if (!['待初診', '追蹤中', '已結案'].includes(values.status)) throw Error('請選擇有效的個案狀態。');
    if (!existingId && data.cases.some(c => c.id.toUpperCase() === id)) throw Error('這個識別碼已存在，請取消並開啟既有個案。');
    const item = { id, name, enrolled: values.enrolled, status: values.status, note: values.note || '' };
    if (existingId) { caseExists(data, existingId); Object.assign(data.cases.find(c => c.id === id), item); }
    else data.cases.push(item);
    audit(data, actor, existingId ? '編輯基本資料' : '建立個案', id);
    return id;
  }
  function addRecord(data, values, actor) {
    caseExists(data, values.caseId);
    if (!validDate(values.date) || (values.nextDate && !validDate(values.nextDate))) throw Error('請確認紀錄與追蹤日期。');
    if (values.nextDate && values.nextDate < values.date) throw Error('下次追蹤日期不能早於本次紀錄日期。');
    const content = requireText(values.content, '諮詢內容');
    data.records.push({ ...values, content, id: uid(), createdBy: actor, createdAt: new Date().toISOString() });
    if (values.nextDate) data.tasks.push({ id: uid(), caseId: values.caseId, type: '一般聯繫', title: '依諮詢紀錄進行後續追蹤', due: values.nextDate, status: '待聯繫', result: '' });
    audit(data, actor, '新增追蹤紀錄', values.caseId);
  }
  function saveVisit(data, values, actor, existingId) {
    caseExists(data, values.caseId);
    if (!validDate(values.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time)) throw Error('請填寫有效的回診日期與時間。');
    const location = requireText(values.location, '回診地點');
    if (!['已安排', '已完成', '已取消'].includes(values.status)) throw Error('請選擇回診狀態。');
    const item = { ...values, location, id: existingId || uid() };
    if (existingId) {
      const old = data.visits.find(v => v.id === existingId && v.caseId === values.caseId);
      if (!old) throw Error('找不到回診安排。');
      const changed = old.date !== item.date || old.time !== item.time || old.location !== item.location || old.status !== '已安排';
      Object.assign(old, item);
      data.tasks.filter(t => t.visitId === old.id).forEach(t => {
        if (item.status !== '已安排') { t.status = '已處理'; t.result = `回診${item.status.slice(1)}，關閉提醒`; }
        else {
          t.due = dayBefore(item.date);
          if (changed) { t.status = '待聯繫'; t.result = ''; }
        }
      });
      if (item.status === '已安排' && !data.tasks.some(t => t.visitId === item.id)) addReminder(data, item);
    } else { data.visits.push(item); if (item.status === '已安排') addReminder(data, item); }
    audit(data, actor, existingId ? '修改回診安排' : '新增回診安排', values.caseId);
  }
  function dayBefore(date) { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }
  function addReminder(data, visit) { data.tasks.push({ id: uid(), caseId: visit.caseId, type: '回診提醒', title: '提醒回診時間與地點', due: dayBefore(visit.date), status: '待聯繫', result: '', visitId: visit.id }); }
  function saveAssessment(data, id, values, actor) {
    const item = data.assessments.find(a => a.id === id);
    if (!item) throw Error('找不到評估表單。');
    if (!['待填寫', '待確認', '已確認'].includes(values.status)) throw Error('請選擇表單狀態。');
    if (values.sentDate && !validDate(values.sentDate)) throw Error('請確認傳送日期。');
    if (values.status === '已確認' && (!validDate(values.confirmedDate) || values.checked !== 'on')) throw Error('請先人工查閱回覆、勾選確認並填寫確認日期。');
    if (values.status === '已確認' && values.sentDate && values.confirmedDate < values.sentDate) throw Error('確認日期不能早於傳送日期。');
    Object.assign(item, { status: values.status, sentDate: values.sentDate, confirmedDate: values.status === '已確認' ? values.confirmedDate : '', note: values.note || '' });
    data.tasks.filter(t => t.assessmentId === id).forEach(t => { t.status = values.status === '已確認' ? '已處理' : values.status === '待確認' ? '等待回覆' : '待聯繫'; t.result = values.status === '已確認' ? '已人工查閱並確認表單' : ''; });
    audit(data, actor, '更新表單人工確認狀態', item.caseId);
  }
  function addContact(data, values, actor) {
    caseExists(data, values.caseId);
    if (!validDate(values.date) || !statuses.includes(values.status)) throw Error('請確認聯繫日期與處理狀態。');
    const note = requireText(values.note, '聯繫內容與結果');
    const task = values.taskId ? data.tasks.find(t => t.id === values.taskId && t.caseId === values.caseId) : null;
    if (values.taskId && !task) throw Error('找不到對應待辦。');
    if (task?.assessmentId && values.status === '已處理') throw Error('表單待辦請至評估分頁，人工查閱回覆後儲存確認。');
    if (values.status === '已處理' && values.checked !== 'on') throw Error('請確認已實際完成聯繫與處理。');
    data.contacts.push({ ...values, note, id: uid(), createdBy: actor, createdAt: new Date().toISOString() });
    if (task) { task.status = values.status; task.result = note; }
    audit(data, actor, '登錄人工聯繫結果', values.caseId);
  }
  function reopenTask(data, id, reason, actor) {
    const task = data.tasks.find(t => t.id === id);
    if (!task || task.status !== '已處理') throw Error('此待辦無法重新開啟。');
    if (task.assessmentId) throw Error('表單待辦請從評估分頁調整確認狀態。');
    const visit = task.visitId && data.visits.find(v => v.id === task.visitId);
    if (visit && visit.status !== '已安排') throw Error('請先將對應回診恢復為已安排。');
    task.status = '待聯繫'; task.result = `重新開啟：${requireText(reason, '重新開啟原因')}`;
    audit(data, actor, task.result, task.caseId);
  }
  window.ClinicModel = { clone, validate, uid, pending, nextVisit, saveCase, addRecord, saveVisit, saveAssessment, addContact, reopenTask };
})();
