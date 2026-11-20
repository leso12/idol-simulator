// ── storage.js ── 저장, 불러오기, 내보내기 ───────────────────────────────
'use strict';

function exportJSON(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `idol_sim_Day${state.day}.json`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function exportLogTXT(state) {
  const text = [...state.log].reverse().join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `idol_log_Day${state.day}.txt`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function exportMembersJSON(state) {
  const blob = new Blob([JSON.stringify(state.members, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `idol_members.json`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try { resolve(JSON.parse(e.target.result)); }
      catch(err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

window.StorageModule = { exportJSON, exportLogTXT, exportMembersJSON, readFile };
