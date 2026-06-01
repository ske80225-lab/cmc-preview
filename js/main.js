(function () {
  'use strict';

  /* ==================================================
    inouekabu.com の .top-scroll-anime アニメーションを再現
    -------------------------------------------------------
    CSS初期状態:
      .scroll-panels__item { transform: scale(1.01, 0); transform-origin: center bottom; }
      .scroll-content      { opacity: 0; transform: translateY(100vh); }

    ▼スクロールダウン（FV → About）
      1. panels: scaleY 0 → 1  stagger 0.06s  duration 0.6s  ease power2.inOut
      2. content: y → 0        duration 1.3s  ease power2.inOut  (panelsと同時スタート)
      3. content: opacity → 1  duration 0.8s  delay 0.5s
      4. 完了後: スクロールロック解除

    ▼スクロールアップ（About → FV）
      1. スクロールロック
      2. content: y → windowHeight  duration 0.6s
         同時: content opacity → 0  duration 0.6s  delay 0.4s
         同時: panels: scaleY → 0   stagger 0.06s  duration 0.6s
      3. 完了後: ロック解除
  ================================================== */

  /* --------------------------------------------------
    定数
  -------------------------------------------------- */
  var PANEL_STAGGER  = 0.06;  // パネル間の stagger 間隔（inouekabu: 0.06）
  var PANEL_DURATION = 0.6;   // パネルアニメーション時間
  var CONTENT_SLIDE  = 1.3;   // コンテンツスライド時間
  var CONTENT_FADE   = 0.8;   // コンテンツフェード時間
  var FADE_DELAY     = 0.5;   // フェードの遅延
  var EASE_MAIN      = 'power2.inOut';

  /* --------------------------------------------------
    DOM 取得
  -------------------------------------------------- */
  var panelsWrap = document.querySelector('.js-scroll-panels');
  var content    = document.querySelector('.js-scroll-content');

  if (!panelsWrap || !content) return;

  var panels = panelsWrap.querySelectorAll('.scroll-panels__item');

  /* --------------------------------------------------
    スクロールロック / 解除
    inouekabu.com と同じ実装
  -------------------------------------------------- */
  var _savedY = 0;

  function disableScroll() {
    _savedY = window.scrollY;
    document.body.style.overflow  = 'hidden';
    document.body.style.position  = 'fixed';
    document.body.style.top       = '-' + _savedY + 'px';
    document.body.style.width     = '100%';
  }

  function enableScroll() {
    document.body.style.overflow  = '';
    document.body.style.position  = '';
    document.body.style.top       = '';
    document.body.style.width     = '';
    window.scrollTo(0, _savedY);
  }

  /* --------------------------------------------------
    状態管理
  -------------------------------------------------- */
  var isAnimating = false; // アニメーション中フラグ
  var isOpen      = false; // コンテンツが表示済みか

  /* --------------------------------------------------
    ▼ OPEN: FV → About（パネルが下から上へ展開）
    inouekabu: d() 関数と同等
  -------------------------------------------------- */
  function open() {
    if (isAnimating || isOpen) return;
    isAnimating = true;
    isOpen      = true;

    // panels: scaleY 0 → 1（下端を起点に展開）左→右 stagger
    gsap.to(panels, {
      scaleY:   1,
      stagger:  PANEL_STAGGER,
      duration: PANEL_DURATION,
      ease:     EASE_MAIN,
      onStart: function () {
        // コンテンツを下から上へスライドイン（パネルと同時スタート）
        gsap.to(content, {
          y:        0,
          duration: CONTENT_SLIDE,
          ease:     EASE_MAIN,
        });
        // コンテンツフェードイン（少し遅延）
        gsap.to(content, {
          opacity:  1,
          duration: CONTENT_FADE,
          delay:    FADE_DELAY,
          ease:     EASE_MAIN,
          onComplete: function () {
            isAnimating = false;
            enableScroll();
          },
        });
      },
    });
  }

  /* --------------------------------------------------
    ▲ CLOSE: About → FV（コンテンツが下へ退場）
    inouekabu: h() 関数と同等
  -------------------------------------------------- */
  function close() {
    if (isAnimating || !isOpen) return;
    isAnimating = true;
    isOpen      = false;

    disableScroll();

    // コンテンツを画面下へスライドアウト
    gsap.to(content, {
      y:        window.innerHeight,
      duration: PANEL_DURATION,
      ease:     EASE_MAIN,
      onStart: function () {
        // コンテンツフェードアウト
        gsap.to(content, {
          opacity:  0,
          duration: PANEL_DURATION,
          delay:    0.4,
          ease:     EASE_MAIN,
        });
        // panels: scaleY 1 → 0（閉じる）
        gsap.to(panels, {
          scaleY:   0,
          stagger:  PANEL_STAGGER,
          duration: PANEL_DURATION,
          ease:     EASE_MAIN,
          onComplete: function () {
            isAnimating = false;
          },
        });
      },
    });
  }

  /* --------------------------------------------------
    イベントリスナー（inouekabu と同じトリガー条件）
  -------------------------------------------------- */

  // ホイール
  window.addEventListener('wheel', function (e) {
    var scrollingDown = e.deltaY > 0;
    var scrollingUp   = e.deltaY < 0;

    if (scrollingDown && !isAnimating && !isOpen && window.scrollY < 1) {
      open();
    }
    if (scrollingUp && !isAnimating && isOpen && window.scrollY < 1) {
      close();
    }
  });

  // スクロール（トップに戻ったとき）
  var _prevScrollY = 0;
  window.addEventListener('scroll', function () {
    if (window.scrollY === 0 && !isAnimating && isOpen && _prevScrollY > 0) {
      close();
    }
    _prevScrollY = window.scrollY;
  }, { passive: true });

  // タッチ
  var _touchStartY = 0;
  window.addEventListener('touchstart', function (e) {
    _touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    var currentY    = e.touches[0].clientY;
    var swipingDown = currentY < _touchStartY; // 指が上 → スクロールダウン
    var swipingUp   = currentY > _touchStartY;

    if (swipingDown && !isAnimating && !isOpen && window.scrollY < 1) {
      open();
    }
    if (swipingUp && !isAnimating && isOpen && window.scrollY === 0) {
      close();
    }
  }, { passive: true });

  /* --------------------------------------------------
    初期化
    inouekabu: ページロード時の状態セット
    - scrollY=0 → スクロールロック
    - scrollY>0 → パネル・コンテンツを即座に表示状態に
  -------------------------------------------------- */
  function init() {
    if (window.scrollY === 0) {
      // FV 表示中: スクロールロック
      disableScroll();
    } else {
      // すでにスクロール済み: パネル・コンテンツを表示状態に
      gsap.set(panels, { scaleY: 1 });
      gsap.set(content, { y: 0, opacity: 1 });
      isOpen = true;
    }
  }

  init();

}());
