/* pipeline/score.js — 5·6단계 (CLAUDE.md 2장)
 *   5) 중요도 계산: 연결 수 + 역할 가중치 (위젯 F3 공식과 동일값)
 *   6) 콘텐츠 앵커링: 각 노드에 자사 기사·영상 링크 부착(사전에서 매칭)
 * 최종적으로 8장 스키마의 { nodes, links } 를 만든다(위젯이 그대로 읽는 형태).
 */
"use strict";

function scoreAndAnchor(entities, links, kb) {
  // 5단계: degree(연결 수) 집계 — 위젯과 동일하게 노드 weight/importance의 근거가 된다.
  const degree = {};
  entities.forEach(e => (degree[e.id] = 0));
  links.forEach(l => { if (degree[l.s] != null) degree[l.s]++; if (degree[l.t] != null) degree[l.t]++; });

  // 6단계: 사전에서 각 엔티티의 anchors(자사 콘텐츠 링크)를 붙인다.
  const dictById = new Map(kb.dictionary.map(d => [d.id, d]));

  const nodes = entities.map(e => {
    const d = dictById.get(e.id);
    return {
      id: e.id,
      label: e.label,
      type: e.type,
      weight: e.weight,
      avatar: e.avatar,
      image: null,
      desc: e.desc,
      anchors: (d && d.anchors) ? d.anchors : []
    };
  });

  // 위젯 F3와 동일 공식(importance = 0.55*weight + 0.45*deg/maxDeg)은 위젯이 렌더 시 계산하므로
  // 여기서는 스키마 필드(weight/anchors)만 확정한다. degree는 참고로 로그에 남긴다.
  return { nodes, links, _degree: degree };
}

module.exports = { scoreAndAnchor };
