// ── state.js ── 상태 모델, 기본값, 마이그레이션 ──────────────────────────
'use strict';

const DEFAULT_SETTINGS = {
  autoEventMax: 3,
  relationshipMode: 'monogamy',
  allowRomance: true,
  allowSameGender: true,
  allowOppositeGender: true,
  autoConfessChance: 0.30,
  exAvoidDays: 3,
  exAwkwardClear: 80,
  exReunionPossible: 140,
  exReunionConfirm: 150,
  exReunionOkMin: 100,
  moneyLowThreshold: 500,
  albumProgressGain: 1.0,
  autoRestId: 'rest',
  autoBreakupThreshold: 50,
  concertMinPrepDays: 3,
  concertMaxPrepDays: 30,
  comebackDays: 21,
  kpiPopDecayPerDay: 1,
  logPreviewN: 30,
  weightAlertDelta: 3.0,
  albumQualityThresholdLow: 50,
  albumQualityThresholdHigh: 80,
  loverAffectionBase: 150
};

const DEFAULT_ALBUM = {
  isPreparing: false,
  isReleased: false,
  comebackDaysLeft: 0,
  progress: { lyrics: 0, arrangement: 0, vocal: 0, choreography: 0 },
  title: '',
  releaseInfo: {}
};

const DEFAULT_CONCERT = {
  isPlanned: false,
  daysLeft: 0,
  venueName: '',
  prepPercent: 0
};

function createDefaultState() {
  return {
    version: '1.1.0',
    migrations: [],
    groupName: '미설정',
    theme: 'light',
    day: 1,
    money: 5000,
    kpi: { popularity: 0, fandom: 0, reputation: 0 },
    members: [],
    schedule: [],
    manualSchedule: {},
    album: JSON.parse(JSON.stringify(DEFAULT_ALBUM)),
    concert: JSON.parse(JSON.stringify(DEFAULT_CONCERT)),
    relations: [],
    log: [],
    relLog: [],
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    milestone: {}
  };
}

// 개별 멤버 필드 보정 — condition/stats/lastPractice 누락 시 기본값으로 채움
function migrateMember(m) {
  if (!m || typeof m !== 'object') return null;

  // condition
  if (!m.condition || typeof m.condition !== 'object') {
    m.condition = { stamina: 100, fatigue: 0, stress: 0 };
  } else {
    if (typeof m.condition.stamina !== 'number') m.condition.stamina = 100;
    if (typeof m.condition.fatigue !== 'number') m.condition.fatigue = 0;
    if (typeof m.condition.stress  !== 'number') m.condition.stress  = 0;
  }

  // stats
  if (!m.stats || typeof m.stats !== 'object') {
    m.stats = { vocal:0, dance:0, rap:0, looks:0, charm:0, songwriting:0, arrangement:0 };
  } else {
    ['vocal','dance','rap','looks','charm','songwriting','arrangement'].forEach(function(k) {
      if (typeof m.stats[k] !== 'number') m.stats[k] = 0;
    });
  }

  // lastPractice
  if (!m.lastPractice || typeof m.lastPractice !== 'object') {
    m.lastPractice = { vocal:null, dance:null, rap:null, songwriting:null, arrangement:null };
  } else {
    ['vocal','dance','rap','songwriting','arrangement'].forEach(function(k) {
      if (!(k in m.lastPractice)) m.lastPractice[k] = null;
    });
  }

  if (!Array.isArray(m.weightHistory)) m.weightHistory = [];
  if (typeof m.isLeader   !== 'boolean') m.isLeader   = false;
  if (typeof m.weight     !== 'number')  m.weight     = 55;
  if (typeof m.weightBase !== 'number')  m.weightBase = m.weight;
  if (!m.id)       m.id       = 'mb_' + Date.now() + '_' + Math.floor(Math.random()*9999);
  if (!m.name)     m.name     = '이름없음';
  if (!m.position) m.position = '보컬';
  if (!m.gender)   m.gender   = '미입력';
  if (!m.mbti)     m.mbti     = '미입력';
  if (typeof m.height !== 'number') m.height = 170;
  return m;
}

function migrateState(raw) {
  var def = createDefaultState();
  var s = Object.assign({}, def, raw);

  // 깊은 병합
  s.kpi      = Object.assign({}, def.kpi,     (raw.kpi     || {}));
  s.album    = Object.assign({}, def.album,   (raw.album   || {}));
  s.album.progress = Object.assign({}, def.album.progress, ((raw.album || {}).progress || {}));
  s.concert  = Object.assign({}, def.concert, (raw.concert || {}));
  s.settings = Object.assign({}, def.settings,(raw.settings|| {}));

  s.migrations     = Array.isArray(s.migrations) ? s.migrations : [];
  s.log            = Array.isArray(raw.log)       ? raw.log       : [];
  s.relLog         = Array.isArray(raw.relLog)    ? raw.relLog    : [];
  s.relations      = Array.isArray(raw.relations) ? raw.relations : [];
  s.schedule       = Array.isArray(raw.schedule)  ? raw.schedule  : [];
  s.manualSchedule = raw.manualSchedule || {};
  s.milestone      = raw.milestone      || {};

  // 멤버 각각 필드 보정
  s.members = Array.isArray(raw.members)
    ? raw.members.map(migrateMember).filter(function(m){ return m !== null; })
    : [];

  return s;
}

var STORAGE_KEY = 'idol_sim_state_v2';

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch(e) { console.warn('save failed', e); }
}

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    return migrateState(JSON.parse(raw));
  } catch(e) { return createDefaultState(); }
}

function loadStateFromJSON(json) {
  try {
    var raw = typeof json === 'string' ? JSON.parse(json) : json;
    return migrateState(raw);
  } catch(e) { return null; }
}

window.StateModule = {
  createDefaultState: createDefaultState,
  migrateMember: migrateMember,
  migrateState: migrateState,
  saveState: saveState,
  loadState: loadState,
  loadStateFromJSON: loadStateFromJSON,
  DEFAULT_SETTINGS: DEFAULT_SETTINGS
};
