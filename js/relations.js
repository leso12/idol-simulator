// ── relations.js ── 관계 엔진, 호감도, 태그, 단계 ────────────────────────
'use strict';

function relationId(idA, idB) {
  return [idA, idB].sort().join(':');
}

function getRelation(relations, idA, idB) {
  const rid = relationId(idA, idB);
  return relations.find(r => r.id === rid) || null;
}

function ensureRelation(state, idA, idB) {
  const rid = relationId(idA, idB);
  let rel = state.relations.find(r => r.id === rid);
  if (!rel) {
    rel = {
      id: rid,
      affection: 0,
      stage: 'indifference',
      tags: [],
      coldWarDaysLeft: 0,
      avoidDaysLeft: 0,
      confessionPending: false,
      lastEventDay: 0
    };
    state.relations.push(rel);
  }
  return rel;
}

function clampAffection(v) { return Math.max(-200, Math.min(200, v)); }

function changeAffection(rel, delta) {
  rel.affection = clampAffection(rel.affection + delta);
  updateStage(rel);
}

function updateStage(rel, settings) {
  const L = (settings && settings.loverAffectionBase) || 150;
  const a = rel.affection;
  if (rel.tags && rel.tags.includes('lover')) { rel.stage = 'lover'; return; }
  if (a <= -101) rel.stage = 'hatred';
  else if (a <= -31) rel.stage = 'uncomfortable';
  else if (a < 50) rel.stage = 'indifference';
  else if (a < 100) rel.stage = 'friend';
  else if (a < L) rel.stage = 'closeFriend';
  else rel.stage = 'lover';
}

const STAGE_LABELS = {
  hatred: '혐오', uncomfortable: '불편', indifference: '무관심',
  friend: '친구', closeFriend: '절친', lover: '연인'
};

function getStageLabel(stage) { return STAGE_LABELS[stage] || stage; }

function hasTag(rel, tag) { return rel.tags && rel.tags.includes(tag); }
function addTag(rel, tag) { if (!rel.tags.includes(tag)) rel.tags.push(tag); }
function removeTag(rel, tag) { rel.tags = rel.tags.filter(t => t !== tag); }

function isLover(rel) { return hasTag(rel, 'lover'); }
function isExLover(rel) { return hasTag(rel, 'exLover'); }
function isAvoiding(rel) { return hasTag(rel, 'exLover') && rel.avoidDaysLeft > 0; }
function isAwkward(rel) { return hasTag(rel, 'exLover') && !isAvoiding(rel) && rel.affection <= 80; }

// 태그 UI 라벨 생성
function getRelationLabel(rel, settings) {
  const L = (settings && settings.loverAffectionBase) || 150;
  const ex = hasTag(rel, 'exLover');
  if (!ex && hasTag(rel, 'lover')) return '연인';
  if (ex && rel.avoidDaysLeft > 0) return '전연인, 회피';
  if (ex && rel.affection <= (settings && settings.exAwkwardClear || 80)) return '전연인, 서먹함';
  if (ex && rel.affection >= (settings && settings.exReunionPossible || 140)) return '전연인, 썸';
  if (ex) return '전연인';
  return getStageLabel(rel.stage);
}

// 이벤트 타입 후보 결정
function getAllowedTypes(rel, settings) {
  const s = settings || {};
  const exAvoid = s.exAvoidDays || 3;
  const exAwkClear = s.exAwkwardClear || 80;
  const exReunion = s.exReunionPossible || 140;
  const exOkMin = s.exReunionOkMin || 100;

  if (isAvoiding(rel)) return ['avoid'];

  if (isExLover(rel)) {
    if (rel.affection <= exAwkClear) return ['after_breakup','awkward'];
    if (rel.affection >= exReunion) return ['friendship','flirting','date','reunion'];
    if (rel.affection >= exOkMin) return ['friendship','flirting','date'];
    return ['after_breakup','awkward'];
  }

  if (hasTag(rel,'lover')) {
    if (rel.coldWarDaysLeft > 0 || hasTag(rel,'coldWar')) return ['fight','reconcile'];
    if (hasTag(rel,'jealous')) return ['jealousy','fight','reconcile'];
    return ['date','flirting','fight'];
  }

  // 냉전/질투
  if (rel.coldWarDaysLeft > 0 || hasTag(rel,'coldWar')) return ['fight','reconcile'];
  if (hasTag(rel,'jealous')) return ['jealousy','fight','reconcile'];

  const a = rel.affection;
  if (a < -100) return ['fight','friendship'];
  if (a < -30) return ['fight','friendship'];
  if (a < 50) return ['friendship'];
  if (a < 100) return ['friendship','flirting'];
  return ['friendship','flirting','date'];
}

// 이별 처리
function doBreakup(rel, settings) {
  removeTag(rel, 'lover');
  addTag(rel, 'exLover');
  rel.avoidDaysLeft = (settings && settings.exAvoidDays) || 3;
  rel.coldWarDaysLeft = 0;
  removeTag(rel, 'coldWar');
  removeTag(rel, 'jealous');
  updateStage(rel, settings);
}

// 연인 전환
function doBecomeLover(rel, settings) {
  const L = (settings && settings.loverAffectionBase) || 150;
  removeTag(rel, 'exLover');
  addTag(rel, 'lover');
  rel.avoidDaysLeft = 0;
  if (rel.affection < L) rel.affection = L;
  else rel.affection = Math.min(200, rel.affection + 10);
  rel.stage = 'lover';
}

// Day 진행 시 관계 업데이트 (회피 감소, 냉전 감소)
function tickRelations(state) {
  const settings = state.settings;
  state.relations.forEach(rel => {
    if (rel.avoidDaysLeft > 0) rel.avoidDaysLeft--;
    if (rel.coldWarDaysLeft > 0) {
      rel.coldWarDaysLeft--;
      changeAffection(rel, -2);
      if (rel.coldWarDaysLeft <= 0) removeTag(rel, 'coldWar');
    }
    // 자동 이별 체크
    if (hasTag(rel,'lover') && rel.affection < (settings.autoBreakupThreshold || 50)) {
      doBreakup(rel, settings);
    }
    updateStage(rel, settings);
  });
}

window.RelationsModule = {
  relationId, getRelation, ensureRelation,
  clampAffection, changeAffection, updateStage,
  getStageLabel, getRelationLabel,
  hasTag, addTag, removeTag,
  isLover, isExLover, isAvoiding, isAwkward,
  getAllowedTypes,
  doBreakup, doBecomeLover,
  tickRelations,
  STAGE_LABELS
};
