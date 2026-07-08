/* pipeline/schema.js — 8장 스키마 강제 검증 (CLAUDE.md 15장 "출력이 스키마와 어긋남" 회피)
 * 파이프라인 출력이 위젯이 읽을 수 있는 형태인지 필드·타입을 검사한다.
 * 위반 시 에러를 던져 run.js가 캐시로 폴백하게 한다(깨진 그래프를 위젯에 넘기지 않는다).
 */
"use strict";

const NODE_TYPES = new Set(["person", "org", "concept"]);
const LINK_STATUS = new Set(["fact", "claim"]);

function validate(data) {
  const errs = [];
  if (!data || typeof data !== "object") throw new Error("데이터가 객체가 아님");
  if (!Array.isArray(data.nodes)) errs.push("nodes가 배열이 아님");
  if (!Array.isArray(data.links)) errs.push("links가 배열이 아님");
  if (errs.length) throw new Error(errs.join("; "));

  const ids = new Set();
  data.nodes.forEach((n, i) => {
    if (!n.id) errs.push(`nodes[${i}].id 없음`);
    if (ids.has(n.id)) errs.push(`중복 id: ${n.id}`);
    ids.add(n.id);
    if (!n.label) errs.push(`nodes[${i}].label 없음`);
    if (!NODE_TYPES.has(n.type)) errs.push(`nodes[${i}].type 부적합: ${n.type}`);
    if (typeof n.weight !== "number" || n.weight < 0 || n.weight > 1) errs.push(`nodes[${i}].weight 범위 밖: ${n.weight}`);
    if (!("image" in n)) n.image = null;
    if (!Array.isArray(n.anchors)) n.anchors = [];
  });
  data.links.forEach((l, i) => {
    if (!ids.has(l.s)) errs.push(`links[${i}].s 미존재 노드: ${l.s}`);
    if (!ids.has(l.t)) errs.push(`links[${i}].t 미존재 노드: ${l.t}`);
    if (!LINK_STATUS.has(l.status)) errs.push(`links[${i}].status 부적합: ${l.status}`);
    if (!l.label) errs.push(`links[${i}].label 없음`);
    if (!l.src) errs.push(`links[${i}].src 없음(근거 필수 — 지어내지 않는다)`);
  });

  if (errs.length) throw new Error("스키마 위반: " + errs.join("; "));
  return true;
}

module.exports = { validate };
