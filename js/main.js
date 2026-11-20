// ── main.js ── 게임 메인 루프 (fetch 없음, 인라인 데이터 사용) ────────────
'use strict';

// ═══════════════════════════════════════════════════════
// 전역 앱 상태
// ═══════════════════════════════════════════════════════
const APP = {
  state: null,
  scheduleData: [],  // window.SCHEDULES_DATA 로 채움
  templates: null    // window.RELATION_TEMPLATES 로 채움
};
window.APP = APP;

// ═══════════════════════════════════════════════════════
// 유틸
// ═══════════════════════════════════════════════════════
const rand    = (lo, hi) => lo + Math.random() * (hi - lo);
const randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pick    = arr => arr[Math.floor(Math.random() * arr.length)];

function formatMoney(n) {
  return Math.floor(n).toLocaleString('ko-KR') + '원';
}
function statLabel(k) {
  return { vocal:'보컬', dance:'댄스', rap:'랩', looks:'외모',
           charm:'끼', songwriting:'작사', arrangement:'편곡' }[k] || k;
}
function josa(name, type) {
  if (!name) return '';
  return window.MembersModule ? window.MembersModule.josa(name, type) : '';
}
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function getEl(id) { return document.getElementById(id); }

// ═══════════════════════════════════════════════════════
// 초기화 (동기)
// ═══════════════════════════════════════════════════════
function init() {
  // 인라인 데이터 연결 (CORS 없음)
  APP.scheduleData = window.SCHEDULES_DATA || [];
  APP.templates    = window.RELATION_TEMPLATES || null;
  if (APP.templates) window.EventsModule.loadTemplates(APP.templates);

  // 상태 로드
  APP.state = window.StateModule.loadState();
  // settings 기본값 병합
  APP.state.settings = Object.assign(
    {}, window.DEFAULT_CONFIG || {}, APP.state.settings || {}
  );

  // 테마 적용
  applyTheme(APP.state.theme);

  // UI 렌더링
  renderAll();

  // 탭 이벤트
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 헤더 실시간 동기화
  setInterval(syncHeader, 600);

  // 최초 진입 그룹명 팝업
  if (!APP.state.groupName || APP.state.groupName === '미설정') {
    setTimeout(showGroupNamePopup, 300);
  }
}

function syncHeader() {
  if (!APP.state) return;
  setEl('header-day-disp',   'Day ' + APP.state.day);
  setEl('header-money-disp', formatMoney(APP.state.money));
}

// ═══════════════════════════════════════════════════════
// 탭
// ═══════════════════════════════════════════════════════
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'tab-' + tabId));
  if (tabId === 'relations') {
    setTimeout(() => {
      window.GraphModule.renderGraph(getEl('graph-canvas'), APP.state);
      window.GraphModule.renderLegend(getEl('graph-legend'));
    }, 80);
  }
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t || 'light');
}

// ═══════════════════════════════════════════════════════
// 전체 렌더링
// ═══════════════════════════════════════════════════════
function renderAll() {
  renderDashboard();
  renderMembersTab();
  renderScheduleTab();
  renderRelationsTab();
  renderAlbumTab();
  renderSettingsTab();
  renderLogTab();
}

// ═══════════════════════════════════════════════════════
// 대시보드
// ═══════════════════════════════════════════════════════
function renderDashboard() {
  const s = APP.state;
  const gn = s.groupName === '미설정' ? '미설정' : s.groupName;
  setEl('dash-group',  gn);
  setEl('dash-day',    'Day ' + s.day);
  setEl('dash-money',  formatMoney(s.money));
  setEl('dash-pop',    s.kpi.popularity);
  setEl('dash-fandom', s.kpi.fandom.toLocaleString());
  setEl('dash-rep',    s.kpi.reputation);
  setEl('dash-members',s.members.length + '명');

  const albumEl = getEl('dash-album');
  if (albumEl) {
    if (s.concert && s.concert.isPlanned)
      albumEl.textContent = `콘서트 D-${s.concert.daysLeft}`;
    else if (s.album.isReleased && s.album.comebackDaysLeft > 0)
      albumEl.textContent = `컴백 중 D-${s.album.comebackDaysLeft}`;
    else if (s.album.isPreparing)
      albumEl.textContent = '앨범 준비 중';
    else
      albumEl.textContent = '활동 없음';
  }

  const schEl = getEl('dash-schedule');
  if (schEl) {
    if (s.schedule.length === 0) {
      schEl.textContent = '배정 없음';
    } else {
      const counts = {};
      s.schedule.forEach(e => {
        const act = APP.scheduleData.find(a => a.id === e.activityId);
        const label = act ? act.label : e.activityId;
        counts[label] = (counts[label] || 0) + 1;
      });
      schEl.textContent = Object.entries(counts).map(([l,c]) => `${l} ${c}명`).join(' / ');
    }
  }
  renderLogMini('log-mini-dash');
}

// ═══════════════════════════════════════════════════════
// 멤버 탭
// ═══════════════════════════════════════════════════════
function renderMembersTab() {
  const s = APP.state;
  const gn = s.groupName === '미설정' ? '미설정' : s.groupName;
  setEl('member-group', '그룹명 ' + gn);
  setEl('member-count', '멤버 ' + s.members.length + '명');

  const list = getEl('member-list');
  if (!list) return;
  if (s.members.length === 0) {
    list.innerHTML = '<div class="empty-hint">멤버가 없습니다. 멤버를 추가해주세요.</div>';
    return;
  }

  list.className = 'member-grid';
  list.innerHTML = s.members.map(m => {
    const c = m.condition || { stamina:100, fatigue:0, stress:0 };
    const staminaCol = c.stamina <= 20 ? '#e74c3c' : c.stamina <= 50 ? '#f39c12' : '#27ae60';
    return `
    <div class="member-card">
      <div class="member-card-header">
        <span class="member-name">${m.name}</span>
        <span class="member-badges">
          ${m.isLeader ? '<span class="badge badge-leader">👑 리더</span>' : ''}
          <span class="badge badge-pos">${m.position}</span>
          <span class="badge badge-mbti">${m.mbti}</span>
        </span>
      </div>
      <div class="member-info-row">${m.gender} · ${m.height}cm · ${m.weight.toFixed(2)}kg</div>
      <div class="member-stats-grid">
        ${Object.entries(m.stats).map(([k,v]) =>
          `<div class="stat-item"><span class="stat-label">${statLabel(k)}</span><span class="stat-val">${v}</span></div>`
        ).join('')}
      </div>
      <div class="member-condition">
        ${condBar('체력', c.stamina, staminaCol)}
        ${condBar('피로', c.fatigue, '#e67e22')}
        ${condBar('스트레스', c.stress, '#9b59b6')}
      </div>
      <div class="member-actions">
        <button class="btn-sm" onclick="openEditMember('${m.id}')">수정</button>
        <button class="btn-sm btn-danger" onclick="deleteMember('${m.id}')">삭제</button>
        ${!m.isLeader ? `<button class="btn-sm" onclick="setLeader('${m.id}')">리더 지정</button>` : ''}
      </div>
    </div>`;
  }).join('');
}
function condBar(label, val, color) {
  return `<div class="cond-bar-wrap">
    <span>${label}</span>
    <div class="cond-bar"><div class="cond-fill" style="width:${val}%;background:${color}"></div></div>
    <span>${val}</span>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// 수동 스케줄 탭
// ═══════════════════════════════════════════════════════
function renderScheduleTab() {
  const s = APP.state;
  const el = getEl('schedule-list');
  if (!el) return;
  if (s.members.length === 0) { el.innerHTML = '<div class="empty-hint">멤버가 없습니다</div>'; return; }

  const available = APP.scheduleData.filter(a => {
    if (a.requiresComeback && !(s.album.isReleased && s.album.comebackDaysLeft > 0)) return false;
    return true;
  });
  const schMap = {};
  s.schedule.forEach(e => { schMap[e.memberId] = e.activityId; });

  el.innerHTML = s.members.map(m => `
    <div class="schedule-row">
      <span class="sch-name">${m.name}${m.isLeader?' 👑':''}</span>
      <select class="sch-select" onchange="onScheduleSelect('${m.id}',this.value)">
        <option value="">-- 선택 없음 (자동 휴식) --</option>
        ${available.map(a => {
          const pop = APP.state.kpi.popularity;
          const popMult = 1 + Math.min(pop, 200) / 200;
          let suffix = '';
          if (a.cost > 0 && a.earns) {
            suffix = ` | -${formatMoney(a.cost)}/인 +${formatMoney(Math.floor(a.earns.min*popMult))}~${formatMoney(Math.floor(a.earns.max*popMult))}`;
          } else if (a.cost > 0) {
            suffix = ` | -${formatMoney(a.cost)}/인`;
          } else if (a.earns) {
            const eMin = formatMoney(Math.floor(a.earns.min * popMult));
            const eMax = formatMoney(Math.floor(a.earns.max * popMult));
            suffix = a.isGroupOnly
              ? ` | 단체 +${eMin}~${eMax}`
              : ` | +${eMin}~${eMax}/인`;
          }
          return `<option value="${a.id}"${schMap[m.id]===a.id?' selected':''}>${a.label}${suffix}</option>`;
        }).join('')}
      </select>
    </div>`).join('');

  renderLogMini('log-mini-schedule');
}

window.onScheduleSelect = function(memberId, activityId) {
  const s = APP.state;
  const act = APP.scheduleData.find(a => a.id === activityId);
  if (act && act.isGroupOnly && activityId) {
    s.schedule = s.members.map(m => ({ memberId: m.id, activityId, isManual: true }));
    showToast(act.label + ': 전체 멤버가 배정되었습니다');
  } else {
    s.schedule = s.schedule.filter(e => e.memberId !== memberId);
    if (activityId) s.schedule.push({ memberId, activityId, isManual: true });
  }
  window.StateModule.saveState(s);
  renderScheduleTab();
  renderDashboard();
};

window.clearSchedule = function() {
  APP.state.schedule = [];
  window.StateModule.saveState(APP.state);
  renderScheduleTab(); renderDashboard();
  showToast('스케줄을 초기화했습니다');
};
window.applySchedule = function() {
  window.StateModule.saveState(APP.state);
  renderDashboard();
  showToast('스케줄이 확정되었습니다');
};

window.onSmartAssignManual = function() {
  const s = APP.state;
  if (s.members.length === 0) { showToast('멤버가 없습니다'); return; }
  smartAutoAssign(s, true);
  window.StateModule.saveState(s);
  renderScheduleTab();
  renderDashboard();
  showToast('🎲 소지금·컨디션 기반으로 랜덤 배정했습니다');
};

// ═══════════════════════════════════════════════════════
// Day 실행 엔진
// ═══════════════════════════════════════════════════════
// 인지도 반영 수익 계산
// popularity 0→보정없음, 100→+50%, 200→+100%
function calcEarn(act, popularity) {
  const base = randInt(act.earns.min, act.earns.max);
  const popBonus = 1 + Math.min(popularity, 200) / 200; // 최대 2배
  return Math.floor(base * popBonus);
}

// 활동별 비용/수익 로그 문자열 생성
function moneyLog(delta, label) {
  return delta >= 0
    ? `+${formatMoney(delta)} (${label})`
    : `-${formatMoney(Math.abs(delta))} (${label})`;
}

function executeDay(s) {
  const logs = [];
  const kpiDelta = { popularity:0, fandom:0, reputation:0 };
  const RM = window.RelationsModule;

  // 스케줄 없으면 자동 배정
  if (s.schedule.length === 0) autoAssign(s);

  // 강제 휴식
  s.members.forEach(m => {
    const c = m.condition || { stamina:100, fatigue:0, stress:0 };
    if (!m.condition) m.condition = c;
    if (c.stamina <= 20 || c.fatigue >= 85 || c.stress >= 85) {
      const idx = s.schedule.findIndex(e => e.memberId === m.id);
      const rid = s.settings.autoRestId || 'rest';
      if (idx >= 0) s.schedule[idx].activityId = rid;
      else s.schedule.push({ memberId: m.id, activityId: rid, isManual: false });
      logs.push(`⚠️ ${m.name}의 컨디션이 좋지 않아 강제 휴식으로 전환됩니다`);
    }
  });

  // 남는 멤버 자동 휴식
  s.members.forEach(m => {
    if (!m || !m.id) return;
    if (!s.schedule.find(e => e.memberId === m.id))
      s.schedule.push({ memberId: m.id, activityId: s.settings.autoRestId || 'rest', isManual: false });
  });

  // 비용 선처리
  checkAndFixBudget(s);

  // 활동별 그룹핑 & 실행
  const actGroups = {};
  s.schedule.forEach(e => {
    (actGroups[e.activityId] = actGroups[e.activityId] || []).push(e.memberId);
  });

  Object.entries(actGroups).forEach(([actId, memberIds]) => {
    const act = APP.scheduleData.find(a => a.id === actId)
              || { id:actId, label:actId, type:'rest', cost:0, earns:null, isGroupOnly:false };
    const members = memberIds.map(id => s.members.find(m => m.id === id))
      .filter(m => m && m.condition && m.stats);
    if (!members.length) return;

    // 상태 변화
    members.forEach(m => applyCondition(m, act));

    // 로그 & 수익/비용
    const actLogs = buildActivityLogs(s, act, members);
    logs.push(...actLogs);

    if (act.isGroupOnly) {
      if (act.earns) {
        const earn = calcEarn(act, s.kpi.popularity);
        s.money += earn;
        logs.push(`💵 ${act.label} 수익: +${formatMoney(earn)} (인지도 ${s.kpi.popularity} 반영)`);
        kpiDelta.popularity += randInt(3, 15);
        kpiDelta.fandom     += randInt(100, 300);
      }
    } else {
      if (act.earns) {
        let totalEarn = 0;
        members.forEach(() => { totalEarn += calcEarn(act, s.kpi.popularity); });
        s.money += totalEarn;
        logs.push(`💵 ${act.label} 수익: +${formatMoney(totalEarn)} ${members.length}명 × 인지도 ${s.kpi.popularity} 반영`);
        kpiDelta.popularity += randInt(2, 5) * members.length;
      }
      if (act.cost > 0) {
        const totalCost = act.cost * members.length;
        s.money -= totalCost;
        logs.push(`💸 ${act.label} 비용: -${formatMoney(totalCost)} (1인 ${formatMoney(act.cost)} × ${members.length}명)`);
      }
    }
  });

  // 연습 능력치 상승
  const practiceMap = {};
  s.schedule.forEach(e => {
    const act = APP.scheduleData.find(a => a.id === e.activityId);
    if (!act || act.type !== 'practice' || !act.subType) return;
    (practiceMap[act.subType] = practiceMap[act.subType] || [])
      .push(s.members.find(m => m.id === e.memberId));
  });
  Object.entries(practiceMap).forEach(([subType, members]) => {
    const validMembers = members.filter(Boolean);
    const rises = [];
    validMembers.forEach(m => {
      const r = Math.random();
      const delta = r < 0.2 ? 0 : r < 0.5 ? 0.5 : r < 0.85 ? 1 : 2;
      if (delta > 0) m.stats[subType] = Math.round((m.stats[subType] + delta) * 10) / 10;
      rises.push(`  ${m.name} ${statLabel(subType)} +${delta}`);
      m.lastPractice[subType] = s.day;
    });
    logs.push('📊 연습 결과\n' + rises.join('\n'));
    updateAlbumProgress(s, subType, validMembers);
  });

  // 2일 미연습 하락
  logs.push(...applyPracticeDecay(s));

  // 체중 소폭 변동
  applyWeightChange(s, logs);

  // 콘서트 카운트
  if (s.concert && s.concert.isPlanned && s.concert.daysLeft > 0) {
    s.concert.prepPercent = Math.min(100, s.concert.prepPercent + 100 / s.concert.daysLeft);
    s.concert.daysLeft--;
    if (s.concert.daysLeft === 0) logs.push(...executeConcertNow(s, kpiDelta));
  }

  // 컴백 카운트
  if (s.album.isReleased && s.album.comebackDaysLeft > 0) {
    s.album.comebackDaysLeft--;
    if (s.album.comebackDaysLeft === 0) s.album.isReleased = false;
  }

  // KPI 인기도 자연 감소
  if (!(s.album.isReleased && s.album.comebackDaysLeft > 0))
    kpiDelta.popularity -= s.settings.kpiPopDecayPerDay || 1;

  s.kpi.popularity = Math.max(0, s.kpi.popularity + kpiDelta.popularity);
  s.kpi.fandom     = Math.max(0, s.kpi.fandom     + kpiDelta.fandom);
  s.kpi.reputation = Math.max(0, s.kpi.reputation  + kpiDelta.reputation);

  // 자동 이별 체크
  RM.tickRelations(s);

  // 자동 관계 이벤트
  if (APP.templates) {
    const evs = window.EventsModule.generateAutoEvents(s, s.settings.autoEventMax || 3);
    evs.forEach(ev => {
      const firstDot = ev.first.endsWith('.') ? ev.first : ev.first + '.';
      const secondPart = ev.second ? ' ' + (ev.second.endsWith('.') ? ev.second : ev.second + '.') : '';
      const autoEvLine=`${ev.icon} ${firstDot}${secondPart}`;
      logs.push(autoEvLine);
      pushRelLog(`[Day ${s.day}] ${autoEvLine}`);
    });
  }

  return { logs, kpiDelta };
}

function applyCondition(m, act) {
  if (!m || !m.condition) return;
  // condition 필드 보정 (혹시라도 undefined인 경우 방어)
  if (typeof m.condition.stamina !== 'number') m.condition.stamina = 100;
  if (typeof m.condition.fatigue !== 'number') m.condition.fatigue = 0;
  if (typeof m.condition.stress  !== 'number') m.condition.stress  = 0;
  const c = m.condition;
  let st=0, fa=0, sr=0;
  switch(act.type) {
    case 'rest':     st=randInt(15,25); fa=-randInt(20,30); sr=-randInt(10,20); break;
    case 'practice': st=-randInt(5,10); fa=randInt(10,15);  sr=randInt(-5,5);   break;
    case 'special':  st=-randInt(10,20);fa=randInt(15,25);  sr=randInt(-10,10); break;
    case 'schedule':
      if (act.id==='travel') { st=randInt(-5,5); fa=randInt(5,10); sr=-randInt(20,30); }
      else                   { st=-randInt(5,10);fa=randInt(8,12); sr=randInt(-5,5);   }
      break;
  }
  c.stamina = clamp(c.stamina+st, 0, 100);
  c.fatigue  = clamp(c.fatigue+fa, 0, 100);
  c.stress   = clamp(c.stress+sr,  0, 100);
}

function buildActivityLogs(s, act, members) {
  const logs = [];
  const gn = s.groupName === '미설정' ? '아이돌 시뮬레이터' : s.groupName;
  if (act.isGroupOnly) {
    const tmpl = {
      broadcast:[`🎤 ${gn}${josa(gn,'은는')} 음악방송에서 멋진 무대를 보여줬습니다`,'팬들의 환호성이 이어졌습니다'],
      fansign:  [`🖊️ ${gn}${josa(gn,'은는')} 팬 사인회를 성공적으로 마쳤습니다`,'팬들과의 소중한 시간이 되었습니다'],
    }[act.id] || [`🎪 ${gn}${josa(gn,'은는')} ${act.label}을 진행했습니다`];
    logs.push(...tmpl);
  } else if (act.type === 'rest') {
    const names = members.map(m=>m.name).join(', ');
    logs.push(`😴 ${names}${josa(members[0].name,'은는')} 휴식을 취했습니다`);
  } else if (act.type !== 'practice') {
    const names = members.map(m=>m.name).join(', ');
    const icon = act.type==='schedule' ? '📋' : '⭐';
    logs.push(`${icon} ${names}${josa(members[0].name,'은는')} ${act.label}을(를) 진행했습니다`);
  }
  return logs;
}

function executeConcertNow(s, kpiDelta) {
  const earn = randInt(2000, 3000);
  s.money += earn;
  kpiDelta.fandom     += randInt(200, 500);
  kpiDelta.popularity += randInt(10, 30);
  s.concert = { isPlanned:false, daysLeft:0, venueName:'', prepPercent:0 };
  const gn = s.groupName === '미설정' ? '아이돌 시뮬레이터' : s.groupName;
  return [`🎪 ${gn}${josa(gn,'의')} 콘서트가 성황리에 마무리되었습니다 (+${formatMoney(earn)})`];
}

function updateAlbumProgress(s, subType, members) {
  if (!s.album.isPreparing && !s.album.isReleased) return;
  const gain = s.settings.albumProgressGain || 1.0;
  const key  = { vocal:'vocal', dance:'choreography', songwriting:'lyrics', arrangement:'arrangement' }[subType];
  if (!key) return;
  const validPosFilter = m => {
    if (subType==='vocal') return ['메인보컬','보컬','멀티'].includes(m.position);
    if (subType==='dance') return ['메인댄서','댄서','멀티'].includes(m.position);
    return true;
  };
  const contribution = members.filter(validPosFilter).reduce((sum, m) => {
    const c = m.condition || { stamina:100, fatigue:0, stress:0 };
    let bonus = 1.0 + (m.stats && m.stats[subType] ? m.stats[subType] : 0) / 100;
    if (c.stamina<30) bonus*=0.5;
    if (c.fatigue>=80) bonus*=0.5;
    if (c.stress>=80)  bonus*=0.5;
    return sum + bonus;
  }, 0);
  const delta = Math.round(contribution * gain * 2) / 2;
  s.album.progress[key] = clamp((s.album.progress[key]||0) + delta, 0, 100);
}

function applyPracticeDecay(s) {
  // memberDecay: { memberId -> [skillLabel, ...] }
  const memberDecay = {};
  s.members.forEach(m => {
    ['vocal','dance','rap','songwriting','arrangement'].forEach(sk => {
      const last = m.lastPractice[sk];
      const diff = last === null ? 3 : s.day - last;
      if (diff >= 3) {
        const prev = m.stats[sk];
        m.stats[sk] = Math.max(0, Math.round((m.stats[sk]-0.5)*10)/10);
        if (prev !== m.stats[sk]) {
          if (!memberDecay[m.id]) memberDecay[m.id] = { name: m.name, skills: [] };
          memberDecay[m.id].skills.push(statLabel(sk));
        }
      }
    });
  });
  const logs = [];
  const entries = Object.values(memberDecay);
  if (entries.length === 0) return logs;
  // 멤버별로 한 줄: "박문대의 편곡·작사·랩 실력이 떨어졌습니다(-0.5)"
  // 여러 멤버면 쉼표로 이어서 한 블록으로
  const lines = entries.map(e => `${e.name}의 ${e.skills.join('·')} 실력이 떨어졌습니다(-0.5)`);
  logs.push('📉 ' + lines.join(' / '));
  logs.push('좀 더 연습에 집중해야 할 것 같습니다');
  return logs;
}

function applyWeightChange(s, logs) {
  const alertDelta = s.settings.weightAlertDelta || 3.0;
  s.members.forEach(m => {
    const delta = (Math.random()-0.5)*0.1;
    m.weight = Math.round((m.weight+delta)*100)/100;
    if      (m.weight > m.weightBase+alertDelta) { logs.push(`⚖️ ${m.name}의 체중이 다소 늘었습니다`); m.weightBase=m.weight; }
    else if (m.weight < m.weightBase-alertDelta) { logs.push(`⚖️ ${m.name}의 체중이 많이 줄었습니다`); m.weightBase=m.weight; }
  });
}

function autoAssign(s) {
  smartAutoAssign(s, false);
}

// 소지금·컨디션·컴백 상태를 고려한 스마트 랜덤 배정
function smartAutoAssign(s, isManualTrigger) {
  const restId = s.settings.autoRestId || 'rest';
  const inComeback = s.album.isReleased && s.album.comebackDaysLeft > 0;

  // 배정 가능한 활동 후보 (비용 감당 가능한 것만)
  const candidates = APP.scheduleData.filter(a => {
    if (a.requiresComeback && !inComeback) return false;
    if (a.isGroupOnly) return false; // 단체 활동은 별도 처리
    return true;
  });

  // 총 비용 추정 후 감당 불가 활동 제거
  const affordable = candidates.filter(a => {
    if (a.cost <= 0) return true;
    return s.money >= a.cost * s.members.length;
  });

  s.schedule = s.members.map(m => {
    const c = m.condition || { stamina:100, fatigue:0, stress:0 };

    // 컨디션 불량이면 무조건 휴식
    if (c.stamina <= 20 || c.fatigue >= 85 || c.stress >= 85) {
      return { memberId: m.id, activityId: restId, isManual: false };
    }

    // 가중치 계산: 미연습 능력치 우선, 컨디션 좋을수록 연습 선택 가능성 ↑
    const pool = [];

    // 연습 활동 — 오래 안 한 능력치일수록 가중치 높임
    const practiceMap = {
      vocal_prac:'vocal', dance_prac:'dance', rap_prac:'rap',
      lyric_prac:'songwriting', arr_prac:'arrangement'
    };
    affordable.filter(a => a.type === 'practice').forEach(a => {
      const sk = practiceMap[a.id];
      const last = m.lastPractice && m.lastPractice[sk];
      const daysSince = last === null ? 5 : s.day - last;
      const weight = Math.max(1, daysSince * 2); // 오래될수록 높은 가중치
      for (let i = 0; i < weight; i++) pool.push(a.id);
    });

    // 일반 스케줄 활동 (수익 있는 것)
    if (c.stamina > 40 && c.fatigue < 70) {
      affordable.filter(a => a.type === 'schedule' && a.earns).forEach(a => {
        pool.push(a.id);
        pool.push(a.id); // 가중치 2
      });
    }

    // 휴식 — 피로 높을수록 가중치 증가
    const restWeight = Math.max(1, Math.floor(c.fatigue / 20));
    for (let i = 0; i < restWeight; i++) pool.push(restId);

    const chosen = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : restId;
    return { memberId: m.id, activityId: chosen, isManual: false };
  });

  // 비용 최종 체크
  checkAndFixBudget(s);
}

function checkAndFixBudget(s) {
  const actGroups = {};
  s.schedule.forEach(e => { (actGroups[e.activityId]=actGroups[e.activityId]||0); actGroups[e.activityId]++; });
  let total = 0;
  Object.entries(actGroups).forEach(([id, cnt]) => {
    const a = APP.scheduleData.find(x=>x.id===id);
    if (!a||a.cost<=0) return;
    total += a.isGroupOnly ? a.cost : a.cost*cnt;
  });
  if (total <= s.money) return;
  const costly = Object.keys(actGroups)
    .map(id=>APP.scheduleData.find(a=>a.id===id)).filter(a=>a&&a.cost>0)
    .sort((a,b)=>b.cost-a.cost);
  for (const act of costly) {
    if (total <= s.money) break;
    const cnt = actGroups[act.id]||1;
    total -= act.isGroupOnly ? act.cost : act.cost*cnt;
    s.schedule = s.schedule.map(e =>
      e.activityId===act.id ? {...e,activityId:s.settings.autoRestId||'rest'} : e);
  }
}

// ─── 다음날 ───
window.onNextDay = function() {
  const s = APP.state;
  if (s.members.length===0) { showToast('멤버가 없습니다'); return; }
  const {logs, kpiDelta} = executeDay(s);
  const kpiStr = `팬덤 ${kpiDelta.fandom>=0?'+':''}${kpiDelta.fandom} | 인기도 ${kpiDelta.popularity>=0?'+':''}${kpiDelta.popularity}`;
  pushLog(`[Day ${s.day}] 📌 Day ${s.day} 종료 (소지금: ${formatMoney(s.money)} | ${kpiStr})`);
  logs.forEach(l => { if(l) pushLog(`[Day ${s.day}] ${l}`); });
  s.day++; s.schedule=[];
  pushLog(`[Day ${s.day}] 📌 Day ${s.day} 시작 (소지금: ${formatMoney(s.money)})`);
  window.StateModule.saveState(s);
  renderAll();
  showToast(`Day ${s.day} 시작!`);
};

// ─── 7일 진행 ───
window.onNext7Days = function() {
  const s = APP.state;
  if (s.members.length===0) { showToast('멤버가 없습니다'); return; }
  const firstSch = [...s.schedule];
  let warnDay = -1;
  for (let i=0; i<7; i++) {
    if (i===0 && firstSch.length>0) s.schedule=[...firstSch]; else s.schedule=[];
    const {logs, kpiDelta} = executeDay(s);
    const kpiStr = `팬덤 ${kpiDelta.fandom>=0?'+':''}${kpiDelta.fandom} | 인기도 ${kpiDelta.popularity>=0?'+':''}${kpiDelta.popularity}`;
    pushLog(`[Day ${s.day}] 📌 Day ${s.day} 종료 (소지금: ${formatMoney(s.money)} | ${kpiStr})`);
    logs.forEach(l => { if(l) pushLog(`[Day ${s.day}] ${l}`); });
    if (s.money<=0 && warnDay<0) warnDay=s.day;
    s.day++; s.schedule=[];
    pushLog(`[Day ${s.day}] 📌 Day ${s.day} 시작 (소지금: ${formatMoney(s.money)})`);
  }
  s.schedule=[];
  window.StateModule.saveState(s);
  renderAll();
  showToast(warnDay>0 ? `${warnDay}일차 소지금 부족으로 일부 활동이 제한되었습니다` : '7일 진행 완료!');
};

// ═══════════════════════════════════════════════════════
// 관계 탭
// ═══════════════════════════════════════════════════════
// 이벤트 타입 한글 라벨
const EV_TYPE_LABELS = {
  friendship:'🤝 우정', flirting:'✨ 플러팅', date:'💞 데이트',
  fight:'⚡ 싸움', reconcile:'🩹 화해', jealousy:'😣 질투',
  avoid:'🚫 회피', awkward:'🫥 서먹함', after_breakup:'🌫️ 이별 후',
  reunion:'❤️‍🩹 재결합', breakup:'💔 이별'
};

function renderRelationsTab() {
  const s = APP.state;
  const RM = window.RelationsModule;
  const GR = window.GraphModule;

  // ① 관계도
  setTimeout(()=>{
    GR.renderGraph(getEl('graph-canvas'), s);
    GR.renderLegend(getEl('graph-legend'));
  }, 60);

  // ② 관계 수치 조회
  const table = getEl('relation-table');
  if (table) {
    if (s.members.length < 2) {
      table.innerHTML = '<div class="empty-hint">멤버가 2명 이상이어야 관계가 표시됩니다</div>';
    } else {
      const rows = [];
      for (let i=0; i<s.members.length; i++) {
        for (let j=i+1; j<s.members.length; j++) {
          const a=s.members[i], b=s.members[j];
          const rel = RM.ensureRelation(s, a.id, b.id);
          const label = RM.getRelationLabel(rel, s.settings);
          const color = GR.STAGE_COLORS[RM.hasTag(rel,'exLover')?'exLover':rel.stage]||'#999';
          const bar = Math.round((rel.affection + 200) / 4); // 0~100%
          const barColor = rel.affection >= 0 ? 'var(--accent)' : 'var(--danger)';
          rows.push(`
            <div class="rel-stat-row">
              <div class="rel-stat-names">
                <span class="rel-name-a">${a.name}</span>
                <span class="rel-sep">↔</span>
                <span class="rel-name-b">${b.name}</span>
              </div>
              <div class="rel-stat-bar-wrap">
                <div class="rel-stat-bar">
                  <div class="rel-stat-fill" style="width:${bar}%;background:${barColor}"></div>
                </div>
                <span class="rel-stat-num" style="color:${color}">${rel.affection>0?'+':''}${rel.affection}</span>
                <span class="rel-stat-label" style="color:${color}">${label}</span>
              </div>
            </div>`);
        }
      }
      table.innerHTML = rows.join('');
    }
  }

  // ③ 수동 관계 이벤트 패널 — 쌍마다 아코디언, 전체 이벤트 목록 표시 (불가는 disabled)
  const ALL_EV_TYPES = [
    'friendship','flirting','date','fight','reconcile',
    'jealousy','avoid','awkward','after_breakup','reunion','breakup'
  ];

  const evPanel = getEl('relation-event-panel');
  if (evPanel) {
    if (s.members.length < 2) {
      evPanel.innerHTML = '<div class="empty-hint">멤버가 2명 이상이어야 이벤트를 실행할 수 있습니다</div>';
    } else {
      const memberOpts = s.members.map(m =>
        `<option value="${m.id}">${m.name}${m.isLeader?' 👑':''} (${m.position})</option>`
      ).join('');
      evPanel.innerHTML = `
        <div class="ev-select-row">
          <div class="ev-select-group">
            <label class="ev-select-label">A — 행동하는 쪽</label>
            <select id="ev-sel-a" class="input ev-select" onchange="renderEvList()">
              <option value="">선택하세요</option>${memberOpts}
            </select>
          </div>
          <div class="ev-arrow-mid">→</div>
          <div class="ev-select-group">
            <label class="ev-select-label">B — 대상</label>
            <select id="ev-sel-b" class="input ev-select" onchange="renderEvList()">
              <option value="">선택하세요</option>${memberOpts}
            </select>
          </div>
        </div>
        <div id="ev-list-area"><p class="note" style="margin-top:8px">A와 B를 선택하면 이벤트 목록이 표시됩니다.</p></div>`;
    }
  }

  // ④ 최근 관계 로그만
  renderRelLogMini('log-mini-relation');
}

// A/B 드롭다운 선택 시 이벤트 목록 즉시 렌더
const ALL_EV_TYPES_GLOBAL = [
  'friendship','flirting','date','fight','reconcile',
  'jealousy','avoid','awkward','after_breakup','reunion','breakup'
];

window.renderEvList = function() {
  const s = APP.state;
  const RM = window.RelationsModule;
  const GR = window.GraphModule;
  const listArea = getEl('ev-list-area');
  if (!listArea) return;

  const idA = getEl('ev-sel-a')?.value;
  const idB = getEl('ev-sel-b')?.value;

  if (!idA || !idB) { listArea.innerHTML = '<p class="note" style="margin-top:8px">A와 B를 선택하면 이벤트 목록이 표시됩니다.</p>'; return; }
  if (idA === idB) { listArea.innerHTML = '<p class="note" style="margin-top:8px;color:var(--danger)">A와 B는 다른 멤버여야 합니다.</p>'; return; }

  const a = s.members.find(m => m.id === idA);
  const b = s.members.find(m => m.id === idB);
  if (!a || !b) return;

  const rel = RM.ensureRelation(s, idA, idB);
  const allowed = RM.getAllowedTypes(rel, s.settings);
  const color = GR.STAGE_COLORS[RM.hasTag(rel,'exLover')?'exLover':rel.stage] || '#999';

  const loverBtn = RM.isLover(rel)
    ? `<button class="ev-item ev-item-danger" onclick="doBreakupUI('${idA}','${idB}')">💔 이별</button>`
    : `<button class="ev-item ev-item-love" onclick="doConfessUI('${idA}','${idB}')">💌 고백 (${a.name} → ${b.name})</button>`;

  const evItems = ALL_EV_TYPES_GLOBAL.map(t => {
    const isAllowed = allowed.includes(t);
    const label = EV_TYPE_LABELS[t] || t;
    const reason = isAllowed ? '' : getDisabledReason(t, rel, s.settings);
    return isAllowed
      ? `<button class="ev-item" onclick="quickRelEvent('${idA}','${idB}','${t}')">${label}</button>`
      : `<button class="ev-item ev-item-disabled" disabled title="${reason}">${label}</button>`;
  }).join('');

  listArea.innerHTML = `
    <div class="ev-rel-status" style="color:${color}">
      ${a.name} → ${b.name} &nbsp;·&nbsp; ${RM.getRelationLabel(rel,s.settings)} &nbsp;·&nbsp; 호감도 ${rel.affection>0?'+':''}${rel.affection}
    </div>
    <div class="rel-ev-list" style="display:flex;padding:8px 0">
      ${loverBtn}
      ${evItems}
    </div>`;
};

// 비활성화 이유 툴팁
function getDisabledReason(type, rel, settings) {
  const RM = window.RelationsModule;
  const isEx = RM.isExLover(rel);
  const isLover = RM.isLover(rel);
  const hasColdWar = rel.coldWarDaysLeft > 0 || RM.hasTag(rel,'coldWar');
  const isAvoiding = rel.avoidDaysLeft > 0;
  const exOkMin = settings.exReunionOkMin || 100;
  const exReunion = settings.exReunionPossible || 140;

  if (isAvoiding) return '회피 기간 중 — avoid만 가능';
  if (hasColdWar && !['fight','reconcile'].includes(type)) return '냉전 중 — 싸움/화해만 가능';
  if (isLover && ['reunion','after_breakup','avoid','awkward','breakup'].includes(type))
    return '연인 상태에서는 불가';
  if (!isLover && !isEx && ['reconcile','reunion','after_breakup','avoid','awkward'].includes(type))
    return '해당 관계 상태가 아님';
  if (isEx && isAvoiding && type !== 'avoid') return '회피 기간 중';
  if (isEx && !isAvoiding && rel.affection <= (settings.exAwkwardClear||80)
      && !['after_breakup','awkward','avoid'].includes(type)) return '서먹함 단계 — 이별 후/서먹함만 가능';
  if (isEx && rel.affection < exOkMin && ['date','flirting','friendship'].includes(type))
    return `재접근 허용치(${exOkMin}) 미달`;
  if (isEx && rel.affection < exReunion && type === 'reunion') return `재결합 가능 호감도(${exReunion}) 미달`;
  if (!isLover && type === 'breakup') return '연인 상태가 아님';
  if (type === 'jealousy' && rel.affection < 0) return '호감도 부족 (질투 불가)';
  return '현재 관계 상태에서 불가';
}

// 이벤트 타입 버튼 직접 실행 (모달 없이)
window.quickRelEvent = function(idA, idB, type) {
  const s=APP.state, RM=window.RelationsModule, EM=window.EventsModule;
  const rel=RM.ensureRelation(s, idA, idB);
  const a=s.members.find(m=>m.id===idA), b=s.members.find(m=>m.id===idB);
  if (!a || !b) return;

  // breakup은 confirm
  if (type === 'breakup') { doBreakupUI(idA, idB); return; }

  // manualFail 체크
  if (RM.isExLover(rel) && rel.affection < (s.settings.exReunionOkMin||100)
      && ['friendship','flirting','date'].includes(type)) {
    const fail=EM.buildManualFail(type, a, b);
    if(fail){
      const mfq1=fail.first.endsWith('.')?fail.first:fail.first+'.';
      const mfq2=fail.second?(fail.second.endsWith('.')?fail.second:fail.second+'.'):'';
      pushLog(`[Day ${s.day}] 🌫️ ${mfq1}${mfq2?' '+mfq2:''}`);
    }
    window.StateModule.saveState(s); renderAll(); return;
  }

  if (!APP.templates) { showToast('템플릿 없음'); return; }
  const cands=APP.templates.templates.filter(t=>t.type===type);
  if (!cands.length) { showToast('해당 이벤트 없음'); return; }
  const tpl=EM.weightedRandom(cands, t=>t.weight||1);
  const ev=EM.applyTemplate(tpl, s, a, b, rel);
  if(ev){
    const fd=ev.first.endsWith('.')?ev.first:ev.first+'.';
    const sd=ev.second?(ev.second.endsWith('.')?ev.second:ev.second+'.'):'';
    const relLine=`[Day ${s.day}] ${ev.icon} ${fd}${sd?' '+sd:''}`;
    pushLog(relLine);
    pushRelLog(relLine);
  }
  window.StateModule.saveState(s);
  renderRelationsTab();
  renderLogTab();
  showToast(`${EV_TYPE_LABELS[type]||type} 이벤트 실행`);
};

window.doBreakupUI = function(idA, idB) {
  showConfirm('정말 이별시키겠습니까?', () => {
    const s=APP.state, RM=window.RelationsModule, EM=window.EventsModule;
    const rel=RM.ensureRelation(s,idA,idB);
    const a=s.members.find(m=>m.id===idA), b=s.members.find(m=>m.id===idB);
    RM.doBreakup(rel, s.settings);
    if (APP.templates && a && b) {
      const tmpl=APP.templates.templates.find(t=>t.id==='bk_01');
      if (tmpl) {
        const first=EM.resolveTemplate(tmpl,{A:a.name,B:b.name});
        const second=EM.pickSecondLine(tmpl,false);
        const bkFirst=first.endsWith('.')?first:first+'.';
        const bkSecond=second?(second.endsWith('.')?second:second+'.'):'';
        const bkLine=`[Day ${s.day}] 💔 ${bkFirst}${bkSecond?' '+bkSecond:''}`;
        pushLog(bkLine);
        pushRelLog(bkLine);
      }
    }
    window.StateModule.saveState(s); renderAll();
  });
};

window.doConfessUI = function(idA, idB) {
  const s=APP.state, result=window.EventsModule.doConfess(s,idA,idB);
  if (!result) return;
  if (result.type==='already_lover') { showPopup('이미 연인입니다'); return; }
  if (result.type==='romance_disabled') {
    showPopup('현재 연애가 허용되지 않는 설정입니다.\n설정 탭에서 변경할 수 있습니다');
    return;
  }
  if (result.type==='gender_block') {
    const reason = result.reason === 'same' ? '동성 연애가 허용되지 않습니다' : '이성 연애가 허용되지 않습니다';
    const cl7=`[Day ${s.day}] 💌 ${result.from.name}의 고백 — ${reason}`;
    pushLog(cl7); pushRelLog(cl7);
    const cl8='마음은 있지만 이어질 수 없었습니다.';
    pushLog(cl8); pushRelLog(cl8);
    window.StateModule.saveState(s); renderAll(); return;
  }
  if (result.type==='monogamy_block') {
    const cl1=`[Day ${s.day}] 💌 ${result.from.name}의 고백 — 이미 연애 중인 멤버가 있습니다`;
    pushLog(cl1); pushRelLog(cl1);
    const cl2='고백한 쪽의 마음이 복잡해집니다.';
    pushLog(cl2); pushRelLog(cl2);
  } else if (result.type==='success') {
    const cl3=`[Day ${s.day}] 💑 ${result.from.name}과 ${result.to.name}이 연인이 되었습니다`;
    pushLog(cl3); pushRelLog(cl3);
    const cl4='두 사람의 마음이 하나로 이어졌습니다.';
    pushLog(cl4); pushRelLog(cl4);
  } else {
    const cl5=`[Day ${s.day}] 💌 ${result.from.name}의 고백`;
    pushLog(cl5); pushRelLog(cl5);
    const cl6='마음이 복잡하지만 아직은 아닌 것 같습니다.';
    pushLog(cl6); pushRelLog(cl6);
  }
  window.StateModule.saveState(s); renderAll();
};

window.openRelEventUI = function(idA, idB) {
  const s=APP.state, RM=window.RelationsModule;
  const a=s.members.find(m=>m.id===idA), b=s.members.find(m=>m.id===idB);
  const rel=RM.ensureRelation(s,idA,idB);
  const allowed=RM.getAllowedTypes(rel,s.settings);
  if (!APP.templates) { showToast('템플릿 없음'); return; }
  const TL={friendship:'우정',flirting:'플러팅',date:'데이트',fight:'싸움',reconcile:'화해',
    jealousy:'질투',avoid:'회피',awkward:'서먹함',after_breakup:'이별 후',reunion:'재결합',breakup:'이별'};
  showModal(`
    <h3>${a.name} ↔ ${b.name}</h3>
    <p style="margin-bottom:10px;font-size:.82rem;color:var(--text-sub)">호감도: ${rel.affection} · ${RM.getRelationLabel(rel,s.settings)}</p>
    <div class="form-group"><label>이벤트 유형</label>
      <select id="ev-type-sel" class="input">
        ${allowed.map(t=>`<option value="${t}">${TL[t]||t}</option>`).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="execManualRelEvent('${idA}','${idB}')">실행</button>
      <button class="btn btn-ghost" onclick="closeModal()">취소</button>
    </div>`);
};

window.execManualRelEvent = function(idA, idB) {
  const type=getEl('ev-type-sel')?.value;
  if (!type) return;
  const s=APP.state, RM=window.RelationsModule, EM=window.EventsModule;
  const rel=RM.ensureRelation(s,idA,idB);
  const a=s.members.find(m=>m.id===idA), b=s.members.find(m=>m.id===idB);
  if (RM.isExLover(rel) && rel.affection<(s.settings.exReunionOkMin||100)
      && ['friendship','flirting','date'].includes(type)) {
    const fail=EM.buildManualFail(type,a,b);
    if(fail){
      const mf1=fail.first.endsWith('.')?fail.first:fail.first+'.';
      const mf2=fail.second?(fail.second.endsWith('.')?fail.second:fail.second+'.'):'';
      pushLog(`[Day ${s.day}] 🌫️ ${mf1}${mf2?' '+mf2:''}`);
    }
    window.StateModule.saveState(s); renderAll(); closeModal(); return;
  }
  const cands=APP.templates.templates.filter(t=>t.type===type);
  if (!cands.length){ closeModal(); return; }
  const tpl=EM.weightedRandom(cands,t=>t.weight||1);
  const ev=EM.applyTemplate(tpl,s,a,b,rel);
  if(ev){
    const fd2=ev.first.endsWith('.')?ev.first:ev.first+'.';
    const sd2=ev.second?(ev.second.endsWith('.')?ev.second:ev.second+'.'):'';
    pushLog(`[Day ${s.day}] ${ev.icon} ${fd2}${sd2?' '+sd2:''}`);
  }
  window.StateModule.saveState(s); renderAll(); closeModal();
};

// ═══════════════════════════════════════════════════════
// 앨범·콘서트 탭
// ═══════════════════════════════════════════════════════
function averageProgress(prog) {
  const v=Object.values(prog); return v.reduce((a,b)=>a+b,0)/v.length;
}
function renderAlbumTab() {
  const s=APP.state, alb=s.album, prog=alb.progress;
  const progEl=getEl('album-progress');
  if (progEl) {
    if (alb.isPreparing||alb.isReleased) {
      progEl.innerHTML=[['lyrics','작사·작곡'],['arrangement','편곡'],['vocal','보컬'],['choreography','안무']].map(([k,l])=>`
        <div class="prog-row">
          <span class="prog-label">${l}</span>
          <div class="prog-bar"><div class="prog-fill" style="width:${prog[k]||0}%"></div></div>
          <span class="prog-num">${(prog[k]||0).toFixed(1)}%</span>
        </div>`).join('')
        +`<div class="album-status">${alb.isReleased?`컴백 중 (${alb.comebackDaysLeft}일 남음)`:'준비 중'}${alb.title?` — "${alb.title}"`:''}</div>
           <div class="album-quality">평균 완성도: ${averageProgress(prog).toFixed(1)}%</div>`;
    } else {
      progEl.innerHTML='<div class="empty-hint">앨범 준비를 시작하려면 아래 버튼을 누르세요</div>';
    }
  }
  const c=s.concert||{isPlanned:false,daysLeft:0,prepPercent:0};
  if(!s.concert) s.concert=c;
  setEl('concert-status', c.isPlanned?`D-${c.daysLeft}일 (준비 ${Math.round(c.prepPercent||0)}%)${c.venueName?' — '+c.venueName:''}`:'예정 없음');
}

window.onStartAlbum = function() {
  const s=APP.state;
  if (s.album.isReleased&&s.album.comebackDaysLeft>0){showPopup('컴백 활동 중에는 다른 앨범을 발매할 수 없습니다');return;}
  s.album.isPreparing=true; s.album.isReleased=false;
  s.album.progress={lyrics:0,arrangement:0,vocal:0,choreography:0};
  s.album.title=''; s.album.releaseInfo={};
  window.StateModule.saveState(s); renderAlbumTab(); showToast('앨범 준비를 시작했습니다');
};

window.onReleaseAlbum = function() {
  const s=APP.state;
  if (!s.album.isPreparing){showPopup('먼저 앨범 준비를 시작해주세요');return;}
  if (s.album.isReleased&&s.album.comebackDaysLeft>0){showPopup('컴백 활동 중에는 다른 앨범을 발매할 수 없습니다');return;}
  if (s.money<500){showPopup(`앨범 발매 비용이 부족합니다\n필요: 500원 / 보유: ${formatMoney(s.money)}`);return;}
  showModal(`
    <h3>앨범 발매</h3>
    <div class="form-group"><label>타이틀곡 제목 *</label><input id="alb-title" class="input" placeholder="타이틀곡 제목"></div>
    <div class="form-group"><label>장르 *</label><input id="alb-genre" class="input" placeholder="발라드, 댄스, 팝..."></div>
    <div class="form-group"><label>컨셉 *</label><input id="alb-concept" class="input" placeholder="청량, 퇴폐미, 걸크러쉬..."></div>
    <div class="form-group"><label>작사·작곡 담당 *</label>
      <select id="alb-lyricist" class="input"><option value="">선택</option>${s.members.map(m=>`<option value="${m.id}">${m.name}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>편곡 담당 *</label>
      <select id="alb-arranger" class="input"><option value="">선택</option>${s.members.map(m=>`<option value="${m.id}">${m.name}</option>`).join('')}</select>
    </div>
    <p class="note">발매 비용: 500원 · 현재 잔액: ${formatMoney(s.money)}</p>
    <div class="modal-actions">
      <button class="btn" onclick="confirmReleaseAlbum()">발매</button>
      <button class="btn btn-ghost" onclick="closeModal()">취소</button>
    </div>`);
};

window.confirmReleaseAlbum = function() {
  const title=getEl('alb-title')?.value?.trim(),genre=getEl('alb-genre')?.value?.trim(),
    concept=getEl('alb-concept')?.value?.trim(),
    lyricist=getEl('alb-lyricist')?.value,arranger=getEl('alb-arranger')?.value;
  const miss=[];
  if(!title) miss.push('타이틀곡 제목'); if(!genre) miss.push('장르');
  if(!concept) miss.push('컨셉'); if(!lyricist) miss.push('작사·작곡 담당'); if(!arranger) miss.push('편곡 담당');
  if(miss.length>0){showPopup('필수 항목이 누락되었습니다.\n'+miss.join(', '));return;}
  const s=APP.state;
  s.money-=500;
  const avg=averageProgress(s.album.progress);
  const bonus=avg>=(s.settings.albumQualityThresholdHigh||80)?1.2:avg<(s.settings.albumQualityThresholdLow||50)?0.8:1.0;
  s.kpi.fandom+=Math.round(randInt(50,200)*bonus);
  s.album={...s.album,isPreparing:false,isReleased:true,
    comebackDaysLeft:s.settings.comebackDays||21,title,releaseInfo:{genre,concept,lyricist,arranger}};
  const gn=s.groupName==='미설정'?'아이돌 시뮬레이터':s.groupName;
  pushLog(`[Day ${s.day}] 💿 ${gn}${josa(gn,'의')} 새 앨범 "${title}"이 발매되었습니다!`);
  pushLog(`컴백 기간 ${s.album.comebackDaysLeft}일이 시작되었습니다`);
  window.StateModule.saveState(s); renderAll(); closeModal(); showToast(`"${title}" 발매 완료!`);
};

window.onPlanConcert = function() {
  const s=APP.state;
  if(s.concert&&s.concert.isPlanned){showPopup('이미 콘서트가 예정되어 있습니다');return;}
  if(s.money<1000){showPopup(`콘서트 예약 비용이 부족합니다\n필요: 1,000원 / 보유: ${formatMoney(s.money)}`);return;}
  showModal(`
    <h3>콘서트 예약</h3>
    <div class="form-group"><label>개최 예정일 (일 후, 3~30) *</label>
      <input id="concert-days" class="input" type="number" min="3" max="30" value="7"></div>
    <div class="form-group"><label>장소명 (선택)</label>
      <input id="concert-venue" class="input" placeholder="공연장 이름"></div>
    <p class="note">예약 비용: 1,000원 · 현재 잔액: ${formatMoney(s.money)}</p>
    <div class="modal-actions">
      <button class="btn" onclick="confirmConcert()">예약</button>
      <button class="btn btn-ghost" onclick="closeModal()">취소</button>
    </div>`);
};

window.confirmConcert = function() {
  const days=parseInt(getEl('concert-days')?.value||'7');
  if(isNaN(days)||days<3||days>30){showPopup('개최 예정일은 3~30일 사이여야 합니다');return;}
  const s=APP.state;
  s.money-=1000;
  s.concert={isPlanned:true,daysLeft:days,venueName:getEl('concert-venue')?.value?.trim()||'',prepPercent:0};
  window.StateModule.saveState(s); renderAll(); closeModal(); showToast(`콘서트 D-${days}로 예약되었습니다`);
};

// ═══════════════════════════════════════════════════════
// 설정 탭
// ═══════════════════════════════════════════════════════
function renderSettingsTab() {
  const s=APP.state;
  const gn=getEl('settings-group-name');
  if(gn) gn.value=s.groupName==='미설정'?'':s.groupName;
  const th=getEl('settings-theme');
  if(th) th.value=s.theme;
  const md=getEl('settings-mode');
  if(md) md.value=s.settings.relationshipMode;
  const ar=getEl('settings-allow-romance');
  if(ar) ar.checked=s.settings.allowRomance!==false;
  // 연애 비허용이면 하위 옵션 dim 처리
  const sgLabel=getEl('label-same-gender');
  const ogLabel=getEl('label-opp-gender');
  const romanceOn=s.settings.allowRomance!==false;
  if(sgLabel) sgLabel.style.opacity=romanceOn?'1':'0.35';
  if(ogLabel) ogLabel.style.opacity=romanceOn?'1':'0.35';
  const sg=getEl('settings-same-gender');
  if(sg){ sg.checked=!!s.settings.allowSameGender; sg.disabled=!romanceOn; }
  const og=getEl('settings-opp-gender');
  if(og){ og.checked=!!s.settings.allowOppositeGender; og.disabled=!romanceOn; }
  // 헤더 테마 토글 동기화
  const thBtn=getEl('header-theme-btn');
  if(thBtn) thBtn.textContent=s.theme==='dark'?'☀️':'🌙';
}
window.onSaveGroupName=function(){
  const v=getEl('settings-group-name')?.value?.trim();
  APP.state.groupName=v||'미설정';
  window.StateModule.saveState(APP.state);
  renderDashboard(); renderMembersTab(); showToast('그룹명을 변경했습니다');
};
window.onChangeTheme=function(v){APP.state.theme=v;applyTheme(v);window.StateModule.saveState(APP.state);showToast('테마를 변경했습니다');};
window.onChangeMode=function(v){APP.state.settings.relationshipMode=v;window.StateModule.saveState(APP.state);};
window.onChangeAllowRomance=function(v){
  APP.state.settings.allowRomance=v;
  window.StateModule.saveState(APP.state);
  renderSettingsTab(); // dim 처리 즉시 반영
};
window.onChangeSameGender=function(v){APP.state.settings.allowSameGender=v;window.StateModule.saveState(APP.state);};
window.onChangeOppGender =function(v){APP.state.settings.allowOppositeGender=v;window.StateModule.saveState(APP.state);};
window.onToggleTheme=function(){
  const s=APP.state;
  s.theme=s.theme==='dark'?'light':'dark';
  applyTheme(s.theme);
  window.StateModule.saveState(s);
  showToast('테마를 변경했습니다');
  const btn=getEl('header-theme-btn');
  if(btn) btn.textContent=s.theme==='dark'?'☀️':'🌙';
};

// ═══════════════════════════════════════════════════════
// 로그
// ═══════════════════════════════════════════════════════
function renderLogTab(){const el=getEl('log-full');if(!el)return;el.textContent=APP.state.log.join('\n');}
function renderLogMini(id){
  const el=getEl(id);if(!el)return;
  const N=APP.state.settings.logPreviewN||30;
  el.textContent=APP.state.log.slice(0,N).join('\n');
}
function renderRelLogMini(id){
  const el=getEl(id);if(!el)return;
  const N=APP.state.settings.logPreviewN||30;
  const relLog=APP.state.relLog||[];
  el.textContent=relLog.slice(0,N).join('\n')||'(관계 이벤트 없음)';
}
function pushLog(line){APP.state.log.unshift(line);}
function pushRelLog(line){
  if(!APP.state.relLog) APP.state.relLog=[];
  APP.state.relLog.unshift(line);
}

// ═══════════════════════════════════════════════════════
// 멤버 CRUD
// ═══════════════════════════════════════════════════════
window.openAddMember = () => showMemberForm(null);
window.openEditMember = id => { const m=APP.state.members.find(m=>m.id===id); if(m) showMemberForm(m); };

function showMemberForm(member) {
  const {VALID_POSITIONS,MBTI_LIST}=window.MembersModule;
  const isEdit=!!member, m=member||{}, st=m.stats||{};
  showModal(`
    <h3>${isEdit?'멤버 수정':'멤버 추가'}</h3>
    <div class="member-form">
      <div class="form-row">
        <div class="form-group"><label>이름 *</label><input id="mf-name" class="input" value="${m.name||''}" placeholder="이름"></div>
        <div class="form-group"><label>성별 *</label>
          <select id="mf-gender" class="input"><option value="">선택</option>
            <option value="남"${m.gender==='남'?' selected':''}>남</option>
            <option value="여"${m.gender==='여'?' selected':''}>여</option>
          </select>
        </div>
        <div class="form-group"><label>MBTI *</label>
          <select id="mf-mbti" class="input"><option value="">선택</option>
            ${MBTI_LIST.map(t=>`<option value="${t}"${m.mbti===t?' selected':''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>키(cm) *</label><input id="mf-height" class="input" type="number" value="${m.height||''}"></div>
        <div class="form-group"><label>몸무게(kg) *</label><input id="mf-weight" class="input" type="number" step="0.01" value="${m.weight||''}"></div>
        <div class="form-group"><label>포지션 *</label>
          <select id="mf-pos" class="input"><option value="">선택</option>
            ${VALID_POSITIONS.map(p=>`<option value="${p}"${m.position===p?' selected':''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label>리더 여부</label>
        <select id="mf-leader" class="input">
          <option value="0"${!m.isLeader?' selected':''}>일반 멤버</option>
          <option value="1"${m.isLeader?' selected':''}>리더</option>
        </select>
      </div>
      <div class="stats-grid">
        ${[['vocal','보컬'],['dance','댄스'],['rap','랩'],['looks','외모'],['charm','끼'],['songwriting','작사작곡'],['arrangement','편곡']].map(([k,l])=>`
        <div class="form-group"><label>${l} *</label>
          <input id="mf-${k}" class="input" type="number" min="0" step="0.5" value="${st[k]!=null?st[k]:0}">
        </div>`).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="saveMemberForm(${isEdit?`'${m.id}'`:'null'})">${isEdit?'저장':'추가'}</button>
      <button class="btn btn-ghost" onclick="closeModal()">취소</button>
    </div>`);
}

window.saveMemberForm = function(editId) {
  const s=APP.state, MM=window.MembersModule;
  const data={
    name:getEl('mf-name')?.value||'', gender:getEl('mf-gender')?.value||'',
    mbti:getEl('mf-mbti')?.value||'', height:getEl('mf-height')?.value||'',
    weight:getEl('mf-weight')?.value||'', position:getEl('mf-pos')?.value||'',
    isLeader:getEl('mf-leader')?.value==='1',
    vocal:getEl('mf-vocal')?.value, dance:getEl('mf-dance')?.value,
    rap:getEl('mf-rap')?.value, looks:getEl('mf-looks')?.value,
    charm:getEl('mf-charm')?.value, songwriting:getEl('mf-songwriting')?.value,
    arrangement:getEl('mf-arrangement')?.value
  };
  const errors=MM.validateMemberData(data, s.members, editId);
  if(errors.length>0){showPopup('필수 항목이 누락되었습니다.\n'+errors.join('\n'));return;}
  if(!editId && s.members.length>=25){showPopup('멤버는 최대 25명까지 추가할 수 있습니다');return;}
  const conflict=MM.checkUniquePositionConflict(data.position, s.members, editId);
  if(conflict){
    const sp=data.position.replace('메인','');
    showConfirm(`이미 [${data.position}]인 ${conflict.name}이 있습니다.\n${conflict.name}의 포지션을 [${sp}]으로 변경할까요?`,()=>{
      conflict.position=sp; applyMemberSave(s,data,editId);
    });
    return;
  }
  applyMemberSave(s,data,editId);
};

function applyMemberSave(s,data,editId){
  const MM=window.MembersModule;
  if(data.isLeader) s.members.forEach(m=>{m.isLeader=false;});
  if(editId){
    const m=s.members.find(m=>m.id===editId);
    if(m){
      m.name=data.name.trim(); m.gender=data.gender; m.mbti=data.mbti;
      m.height=Number(data.height); m.weight=Math.round(parseFloat(data.weight)*100)/100;
      m.position=data.position; m.isLeader=!!data.isLeader;
      ['vocal','dance','rap','looks','charm','songwriting','arrangement'].forEach(k=>{
        m.stats[k]=Math.max(0,Number(data[k])||0);
      });
    }
  } else {
    const nm=MM.createMember(data);
    if(s.members.length===0) nm.isLeader=true;
    if(data.isLeader) nm.isLeader=true;
    // condition/stats 등 필드가 반드시 있도록 보정
    window.StateModule.migrateMember(nm);
    s.members.push(nm);
  }
  window.StateModule.saveState(s); renderAll(); closeModal();
  showToast(editId?'멤버를 수정했습니다':'멤버를 추가했습니다');
}

window.deleteMember = function(id){
  const s=APP.state, m=s.members.find(m=>m.id===id);
  if(!m) return;
  if(m.isLeader && s.members.length>1){
    showConfirm(`리더 ${m.name}을 삭제합니다.\n삭제 후 바로 새 리더를 지정해야 합니다.`,()=>{
      s.members=s.members.filter(mb=>mb.id!==id);
      s.schedule=s.schedule.filter(e=>e.memberId!==id);
      window.StateModule.saveState(s); renderAll(); showLeaderAssignPopup();
    });
  } else {
    showConfirm(`${m.name}을 삭제하시겠습니까?`,()=>{
      s.members=s.members.filter(mb=>mb.id!==id);
      s.schedule=s.schedule.filter(e=>e.memberId!==id);
      window.StateModule.saveState(s); renderAll(); showToast('멤버를 삭제했습니다');
    });
  }
};

function showLeaderAssignPopup(){
  const s=APP.state;
  if(s.members.length===0){showToast('멤버가 없습니다');return;}
  showModal(`
    <h3>새 리더를 지정해주세요</h3>
    <div id="leader-assign-list">
      ${s.members.map(m=>`<div class="leader-option" onclick="assignLeader('${m.id}')">
        <span>${m.name}</span><span class="badge badge-pos">${m.position}</span>
      </div>`).join('')}
    </div>`,false);
}
window.assignLeader=function(id){
  APP.state.members.forEach(m=>{m.isLeader=m.id===id;});
  window.StateModule.saveState(APP.state); renderAll(); closeModal(); showToast('리더가 지정되었습니다');
};
window.setLeader=function(id){
  APP.state.members.forEach(m=>{m.isLeader=m.id===id;});
  window.StateModule.saveState(APP.state); renderMembersTab(); showToast('리더가 변경되었습니다');
};

// ═══════════════════════════════════════════════════════
// 저장 / 내보내기
// ═══════════════════════════════════════════════════════
window.onSave     =()=>{window.StateModule.saveState(APP.state);showToast('저장했습니다');};
window.onExport   =()=>{window.StorageModule.exportJSON(APP.state);showToast('내보냈습니다');};
window.onExportLog=()=>{window.StorageModule.exportLogTXT(APP.state);showToast('로그TXT를 저장했습니다');};
window.onExportMembers=()=>{window.StorageModule.exportMembersJSON(APP.state);showToast('멤버를 내보냈습니다');};
window.onImport   =()=>{getEl('import-file').click();};
window.onImportMembers=()=>{getEl('import-members-file').click();};

window.onImportFile = async function(input){
  const file=input.files[0]; if(!file) return;
  try {
    const json=await window.StorageModule.readFile(file);
    const ns=window.StateModule.loadStateFromJSON(json);
    if(!ns){showPopup('파일을 읽을 수 없습니다');return;}
    APP.state=ns; window.StateModule.saveState(APP.state);
    renderAll(); showToast('불러왔습니다');
  } catch(e){showPopup('파일 형식 오류');}
  input.value='';
};
window.onImportMembersFile = async function(input){
  const file=input.files[0]; if(!file) return;
  try {
    const members=await window.StorageModule.readFile(file);
    if(!Array.isArray(members)){showPopup('멤버 파일 형식 오류');return;}
    APP.state.members=members; window.StateModule.saveState(APP.state);
    renderAll(); showToast('멤버를 불러왔습니다');
  } catch(e){showPopup('파일 형식 오류');}
  input.value='';
};
window.onReset=function(){
  showConfirm('정말 초기화하시겠습니까? 모든 데이터가 삭제됩니다.',()=>{
    APP.state=window.StateModule.createDefaultState();
    window.StateModule.saveState(APP.state); renderAll(); showToast('초기화되었습니다');
  });
};

// ═══════════════════════════════════════════════════════
// 그룹명 팝업
// ═══════════════════════════════════════════════════════
function showGroupNamePopup(){
  showModal(`
    <h3>그룹명을 입력해주세요</h3>
    <div class="form-group"><input id="gn-input" class="input" placeholder="그룹명 (비워두면 미설정)" autofocus></div>
    <div class="modal-actions"><button class="btn" onclick="saveGroupNameFromPopup()">확인</button></div>
  `,false);
  setTimeout(()=>{
    const inp=getEl('gn-input');
    if(inp){inp.focus();inp.addEventListener('keydown',e=>{if(e.key==='Enter')window.saveGroupNameFromPopup();});}
  },80);
}
window.saveGroupNameFromPopup=function(){
  const v=getEl('gn-input')?.value?.trim();
  APP.state.groupName=v||'미설정';
  window.StateModule.saveState(APP.state);
  renderDashboard(); renderMembersTab(); closeModal();
};

// ═══════════════════════════════════════════════════════
// UI 헬퍼 — toast / popup / confirm / modal
// ═══════════════════════════════════════════════════════
let _toastTimer=null;
function showToast(msg){
  let t=getEl('toast');
  if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}
  t.textContent=msg; t.classList.add('show');
  if(_toastTimer) clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>t.classList.remove('show'),1600);
}

function showPopup(msg){
  showModal(`
    <div class="popup-msg">${msg.replace(/\n/g,'<br>')}</div>
    <div class="modal-actions"><button class="btn" onclick="closeModal()">확인</button></div>`);
}

function showConfirm(msg, onYes){
  showModal(`
    <div class="popup-msg">${msg.replace(/\n/g,'<br>')}</div>
    <div class="modal-actions">
      <button class="btn" id="confirm-yes-btn">확인</button>
      <button class="btn btn-ghost" onclick="closeModal()">취소</button>
    </div>`);
  setTimeout(()=>{
    const btn=getEl('confirm-yes-btn');
    if(btn) btn.onclick=()=>{onYes();closeModal();};
  },30);
}

let _allowClose=true;
function showModal(html, allowClose=true){
  _allowClose=allowClose;
  let ov=getEl('modal-overlay');
  if(!ov){
    ov=document.createElement('div'); ov.id='modal-overlay';
    ov.addEventListener('click',e=>{if(e.target===ov&&_allowClose)closeModal();});
    document.body.appendChild(ov);
  }
  ov.innerHTML=`<div class="modal-box" role="dialog">${html}</div>`;
  ov.classList.add('active');
  setTimeout(()=>{const fi=ov.querySelector('input,select');if(fi)fi.focus();},60);
}
window.closeModal=function(){
  const ov=getEl('modal-overlay'); if(ov)ov.classList.remove('active');
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&_allowClose)closeModal();});

// ═══════════════════════════════════════════════════════
// 시작
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', init);
