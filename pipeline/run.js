/* pipeline/run.js — Mode A 오케스트레이터 (CLAUDE.md 12장 Phase 9·10)
 *   기사 HTML/텍스트 → 본문 추출 → 1~6단계 → 8장 스키마 {nodes,links}
 *   그리고(옵션) 7단계: injectOntology로 위젯이 삽입된 완성 HTML까지.
 *
 * 사용법:
 *   node pipeline/run.js [기사파일]                 # 온톨로지 JSON을 stdout으로
 *   node pipeline/run.js [기사파일] --html [출력]    # 위젯 삽입된 자기완결 HTML 생성
 *   기사파일 생략 시 데모 고정 기사(연합뉴스 원본)를 입력으로 사용.
 *
 * 절대 원칙:
 *   - API 키(GEMINI_API_KEY)는 환경변수로만. 네트워크·키는 이 계층에만.
 *   - 어느 단계가 실패하거나 스키마를 위반하면 캐시(지식베이스 전체)로 폴백 → 발표 경로 무영향.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { extract } = require("./extract");
const { verify } = require("./verify");
const { scoreAndAnchor } = require("./score");
const { validate } = require("./schema");
const { injectOntology, embedCharacter } = require("../inject/injectOntology");

const ROOT = path.resolve(__dirname, "..");
const KB = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "knowledge.json"), "utf8"));
const DEMO_ARTICLE = "'홍명보 선임' 경찰 뒷북 수사…'신속처리 지시'도 뭉갰다 _ 연합뉴스.html";

// ── HTML → 본문 텍스트(태그·스크립트 제거, 공백 정리)
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// ── 캐시 폴백: 지식베이스 전체를 8장 스키마로 (= 미리 캐싱된 파이프라인 출력)
function cacheFallback() {
  const entities = KB.dictionary.map(d => ({
    id: d.id, label: d.label, type: d.type, weight: d.weight, avatar: d.avatar, desc: d.desc
  }));
  const links = KB.archive.map(a => ({ s: a.s, t: a.t, label: a.label, status: a.status, src: a.src }));
  const { nodes } = scoreAndAnchor(entities, links, KB);
  return { nodes, links };
}

// ── 파이프라인 본체: 기사 텍스트 → {nodes, links}
async function runPipeline(text) {
  const { entities, relations, mode } = await extract(text, KB);        // 1~3단계
  const links = verify(relations, text, KB);                            // 4단계 (근거 없으면 제외)
  const { nodes, _degree } = scoreAndAnchor(entities, links, KB);       // 5·6단계
  const data = { nodes, links };
  validate(data);                                                       // 8장 스키마 강제
  return { data, mode, degree: _degree };
}

// ── 자기완결 위젯 블록: vendor/d3·data 인라인 + 캐릭터 임베드 (임의 기사에 붙여도 오프라인 동작)
function buildStandaloneWidget(data) {
  let block = fs.readFileSync(path.join(ROOT, "inject", "widget-block.html"), "utf8");
  block = embedCharacter(block, ROOT).block;
  const d3 = fs.readFileSync(path.join(ROOT, "vendor", "d3.min.js"), "utf8");
  // 함수형 치환 필수: d3 코드의 $&·$'·$` 시퀀스가 특수 치환으로 오해석되는 것을 막는다.
  block = block.replace('<script src="vendor/d3.min.js"></script>', () => `<script>${d3}</script>`);
  const dataJs = `<script>window.ONTOLOGY_DATA=${JSON.stringify(data)};</script>`;
  block = block.replace('<script src="data/ontology.js"></script>', () => dataJs);
  return block;
}

async function main() {
  const args = process.argv.slice(2);
  const htmlIdx = args.indexOf("--html");
  const wantHtml = htmlIdx !== -1;
  const positional = args.filter((a, i) => !a.startsWith("--") && !(wantHtml && i === htmlIdx + 1));
  const inputPath = positional[0] ? path.resolve(positional[0]) : path.join(ROOT, DEMO_ARTICLE);
  const outHtml = wantHtml ? (args[htmlIdx + 1] && !args[htmlIdx + 1].startsWith("--") ? path.resolve(args[htmlIdx + 1]) : path.join(__dirname, "out", "article.embedded.html")) : null;

  const rawInput = fs.readFileSync(inputPath, "utf8");
  const text = /<[a-z!]/i.test(rawInput) ? htmlToText(rawInput) : rawInput;

  let data, note;
  try {
    const r = await runPipeline(text);
    data = r.data;
    note = `경로=${r.mode} · 노드 ${data.nodes.length} · 관계 ${data.links.length}`;
    if (!data.nodes.length) throw new Error("추출된 노드 없음");
  } catch (e) {
    console.error(`[run] 파이프라인 실패 → 캐시 폴백: ${e.message}`);
    data = cacheFallback();
    note = `경로=cache(폴백) · 노드 ${data.nodes.length} · 관계 ${data.links.length}`;
  }
  console.error(`[run] 입력: ${path.basename(inputPath)} · ${note}` + (process.env.GEMINI_API_KEY ? " · GEMINI_API_KEY 감지" : " · (키 없음: 로컬 경로)"));

  if (wantHtml) {
    const block = buildStandaloneWidget(data);
    const { html, at } = injectOntology(rawInput, block);
    fs.mkdirSync(path.dirname(outHtml), { recursive: true });
    fs.writeFileSync(outHtml, html, "utf8");
    console.error(`[run] 삽입 완료(${at}) → ${outHtml}`);
  } else {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");   // 온톨로지 JSON을 stdout으로
  }
}

main().catch(e => { console.error("[run] 치명적 오류:", e); process.exit(1); });
