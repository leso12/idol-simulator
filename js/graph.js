// ── graph.js ── 관계도 SVG 렌더러 ─────────────────────────────────────────
'use strict';

const STAGE_COLORS = {
  hatred:       '#e74c3c',
  uncomfortable:'#e67e22',
  indifference: '#95a5a6',
  friend:       '#3498db',
  closeFriend:  '#9b59b6',
  lover:        '#e91e8c',
  exLover:      '#ff6b9d'
};

function renderGraph(container, state) {
  if (!container) return;
  const { RelationsModule: RM } = window;
  const members = state.members;
  if (members.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;opacity:.5">멤버가 없습니다</div>';
    return;
  }

  const W = container.clientWidth || 400;
  const H = Math.max(340, W * 0.75);
  const cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) * 0.32;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const n = members.length;
  const positions = members.map((m, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), m };
  });

  // 선 그리기
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const rel = RM.getRelation(state.relations, positions[i].m.id, positions[j].m.id);
      if (!rel) continue;
      const aff = rel.affection;
      if (aff === 0) continue;

      const label = RM.getRelationLabel(rel, state.settings);
      const stage = RM.hasTag(rel,'exLover') ? 'exLover' : rel.stage;
      const color = STAGE_COLORS[stage] || '#ccc';
      const width = Math.max(0.5, Math.abs(aff) / 40);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', positions[i].x);
      line.setAttribute('y1', positions[i].y);
      line.setAttribute('x2', positions[j].x);
      line.setAttribute('y2', positions[j].y);
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', width);
      line.setAttribute('opacity', '0.7');

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${positions[i].m.name} ↔ ${positions[j].m.name}: ${aff} (${label})`;
      line.appendChild(title);
      svg.appendChild(line);
    }
  }

  // 노드 그리기
  positions.forEach(({ x, y, m }) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.style.cursor = 'default';

    // 원
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x); circle.setAttribute('cy', y);
    circle.setAttribute('r', 22);
    circle.setAttribute('fill', m.isLeader ? '#f39c12' : 'var(--accent,#6c63ff)');
    circle.setAttribute('stroke', '#fff'); circle.setAttribute('stroke-width', 2.5);
    g.appendChild(circle);

    // 원 안 첫 글자
    const initText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    initText.setAttribute('x', x); initText.setAttribute('y', y + 5);
    initText.setAttribute('text-anchor', 'middle');
    initText.setAttribute('fill', '#fff');
    initText.setAttribute('font-size', '13');
    initText.setAttribute('font-weight', 'bold');
    initText.textContent = m.name.charAt(0);
    g.appendChild(initText);

    // 리더 왕관 표시
    if (m.isLeader) {
      const crown = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      crown.setAttribute('x', x + 14); crown.setAttribute('y', y - 14);
      crown.setAttribute('text-anchor', 'middle');
      crown.setAttribute('font-size', '12');
      crown.textContent = '👑';
      g.appendChild(crown);
    }

    // 이름 전체 (아래)
    const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nameText.setAttribute('x', x); nameText.setAttribute('y', y + 36);
    nameText.setAttribute('text-anchor', 'middle');
    nameText.setAttribute('fill', 'var(--text-main,#333)');
    nameText.setAttribute('font-size', '12');
    nameText.setAttribute('font-weight', '600');
    nameText.textContent = m.name;
    g.appendChild(nameText);

    // 포지션 (이름 아래 작게)
    const posText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    posText.setAttribute('x', x); posText.setAttribute('y', y + 49);
    posText.setAttribute('text-anchor', 'middle');
    posText.setAttribute('fill', 'var(--text-sub,#888)');
    posText.setAttribute('font-size', '10');
    posText.textContent = m.position || '';
    g.appendChild(posText);

    svg.appendChild(g);
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

// 범례 렌더링
function renderLegend(container) {
  const items = [
    ['혐오', STAGE_COLORS.hatred],
    ['불편', STAGE_COLORS.uncomfortable],
    ['무관심', STAGE_COLORS.indifference],
    ['친구', STAGE_COLORS.friend],
    ['절친', STAGE_COLORS.closeFriend],
    ['연인', STAGE_COLORS.lover],
    ['전연인', STAGE_COLORS.exLover],
  ];
  container.innerHTML = items.map(([label, color]) =>
    `<span class="legend-item"><span class="legend-dot" style="background:${color}"></span>${label}</span>`
  ).join('');
}

window.GraphModule = { renderGraph, renderLegend, STAGE_COLORS };
