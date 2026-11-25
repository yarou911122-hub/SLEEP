/* 全部為虛構資料。固定工作日方便老師重複驗收，不代表電腦今天。 */
window.makeClinicSeed = () => ({
  version: 1,
  referenceDate: '2026-11-25',
  cases: [
    { id: 'DEMO-001', name: '測試個案 A', enrolled: '2026-11-14', status: '追蹤中', note: '虛構個案，請依待辦確認回診時間。' },
    { id: 'DEMO-002', name: '測試個案 B', enrolled: '2026-11-16', status: '追蹤中', note: '虛構個案，等待人工查閱表單回覆。' },
    { id: 'DEMO-003', name: '測試個案 C', enrolled: '2026-11-20', status: '待初診', note: '虛構個案，需先完成初次聯繫。' },
    { id: 'DEMO-004', name: '測試個案 D', enrolled: '2026-11-05', status: '已結案', note: '虛構個案，已結束追蹤。' }
  ],
  visits: [
    { id: 'V1', caseId: 'DEMO-001', date: '2026-11-26', time: '09:00', location: '示範門診一', status: '已安排' },
    { id: 'V2', caseId: 'DEMO-002', date: '2026-11-25', time: '10:30', location: '示範門診二', status: '已安排' },
    { id: 'V3', caseId: 'DEMO-003', date: '2026-11-27', time: '14:00', location: '示範門診一', status: '已安排' }
  ],
  tasks: [
    { id: 'T1', caseId: 'DEMO-001', type: '回診提醒', due: '2026-11-25', title: '提醒明日回診時間與地點', status: '待聯繫', result: '', visitId: 'V1' },
    { id: 'T2', caseId: 'DEMO-002', type: '表單確認', due: '2026-11-25', title: '人工查閱睡眠評估回覆', status: '等待回覆', result: '', assessmentId: 'A2' },
    { id: 'T3', caseId: 'DEMO-003', type: '回診確認', due: '2026-11-24', title: '確認首次看診時間', status: '待聯繫', result: '' },
    { id: 'T4', caseId: 'DEMO-001', type: '表單確認', due: '2026-11-26', title: '追蹤睡眠評估填寫情況', status: '待聯繫', result: '', assessmentId: 'A1' },
    { id: 'T5', caseId: 'DEMO-004', type: '一般聯繫', due: '2026-11-20', title: '結案聯繫', status: '已處理', result: '已電話確認結案。' }
  ],
  assessments: [
    { id: 'A1', caseId: 'DEMO-001', name: '睡眠評估（示意）', status: '待填寫', sentDate: '', confirmedDate: '', note: '' },
    { id: 'A2', caseId: 'DEMO-002', name: '睡眠評估（示意）', status: '待確認', sentDate: '2026-11-23', confirmedDate: '', note: '已人工傳送示範連結，尚未查閱回覆。' },
    { id: 'A3', caseId: 'DEMO-004', name: '睡眠評估（示意）', status: '已確認', sentDate: '2026-11-10', confirmedDate: '2026-11-14', note: '虛構資料：已人工核對。' }
  ],
  records: [
    { id: 'R1', caseId: 'DEMO-001', date: '2026-11-14', kind: '門診諮詢', content: '已說明回診安排與表單流程。', nextDate: '2026-11-25', createdBy: '示範個管', createdAt: '2026-11-14T09:00:00+08:00' },
    { id: 'R2', caseId: 'DEMO-001', date: '2026-11-20', kind: '電話追蹤', content: '再次確認下次追蹤事項。', nextDate: '2026-11-25', createdBy: '示範個管', createdAt: '2026-11-20T10:00:00+08:00' }
  ],
  contacts: [],
  audit: []
});
