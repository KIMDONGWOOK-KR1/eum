/* pipeline/verify.js — 4단계 RAG 사실 검증 (CLAUDE.md 2장 4단계)
 *   각 관계를 근거 아카이브에서 검색해:
 *     - 근거 있고 확인됨 → status:"fact"  (+ src=근거 출처)
 *     - 주장은 있으나 검증 불가 → status:"claim"
 *     - 근거가 전혀 없음 → 표시하지 않는다(배열에서 제외 = "지어내지 않는다")
 *
 * 로컬 아카이브는 (s,t)별 근거 문구·판정을 담는다. 프로덕션에서는 이 자리에
 * 벡터검색(임베딩) + 뉴스 아카이브가 들어가고, 인터페이스(입력 relations → 판정된 links)는 동일하다.
 */
"use strict";

function verify(relations, text, kb) {
  const links = [];
  for (const r of relations) {
    // 아카이브에서 같은 (s,t) 근거 레코드를 찾는다
    const rec = kb.archive.find(a => a.s === r.s && a.t === r.t);
    if (!rec) {
      // 아카이브에 근거 레코드가 없으면 확정할 수 없음 → 지어내지 않기 위해 제외
      continue;
    }
    // 근거 문구가 본문에 실제로 있는지 확인(RAG 검색의 로컬 대체)
    const grounded = (rec.evidence || []).some(ev => text.includes(ev));
    if (!grounded) {
      // 근거를 본문에서 확인하지 못함 → 확정 불가. fact로는 절대 올리지 않는다.
      // (아카이브가 claim으로 표시한 건 '주장은 존재'하므로 claim 유지, 그 외는 제외)
      if (rec.status === "claim") links.push({ s: r.s, t: r.t, label: r.label || rec.label, status: "claim", src: rec.src });
      continue;
    }
    links.push({ s: r.s, t: r.t, label: r.label || rec.label, status: rec.status, src: rec.src });
  }
  return links;
}

module.exports = { verify };
