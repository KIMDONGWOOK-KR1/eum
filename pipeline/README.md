# pipeline/ — Mode A 실서비스 파이프라인 (CLAUDE.md 2·6·12장)

> **기사 HTML → 7단계 AI 파이프라인 → 8장 온톨로지 JSON → (옵션) 위젯 삽입 HTML**
>
> 발표용 데모(Mode B)와 **물리적으로 분리**된 계층. 여기서만 네트워크·API 키를 쓴다.
> 실패하면 항상 캐시(지식베이스)로 폴백하므로 **발표 경로(index.html)는 영향받지 않는다.**

---

## 구성

| 파일 | 단계 | 역할 |
|---|---|---|
| `extract.js` | 1~3 | 엔티티 추출·정규화·관계 추출 (Gemini 또는 로컬 사전) |
| `verify.js` | 4 | RAG 사실 검증 → `status(fact/claim)`·`src`. 근거 없으면 제외("지어내지 않는다") |
| `score.js` | 5·6 | 중요도 근거(degree) 집계 + 콘텐츠 앵커링(자사 링크 부착) |
| `schema.js` | 7 | 8장 스키마 강제 검증(위젯이 못 읽는 출력 차단) |
| `run.js` | — | 오케스트레이터 (입력→출력, 실패 시 캐시 폴백) |
| `data/knowledge.json` | — | 엔티티 사전 + RAG 근거 아카이브(로컬 지식베이스) |
| `out/` | — | `--html` 산출물 폴더 |

## 실행

```bash
# 1) 기사 → 온톨로지 JSON (Phase 9). 인자 생략 시 데모 고정 기사 사용
node pipeline/run.js > out/ontology.json
node pipeline/run.js path/to/article.html

# 2) 기사 → 위젯이 삽입된 자기완결 HTML (Phase 10)
node pipeline/run.js path/to/article.html --html out/article.embedded.html
```

- 로그(진행 상황·폴백 여부)는 **stderr**, 결과 JSON은 **stdout**으로 나온다.
- `--html` 산출물은 d3·데이터·캐릭터를 모두 **인라인**해 외부 의존 0(오프라인·`file://` OK).

## Gemini(실서비스) 경로 켜기

키가 있으면 1~3단계가 자동으로 Gemini로 전환된다(없으면 로컬 사전 경로).

```bash
export GEMINI_API_KEY=...           # AI Studio 키 (또는 Vertex 구성)
export GEMINI_MODEL=gemini-2.5-flash # (선택) 기본값
node pipeline/run.js article.html
```

- **키는 환경변수로만** 주입한다. 코드·커밋에 하드코딩 금지.
- Gemini 호출 실패 시 자동으로 로컬 → 그래도 실패면 캐시로 폴백한다.

## 설계 원칙 (CLAUDE.md 4·15장)

1. **스키마 단일화** — 출력은 Mode B 캐시와 동일한 8장 `{nodes, links}`. 위젯은 출처(실시간/캐시)를 모른 채 동일하게 렌더한다.
2. **지어내지 않는다** — `verify`가 근거를 확인한 관계만 남긴다. 근거 없으면 배열에서 제외, 미검증 주장은 `claim`으로만.
3. **폴백 안전망** — 어떤 단계가 실패하거나 스키마를 위반하면 `run.js`가 캐시(지식베이스 전체)로 폴백 → 발표 데모 무영향.
4. **계층 분리** — 네트워크·API 키는 이 폴더 안에서만. `inject/injectOntology.js`(3장 계약)를 재사용해 삽입 단계를 공유한다.

## 지식베이스 확장

`data/knowledge.json`의 `dictionary`(엔티티·별칭·앵커)와 `archive`(관계·근거 문구·판정)를 채우면
로컬 경로가 더 많은 기사를 처리할 수 있다. 프로덕션에서는 이 자리에 언론사 아카이브 + 임베딩 벡터검색이 들어간다.
