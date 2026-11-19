// 所有姓名、編號與紀錄皆為虛構；日期固定，方便重複驗收。
window.CLINIC_DEMO = {
  referenceDate: '2026-11-16',
  cases: [
    { id: 'DEMO-001', name: '示範個案甲', age: 48, status: '追蹤中', nextVisit: '2026-11-16', time: '09:00', assessment: '待填寫', line: '未綁定', note: '示範紀錄：下次回診確認追蹤安排。' },
    { id: 'DEMO-002', name: '示範個案乙', age: 62, status: '追蹤中', nextVisit: '2026-11-16', time: '10:30', assessment: '已完成', line: '已發送（模擬）', note: '示範紀錄：已完成本次評估表單。' },
    { id: 'DEMO-003', name: '示範個案丙', age: 35, status: '待初診', nextVisit: '2026-11-18', time: '14:00', assessment: '填寫中', line: '待發送（模擬）', note: '示範紀錄：等待初診。' },
    { id: 'DEMO-004', name: '示範個案丁', age: 54, status: '已結案', nextVisit: null, time: null, assessment: '已完成', line: '未排程', note: '示範紀錄：已結束追蹤。' }
  ]
};
