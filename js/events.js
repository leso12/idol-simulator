// ── events.js ── 관계 이벤트 엔진, 템플릿 해석기 ─────────────────────────
'use strict';

let _templates = null;

function loadTemplates(data) { _templates = data; }

function getTemplates() { return _templates; }

// 조사 처리 (josa from members.js)
function resolveJosa(str, name) {
  // {A}{은는} 등 패턴 처리
  const J = window.MembersModule ? window.MembersModule.josa : (n,t)=>'';
  return str
    .replace(/\{은는\}/g, () => J(name,'은는'))
    .replace(/\{이가\}/g, () => J(name,'이가'))
    .replace(/\{을를\}/g, () => J(name,'을를'))
    .replace(/\{와과\}/g, () => J(name,'와과'))
    .replace(/\{에게\}/g, () => '에게')
    .replace(/\{의\}/g,   () => '의')
    .replace(/\{가\}/g,   () => J(name,'이가'))
    .replace(/\{를\}/g,   () => J(name,'을를'));
}

function resolveTemplate(tpl, names) {
  // names: { A, B, C, G }
  let first = tpl.first;
  if (names.A) {
    first = first.replace(/\{A\}/g, names.A);
    first = resolveJosa(first, names.A);
  }
  if (names.B) {
    // B 뒤 조사는 B 이름으로
    let tmp = first;
    // {B}{...} 패턴 처리
    tmp = tmp.replace(/\{B\}\{([^}]+)\}/g, (_, jType) => {
      return names.B + window.MembersModule.josa(names.B, jType);
    });
    tmp = tmp.replace(/\{B\}/g, names.B);
    first = tmp;
  }
  if (names.C) {
    let tmp = first;
    tmp = tmp.replace(/\{C\}\{([^}]+)\}/g, (_, jType) => {
      return names.C + window.MembersModule.josa(names.C, jType);
    });
    tmp = tmp.replace(/\{C\}/g, names.C);
    first = tmp;
  }
  if (names.G) {
    first = first.replace(/\{G\}/g, names.G);
    first = resolveJosa(first, names.G);
  }
  return first;
}

function pickSecondLine(tpl, isLover) {
  const T = _templates;
  if (!T) return '';
  if (tpl.type === 'date' && isLover && tpl.skinshipByPlaceType) {
    const allSkinship = [];
    Object.values(tpl.skinshipByPlaceType).forEach(arr => allSkinship.push(...arr));
    if (allSkinship.length > 0) return allSkinship[Math.floor(Math.random() * allSkinship.length)];
  }
  const pool = tpl.secondKey && T.genericSecondLines[tpl.secondKey];
  if (!pool || pool.length === 0) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}

function weightedRandom(arr, weightFn) {
  const weights = arr.map(weightFn);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

// 자동 이벤트 생성
function generateAutoEvents(state, n) {
  if (!_templates || !_templates.templates) return [];
  if (state.members.length < 2) return [];
  const { RelationsModule: RM, MembersModule: MM } = window;
  const settings = state.settings;
  const results = [];

  // 쌍 선정: lastEventDay 오래된 순
  const pairs = [];
  const members = state.members;
  for (let i = 0; i < members.length; i++) {
    for (let j = i+1; j < members.length; j++) {
      const rel = RM.ensureRelation(state, members[i].id, members[j].id);
      pairs.push({ a: members[i], b: members[j], rel });
    }
  }
  pairs.sort((x, y) => x.rel.lastEventDay - y.rel.lastEventDay ||
    Math.abs(y.rel.affection) - Math.abs(x.rel.affection));

  const chosen = pairs.slice(0, Math.min(n, pairs.length));

  for (const { a, b, rel } of chosen) {
    const allowed = RM.getAllowedTypes(rel, settings);
    const candidates = _templates.templates.filter(t => allowed.includes(t.type));
    if (candidates.length === 0) continue;
    const tpl = weightedRandom(candidates, t => t.weight || 1);
    const ev = applyTemplate(tpl, state, a, b, rel);
    if (ev) results.push(ev);
  }
  return results;
}

function applyTemplate(tpl, state, a, b, rel) {
  const { RelationsModule: RM } = window;
  const settings = state.settings;
  const groupName = state.groupName === '미설정' ? '아이돌 시뮬레이터' : state.groupName;
  const names = { A: a ? a.name : '', B: b ? b.name : '', G: groupName };

  const first = resolveTemplate(tpl, names);
  const second = pickSecondLine(tpl, RM.isLover(rel));
  const icon = (_templates.icons && _templates.icons[tpl.type]) || '📌';

  // affection 변화 적용
  applyAffectionChange(tpl.type, rel, state, a, b);
  rel.lastEventDay = state.day;

  return { first, second, icon, type: tpl.type, day: state.day };
}

function applyAffectionChange(type, rel, state, a, b) {
  const { RelationsModule: RM } = window;
  const settings = state.settings;
  const rand = (min, max) => min + Math.random() * (max - min);

  switch(type) {
    case 'friendship':  RM.changeAffection(rel, Math.round(rand(3,6)));  break;
    case 'flirting':    RM.changeAffection(rel, Math.round(rand(4,8)));  break;
    case 'date':        RM.changeAffection(rel, Math.round(rand(5,10))); break;
    case 'fight': {
      RM.changeAffection(rel, -Math.round(rand(10,15)));
      RM.addTag(rel, 'coldWar');
      rel.coldWarDaysLeft = 3;
      break;
    }
    case 'reconcile':
      RM.changeAffection(rel, Math.round(rand(2,4)));
      RM.removeTag(rel, 'coldWar');
      rel.coldWarDaysLeft = 0;
      break;
    case 'breakup':
      RM.doBreakup(rel, settings);
      break;
    case 'after_breakup': RM.changeAffection(rel, -Math.round(rand(2,5))); break;
    case 'avoid':   break;
    case 'awkward': RM.changeAffection(rel, Math.round(rand(1,2))); break;
    case 'reunion':
      RM.changeAffection(rel, Math.round(rand(5,10)));
      if (rel.affection >= (settings.exReunionConfirm || 150)) RM.doBecomeLover(rel, settings);
      break;
    case 'jealousy':
      RM.changeAffection(rel, -Math.round(rand(4,8)));
      break;
    default: break;
  }
  RM.updateStage(rel, settings);
}

// 수동 고백
function doConfess(state, fromId, toId) {
  const { RelationsModule: RM } = window;
  const settings = state.settings;
  const rel = RM.ensureRelation(state, fromId, toId);
  const from = state.members.find(m => m.id === fromId);
  const to   = state.members.find(m => m.id === toId);
  if (!from || !to) return null;

  if (RM.isLover(rel)) return { type: 'already_lover' };

  // 연애 자체 비허용 체크
  if (settings.allowRomance === false) {
    return { type: 'romance_disabled', from, to };
  }

  // 성별 허용 체크
  const sameGender = from.gender === to.gender;
  if (sameGender && !settings.allowSameGender) {
    return { type: 'gender_block', reason: 'same', from, to };
  }
  if (!sameGender && !settings.allowOppositeGender) {
    return { type: 'gender_block', reason: 'opposite', from, to };
  }

  const L = settings.loverAffectionBase || 150;
  if (settings.relationshipMode === 'monogamy') {
    const fromHasLover = state.relations.some(r => r.id.includes(fromId) && RM.isLover(r));
    const toHasLover   = state.relations.some(r => r.id.includes(toId)   && RM.isLover(r));
    if (fromHasLover || toHasLover) return { type: 'monogamy_block', from, to };
  }

  if (rel.affection >= L) {
    RM.doBecomeLover(rel, settings);
    return { type: 'success', from, to, rel };
  }
  rel.confessionPending = true;
  return { type: 'pending', from, to };
}

// manualFail 로그 생성
function buildManualFail(subType, a, b) {
  if (!_templates || !_templates.manualFail) return null;
  const pool = _templates.manualFail.exLoverBeforeReunionOk[subType];
  if (!pool || pool.length === 0) return null;
  const item = pool[Math.floor(Math.random() * pool.length)];
  const names = { A: a.name, B: b.name };
  const first = resolveTemplate({ first: item.first }, names);
  return { first, second: item.second };
}

// 로그 문자열 생성
function formatEventLog(ev, day) {
  return [`[Day ${day}] ${ev.icon} ${ev.first}`, ev.second || ''];
}

window.EventsModule = {
  loadTemplates, getTemplates,
  resolveTemplate, pickSecondLine,
  generateAutoEvents, applyTemplate, applyAffectionChange,
  doConfess, buildManualFail, formatEventLog, weightedRandom
};
