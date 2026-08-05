/* ══════════════════════════════════════════════════════════════
   Tanz Pilates Studio — main.js
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ────────────────────────────────────────────────────────────
     ① 설정 — 이 두 값만 채우면 됩니다
     ──────────────────────────────────────────────────────────── */

  // 네이버 클라우드 플랫폼 > Maps > Application 에서 발급받은 Key ID.
  // 비워두면 지도 대신 주소 카드 + 네이버 지도 링크가 그대로 노출됩니다.
  var NAVER_MAP_KEY_ID = 'kbyjs3ojtm';

  // 위젯 임베드 후에는 자동 감지되므로 보통 손댈 필요 없음.
  // (감지가 실패하는 특수한 위젯일 때만 true 로 강제)
  var IG_WIDGET_INSTALLED = false;


  /* ────────────────────────────────────────────────────────────
     ② 로딩 스크린 — 페이지 로드 완료 시 페이드아웃
        (효과가 보이도록 최소 600ms 유지, 안전장치 3초)
     ──────────────────────────────────────────────────────────── */
  function initLoader() {
    var loader = document.getElementById('loading-screen');
    if (!loader) return;

    var shownAt = Date.now();
    var MIN_SHOW = reduceMotion ? 0 : 600;

    function hide() {
      var wait = Math.max(0, MIN_SHOW - (Date.now() - shownAt));
      setTimeout(function () { loader.classList.add('is-done'); }, wait);
    }

    if (document.readyState === 'complete') hide();
    else window.addEventListener('load', hide);

    setTimeout(hide, 3000);   // 로드 이벤트가 늦어도 3초 뒤엔 무조건 해제

    // bfcache 복귀 시(뒤로가기) 로더가 다시 보이지 않도록
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) loader.classList.add('is-done');
    });
  }


  /* ────────────────────────────────────────────────────────────
     ③ 스크롤 등장 애니메이션
     ──────────────────────────────────────────────────────────── */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.dataset.delay || '0', 10);
        setTimeout(function () { el.classList.add('is-in'); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

    items.forEach(function (el) { io.observe(el); });
  }


  /* ────────────────────────────────────────────────────────────
     ③ 현재 섹션에 해당하는 메뉴 활성화
     ──────────────────────────────────────────────────────────── */
  function initActiveMenu() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__menu a[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    var sections = [];

    links.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      var sec = document.getElementById(id);
      if (!sec) return;
      map[id] = a;
      sections.push(sec);
    });

    function setActive(id) {
      links.forEach(function (a) { a.classList.remove('is-active'); });
      if (map[id]) map[id].classList.add('is-active');
    }

    var io = new IntersectionObserver(function (entries) {
      // 화면에 가장 많이 보이는 섹션을 활성 처리
      var best = null;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
      });
      if (best) setActive(best.target.id);
    }, { threshold: [0.25, 0.5, 0.75] });

    sections.forEach(function (s) { io.observe(s); });
  }


  /* ────────────────────────────────────────────────────────────
     ④ 네이버 지도 — 키가 있을 때만 로드
     ──────────────────────────────────────────────────────────── */
  function initMap() {
    var el = document.getElementById('map');
    if (!el || !NAVER_MAP_KEY_ID) return;   // 키 없으면 폴백 카드 유지

    var lat = parseFloat(el.dataset.lat);
    var lng = parseFloat(el.dataset.lng);
    var name = el.dataset.name;
    var addr = el.dataset.address;
    var mapUrl = 'https://map.naver.com/p/search/' + encodeURIComponent(addr);
    var fallbackHTML = el.innerHTML;   // 실패 시 복원용

    function buildMap() {
      if (!window.naver || !window.naver.maps || !window.naver.maps.Map) return false;
      try {
        el.innerHTML = '';   // 지도 생성 직전에만 폴백 제거
        var map = new naver.maps.Map(el, {
          center: new naver.maps.LatLng(lat, lng),
          zoom: 16,
          zoomControl: true,
          zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT }
        });
        var marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(lat, lng),
          map: map,
          cursor: 'pointer'
        });
        var infoWindow = new naver.maps.InfoWindow({
          content:
            '<div style="padding:10px 14px;font-size:14px;line-height:1.5;">' +
            '<strong>' + name + '</strong><br>' + addr + '<br>' +
            '<a href="' + mapUrl + '" target="_blank" rel="noopener" ' +
            'style="display:inline-block;margin-top:6px;color:#03c75a;font-weight:bold;text-decoration:none;">' +
            '탄츠필라테스 네이버 지도에서 보기 →</a></div>'
        });
        naver.maps.Event.addListener(marker, 'click', function () {
          window.open(mapUrl, '_blank', 'noopener');
        });
        infoWindow.open(map, marker);
        return true;
      } catch (e) {
        console.warn('[map] 지도 생성 실패:', e);
        el.innerHTML = fallbackHTML;   // 폴백 복원
        return false;
      }
    }

    // 이 앱은 구세대(AI·NAVER API) — 정식 파라미터는 ncpClientId.
    // 실패 시 신형(ncpKeyId)으로 1회 재시도. 어느 쪽이든 성공 전엔 폴백 카드 유지.
    var params = ['ncpClientId', 'ncpKeyId'];
    var idx = 0;

    function tryLoad() {
      if (idx >= params.length) {
        console.warn('[map] 네이버 지도 인증 실패 — 콘솔의 Web 서비스 URL 등록을 확인하세요.');
        el.innerHTML = fallbackHTML;
        return;
      }
      var param = params[idx++];
      var authFailed = false;
      window.navermap_authFailure = function () {
        authFailed = true;
        console.warn('[map] 인증 실패 (' + param + ') — 다음 방식으로 재시도');
        setTimeout(tryLoad, 0);
      };
      var s = document.createElement('script');
      s.src = 'https://oapi.map.naver.com/openapi/v3/maps.js?' + param + '=' + encodeURIComponent(NAVER_MAP_KEY_ID);
      s.async = true;
      s.onload = function () {
        // 인증 실패 콜백이 onload 직후 비동기로 올 수 있어 한 틱 늦춰 판정
        setTimeout(function () {
          if (!authFailed) buildMap();
        }, 150);
      };
      s.onerror = function () {
        console.warn('[map] 지도 스크립트 로드 실패 (' + param + ')');
        setTimeout(tryLoad, 0);
      };
      document.head.appendChild(s);
    }

    tryLoad();
  }

  /* ────────────────────────────────────────────────────────────
     ⑤ 인스타그램 위젯 폴백 제어
     ──────────────────────────────────────────────────────────── */
  function initInstagram() {
    var wrap = document.getElementById('ig-widget');
    var fallback = document.getElementById('ig-fallback');
    if (!wrap || !fallback) return;

    function check() {
      // behold-widget 같은 커스텀 엘리먼트는 존재해도 로드 전엔 높이 0 —
      // '실제로 그려졌는가(높이)'를 기준으로 판단해야 빈 섹션이 안 생김
      var hasContent = IG_WIDGET_INSTALLED || wrap.offsetHeight > 40;
      fallback.classList.toggle('is-hidden', hasContent);
    }

    check();
    // 서드파티 위젯은 비동기로 주입되므로 잠시 지켜봅니다
    var tries = 0;
    var timer = setInterval(function () {
      check();
      if (++tries > 10) clearInterval(timer);
    }, 800);
  }


  /* ────────────────────────────────────────────────────────────
     실행
     ──────────────────────────────────────────────────────────── */
  function boot() {
    initLoader();
    initReveal();
    initActiveMenu();
    initMap();
    initInstagram();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
