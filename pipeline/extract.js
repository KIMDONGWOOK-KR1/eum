/* pipeline/extract.js — 1~3단계 (CLAUDE.md 2장)
 *   1) 엔티티 추출  2) 정규화(사전 대조·배경 부착)  3) 관계 추출
 * GEMINI_API_KEY가 있으면 Gemini(실서비스 경로), 없으면 로컬 사전 기반(오프라인 데모 경로).
 * 두 경로 모두 동일한 중간형태 { entities, relations } 를 반환한다.
 *   entities: [{ id, label, type(person|org|concept), weight, avatar, desc }]
 *   relations: [{ s, t, label }]   ← status/src(4단계)·anchors(6단계)는 뒤 단계에서 채운다
 */
"use strict";

// ── 3단계 관계 후보: 사전에 있는 두 엔티티가 본문에 함께 등장하면 후보로 올린다.
//    (검증은 4단계 verify가 담당 — 지어내지 않기 위해 근거 확인 후에만 확정)
function localExtract(text, kb) {
  const present = new Map(); // id -> dict entry
  for (const d of kb.dictionary) {
    const hit = d.aliases.find(a => text.includes(a));
    if (hit) present.set(d.id, d);
  }
  // 1·2단계 산출: 본문에 등장한 엔티티만, 사전의 정규 표기·타입·배경을 붙여 정규화
  const entities = [...present.values()].map(d => ({
    id: d.id, label: d.label, type: d.type, weight: d.weight, avatar: d.avatar, desc: d.desc
  }));
  // 3단계 산출: 두 엔티티가 모두 본문에 있으면 아카이브의 관계 라벨을 후보로 제시
  const relations = kb.archive
    .filter(r => present.has(r.s) && present.has(r.t))
    .map(r => ({ s: r.s, t: r.t, label: r.label }));
  return { entities, relations, mode: "local" };
}

// ── Gemini 경로 (REST, 의존성 없음 · Node 18+ 전역 fetch 사용)
async function geminiExtract(text) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const prompt = [
    "당신은 뉴스 기사에서 인물·조직·쟁점 엔티티와 그 관계를 뽑는 지식그래프 추출기입니다.",
    "아래 기사 본문에서 스키마에 맞는 엔티티와 관계만 추출해 JSON으로 출력하세요.",
    "규칙:",
    "1. type은 person(인물)/org(조직)/concept(쟁점·사건) 중 하나.",
    "2. 근거가 본문에 없는 관계는 만들지 마세요(지어내지 않는다).",
    "3. weight는 이슈 내 역할 중요도 0~1. avatar는 이니셜/약칭/이모지 1~3자.",
    "4. label(관계)은 '무엇을 어떻게'가 드러나게 한 문장으로.",
    "출력 형식: {\"entities\":[{\"id\",\"label\",\"type\",\"weight\",\"avatar\",\"desc\"}],\"relations\":[{\"s\",\"t\",\"label\"}]}",
    "id는 영문 소문자 슬러그. relations의 s/t는 entities의 id를 참조.",
    "",
    "[기사 본문]",
    text.slice(0, 12000)
  ].join("\n");

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
  };
  const res = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  const j = await res.json();
  const raw = j.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Gemini 응답에 텍스트 없음");
  const parsed = JSON.parse(raw);
  return {
    entities: parsed.entities || [],
    relations: (parsed.relations || []).map(r => ({ s: r.s, t: r.t, label: r.label })),
    mode: "gemini"
  };
}

// ── 1~3단계 오케스트레이션: 키 있으면 Gemini, 실패/부재 시 로컬로 폴백
async function extract(text, kb) {
  if (process.env.GEMINI_API_KEY) {
    try {
      const out = await geminiExtract(text);
      if (out.entities.length) return out;
      console.warn("[extract] Gemini 결과가 비어 로컬로 폴백");
    } catch (e) {
      console.warn("[extract] Gemini 실패 → 로컬 폴백:", e.message);
    }
  }
  return localExtract(text, kb);
}

module.exports = { extract, localExtract, geminiExtract };
