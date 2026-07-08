/* NewsOntology — 파이프라인 출력(캐시). CLAUDE.md 8장과 동일 스키마.
   Mode B(오프라인 데모)는 이 하드코딩 데이터를 window.ONTOLOGY_DATA로 주입한다.
   fetch가 아니라 <script src>로 로드하므로 file://에서도 CORS 없이 동작한다. */
(function () {
  const nodes = [
    { id: "case", label: "홍명보 선임 의혹", type: "concept", weight: 1.0, avatar: "⚽", image: null,
      desc: "홍명보 전 감독 선임 과정에 부당 개입이 있었는지 다투는 이 사건의 진앙. 2024년 7월 시민 고발로 시작돼 2년째 수사 중.",
      anchors: [
        { title: "[관련기사] '홍명보 선임 의혹' 연합뉴스 기사 모음", url: "https://www.yna.co.kr/search/index?query=%ED%99%8D%EB%AA%85%EB%B3%B4%20%EC%84%A0%EC%9E%84%20%EC%9D%98%ED%98%B9" },
        { title: "[영상] 홍명보 감독 선임 논란 정리 (연합뉴스TV)", url: "https://www.youtube.com/results?search_query=%EC%97%B0%ED%95%A9%EB%89%B4%EC%8A%A4+%ED%99%8D%EB%AA%85%EB%B3%B4+%EA%B0%90%EB%8F%85+%EC%84%A0%EC%9E%84+%EB%85%BC%EB%9E%80", youtube: true } ] },

    { id: "police", label: "경찰", type: "org", weight: 0.95, avatar: "경찰", image: null,
      desc: "서울청·종로서. 선임 의혹을 수사해온 주체이자 '9개월 방치·뒷북 수사'라는 비판의 대상.",
      anchors: [
        { title: "[관련기사] 경찰 수사 진행 상황 기사 모음", url: "https://www.yna.co.kr/search/index?query=%ED%99%8D%EB%AA%85%EB%B3%B4%20%EC%84%A0%EC%9E%84%20%EA%B2%BD%EC%B0%B0%20%EC%88%98%EC%82%AC" },
        { title: "[영상] 경찰 '뒷북 수사' 논란 보도 (연합뉴스TV)", url: "https://www.youtube.com/results?search_query=%EC%97%B0%ED%95%A9%EB%89%B4%EC%8A%A4+%ED%99%8D%EB%AA%85%EB%B3%B4+%EC%84%A0%EC%9E%84+%EA%B2%BD%EC%B0%B0+%EC%88%98%EC%82%AC", youtube: true } ] },

    { id: "review", label: "수사심의위", type: "org", weight: 0.7, avatar: "심의", image: null,
      desc: "서울경찰청 수사심의위. 지난해 9월 종로서에 '신속처리'를 지시하라 의결했으나 이행되지 않음.",
      anchors: [
        { title: "[관련기사] 경찰 수사심의위원회 관련 기사", url: "https://www.yna.co.kr/search/index?query=%EA%B2%BD%EC%B0%B0%20%EC%88%98%EC%82%AC%EC%8B%AC%EC%9D%98%EC%9C%84%EC%9B%90%ED%9A%8C" },
        { title: "[영상] 경찰 수사심의위원회 제도 설명 (연합뉴스TV)", url: "https://www.youtube.com/results?search_query=%EC%97%B0%ED%95%A9%EB%89%B4%EC%8A%A4+%EA%B2%BD%EC%B0%B0+%EC%88%98%EC%82%AC%EC%8B%AC%EC%9D%98%EC%9C%84%EC%9B%90%ED%9A%8C", youtube: true } ] },

    { id: "leesaeng", label: "이임생 전 이사", type: "person", weight: 0.55, avatar: "이", image: null,
      desc: "이임생 전 대한축구협회 기술총괄이사. 선임 과정 업무방해 혐의로 고발된 수사 대상.",
      anchors: [
        { title: "[관련기사] 이임생 전 이사 관련 기사 모음", url: "https://www.yna.co.kr/search/index?query=%EC%9D%B4%EC%9E%84%EC%83%9D%20%EA%B8%B0%EC%88%A0%EC%9D%B4%EC%82%AC%20%ED%99%8D%EB%AA%85%EB%B3%B4" },
        { title: "[영상] 이임생 전 이사 선임 주도 논란 (연합뉴스TV)", url: "https://www.youtube.com/results?search_query=%EC%97%B0%ED%95%A9%EB%89%B4%EC%8A%A4+%EC%9D%B4%EC%9E%84%EC%83%9D+%ED%99%8D%EB%AA%85%EB%B3%B4+%EC%84%A0%EC%9E%84", youtube: true } ] },

    { id: "hong", label: "홍명보 감독", type: "person", weight: 0.5, avatar: "홍", image: null,
      desc: "홍명보 전 국가대표팀 감독. 선임 의혹의 당사자로, 월드컵 부진 뒤 사의를 표함.",
      anchors: [
        { title: "[관련기사] 홍명보 감독 사퇴 관련 기사", url: "https://www.yna.co.kr/search/index?query=%ED%99%8D%EB%AA%85%EB%B3%B4%20%EA%B0%90%EB%8F%85%20%EC%82%AC%ED%87%B4" },
        { title: "[영상] 홍명보 감독 사퇴 회견 (연합뉴스TV)", url: "https://www.youtube.com/results?search_query=%EC%97%B0%ED%95%A9%EB%89%B4%EC%8A%A4+%ED%99%8D%EB%AA%85%EB%B3%B4+%EA%B0%90%EB%8F%85+%EC%82%AC%ED%87%B4+%ED%9A%8C%EA%B2%AC", youtube: true } ] },

    { id: "president", label: "이재명 대통령", type: "person", weight: 0.55, avatar: "이", image: null,
      desc: "'무능한 사람을 지휘관으로 선발한 결과'라며 공개 질책해, 수사에 정치적 압박이 됐다는 평이 나옴.",
      anchors: [
        { title: "[관련기사] 이재명 대통령 관련 기사 모음", url: "https://www.yna.co.kr/search/index?query=%EC%9D%B4%EC%9E%AC%EB%AA%85%20%EB%8C%80%ED%86%B5%EB%A0%B9%20%EC%B6%95%EA%B5%AC" },
        { title: "[영상] 이재명 대통령 축구 관련 발언 (연합뉴스TV)", url: "https://www.youtube.com/results?search_query=%EC%97%B0%ED%95%A9%EB%89%B4%EC%8A%A4+%EC%9D%B4%EC%9E%AC%EB%AA%85+%ED%99%8D%EB%AA%85%EB%B3%B4", youtube: true } ] },

    { id: "geumsudae", label: "금융범죄수사대", type: "org", weight: 0.45, avatar: "금수", image: null,
      desc: "서울청 광수단 산하 금융범죄수사대(금수대). 지난 1일 종로서에서 사건을 넘겨받은 특수수사 부서.",
      anchors: [
        { title: "[관련기사] 서울청 광수단 금융범죄수사대 관련 기사", url: "https://www.yna.co.kr/search/index?query=%EC%84%9C%EC%9A%B8%EA%B2%BD%EC%B0%B0%EC%B2%AD%20%EA%B4%91%EC%97%AD%EC%88%98%EC%82%AC%EB%8B%A8%20%EA%B8%88%EC%9C%B5%EB%B2%94%EC%A3%84%EC%88%98%EC%82%AC%EB%8C%80" },
        { title: "[영상] 서울청 광수단 금융범죄수사대 관련 (연합뉴스TV)", url: "https://www.youtube.com/results?search_query=%EC%97%B0%ED%95%A9%EB%89%B4%EC%8A%A4+%EC%84%9C%EC%9A%B8%EA%B2%BD%EC%B0%B0%EC%B2%AD+%EA%B4%91%EC%97%AD%EC%88%98%EC%82%AC%EB%8B%A8", youtube: true } ] },
  ];

  const links = [
    { s: "review",    t: "police",    label: "신속처리 지시(9개월째 미이행)", status: "fact",  src: "수사심의위 의결(2025.9.23)·종로서 방치 확인" },
    { s: "police",    t: "case",      label: "선임 의혹 2년째 수사",          status: "fact",  src: "연합뉴스 본문" },
    { s: "leesaeng",  t: "case",      label: "선임 개입 의혹(고발 대상)",      status: "claim", src: "시민 고발(2024.7)·수사 중(미확정)" },
    { s: "hong",      t: "case",      label: "선임 당사자",                  status: "fact",  src: "기사 명시" },
    { s: "leesaeng",  t: "hong",      label: "선임 과정 개입 의혹",          status: "claim", src: "고발 내용(검증 안 됨)" },
    { s: "police",    t: "geumsudae", label: "사건 재배당(이첩)",            status: "fact",  src: "2026.7.1 광수단 이첩" },
    { s: "president", t: "police",    label: "공개 질책",                    status: "fact",  src: "이재명 대통령 발언" },
    { s: "president", t: "case",      label: "여론·정치권에 떠밀린 수사 논란", status: "claim", src: "'떠밀린 결과 아니냐' 비판(해석)" },
  ];

  window.ONTOLOGY_DATA = { nodes, links };
})();
