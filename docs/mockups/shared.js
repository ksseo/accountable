// Sample data and helpers shared by the three mockups.
// Today is fixed at 2026. 11. 23. so every screenshot shows the same figures.

const TODAY = '2026-11-23';

const STAGES = [
  { key: 'new', ko: '신규', prob: 10, fill: '#06D6A0', ink: '#047A5C', chip: '#06D6A0', onChip: '#073B4C', tint: '#E1FAF3' },
  { key: 'qualified', ko: '적격', prob: 25, fill: '#FFC145', ink: '#8A6000', chip: '#FFC145', onChip: '#073B4C', tint: '#FFF5DE' },
  { key: 'proposal', ko: '제안', prob: 50, fill: '#F78C6B', ink: '#A8432A', chip: '#F78C6B', onChip: '#073B4C', tint: '#FEEDE7' },
  { key: 'negotiation', ko: '협상', prob: 75, fill: '#118AB2', ink: '#0D7194', chip: '#0D7194', onChip: '#FFFFFF', tint: '#E2F1F6' },
  { key: 'won', ko: '수주', prob: 100, fill: '#073B4C', ink: '#073B4C', chip: '#073B4C', onChip: '#FFFFFF', tint: '#E3E9EC' },
  { key: 'lost', ko: '실주', prob: 0, fill: '#CDD8DB', ink: '#4A6470', chip: '#CDD8DB', onChip: '#073B4C', tint: '#EBF0F1' },
];
const STAGE = Object.fromEntries(STAGES.map((s) => [s.key, s]));
const OPEN_KEYS = ['new', 'qualified', 'proposal', 'negotiation'];

const DEALS = [
  { name: '동남아 콜드체인 포장 시범 공급', org: 'Saigon Fresh Logistics', stage: 'new', value: 38000, close: '2027-02-20' },
  { name: '화장품 용기 2차 금형', org: '루미에르코스메틱', stage: 'new', value: 24500, close: '2027-01-15' },
  { name: 'Warehouse sensor pilot', org: 'Brightwater Foods', stage: 'new', value: 52000, close: '2027-03-10' },
  { name: '정밀 베어링 연간 단가 계약', org: '대성기계공업', stage: 'new', value: 67000, close: '2027-02-05' },
  { name: 'Label printer retrofit', org: 'Kessler Verpackung GmbH', stage: 'new', value: 18500, close: '2027-01-30' },
  { name: '냉동식품 트레이 공급', org: '해담푸드', stage: 'qualified', value: 45000, close: '2026-12-18' },
  { name: 'Line 2 conveyor parts', org: 'Osaka Kogyo Co.', stage: 'qualified', value: 83000, close: '2027-01-12' },
  { name: '의료기기 멸균 파우치', org: '메디온헬스케어', stage: 'qualified', value: 29000, close: '2026-11-14' },
  { name: 'Retail display packaging', org: 'Northwind Market', stage: 'qualified', value: 36000, close: '2027-01-22' },
  { name: '2027 포장재 공급', org: '한빛정밀', stage: 'proposal', value: 120000, close: '2026-12-30' },
  { name: 'Spare parts framework', org: 'Sakura Precision Co.', stage: 'proposal', value: 96500, close: '2026-12-12' },
  { name: '물류센터 자동화 부품', org: '우진로지스', stage: 'proposal', value: 74000, close: '2026-11-05' },
  { name: 'Cosmetic tube supply', org: 'Maison Lys', stage: 'proposal', value: 41000, close: '2027-01-08' },
  { name: '자동차 부품 3년 공급', org: '세원오토텍', stage: 'negotiation', value: 248000, close: '2026-12-05' },
  { name: 'Food-grade film contract', org: 'Pacific Harbor Foods', stage: 'negotiation', value: 132000, close: '2026-12-20' },
  { name: 'Packaging line upgrade', org: 'Kessler Verpackung GmbH', stage: 'negotiation', value: 45000, close: '2026-11-20' },
  { name: '반도체 장비 부품 납품', org: '한결테크', stage: 'won', value: 54000, close: '2026-11-18' },
  { name: 'Bottle cap order Q1', org: 'Brightwater Foods', stage: 'won', value: 23000, close: '2026-11-09' },
  { name: '산업용 필터 교체', org: '대성기계공업', stage: 'won', value: 15000, close: '2026-11-02' },
  { name: 'Gasket supply renewal', org: 'Osaka Kogyo Co.', stage: 'won', value: 31000, close: '2026-10-28' },
  { name: '친환경 완충재 입찰', org: '그린팩유통', stage: 'lost', value: 58000, close: '2026-11-12' },
  { name: 'Display stand project', org: 'Northwind Market', stage: 'lost', value: 12000, close: '2026-10-30' },
];
DEALS.forEach((d) => { d.prob = d.prob ?? STAGE[d.stage].prob; });

// Revenue won and deals won and lost, month by month, for the last 12 months.
const MONTHS = [
  { m: '2025-12', won: 48000, wonN: 2, lostN: 1 },
  { m: '2026-01', won: 36500, wonN: 2, lostN: 2 },
  { m: '2026-02', won: 61000, wonN: 3, lostN: 1 },
  { m: '2026-03', won: 55000, wonN: 2, lostN: 1 },
  { m: '2026-04', won: 72500, wonN: 3, lostN: 2 },
  { m: '2026-05', won: 40000, wonN: 2, lostN: 1 },
  { m: '2026-06', won: 88000, wonN: 4, lostN: 1 },
  { m: '2026-07', won: 64000, wonN: 3, lostN: 2 },
  { m: '2026-08', won: 97500, wonN: 4, lostN: 1 },
  { m: '2026-09', won: 81000, wonN: 3, lostN: 2 },
  { m: '2026-10', won: 78000, wonN: 3, lostN: 1 },
  { m: '2026-11', won: 92000, wonN: 3, lostN: 1 },
];

// Value that reached each stage: open deals plus deals closed in the last 12 months (spec RULE-13).
const FUNNEL = [
  { stage: 'new', value: 2760000, n: 96 },
  { stage: 'qualified', value: 2150000, n: 75 },
  { stage: 'proposal', value: 1690000, n: 58 },
  { stage: 'negotiation', value: 1240000, n: 44 },
  { stage: 'won', value: 813500, n: 34 },
];

const FOLLOWUPS = [
  { date: '2026-11-18', text: '견적서 수정본 회신 확인', on: '물류센터 자동화 부품', kind: 'deal' },
  { date: '2026-11-20', text: 'Call back about sample results', on: 'Emma Clarke', sub: 'Pacific Harbor Foods', kind: 'contact' },
  { date: '2026-11-21', text: '멸균 파우치 샘플 발송 일정 확인', on: '의료기기 멸균 파우치', kind: 'deal' },
  { date: '2026-11-23', text: '계약서 초안 법무 검토 요청', on: '자동차 부품 3년 공급', kind: 'deal' },
  { date: '2026-11-25', text: 'Send revised price list', on: 'Kenji Watanabe', sub: 'Osaka Kogyo Co.', kind: 'contact' },
  { date: '2026-11-27', text: '공장 방문 미팅 준비', on: '박서연', sub: '한빛정밀', kind: 'contact' },
  { date: '2026-12-02', text: 'Follow up on trial order', on: '동남아 콜드체인 포장 시범 공급', kind: 'deal' },
];
const FOLLOWUPS_LATER = 4;

const ACTIVITY = [
  { at: '2026-11-23T10:42', kind: 'stage', text: '단계 변경: 제안 → 협상', on: 'Food-grade film contract' },
  { at: '2026-11-23T09:15', kind: 'call', text: '납기 일정 확정, 계약서 초안은 이번 주에 보내기로 함', on: '김도윤', sub: '세원오토텍' },
  { at: '2026-11-20T16:30', kind: 'email', text: 'Asked for delivery in two batches, January and March', on: 'Lukas Becker', sub: 'Kessler Verpackung GmbH' },
  { at: '2026-11-18T14:05', kind: 'stage', text: '단계 변경: 협상 → 수주', on: '반도체 장비 부품 납품' },
  { at: '2026-11-18T14:05', kind: 'status', text: '상태 변경: 적격 → 고객', on: '이하늘', sub: '한결테크' },
  { at: '2026-11-17T11:20', kind: 'note', text: '실주 사유: 경쟁사와 단가 8% 차이', on: '친환경 완충재 입찰' },
  { at: '2026-11-16T15:00', kind: 'call', text: 'Trial order of 2,000 trays confirmed for December', on: 'Nguyen Thi Mai', sub: 'Saigon Fresh Logistics' },
  { at: '2026-11-13T10:10', kind: 'email', text: '2027년 물량 계획서 받음, 다음 주 제안서 준비', on: '박서연', sub: '한빛정밀' },
];

// Dates, money and counting

const day = (iso) => new Date(iso.length > 10 ? iso : iso + 'T00:00:00');
const daysBetween = (a, b) => Math.round((day(b.slice(0, 10)) - day(a.slice(0, 10))) / 86400000);
const sum = (xs, f) => xs.reduce((total, x) => total + f(x), 0);

const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
const usdShort = (n) => {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + n;
};
const pct = (n) => Math.round(n) + '%';

const fmtDate = (iso) => new Intl.DateTimeFormat('ko-KR').format(day(iso));
const fmtDateDow = (iso) =>
  new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' }).format(day(iso));
const fmtMonthDay = (iso) => new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric' }).format(day(iso));
const fmtTime = (iso) => new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' }).format(day(iso));
const fmtWhen = (iso) => {
  const d = daysBetween(iso, TODAY);
  if (d === 0) return '오늘 ' + fmtTime(iso);
  if (d === 1) return '어제 ' + fmtTime(iso);
  return fmtMonthDay(iso) + ' ' + fmtTime(iso);
};

const isOpen = (d) => OPEN_KEYS.includes(d.stage);
const isLate = (d) => isOpen(d) && d.close && d.close < TODAY;
const daysLate = (d) => daysBetween(d.close, TODAY);
const expected = (d) => Math.round((d.value * d.prob) / 100);

const followUpState = (f) => {
  const d = daysBetween(f.date, TODAY);
  if (d > 0) return { kind: 'overdue', label: `${d}일 지남` };
  if (d === 0) return { kind: 'today', label: '오늘' };
  return { kind: 'upcoming', label: fmtMonthDay(f.date) };
};

// Figures worked out from the data, the way the backend would.

const openDeals = DEALS.filter(isOpen);
const lateDeals = openDeals.filter(isLate);
const thisMonth = TODAY.slice(0, 7);
const wonThisMonth = DEALS.filter((d) => d.stage === 'won' && d.close.startsWith(thisMonth));
const monthAgo = (() => {
  const d = day(TODAY);
  d.setDate(d.getDate() - 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const FIG = {
  openValue: sum(openDeals, (d) => d.value),
  openCount: openDeals.length,
  expected: sum(openDeals, expected),
  wonMonth: sum(wonThisMonth, (d) => d.value),
  wonMonthCount: wonThisMonth.length,
  lastMonthWon: MONTHS[MONTHS.length - 2].won,
  lateCount: lateDeals.length,
  lateValue: sum(lateDeals, (d) => d.value),
  overdueCount: FOLLOWUPS.filter((f) => followUpState(f).kind === 'overdue').length,
  wonYear: sum(MONTHS, (m) => m.won),
};
FIG.expectedShare = (FIG.expected / FIG.openValue) * 100;
FIG.wonChange = FIG.wonMonth - FIG.lastMonthWon;
FIG.wonChangePct = (FIG.wonChange / FIG.lastMonthWon) * 100;

const BY_STAGE = STAGES.map((s) => {
  let deals = DEALS.filter((d) => d.stage === s.key);
  if (!OPEN_KEYS.includes(s.key)) deals = deals.filter((d) => d.close >= monthAgo);
  return {
    ...s,
    open: OPEN_KEYS.includes(s.key),
    deals,
    count: deals.length,
    value: sum(deals, (d) => d.value),
    expected: sum(deals, expected),
  };
});
const OPEN_STAGES = BY_STAGE.filter((s) => s.open);

// Icons, drawn after Lucide's shapes

const ICONS = {
  dashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  briefcase: '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  kanban: '<path d="M6 5v11"/><path d="M12 5v6"/><path d="M18 5v14"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  note: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  call: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  email: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  stage: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
  status: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const KIND_LABEL = { note: '메모', call: '통화', email: '이메일', stage: '단계 변경', status: '상태 변경' };

const NAV = [
  { key: 'dashboard', ko: '대시보드', icon: 'dashboard' },
  { key: 'organizations', ko: '거래처', icon: 'building' },
  { key: 'contacts', ko: '연락처', icon: 'users' },
  { key: 'deals', ko: '영업 기회', icon: 'briefcase' },
  { key: 'pipeline', ko: '파이프라인', icon: 'kanban' },
];

// Charts, as plain SVG

const niceMax = (v) => {
  const step = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / (step / 2)) * (step / 2);
};
const f1 = (n) => n.toFixed(1);

function smoothPath(p) {
  let d = `M ${f1(p[0][0])} ${f1(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 8, p1[1] + (p2[1] - p0[1]) / 8];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 8, p2[1] - (p3[1] - p1[1]) / 8];
    d += ` C ${f1(c1[0])} ${f1(c1[1])}, ${f1(c2[0])} ${f1(c2[1])}, ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}

function lineChart({
  width = 720, height = 260, pad = { t: 28, r: 20, b: 48, l: 52 },
  line = '#047A5C', area = 'rgba(6, 214, 160, 0.16)', grid = '#E3EAEC', label = '#4A6470',
  ticks = 4, showLast = true,
} = {}) {
  const max = niceMax(Math.max(...MONTHS.map((m) => m.won)));
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const x = (i) => pad.l + (iw * i) / (MONTHS.length - 1);
  const y = (v) => pad.t + ih - (ih * v) / max;
  const pts = MONTHS.map((m, i) => [x(i), y(m.won)]);
  const path = smoothPath(pts);
  const base = pad.t + ih;
  let g = '';
  for (let k = 0; k <= ticks; k++) {
    const v = (max * k) / ticks;
    g += `<line x1="${pad.l}" x2="${width - pad.r}" y1="${f1(y(v))}" y2="${f1(y(v))}" stroke="${grid}" stroke-width="1"/>`;
    g += `<text x="${pad.l - 10}" y="${f1(y(v) + 4)}" text-anchor="end" class="axis">${usdShort(v)}</text>`;
  }
  const yearOf = (m, i) => (i === 0 || m.endsWith("-01") ? `${m.slice(0, 4)}년` : "");
  const xl = MONTHS.map((m, i) => `<text x="${f1(x(i))}" y="${height - 24}" text-anchor="middle" class="axis">${Number(m.m.slice(5))}월</text><text x="${f1(x(i))}" y="${height - 7}" text-anchor="middle" class="axis">${yearOf(m.m, i)}</text>`).join("");
  const dots = pts.map(([px, py], i) => (i === pts.length - 1 && showLast)
    ? `<circle cx="${f1(px)}" cy="${f1(py)}" r="6" fill="${line}" stroke="#fff" stroke-width="2.5"/>`
    : `<circle cx="${f1(px)}" cy="${f1(py)}" r="3.5" fill="#fff" stroke="${line}" stroke-width="2"/>`).join('');
  const last = pts[pts.length - 1];
  const lastLabel = showLast
    ? `<text x="${f1(last[0])}" y="${f1(last[1] - 14)}" text-anchor="end" class="point-label">${usd(MONTHS[MONTHS.length - 1].won)}</text>`
    : '';
  const summary = `최근 12개월 월별 수주 금액. 가장 높은 달은 2026년 8월 ${usd(97500)}, 이번 달은 ${usd(FIG.wonMonth)}.`;
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${summary}">
    ${g}
    <path d="${path} L ${f1(x(MONTHS.length - 1))} ${base} L ${f1(x(0))} ${base} Z" fill="${area}"/>
    <path d="${path}" fill="none" stroke="${line}" stroke-width="2.5" stroke-linecap="round"/>
    ${dots}${lastLabel}${xl}
  </svg>`;
}

function barChart({
  width = 440, height = 240, pad = { t: 22, r: 8, b: 48, l: 8 },
  won = '#06D6A0', lost = '#F78C6B', grid = '#E3EAEC',
} = {}) {
  const max = 5;
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const gw = iw / MONTHS.length;
  const bw = Math.min(14, gw * 0.32);
  const y = (v) => pad.t + ih - (ih * v) / max;
  let g = '';
  for (let k = 0; k <= max; k += max) {
    g += `<line x1="${pad.l}" x2="${width - pad.r}" y1="${f1(y(k))}" y2="${f1(y(k))}" stroke="${grid}"/>`;
  }
  const bars = MONTHS.map((m, i) => {
    const cx = pad.l + gw * i + gw / 2;
    const xw = cx - bw - 1.5;
    const xl = cx + 1.5;
    // The first month's year is left out when it would run into January's.
    const roomForFirst = gw >= 48 || !MONTHS[1].m.endsWith('-01');
    const year = (i === 0 && roomForFirst) || m.m.endsWith('-01') ? `${m.m.slice(0, 4)}년` : '';
    return `
      <rect x="${f1(xw)}" y="${f1(y(m.wonN))}" width="${f1(bw)}" height="${f1((ih * m.wonN) / max)}" rx="3" fill="${won}"/>
      <rect x="${f1(xl)}" y="${f1(y(m.lostN))}" width="${f1(bw)}" height="${f1((ih * m.lostN) / max)}" rx="3" fill="${lost}"/>
      <text x="${f1(xw + bw / 2)}" y="${f1(y(m.wonN) - 5)}" text-anchor="middle" class="bar-label">${m.wonN}</text>
      <text x="${f1(xl + bw / 2)}" y="${f1(y(m.lostN) - 5)}" text-anchor="middle" class="bar-label">${m.lostN}</text>
      <text x="${f1(cx)}" y="${height - 24}" text-anchor="middle" class="axis">${Number(m.m.slice(5))}월</text>
      <text x="${f1(cx)}" y="${height - 7}" text-anchor="middle" class="axis">${year}</text>`;
  }).join('');
  const summary = `최근 12개월 월별 수주 ${sum(MONTHS, (m) => m.wonN)}건, 실주 ${sum(MONTHS, (m) => m.lostN)}건.`;
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${summary}">${g}${bars}</svg>`;
}

// Switching between the dashboard and the pipeline, by the page address

function setupViews() {
  const show = () => {
    const view = location.hash === '#pipeline' ? 'pipeline' : 'dashboard';
    document.querySelectorAll('[data-view]').forEach((el) => { el.hidden = el.dataset.view !== view; });
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const on = a.dataset.nav === view;
      a.classList.toggle('is-current', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  };
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (!['dashboard', 'pipeline'].includes(a.dataset.nav)) a.addEventListener('click', (e) => e.preventDefault());
  });
  addEventListener('hashchange', show);
  show();
}

const navHref = (key) => (['dashboard', 'pipeline'].includes(key) ? `#${key}` : '#');
