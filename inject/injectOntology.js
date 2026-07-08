/* CLAUDE.md 3장 입출력 계약 구현 (데모용 Node 버전)
 *   원본 기사 HTML + 위젯 블록 → 온톨로지가 삽입된 HTML(index.html)
 * 원본은 절대 변형하지 않고, 본문 하단(해시태그 영역 직전)에 위젯만 삽입한다.
 * 위젯의 D3·데이터는 vendor/·data/ 로컬 참조 → 위젯 자체는 오프라인 동작.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ORIGINAL = "'홍명보 선임' 경찰 뒷북 수사…'신속처리 지시'도 뭉갰다 _ 연합뉴스.html";
const OUT = "index.html";

// ── 3장 입출력 계약: 원본 기사 HTML + 위젯 블록 → 위젯이 삽입된 HTML(순수 함수)
//    삽입점 우선순위: ① 명시 마커 → ② 본문 하단(해시태그 직전) → ③ </article> → ④ </body>
//    원본은 절대 변형하지 않고 삽입만 한다. Mode A(pipeline)도 이 함수를 재사용한다.
function injectOntology(articleHtml, block) {
  const bundle = "\n" + block + "\n";
  // 주의: 치환값(block)에 d3의 $&·$'·$` 등 특수 시퀀스가 있을 수 있으므로 반드시 '함수형' 치환을 쓴다.
  if (articleHtml.includes("<!-- NEWSONTOLOGY_SLOT -->"))
    return { html: articleHtml.replace("<!-- NEWSONTOLOGY_SLOT -->", () => bundle), at: "마커 주석" };
  if (articleHtml.includes('<div class="keyword-zone">'))
    return { html: articleHtml.replace('<div class="keyword-zone">', () => bundle + '<div class="keyword-zone">'), at: "본문 하단(해시태그 직전)" };
  if (articleHtml.includes("</article>"))
    return { html: articleHtml.replace("</article>", () => bundle + "</article>"), at: "</article> 직전" };
  if (articleHtml.includes("</body>"))
    return { html: articleHtml.replace("</body>", () => bundle + "</body>"), at: "</body> 직전" };
  return { html: articleHtml + bundle, at: "문서 끝" };
}

// ── 빌드 시 로컬 키 읽기: env 우선 → inject/keys.local.json → 없으면 "" (위젯은 정적 폴백으로 동작)
function readLocalKey(rootDir, name) {
  if (process.env[name]) return process.env[name];
  try {
    const j = JSON.parse(fs.readFileSync(path.join(rootDir, "inject", "keys.local.json"), "utf8"));
    if (j[name]) return j[name];
  } catch (_) {}
  return "";
}

// ── 위젯 블록 자산 주입: 캐릭터 이미지(data URI) + 클라이언트 키(플레이스홀더 치환)
//    키는 커밋본엔 없고(플레이스홀더), 빌드 시에만 주입 → 저장소에 키가 남지 않는다.
function embedCharacter(block, rootDir) {
  let out = block, kb = null;
  const p = path.join(rootDir, "캐릭터.png");
  if (fs.existsSync(p)) {
    const uri = "data:image/png;base64," + fs.readFileSync(p).toString("base64");
    out = out.replace("__CHARACTER_DATA_URI__", () => uri);
    kb = (fs.statSync(p).size / 1024).toFixed(0);
  }
  out = out.replace("__YT_API_KEY__", () => readLocalKey(rootDir, "YT_API_KEY"));
  return { block: out, kb };
}

module.exports = { injectOntology, embedCharacter };

// ── CLI 실행(직접 호출 시에만): Mode B 산출물 index.html 생성
if (require.main === module) {
  const src = fs.readFileSync(path.join(ROOT, ORIGINAL), "utf8");
  const rawWidget = fs.readFileSync(path.join(__dirname, "widget-block.html"), "utf8");
  const { block: widget, kb } = embedCharacter(rawWidget, ROOT);
  if (kb) console.log(`  · 캐릭터 이미지 임베드: OK (${kb}KB)`);
  else console.warn("  · ⚠ 캐릭터.png 없음 — 버튼 아이콘 자리가 비어 보일 수 있음");

  const { html: out, at } = injectOntology(src, widget);
  fs.writeFileSync(path.join(ROOT, OUT), out, "utf8");
  console.log(`삽입 완료 → ${OUT}`);
  console.log(`  · 삽입 위치: ${at}`);
  console.log(`  · 원본 길이: ${src.length}  →  결과 길이: ${out.length}  (증가 ${out.length - src.length}자)`);
  console.log(`  · 원본 본문 보존: ${out.includes(src.slice(0, 4000)) ? "OK (앞부분 무변형)" : "확인 필요"}`);
}
