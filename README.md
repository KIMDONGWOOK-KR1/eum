> ## 📦 이 저장소는 [eum_platform](https://github.com/KIMDONGWOOK-KR1/eum_platform)으로 통합되었습니다
> 같은 코드가 [`eum_platform/b2b/`](https://github.com/KIMDONGWOOK-KR1/eum_platform/tree/main/b2b)에 있으며, B2C(유튜브 지식그래프)와 함께 최신 문서는 eum_platform에서 확인해 주세요.

---

# NewsOntology — 실서비스 파이프라인 (이음 B2B)

**기사 HTML → 7단계 AI 파이프라인(Gemini + RAG) → 검증된 온톨로지 → 관계도 위젯이 삽입된 HTML**

뉴스 기사에서 인물·조직·쟁점 엔티티와 그 관계를 추출·검증·중요도화하고, 검증된 온톨로지를
인터랙티브 관계도 위젯으로 렌더링해 원본 기사 하단에 삽입한 완성 HTML을 반환하는 B2B 서비스.

> 이 저장소는 **실서비스 파이프라인(Mode A)** 과 그것이 공유하는 **온톨로지 스키마·위젯**을 담는다.
> B2C(이음, 유튜브)와 동일한 그래프 스키마를 사용해 두 서비스가 데이터·시각 언어를 공유한다.

---

## 파이프라인 7단계

1. **엔티티 추출** — Gemini가 본문에서 인물·조직·쟁점을 추출
2. **정규화** — 엔티티 사전 대조로 표기 통일·배경 부착
3. **관계 추출** — 엔티티 간 관계와 유형 분류
4. **사실 검증(RAG)** — 근거 검색 → `fact`(확인)/`claim`(미검증), 근거 없으면 제외("지어내지 않는다")
5. **중요도 계산** — 연결 수 + 역할 가중치
6. **콘텐츠 앵커링** — 각 노드에 자사 기사·영상 링크 연결(트래픽 순환)
7. **구조화 출력·렌더링** — 8장 스키마 JSON → 위젯으로 렌더 → 기사에 삽입

## 구조

```
pipeline/            # Mode A 파이프라인 (Node.js)
├── run.js           #   오케스트레이터: 기사 → 온톨로지 JSON / 삽입 HTML
├── extract.js       #   1~3단계 (Gemini 또는 로컬 사전)
├── verify.js        #   4단계 RAG 사실 검증
├── score.js         #   5·6단계 중요도 + 앵커링
├── schema.js        #   8장 스키마 강제 검증
├── data/knowledge.json  # 엔티티 사전 + 근거 아카이브
└── README.md
inject/
├── injectOntology.js    # 입출력 계약: 기사 HTML + 위젯 → 삽입된 HTML
├── widget-block.html    # 관계도 위젯 (D3 · 오프라인 · #newsontology-widget 스코프)
└── keys.example.json    # 클라이언트 키 템플릿 (실제 키는 keys.local.json에)
vendor/d3.min.js     # D3 v7 로컬 사본 (오프라인)
data/ontology.js     # 8장 스키마 예시(캐시된 파이프라인 출력)
```

## 실행

```bash
# 기사 → 온톨로지 JSON
node pipeline/run.js path/to/article.html

# 기사 → 위젯이 삽입된 자기완결 HTML (외부 의존 0, file://에서도 동작)
node pipeline/run.js path/to/article.html --html out/article.embedded.html
```

인자를 생략하면 데모 고정 기사를 입력으로 사용한다. 자세한 내용은 [`pipeline/README.md`](pipeline/README.md).

## 환경변수 / 키

| 키 | 용도 | 주입 방법 |
|---|---|---|
| `GEMINI_API_KEY` | 1~3단계 실서비스 추출 (없으면 로컬 사전 경로) | 환경변수 |
| `GEMINI_MODEL` | (선택) 기본 `gemini-2.5-flash` | 환경변수 |
| `YT_API_KEY` | 위젯의 관련 영상(연합뉴스TV) 카드 | 환경변수 또는 `inject/keys.local.json` |

```bash
cp inject/keys.example.json inject/keys.local.json   # 실제 키 입력 (git 제외됨)
export GEMINI_API_KEY=...                              # 실서비스 추출을 켜려면
```

**키는 코드·커밋에 하드코딩하지 않는다.** 네트워크·API 키는 파이프라인 계층에만 둔다.

## 원칙

- **스키마 단일화** — 출력은 B2C 캐시와 동일한 8장 `{nodes, links}`. 위젯은 출처를 모른 채 렌더.
- **지어내지 않는다** — 근거(`src`) 없는 관계는 출력하지 않는다.
- **폴백 안전망** — 어느 단계든 실패/스키마 위반 시 캐시로 폴백.
- **위젯 오프라인 100%** — D3·데이터 로컬/인라인, 외부 CDN·fetch 없음.
