// ── data.js ── JSON 데이터 인라인 (fetch 없음) ────────────────────────────
'use strict';

// cost: 1인당 비용 / earns: 기본 수익 범위(인지도 보정 전)
// 수익 실제 지급액 = earns * (1 + popularity/200) 로 인지도 반영
window.SCHEDULES_DATA = [
  { id:'rest',       label:'휴식',        type:'rest',     subType:null,          cost:0,   isGroupOnly:false, requiresComeback:false, earns:null },
  // 연습 — 1인당 50~100원 (강사비·시설비)
  { id:'vocal_prac', label:'보컬 연습',   type:'practice', subType:'vocal',       cost:75,  isGroupOnly:false, requiresComeback:false, earns:null },
  { id:'dance_prac', label:'안무 연습',   type:'practice', subType:'dance',       cost:75,  isGroupOnly:false, requiresComeback:false, earns:null },
  { id:'rap_prac',   label:'랩 연습',     type:'practice', subType:'rap',         cost:50,  isGroupOnly:false, requiresComeback:false, earns:null },
  { id:'lyric_prac', label:'작사·작곡',   type:'practice', subType:'songwriting', cost:50,  isGroupOnly:false, requiresComeback:false, earns:null },
  { id:'arr_prac',   label:'편곡',        type:'practice', subType:'arrangement', cost:50,  isGroupOnly:false, requiresComeback:false, earns:null },
  // 단체 특수 — 수익은 인지도 보정 후 지급
  { id:'broadcast',  label:'음악방송',    type:'special',  subType:null,          cost:0,   isGroupOnly:true,  requiresComeback:true,  earns:{min:300, max:600}  },
  { id:'fansign',    label:'팬 사인회',   type:'special',  subType:null,          cost:0,   isGroupOnly:true,  requiresComeback:true,  earns:{min:200, max:500}  },
  // 개인 스케줄 — 수익은 인지도 보정 후 1인당 지급
  { id:'ad_shoot',   label:'광고 촬영',   type:'schedule', subType:null,          cost:0,   isGroupOnly:false, requiresComeback:false, earns:{min:200, max:800}  },
  { id:'variety',    label:'예능 출연',   type:'schedule', subType:null,          cost:0,   isGroupOnly:false, requiresComeback:false, earns:{min:150, max:500}  },
  { id:'content',    label:'콘텐츠 촬영', type:'schedule', subType:null,          cost:0,   isGroupOnly:false, requiresComeback:false, earns:{min:100, max:400}  },
  { id:'travel',     label:'그룹 여행',   type:'schedule', subType:null,          cost:350, isGroupOnly:false, requiresComeback:false, earns:null }
];

window.RELATION_TEMPLATES = {
  icons: { friendship:'🤝', flirting:'✨', date:'💞', jealousy:'😣', fight:'⚡',
           reconcile:'🩹', breakup:'💔', after_breakup:'🌫️', avoid:'🚫',
           awkward:'🫥', reunion:'❤️‍🩹', daily:'📌', group_daily:'👥' },
  genericSecondLines: {
    softWarm:      ['분위기가 한결 가벼워졌습니다','말보다 표정이 먼저 풀렸습니다','작은 배려가 오래 남았습니다','근심이 잠깐 사라졌습니다','편안한 공기가 이어졌습니다'],
    flirtMood:     ['공기가 미묘하게 달라졌습니다','말끝이 조심스러워졌습니다','기분 좋은 긴장이 맴돌았습니다','자꾸 시선이 머물렀습니다','괜히 심장이 빨라졌습니다'],
    dateMood:      ['말이 없어도 불편하지 않았습니다','서로의 속도가 자연스럽게 맞아갔습니다','가까워진 거리만큼 말이 조심스러워졌습니다','분위기가 부드럽게 번졌습니다','조용히 마음이 가까워졌습니다'],
    jealousMood:   ['마음이 가라앉지 않았습니다','괜히 예민해졌습니다','사소한 장면이 크게 느껴졌습니다','불안이 천천히 올라왔습니다','감정이 앞서 나갔습니다'],
    fightMood:     ['서로의 표정이 굳었습니다','대화가 매끄럽지 않았습니다','분위기가 무거워졌습니다','감정이 쉽게 가라앉지 않았습니다','말이 더 이어지지 않았습니다'],
    reconcileMood: ['딱딱했던 공기가 풀렸습니다','갈등이 멈췄습니다','마음이 누그러졌습니다','서로의 속도가 다시 맞춰졌습니다','긴장이 조금 풀렸습니다'],
    breakMood:     ['공기가 차갑게 가라앉았습니다','한참 동안 숨이 가빴습니다','마음이 텅 빈 느낌이 들었습니다','말이 더 이어지지 않았습니다','시선이 쉽게 돌아오지 않았습니다'],
    afterBreakMood:['기억이 튀어나왔습니다','공기가 조용히 굳었습니다','쉽게 닿지 않았습니다','말을 꺼내지 못했습니다','시간이 필요했습니다'],
    avoidMood:     ['거리를 유지했습니다','분위기가 얼어붙었습니다','같은 공기가 부담스러웠습니다','말을 꺼내지 못했습니다','시선이 엇갈렸습니다'],
    awkwardMood:   ['분위기가 쉽게 풀리지 않았습니다','작은 침묵이 길어졌습니다','조심스러움이 남았습니다','공기가 아직 낯설었습니다','말이 자연스럽게 이어지지 않았습니다'],
    reunionMood:   ['상처 위로도 다시 온기가 올라왔습니다','마음이 같은 방향으로 움직였습니다','오래 망설이다가도 손을 놓지 않았습니다','조용히 서로를 확인했습니다','다시 시작할 용기가 생겼습니다']
  },
  templates: [
    { id:'fr_01', type:'friendship',   participants:'pair',   first:'{A}{은는} {B}{와과} 연습실 구석에서 소곤소곤 이야기를 나눴습니다', secondKey:'softWarm',    weight:10 },
    { id:'fr_02', type:'friendship',   participants:'pair',   first:'{A}{은는} {B}{에게} 물을 건네며 고개를 끄덕였습니다',             secondKey:'softWarm',    weight:10 },
    { id:'fr_03', type:'friendship',   participants:'pair',   first:'{A}{은는} {B}{와과} 장난을 주고받다 동시에 웃음이 터졌습니다',     secondKey:'softWarm',    weight:8  },
    { id:'fl_01', type:'flirting',     participants:'pair',   first:'{A}{은는} {B}{를} 바라보다가 눈이 마주치자 슬쩍 시선을 피했습니다',secondKey:'flirtMood',   weight:10 },
    { id:'fl_02', type:'flirting',     participants:'pair',   first:'{A}{은는} {B}{에게} 오늘은 좀 다르다고 툭 던졌습니다',            secondKey:'flirtMood',   weight:9  },
    { id:'fl_03', type:'flirting',     participants:'pair',   first:'{A}{은는} {B}{의} 작은 변화에 먼저 반응했습니다',                 secondKey:'flirtMood',   weight:8  },
    { id:'dt_01', type:'date',         participants:'pair',   first:'{A}{은는} {B}{와과} 카페 창가에 앉아 천천히 이야기를 나눴습니다',  secondKey:'dateMood',    weight:10,
      skinshipByPlaceType:{ indoor:['컵을 내려놓는 손끝이 살짝 닿았고, 둘 다 잠깐 시선을 피했습니다','테이블 위로 손이 겹쳤고, 아무도 먼저 빼지 못했습니다'] } },
    { id:'dt_02', type:'date',         participants:'pair',   first:'{A}{은는} {B}{와과} 영화관에서 나란히 앉아 조용히 화면을 봤습니다',secondKey:'dateMood',    weight:9,
      skinshipByPlaceType:{ indoor:['어깨가 맞닿은 채로 한참을 그대로 있었습니다','팔이 스치자 둘 다 가만히 숨을 골랐습니다'] } },
    { id:'dt_03', type:'date',         participants:'pair',   first:'{A}{은는} {B}{와과} 밤공기를 마시며 천천히 걸었습니다',            secondKey:'dateMood',    weight:10,
      skinshipByPlaceType:{ outdoor:['두 사람은 손을 잡았고, 부끄러운 듯 말이 줄어들었습니다','걸음이 자연스럽게 맞아들며, 거리가 조금 더 가까워졌습니다'] } },
    { id:'jl_01', type:'jealousy',     participants:'triple', first:'{A}{은는} {B}{이가} {C}{와과} 웃는 모습을 보고 표정이 굳었습니다', secondKey:'jealousMood', weight:10 },
    { id:'jl_02', type:'jealousy',     participants:'triple', first:'{A}{은는} {B}{이가} {C}{를} 챙기는 장면을 보고 말수가 줄었습니다', secondKey:'jealousMood', weight:9  },
    { id:'ft_01', type:'fight',        participants:'pair',   first:'{A}{은는} {B}{와과} 말이 엇갈리며 분위기가 싸해졌습니다',          secondKey:'fightMood',   weight:10 },
    { id:'ft_02', type:'fight',        participants:'pair',   first:'{A}{은는} {B}{의} 한마디에 멈칫했고 바로 반응하지 못했습니다',     secondKey:'fightMood',   weight:9  },
    { id:'rc_01', type:'reconcile',    participants:'pair',   first:'{A}{은는} {B}{에게} 먼저 미안하다고 말했습니다',                  secondKey:'reconcileMood',weight:10 },
    { id:'rc_02', type:'reconcile',    participants:'pair',   first:'{A}{은는} {B}{와과} 짧게 대화를 나누고 한숨을 내쉬었습니다',       secondKey:'reconcileMood',weight:9  },
    { id:'bk_01', type:'breakup',      participants:'pair',   first:'{A}{은는} {B}{에게} 이제 그만하자고 말했습니다',                  secondKey:'breakMood',   weight:10 },
    { id:'ab_01', type:'after_breakup',participants:'pair',   first:'{A}{은는} {B}{를} 멀리서 보고도 모른 척 고개를 돌렸습니다',       secondKey:'afterBreakMood',weight:10},
    { id:'av_01', type:'avoid',        participants:'pair',   first:'{A}{은는} {B}{이가} 다가오자 옆길로 빠졌습니다',                  secondKey:'avoidMood',   weight:10 },
    { id:'ak_01', type:'awkward',      participants:'pair',   first:'{A}{은는} {B}{와과} 인사를 주고받았지만 말이 이어지지 않았습니다', secondKey:'awkwardMood', weight:10 },
    { id:'re_01', type:'reunion',      participants:'pair',   first:'{A}{은는} {B}{에게} 다시 시작하자고 말했습니다',                  secondKey:'reunionMood', weight:10 },
    { id:'dy_01', type:'daily',        participants:'single', first:'{A}{은는} 물을 한 컵 마시고 숨을 고르며 자리를 정리했습니다',      secondKey:'softWarm',    weight:6  },
    { id:'gd_01', type:'group_daily',  participants:'group',  first:'{G}{은는} 간식을 나눠 먹으며 쉬는 시간을 가졌습니다',             secondKey:'softWarm',    weight:6  }
  ],
  manualFail: {
    exLoverBeforeReunionOk: {
      friendship:[{first:'{A}{은는} {B}{에게} 말을 걸어보려 했지만 대화가 길게 이어지지 않았습니다',second:'둘 사이에 아직 낯선 공기가 남아 있었습니다'}],
      flirting:  [{first:'{A}{은는} {B}{에게} 가볍게 장난을 던졌지만 미묘한 표정이 돌아왔습니다',   second:'분위기는 부드러워지지 않았습니다'}],
      date:      [{first:'{A}{은는} {B}{와과} 약속을 잡아보려 했지만 결국 나오지 않았습니다',        second:'둘 사이의 거리는 쉽게 줄지 않았습니다'}]
    }
  }
};

window.DEFAULT_CONFIG = {
  autoEventMax:3,
  relationshipMode:'monogamy',   // 'monogamy' | 'open'
  allowRomance:true,             // 연애 자체 허용
  allowSameGender:true,          // 동성 연애 허용
  allowOppositeGender:true,      // 이성 연애 허용
  autoConfessChance:0.30,
  exAvoidDays:3, exAwkwardClear:80, exReunionPossible:140, exReunionConfirm:150,
  exReunionOkMin:100, moneyLowThreshold:500, albumProgressGain:1.0,
  autoRestId:'rest', autoBreakupThreshold:50, concertMinPrepDays:3,
  concertMaxPrepDays:30, comebackDays:21, kpiPopDecayPerDay:1,
  logPreviewN:30, weightAlertDelta:3.0, albumQualityThresholdLow:50,
  albumQualityThresholdHigh:80, loverAffectionBase:150
};
