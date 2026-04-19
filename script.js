/**
 * ═══════════════════════════════════════════════════════════
 * WEDDING INVITATION — Aarav & Diya
 * script.js  —  Fully fixed & enhanced
 *
 * FIXES APPLIED:
 *  1. Events section invisible  → ScrollTrigger.refresh() after
 *     wrapper is painted + double-rAF timing guarantee
 *  2. RSVP blank                → CSS opacity lock bypassed;
 *     GSAP controls RSVP elements directly
 *  3. Curtain opening animation → cinematic split-panel GSAP
 *  4. Falling petals            → canvas-based, 60fps, mobile-safe
 * ═══════════════════════════════════════════════════════════
 */

/* ── PLUGIN REGISTRATION ─────────────────────────────────── */
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* ── TINY HELPERS ────────────────────────────────────────── */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const R  = (a, b) => Math.random() * (b - a) + a;
const RI = (a, b) => Math.floor(R(a, b));

/* ════════════════════════════════════════════════════════════
   A.  CANVAS PETAL SYSTEM  (v2 — premium smooth motion)
   ─────────────────────────────────────────────────────────
   Improvements over v1:
   • Delta-time stepping  → no jitter on slow/fast devices
   • Higher, consistent opacity (0.72–0.95) → more visible
   • Tighter sway range  → looks natural, not random/messy
   • Soft ease-in on spawn (fade up from 0) → no pop-in
   • Two petal sizes: large (hero) + small (accent)
   • Reduced rotV variance  → smoother tumble, less chaotic
   • Shadow pass per petal  → subtle depth, premium feel
════════════════════════════════════════════════════════════ */
function initPetalCanvas() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ── Canvas setup ── */
  const canvas  = document.createElement('canvas');
  canvas.id     = 'petal-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', () => { resize(); }, { passive: true });

  /* ── Device capability ── */
  const isMobile    = window.innerWidth < 600;
  const PETAL_COUNT = isMobile ? 18 : 42;

  /* ── Premium colour palette — richer, more saturated ── */
  const COLORS = [
    [220,  70,  70],   // deep rose
    [235, 100, 100],   // medium rose
    [215,  55,  90],   // crimson-pink
    [250, 160, 160],   // blush
    [200,  50,  80],   // magenta rose
    [240, 130,  90],   // peach-coral
    [185,  45,  75],   // wine rose
  ];

  /* ── Bezier petal draw ── */
  function drawPetalShape(ctx, w, h) {
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.5);
    /* right curve — slightly asymmetric for realism */
    ctx.bezierCurveTo( w * 0.55, -h * 0.22,  w * 0.48,  h * 0.38, 0,  h * 0.5);
    /* left curve */
    ctx.bezierCurveTo(-w * 0.48,  h * 0.38, -w * 0.55, -h * 0.22, 0, -h * 0.5);
    ctx.closePath();
  }

  /* ── Petal class ── */
  class Petal {
    constructor(spreadY = false) { this.reset(spreadY); }

    reset(spreadY = false) {
      /* Position */
      this.x  = R(0, W);
      this.y  = spreadY ? R(-80, H * 0.9) : R(-150, -20);

      /* Size — two tiers for visual variety */
      const large = Math.random() < 0.35;
      this.w  = large ? R(isMobile ? 11 : 15, isMobile ? 17 : 24)
                      : R(isMobile ?  6 :  9, isMobile ? 11 : 15);
      this.h  = this.w * R(1.45, 1.85);

      /* Fall speed — tighter range for consistency */
      this.vy = R(0.55, 1.20);

      /* Horizontal drift — very gentle */
      this.vx = R(-0.20, 0.20);

      /* Sway — smooth sine wave, reduced amplitude */
      this.swayA = R(0.18, 0.55);          // amplitude (px per frame)
      this.swayF = R(0.006, 0.013);        // frequency
      this.swayT = R(0, Math.PI * 2);      // phase offset

      /* Rotation — slow and deliberate, not chaotic */
      this.rot  = R(0, Math.PI * 2);
      this.rotV = R(0.004, 0.014) * (Math.random() < 0.5 ? 1 : -1);

      /* Colour with consistent high opacity */
      const [r, g, b]  = COLORS[RI(0, COLORS.length)];
      const baseAlpha   = R(0.72, 0.92);
      this.fillStyle    = `rgba(${r},${g},${b},${baseAlpha})`;
      this.shadowColor  = `rgba(${r},${g},${b},${baseAlpha * 0.28})`;
      this.veinColor    = `rgba(255,255,255,0.22)`;

      /* Fade-in state (soft spawn, no pop) */
      this.alpha        = 0;
      this.fadeInSpeed  = R(0.012, 0.025);
      this.fading       = true;              // true while fading in
    }

    update(dt) {
      /* dt = delta seconds, target 60fps (dt≈0.0167) */
      const spd = dt * 60;                  // normalise to 60fps units

      /* Fade-in */
      if (this.fading) {
        this.alpha = Math.min(1, this.alpha + this.fadeInSpeed * spd);
        if (this.alpha >= 1) this.fading = false;
      }

      /* Sway + fall */
      this.swayT += this.swayF * spd;
      this.x     += (this.vx + Math.sin(this.swayT) * this.swayA) * spd;
      this.y     += this.vy * spd;
      this.rot   += this.rotV * spd;

      /* Respawn */
      if (this.y > H + 70 || this.x < -70 || this.x > W + 70) {
        this.reset(false);
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.globalAlpha = this.alpha;

      /* 3-D tumble: compress Y axis by |cos(rot*2)| */
      const tilt = 0.32 + Math.abs(Math.cos(this.rot * 2)) * 0.68;
      ctx.scale(1, tilt);

      /* Soft shadow for depth (drawn once, slightly offset) */
      ctx.save();
      ctx.translate(1.5, 2);
      drawPetalShape(ctx, this.w, this.h);
      ctx.fillStyle = this.shadowColor;
      ctx.fill();
      ctx.restore();

      /* Main petal fill */
      drawPetalShape(ctx, this.w, this.h);
      ctx.fillStyle = this.fillStyle;
      ctx.fill();

      /* Midrib vein — only on larger petals for perf */
      if (this.w >= (isMobile ? 10 : 13)) {
        ctx.beginPath();
        ctx.moveTo(0, -this.h * 0.44);
        ctx.quadraticCurveTo(this.w * 0.06, 0, 0, this.h * 0.44);
        ctx.strokeStyle = this.veinColor;
        ctx.lineWidth   = 0.7;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  /* ── Spawn petals spread across screen on init ── */
  const petals = Array.from({ length: PETAL_COUNT }, () => new Petal(true));

  /* ── Delta-time animation loop ── */
  let animId;
  let lastTime = performance.now();

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = now;

    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < petals.length; i++) {
      petals[i].update(dt);
      petals[i].draw(ctx);
    }
    animId = requestAnimationFrame(loop);
  }

  animId = requestAnimationFrame(loop);

  /* Pause when tab is hidden (saves battery/CPU) */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      lastTime = performance.now(); // reset dt so no jump on resume
      animId   = requestAnimationFrame(loop);
    }
  });
}

/* ════════════════════════════════════════════════════════════
   B.  FLOATING GOLD PARTICLES (fixed, dark sections)
════════════════════════════════════════════════════════════ */
function createParticles() {
  const container = document.getElementById('particles-container');
  if (!container) return;
  const count = window.innerWidth < 600 ? 20 : 40;

  for (let i = 0; i < count; i++) {
    const p    = document.createElement('div');
    const size = R(2, 5);
    p.style.cssText = `
      position:absolute;
      width:${size}px; height:${size}px;
      border-radius:50%;
      background:hsl(${R(35,50)},80%,${R(55,75)}%);
      left:${R(0,100)}vw; top:${R(0,100)}vh;
      will-change:transform,opacity;
    `;
    container.appendChild(p);
    gsap.to(p, {
      y: R(-80, 80), x: R(-40, 40), opacity: R(0.1, 0.4),
      duration: R(4, 9), repeat: -1, yoyo: true,
      ease: 'sine.inOut', delay: R(0, 6),
    });
  }
}

/* ════════════════════════════════════════════════════════════
   C.  TWINKLING HERO STARS
════════════════════════════════════════════════════════════ */
function createHeroStars() {
  const container = document.querySelector('.hero-stars');
  if (!container) return;
  const count = window.innerWidth < 600 ? 30 : 60;
  for (let i = 0; i < count; i++) {
    const s    = document.createElement('div');
    const size = R(1, 3);
    s.style.cssText = `
      position:absolute; width:${size}px; height:${size}px;
      border-radius:50%; background:white;
      left:${R(0,100)}%; top:${R(0,100)}%;
    `;
    container.appendChild(s);
    gsap.to(s, {
      opacity: R(0.1, 0.6), duration: R(1.5, 3.5),
      repeat: -1, yoyo: true, ease: 'sine.inOut', delay: R(0, 4),
    });
  }
}

/* ════════════════════════════════════════════════════════════
   D.  COUPLE SECTION FLOATING PETALS (cream bg overlay)
════════════════════════════════════════════════════════════ */
function initCouplePetals() {
  const bg = document.querySelector('.couple-petals-bg');
  if (!bg) return;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 30">
    <ellipse cx="10" cy="15" rx="7" ry="13" fill="#e8a0b0" opacity="0.65"/>
  </svg>`;
  const b64   = 'data:image/svg+xml;base64,' + btoa(svg);
  const count = window.innerWidth < 600 ? 8 : 16;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.style.cssText = `
      position:absolute;
      width:${R(8,18)}px; height:${R(12,24)}px;
      background:url('${b64}') center/cover no-repeat;
      left:${R(0,100)}%; top:${R(-10,110)}%;
      opacity:${R(0.2,0.5)};
      transform:rotate(${R(-60,60)}deg);
      pointer-events:none;
    `;
    bg.appendChild(p);
    gsap.to(p, {
      y: R(-30,30), x: R(-20,20), rotation: R(-40,40),
      duration: R(4,8), repeat: -1, yoyo: true,
      ease: 'sine.inOut', delay: R(0,4),
    });
  }
}

/* ════════════════════════════════════════════════════════════
   E.  CINEMATIC CURTAIN OPENING ANIMATION
   ─────────────────────────────────────────────────────────
   Two heavy velvet-style panels slide apart on click,
   like a theatre curtain / royal parda opening.
   Panels are injected into DOM, animated, then removed.
════════════════════════════════════════════════════════════ */
function buildCurtains() {
  /* ── Left curtain panel ── */
  const left = document.createElement('div');
  left.id    = 'curtain-left';
  left.style.cssText = `
    position:fixed; top:0; left:0;
    width:51%; height:100%;          /* 51% so panels overlap at seam */
    z-index:5000;
    background:linear-gradient(to right,
      #080100 0%,#1a0400 25%,#3d0800 55%,#6b0f0f 80%,#7a1515 100%);
    transform-origin:left center;
    will-change:transform;
    box-shadow:inset -8px 0 30px rgba(0,0,0,0.6);
  `;

  /* ── Right curtain panel ── */
  const right = document.createElement('div');
  right.id    = 'curtain-right';
  right.style.cssText = `
    position:fixed; top:0; right:0;
    width:51%; height:100%;
    z-index:5000;
    background:linear-gradient(to left,
      #080100 0%,#1a0400 25%,#3d0800 55%,#6b0f0f 80%,#7a1515 100%);
    transform-origin:right center;
    will-change:transform;
    box-shadow:inset 8px 0 30px rgba(0,0,0,0.6);
  `;

  /* ── Gold centre seam line ── */
  const seam = document.createElement('div');
  seam.id    = 'curtain-seam';
  seam.style.cssText = `
    position:fixed; top:0; left:50%;
    transform:translateX(-50%);
    width:4px; height:100%;
    z-index:5001;
    background:linear-gradient(to bottom,
      transparent 0%, #fff3a0 10%, #f5c842 30%,
      #d4a017 50%, #f5c842 70%, #fff3a0 90%, transparent 100%);
    box-shadow:0 0 18px 4px rgba(245,200,66,0.55);
    will-change:transform,opacity;
  `;

  /* ── Decorative overlay badge (sits on top of curtains) ── */
  const badge = document.createElement('div');
  badge.id    = 'curtain-badge';
  badge.innerHTML = `
    <div style="
      font-family:'Great Vibes',cursive;
      font-size:clamp(1.8rem,5vw,3.2rem);
      color:#f5c842;
      text-shadow:0 0 30px rgba(245,200,66,0.7),0 0 60px rgba(245,200,66,0.3);
      line-height:1.1;
      margin-bottom:0.6rem;
    ">You Are Invited</div>
    <div style="
      font-family:'Cinzel',serif;
      font-size:clamp(0.5rem,1.4vw,0.65rem);
      letter-spacing:0.45em;
      color:rgba(253,246,227,0.55);
      text-transform:uppercase;
    ">Open to begin</div>
  `;
  badge.style.cssText = `
    position:fixed; top:50%; left:50%;
    transform:translate(-50%,-50%);
    z-index:5002; text-align:center;
    pointer-events:none; will-change:opacity,transform;
  `;

  document.body.appendChild(left);
  document.body.appendChild(right);
  document.body.appendChild(seam);
  document.body.appendChild(badge);

  return { left, right, seam, badge };
}

/* Play the full curtain-open sequence. onDone() fires when complete */
function playCurtainOpen(curtains, onDone) {
  const { left, right, seam, badge } = curtains;

  /* Re-ensure panels are in "nearly-closed" position */
  gsap.set(left,  { x: '-50%' });
  gsap.set(right, { x:  '50%' });
  gsap.set(seam,  { opacity: 1, scaleY: 1 });

  const tl = gsap.timeline({
    defaults: { ease: 'power3.inOut' },
    onComplete: () => {
      [left, right, seam, badge].forEach(el => el.remove());
      onDone();
    },
  });

  tl
    /* 1 — Badge fades out */
    .to(badge, { opacity: 0, y: -20, duration: 0.4, ease: 'power2.in' })

    /* 2 — Seam glows bright then disappears */
    .to(seam, {
      boxShadow: '0 0 40px 12px rgba(245,200,66,0.95)',
      duration: 0.25, ease: 'power1.out',
    }, '-=0.15')
    .to(seam, { opacity: 0, scaleX: 3, duration: 0.35 }, '-=0.05')

    /* 3 — Curtains sweep apart (the magic moment) */
    .to(left,  { x: '-100%', duration: 1.2, ease: 'power3.inOut' }, '-=0.2')
    .to(right, { x:  '100%', duration: 1.2, ease: 'power3.inOut' }, '<')

    /* 4 — Brightness punch as invitation is revealed */
    .fromTo(
      '#invitation-wrapper',
      { filter: 'brightness(0.3) saturate(0.5)' },
      { filter: 'brightness(1) saturate(1)', duration: 0.9, ease: 'power2.out' },
      '-=0.55'
    );
}

/* ════════════════════════════════════════════════════════════
   F.  LANDING SECTION — entrance + button click → curtain
   FIX 1: Curtains stay FULLY CLOSED on page load.
   They open only when user clicks "Open Invitation".
   No auto-animation. Landing text animates behind closed curtain.
════════════════════════════════════════════════════════════ */
function initLanding() {
  const btn     = document.getElementById('open-invitation-btn');
  const landing = document.getElementById('landing');
  const wrapper = document.getElementById('invitation-wrapper');
  if (!btn || !landing || !wrapper) return;

  /* ── Build curtains FULLY CLOSED — no animation on load ── */
  const curtains = buildCurtains();
  gsap.set(curtains.left,  { x: '0%' });    /* left panel: fully covers left half  */
  gsap.set(curtains.right, { x: '0%' });    /* right panel: fully covers right half */
  gsap.set(curtains.seam,  { opacity: 1 });  /* gold seam visible at centre          */
  gsap.set(curtains.badge, { opacity: 0 });  /* badge hidden — landing has own text  */

  /* ── Landing text animates in behind the closed curtain ──
     This runs immediately so text is ready when curtain opens */
  gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.3 })
    .fromTo('.landing-you-are-invited',
      { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1 })
    .fromTo('.landing-names',
      { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, '-=0.5')
    .fromTo('#open-invitation-btn',
      { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.4')
    .fromTo('.landing-tap-hint',
      { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')
    /* FIX 1: Curtains open ONCE here to reveal the landing page */
    .to([curtains.left, curtains.right], {
      x: (i) => i === 0 ? '-100%' : '100%',
      duration: 1.6, ease: 'power3.out',
    }, '+=0.15')
    .to(curtains.seam, { opacity: 0, duration: 0.7 }, '<+=0.5');

  /* ── BUTTON CLICK → Re-close curtains then do full open ── */
  btn.addEventListener('click', () => {
    btn.disabled = true; /* prevent double-trigger */

    /* Step 1: Dramatically sweep curtains back in as build-up */
    gsap.timeline()
      .to([curtains.left, curtains.right], {
        x: (i) => i === 0 ? '-45%' : '45%',
        duration: 0.45, ease: 'power2.in',
      })
      .to(curtains.seam, { opacity: 1, duration: 0.2 }, '-=0.15')

      /* Step 2: Show invitation wrapper, fade out landing, open curtains */
      .add(() => {
        wrapper.classList.remove('hidden');
        gsap.set(wrapper, { opacity: 0 });

        gsap.to(landing, {
          opacity: 0, scale: 0.98, duration: 0.5, ease: 'power2.in',
          onComplete: () => { landing.style.display = 'none'; },
        });

        playCurtainOpen(curtains, () => {
          gsap.to(wrapper, {
            opacity: 1, duration: 0.6, ease: 'power2.out',
            onComplete: () => {
              /* wrapper is display:block + opacity:1 — safe to init ST */
              initAllSectionAnimations();
            },
          });
        });
      });
  });
}


/* ════════════════════════════════════════════════════════════
   G.  HERO SECTION ENTRANCE ANIMATION
   FIX 2+3: Uses fromTo() so elements are guaranteed hidden
   before click. Absolute timeline positions ensure clean
   one-by-one sequence with no overlap or instant flash.
════════════════════════════════════════════════════════════ */
function initHeroSection() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl
    .fromTo('.om-symbol',
      { scale: 0,  opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8 }, 0.1)
    .fromTo('.hero-tagline',
      { y: 25,     opacity: 0 }, { y: 0,     opacity: 1, duration: 0.65 }, 0.65)
    .fromTo('.name-groom',
      { x: -60,    opacity: 0 }, { x: 0,     opacity: 1, duration: 0.75 }, 1.05)
    .fromTo('.name-ampersand',
      { scale: 0,  opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45 }, 1.35)
    .fromTo('.name-bride',
      { x: 60,     opacity: 0 }, { x: 0,     opacity: 1, duration: 0.75 }, 1.55)
    .fromTo('.hero-invite-text',
      { y: 20,     opacity: 0 }, { y: 0,     opacity: 1, duration: 0.65 }, 2.05)
    .fromTo('.hero-date-box',
      { scaleX: 0, opacity: 0 }, { scaleX: 1,opacity: 1, duration: 0.6  }, 2.5 )
    .fromTo('.hero-location',
      { y: 15,     opacity: 0 }, { y: 0,     opacity: 1, duration: 0.55 }, 2.9 )
    .fromTo('.scroll-indicator',
      { y: 10,     opacity: 0 }, { y: 0,     opacity: 1, duration: 0.5  }, 3.2 )
    .fromTo('.star-deco',
      { scale: 0,  opacity: 0 }, { scale: 1, opacity: 0.7, duration: 0.55, stagger: 0.14 }, 2.2);
}

/* ════════════════════════════════════════════════════════════
   H.  ALL SCROLL-TRIGGERED SECTION ANIMATIONS
   ─────────────────────────────────────────────────────────
   ONLY called after invitation-wrapper is visible in DOM.
   Uses double-requestAnimationFrame to guarantee the browser
   has laid out the wrapper before ScrollTrigger measures it.
════════════════════════════════════════════════════════════ */
function initAllSectionAnimations() {

  /* Kill any stale instances from previous attempts */
  ScrollTrigger.getAll().forEach(st => st.kill());

  /* Double-rAF: browser paints twice before we measure */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {

      ScrollTrigger.refresh(true); // recalculate all scroll positions

      /* ── Hero entrance ── */
      initHeroSection();

      /* ── FALLBACK SAFETY NET ───────────────────────────────
         For every [data-reveal] element: set a 2.5s timeout
         that forces is-visible. If ST fires first it clears
         the timeout. Nothing stays invisible regardless.     */
      function revealWithFallback(el, stConfig) {
        const timer = setTimeout(() => {
          el.classList.add('is-visible');
        }, 2500);

        ScrollTrigger.create({
          ...stConfig,
          trigger: el,
          once:    true,
          onEnter: () => {
            clearTimeout(timer);
            el.classList.add('is-visible');
          },
        });

        /* Already in viewport? Reveal immediately */
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.96) {
          clearTimeout(timer);
          el.classList.add('is-visible');
        }
      }

      /* ── [data-reveal] generic reveal ── */
      document.querySelectorAll('[data-reveal]').forEach(el => {
        revealWithFallback(el, { start: 'top 90%' });
      });

      /* ── Couple photos ── */
      document.querySelectorAll('.couple-photo-ring').forEach((el, i) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          scale: 0.6, opacity: 0, duration: 0.9,
          delay: i * 0.2, ease: 'back.out(1.5)',
        });
      });

      /* ── Heart ── */
      gsap.from('.heart-icon', {
        scrollTrigger: { trigger: '.couple-heart', start: 'top 88%', once: true },
        scale: 0, opacity: 0, duration: 0.7, ease: 'back.out(2)', delay: 0.4,
      });

      /* ────────────────────────────────────────────────────
         EVENTS SECTION — CRITICAL FIX
         gsap.set ensures baseline visibility; GSAP `from`
         animates from invisible → visible (never gets stuck)
      ──────────────────────────────────────────────────── */

      /* Events header */
      const eventsHeader = document.querySelector('.events-header');
      if (eventsHeader) {
        gsap.set(eventsHeader, { opacity: 1, y: 0 });
        gsap.from(eventsHeader, {
          scrollTrigger: { trigger: eventsHeader, start: 'top 90%', once: true },
          y: 35, opacity: 0, duration: 0.8, ease: 'power3.out',
        });
      }

      /* Timeline items */
      document.querySelectorAll('.timeline-item').forEach((item, i) => {
        gsap.set(item, { opacity: 1, x: 0 }); /* baseline = visible */
        gsap.from(item, {
          scrollTrigger: { trigger: item, start: 'top 92%', once: true },
          opacity: 0, x: i % 2 === 0 ? -55 : 55,
          duration: 0.9, ease: 'power3.out', delay: 0.07 * i,
        });
      });

      /* Timeline dots */
      document.querySelectorAll('.timeline-dot').forEach(dot => {
        gsap.set(dot, { opacity: 1, scale: 1 });
        gsap.from(dot, {
          scrollTrigger: { trigger: dot, start: 'top 92%', once: true },
          scale: 0, opacity: 0, duration: 0.6, ease: 'back.out(2)',
        });
      });

      /* ────────────────────────────────────────────────────
         BLESSINGS SECTION  (left card + venue card right)
      ──────────────────────────────────────────────────── */

      /* Blessings inner card — slides in from left */
      const blessingsInner = document.querySelector('.blessings-inner');
      if (blessingsInner) {
        gsap.set(blessingsInner, { opacity: 1, x: 0 });
        gsap.from(blessingsInner, {
          scrollTrigger: { trigger: '#blessings', start: 'top 88%', once: true },
          x: -50, opacity: 0, duration: 0.9, ease: 'power3.out',
        });
      }

      /* Family rows stagger inside blessings */
      document.querySelectorAll('.blessings-family').forEach((el, i) => {
        gsap.set(el, { opacity: 1, y: 0 });
        gsap.from(el, {
          scrollTrigger: { trigger: '#blessings', start: 'top 85%', once: true },
          y: 22, opacity: 0, duration: 0.65, delay: 0.25 + i * 0.13, ease: 'power2.out',
        });
      });

      /* Venue card — slides in from right */
      const venueCard = document.querySelector('.venue-card');
      if (venueCard) {
        gsap.set(venueCard, { opacity: 1, x: 0 });
        gsap.from(venueCard, {
          scrollTrigger: { trigger: '#blessings', start: 'top 88%', once: true },
          x: 50, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.15,
        });
      }

      /* Map button pulse after card arrives */
      const mapBtn = document.querySelector('.btn-view-map');
      if (mapBtn) {
        gsap.from(mapBtn, {
          scrollTrigger: { trigger: '#blessings', start: 'top 80%', once: true },
          scale: 0.85, opacity: 0, duration: 0.6, ease: 'back.out(1.8)', delay: 0.55,
        });
      }

      /* ────────────────────────────────────────────────────
         RSVP SECTION — CRITICAL FIX
         The CSS [data-reveal] rule locks opacity:0 on the
         rsvp-header and rsvp-form. We override that inline
         so GSAP handles the animation exclusively.
      ──────────────────────────────────────────────────── */
      document.querySelectorAll('#rsvp [data-reveal]').forEach(el => {
        /* Break the CSS lock */
        el.style.cssText += ';opacity:1 !important;transform:none !important;';
        /* Also add is-visible in case anything checks the class */
        el.classList.add('is-visible');
      });

      const rsvpHeader = document.querySelector('.rsvp-header');
      if (rsvpHeader) {
        gsap.set(rsvpHeader, { clearProps: 'all' });
        gsap.from(rsvpHeader, {
          scrollTrigger: { trigger: '#rsvp', start: 'top 85%', once: true },
          y: 30, opacity: 0, duration: 0.8, ease: 'power3.out',
        });
      }

      const rsvpForm = document.getElementById('rsvp-form');
      if (rsvpForm) {
        gsap.set(rsvpForm, { opacity: 1, y: 0 }); /* guaranteed visible */
        gsap.from(rsvpForm, {
          scrollTrigger: { trigger: rsvpForm, start: 'top 90%', once: true },
          y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.12,
        });
      }

      /* ── Footer ── */
      gsap.from('.footer-couple-script', {
        scrollTrigger: { trigger: '.section-footer', start: 'top 92%', once: true },
        scale: 0.8, opacity: 0, duration: 1, ease: 'back.out(1.4)',
      });

      /* ── Parallax effects (safe here because ST is refreshed) ── */
      initParallaxEffects();

    }); /* end inner rAF */
  }); /* end outer rAF */
}

/* ════════════════════════════════════════════════════════════
   I.  PARALLAX
════════════════════════════════════════════════════════════ */
function initParallaxEffects() {
  gsap.to('.hero-couple-name', {
    scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=600', scrub: 1.5 },
    y: 60, ease: 'none',
  });
  gsap.to('.hero-content', {
    scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=500', scrub: 2 },
    opacity: 0, ease: 'none',
  });
  gsap.to('.hero-bg-glow', {
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
    y: 80, ease: 'none',
  });
  gsap.to('.events-bg-glow', {
    scrollTrigger: { trigger: '#events', start: 'top bottom', end: 'bottom top', scrub: 2 },
    y: -60, ease: 'none',
  });
}

/* ════════════════════════════════════════════════════════════
   J.  RSVP FORM SUBMISSION
════════════════════════════════════════════════════════════ */
function initRSVP() {
  const form     = document.getElementById('rsvp-form');
  const thankYou = document.getElementById('thank-you');
  if (!form || !thankYou) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const nameField = document.getElementById('guest-name');

    if (!nameField.value.trim()) {
      gsap.to(nameField, {
        x: [-10, 10, -8, 8, -4, 4, 0],
        duration: 0.5, ease: 'power2.inOut',
      });
      nameField.focus();
      return;
    }

    gsap.to(form, {
      opacity: 0, y: -20, duration: 0.5, ease: 'power2.in',
      onComplete: () => {
        form.classList.add('hidden');
        thankYou.classList.remove('hidden');
        gsap.from(thankYou, { opacity: 0, scale: 0.85, duration: 0.7, ease: 'back.out(1.5)' });
        confettiBurst();
      },
    });
  });
}

/* ════════════════════════════════════════════════════════════
   K.  CONFETTI BURST
════════════════════════════════════════════════════════════ */
function confettiBurst() {
  const colors = ['#f5c842','#c9960c','#e8d5b0','#ffffff','#d4a017','#c04040','#f5d0d0'];
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;

  for (let i = 0; i < 60; i++) {
    const el   = document.createElement('div');
    const size = R(5, 13);
    el.style.cssText = `
      position:fixed; width:${size}px; height:${size}px;
      background:${colors[RI(0,colors.length)]};
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      left:${cx}px; top:${cy}px;
      pointer-events:none; z-index:9998;
    `;
    document.body.appendChild(el);
    gsap.to(el, {
      x: R(-300,300), y: R(-400,200), rotation: R(-360,360),
      opacity: 0, duration: R(1.5,3), ease: 'power2.out', delay: R(0,0.4),
      onComplete: () => el.remove(),
    });
  }
}

/* ════════════════════════════════════════════════════════════
   L.  MUSIC BUTTON  —  Din Shagna Da  (BULLETPROOF v3)
   ─────────────────────────────────────────────────────────
   Root cause of previous failures:
   • External file path not resolving in preview environments
   • GSAP fade proxy running before audio actually started
   Fix:
   • Audio embedded as base64 data URI in HTML — always loads
   • Volume fade done with plain setInterval, no GSAP needed
   • setPlayingState called only inside .then() — guaranteed
     audio is actually playing before UI updates
════════════════════════════════════════════════════════════ */
function initMusic() {
  const btn   = document.getElementById('music-btn');
  const audio = document.getElementById('bg-music');
  const icon  = document.getElementById('music-icon');

  if (!btn || !audio) {
    console.error('[Music] Elements not found. btn:', btn, 'audio:', audio);
    return;
  }

  let playing    = false;
  let fadeTimer  = null;

  /* ── Update button visuals ── */
  function setUI(isPlaying) {
    playing          = isPlaying;
    icon.textContent = isPlaying ? '🔊' : '🔇';
    btn.setAttribute('aria-label', isPlaying ? 'Pause music' : 'Play music');
    btn.classList.toggle('is-playing', isPlaying);
  }

  /* ── Smooth volume fade using setInterval ──
     Steps volume from current → target over ~800 ms            */
  function fadeVolume(targetVol, durationMs, onDone) {
    clearInterval(fadeTimer);
    const steps    = 40;
    const interval = durationMs / steps;
    const start    = audio.volume;
    const delta    = (targetVol - start) / steps;
    let   count    = 0;

    fadeTimer = setInterval(() => {
      count++;
      audio.volume = Math.min(1, Math.max(0, start + delta * count));
      if (count >= steps) {
        clearInterval(fadeTimer);
        audio.volume = targetVol;
        if (typeof onDone === 'function') onDone();
      }
    }, interval);
  }

  /* ── Play ── */
  function startAudio() {
    audio.volume = 0;

    const promise = audio.play();

    if (promise !== undefined) {
      promise
        .then(() => {
          setUI(true);
          fadeVolume(1, 1500, null);   /* fade in over 1.5 s */
        })
        .catch(err => {
          console.error('[Music] play() blocked:', err.message);
          /* Show user a hint — icon shakes */
          gsap.to(btn, { x: [-6,6,-4,4,-2,2,0], duration: 0.4 });
        });
    } else {
      /* Old browser, no Promise */
      setUI(true);
      fadeVolume(1, 1500, null);
    }
  }

  /* ── Pause ── */
  function stopAudio() {
    fadeVolume(0, 600, () => {
      audio.pause();
      audio.volume = 0;
    });
    setUI(false);
  }

  /* ── Button click ── */
  btn.addEventListener('click', () => {
    /* Small bounce so user knows button registered */
    gsap.fromTo(btn,
      { scale: 0.88 },
      { scale: 1, duration: 0.3, ease: 'back.out(3)' }
    );

    if (!playing) startAudio();
    else          stopAudio();
  });

  /* ── Auto-pause when tab is hidden ── */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) {
      audio.pause();
    } else if (!document.hidden && playing) {
      audio.play().catch(() => {});
    }
  });
}

/* ════════════════════════════════════════════════════════════
   M.  GOLD BAR SHIMMER (landing section)
════════════════════════════════════════════════════════════ */
function initGoldBarsShimmer() {
  document.querySelectorAll('.gold-bar').forEach(bar => {
    gsap.to(bar, {
      backgroundPosition: '0 200%',
      duration: 3, repeat: -1, ease: 'sine.inOut', yoyo: true,
    });
  });
}

/* ════════════════════════════════════════════════════════════
   N.  DESKTOP CURSOR GLOW (skips touch devices)
════════════════════════════════════════════════════════════ */
function initCursorGlow() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const cursor = Object.assign(document.createElement('div'), {});
  cursor.style.cssText = `
    position:fixed; width:20px; height:20px; border-radius:50%;
    background:radial-gradient(circle, rgba(201,150,12,0.5) 0%, transparent 70%);
    pointer-events:none; z-index:99999;
    transform:translate(-50%,-50%); mix-blend-mode:screen;
  `;
  const ring = document.createElement('div');
  ring.style.cssText = `
    position:fixed; width:40px; height:40px; border-radius:50%;
    border:1px solid rgba(201,150,12,0.3);
    pointer-events:none; z-index:99998;
    transform:translate(-50%,-50%);
  `;
  document.body.appendChild(cursor);
  document.body.appendChild(ring);

  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    gsap.to(cursor, { x: mx, y: my, duration: 0.1, ease: 'none' });
  });
  gsap.ticker.add(() => {
    rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
    gsap.set(ring, { x: rx, y: ry });
  });
  document.querySelectorAll('a, button, input, select, label').forEach(el => {
    el.addEventListener('mouseenter', () =>
      gsap.to(ring, { width: 60, height: 60, borderColor: 'rgba(201,150,12,0.7)', duration: 0.3 }));
    el.addEventListener('mouseleave', () =>
      gsap.to(ring, { width: 40, height: 40, borderColor: 'rgba(201,150,12,0.3)', duration: 0.3 }));
  });
}

/* ════════════════════════════════════════════════════════════
   O.  HOVER MICRO-INTERACTIONS
════════════════════════════════════════════════════════════ */
function initHoverEffects() {
  document.querySelectorAll('.timeline-card-quote').forEach(el => {
    el.addEventListener('mouseenter', () => gsap.to(el, { y: -4, boxShadow: '0 10px 30px rgba(201,150,12,0.5)', duration: 0.3 }));
    el.addEventListener('mouseleave', () => gsap.to(el, { y:  0, boxShadow: '0  4px 15px rgba(201,150,12,0.3)', duration: 0.3 }));
  });

  document.querySelectorAll('.blessings-family').forEach(el => {
    el.addEventListener('mouseenter', () => gsap.to(el, { scale: 1.03, duration: 0.3, ease: 'power2.out' }));
    el.addEventListener('mouseleave', () => gsap.to(el, { scale: 1,    duration: 0.3, ease: 'power2.out' }));
  });

  /* Venue card — lift on hover */
  const venueCard = document.querySelector('.venue-card');
  if (venueCard) {
    venueCard.addEventListener('mouseenter', () =>
      gsap.to(venueCard, {
        y: -6,
        boxShadow: '0 18px 50px rgba(201,150,12,0.28), 0 4px 12px rgba(201,150,12,0.12)',
        duration: 0.35, ease: 'power2.out',
      })
    );
    venueCard.addEventListener('mouseleave', () =>
      gsap.to(venueCard, {
        y: 0,
        boxShadow: '0 8px 40px rgba(201,150,12,0.14), 0 2px 8px rgba(201,150,12,0.08)',
        duration: 0.35, ease: 'power2.out',
      })
    );
  }

  /* Map button — subtle pulse on hover (via CSS handles shimmer; GSAP adds glow) */
  const mapBtn = document.querySelector('.btn-view-map');
  if (mapBtn) {
    mapBtn.addEventListener('mouseenter', () =>
      gsap.to(mapBtn, { scale: 1.04, duration: 0.25, ease: 'power2.out' })
    );
    mapBtn.addEventListener('mouseleave', () =>
      gsap.to(mapBtn, { scale: 1,    duration: 0.25, ease: 'power2.out' })
    );
  }
}

/* ════════════════════════════════════════════════════════════
   P.  SCROLL PROGRESS BAR
════════════════════════════════════════════════════════════ */
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.style.cssText = `
    position:fixed; top:0; left:0; height:2px; width:0%;
    background:linear-gradient(to right, #d4a017, #f5c842);
    z-index:99999; pointer-events:none; transition:width 0.1s;
  `;
  document.body.appendChild(bar);
  window.addEventListener('scroll', () => {
    const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    bar.style.width = Math.min(pct * 100, 100) + '%';
  }, { passive: true });
}

/* ════════════════════════════════════════════════════════════
   Q.  SMOOTH ANCHOR SCROLL
════════════════════════════════════════════════════════════ */
function initSmoothScroll() {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) gsap.to(window, { scrollTo: { y: target }, duration: 1.2, ease: 'power3.inOut' });
  });
}

/* ════════════════════════════════════════════════════════════
   BOOTSTRAP — DOMContentLoaded
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initPetalCanvas();        /* A — canvas falling petals (always visible)  */
  createParticles();        /* B — floating gold dots                       */
  createHeroStars();        /* C — twinkling stars in hero section          */
  initCouplePetals();       /* D — pink petals in couple section            */
  initGoldBarsShimmer();    /* M — landing gold bar shimmer                 */
  initMusic();              /* L — music toggle                             */
  initCursorGlow();         /* N — desktop cursor glow                      */
  initHoverEffects();       /* O — hover micro-interactions                 */
  initRSVP();               /* J — RSVP form submit                         */
  initScrollProgress();     /* P — top scroll progress bar                  */
  initSmoothScroll();       /* Q — anchor smooth scroll                     */
  initLanding();            /* F — landing + curtain + invitation reveal    */
  /* NOTE: initAllSectionAnimations() is called INSIDE
     the curtain onComplete, AFTER wrapper is visible.        */
});
