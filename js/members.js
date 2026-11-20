// ── members.js ── 멤버 CRUD, 검증, 역할 제한 ─────────────────────────────
'use strict';

const VALID_POSITIONS = ['메인보컬','보컬','메인댄서','댄서','메인래퍼','래퍼','멀티'];
const UNIQUE_POSITIONS = ['메인보컬','메인댄서','메인래퍼'];
const MBTI_LIST = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
                   'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];

let _memberIdCounter = 1;

function genMemberId() {
  return 'mb_' + (Date.now()) + '_' + (_memberIdCounter++);
}

// 받침 유무로 조사 자동 선택
function josa(name, type) {
  const last = name.charCodeAt(name.length - 1);
  const hasBatchim = last >= 0xAC00 && ((last - 0xAC00) % 28) !== 0;
  switch(type) {
    case '은는': return hasBatchim ? '은' : '는';
    case '이가': return hasBatchim ? '이' : '가';
    case '을를': return hasBatchim ? '을' : '를';
    case '와과': return hasBatchim ? '과' : '와';
    case '에게': return '에게';
    case '의':   return '의';
    default: return '';
  }
}

function createMember(data) {
  const stats = {
    vocal: Number(data.vocal) || 0,
    dance: Number(data.dance) || 0,
    rap: Number(data.rap) || 0,
    looks: Number(data.looks) || 0,
    charm: Number(data.charm) || 0,
    songwriting: Number(data.songwriting) || 0,
    arrangement: Number(data.arrangement) || 0
  };
  const w = Math.round(parseFloat(data.weight) * 100) / 100;
  return {
    id: genMemberId(),
    name: data.name.trim(),
    gender: data.gender,
    mbti: data.mbti,
    height: Number(data.height),
    weight: w,
    weightBase: w,
    position: data.position,
    isLeader: !!data.isLeader,
    stats,
    condition: { stamina: 100, fatigue: 0, stress: 0 },
    lastPractice: { vocal: null, dance: null, rap: null, songwriting: null, arrangement: null },
    weightHistory: []
  };
}

function validateMemberData(data, existingMembers, editingId) {
  const errors = [];
  if (!data.name || !data.name.trim()) errors.push('이름을 입력해주세요');
  if (!data.gender) errors.push('성별을 선택해주세요');
  if (!data.mbti) errors.push('MBTI를 선택해주세요');
  if (!data.height || isNaN(data.height) || Number(data.height) <= 0) errors.push('키를 올바르게 입력해주세요');
  if (!data.weight || isNaN(data.weight) || Number(data.weight) <= 0) errors.push('몸무게를 올바르게 입력해주세요');
  if (!data.position || !VALID_POSITIONS.includes(data.position)) errors.push('포지션을 선택해주세요');

  const statFields = ['vocal','dance','rap','looks','charm','songwriting','arrangement'];
  const statLabels = ['보컬','댄스','랩','외모','끼','작사작곡','편곡'];
  statFields.forEach((f,i) => {
    const v = data[f];
    if (v === '' || v === undefined || v === null) errors.push(`${statLabels[i]} 능력치를 입력해주세요`);
    else if (isNaN(Number(v)) || Number(v) < 0) errors.push(`${statLabels[i]} 능력치는 0 이상이어야 합니다`);
  });

  return errors;
}

function checkUniquePositionConflict(position, existingMembers, editingId) {
  if (!UNIQUE_POSITIONS.includes(position)) return null;
  const conflict = existingMembers.find(m => m.position === position && m.id !== editingId);
  return conflict || null;
}

window.MembersModule = {
  VALID_POSITIONS,
  UNIQUE_POSITIONS,
  MBTI_LIST,
  josa,
  createMember,
  validateMemberData,
  checkUniquePositionConflict,
  genMemberId
};
