// matter.js
function makeWorld() {
  // Ensure required containers exist (auto-create if missing)
  function ensureEl(id, parent = document.body) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      parent.appendChild(el);
    }
    return el;
  }

  const matterRoot = ensureEl("matter");
  const matterController = ensureEl("matter-controller", matterRoot);
  matterRoot.style.visibility = "visible";

  /** Viewport (full window) **/
  var VIEW = {};
  VIEW.width = window.innerWidth;
  VIEW.height = window.innerHeight;
  VIEW.centerX = VIEW.width / 2;
  VIEW.centerY = VIEW.height / 2;
  VIEW.offsetX = VIEW.width / 2;
  VIEW.offsetY = VIEW.height / 2;

  // Matter.js aliases
  var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    MouseConstraint = Matter.MouseConstraint,
    Mouse = Matter.Mouse,
    Query = Matter.Query,
    Events = Matter.Events;

  // Engine & renderer
  var engine = Engine.create(),
    world = engine.world;

  var render = Render.create({
    engine: engine,
    element: matterController,
    options: {
      width: VIEW.width,
      height: VIEW.height,
      background: "transparent",
      wireframeBackground: "transparent",
      hasBounds: false,
      enabled: true,
      wireframes: false,
      showSleeping: true,
      showDebug: false,
      showBroadphase: false,
      showBounds: false,
      showVelocity: false,
      showCollisions: false,
      showAxes: false,
      showPositions: false,
      showAngleIndicator: false,
      showIds: false,
      showShadows: false,
    },
  });

  // Fill the fixed controller
  render.canvas.style.width = "100%";
  render.canvas.style.height = "100%";

  Render.run(render);

  var runner = Runner.create();
  Runner.run(runner, engine);

  // ---- While dragging, disable pointer events on .main-content ----
  const MAIN_PE_TARGETS = Array.from(
    document.querySelectorAll(".main-content")
  );
  function setMainContentPE(disabled) {
    for (const el of MAIN_PE_TARGETS) {
      el.style.pointerEvents = disabled ? "none" : "auto";
    }
  }

  // ---------------- Segmented Floor (invisible; middle chamfer 20px) ----------------
  const SIDE_W = 76; // <-- per baseline: 76px side shelves
  const SHELF_H = 120; // shelf thickness (top edge aligned with window bottom)
  const MID_TOP_OFFSET = 72; // middle column top sits 72px above window bottom

  const staticBase = {
    isStatic: true,
    restitution: 0,
    friction: 1,
    render: { visible: false }, // invisible colliders
  };

  // Left shelf: TOP edge = window bottom -> centerY = VIEW.height + SHELF_H/2
  const leftFloor = Bodies.rectangle(
    SIDE_W / 2,
    VIEW.height + SHELF_H / 2,
    SIDE_W,
    SHELF_H,
    staticBase
  );

  // Right shelf: TOP edge = window bottom
  const rightFloor = Bodies.rectangle(
    VIEW.width - SIDE_W / 2,
    VIEW.height + SHELF_H / 2,
    SIDE_W,
    SHELF_H,
    staticBase
  );

  // Middle column (window-height; rounded; scrolls up then clamps at first .work-item top)
  const MID_W = Math.max(2, VIEW.width - 2 * SIDE_W);
  const MID_H = VIEW.height;

  // Anchor the middle segment's TOP to the first .work-item on load,
  // and clamp so it never goes above the top of the viewport (0).
  function getFirstWorkTopDoc() {
    const el = document.querySelector(".work-item");
    // If no .work-item, anchor the middle's top to the bottom edge of the window.
    if (!el) return window.scrollY + VIEW.height;
    const r = el.getBoundingClientRect();
    return r.top + window.scrollY; // viewport -> document coords
  }

  function middleCenterY() {
    // Desired TOP in viewport coords: (doc-anchored top) - scroll
    const desiredTopVP = getFirstWorkTopDoc() - window.scrollY;

    // Clamp so the middle's top never goes above the viewport top
    const clampedTopVP = Math.max(0, desiredTopVP);

    // Convert top -> center for Matter
    return clampedTopVP + MID_H / 2;
  }

  const midColumn = Bodies.rectangle(
    SIDE_W + MID_W / 2,
    middleCenterY(),
    MID_W,
    MID_H,
    {
      ...staticBase,
      chamfer: { radius: 20 }, // 20px rounded corners
    }
  );

  World.add(world, [leftFloor, rightFloor, midColumn]);

  // Scroll handler: shelves stay fixed; middle column follows scroll until its top hits clamp
  let scrolling = false;
  function updateMidColumn() {
    scrolling = false;
    Body.setPosition(midColumn, { x: SIDE_W + MID_W / 2, y: middleCenterY() });
  }
  function onScroll() {
    if (!scrolling) {
      scrolling = true;
      requestAnimationFrame(updateMidColumn);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  // ---------------- Walls & ceiling ----------------
  const wallopts = {
    isStatic: true,
    restitution: 0.2,
    friction: 1,
    render: { visible: false },
  };

  const ceiling = Bodies.rectangle(
    VIEW.width / 2,
    -500,
    VIEW.width + 200,
    100,
    wallopts
  );
  const wallRight = Bodies.rectangle(
    VIEW.width + 50,
    VIEW.height / 2 - 250,
    100,
    VIEW.height + 500,
    wallopts
  );
  const wallLeft = Bodies.rectangle(
    -50,
    VIEW.height / 2 - 250,
    100,
    VIEW.height + 500,
    wallopts
  );
  World.add(world, [ceiling, wallRight, wallLeft]);

  // ---- Hover color mapping ----
  const hoverMap = {
    "#342D41": "#B795FF",
    "#431C1F": "#FD3846",
    "#26361D": "#68B83D",
    "#443915": "#FFCB13",
  };

  // Proximity tuning (active only while dragging)
  const PROX_RADIUS = 100; // pixels around the dragged shape
  const MIN_BLUR = 10,
    MAX_BLUR = 44;
  const MIN_ALPHA = 0.06,
    MAX_ALPHA = 0.3;

  // Keep references & state
  const interactiveBodies = [];
  const hoveredSet = new Set(); // body.id currently hovered (pointer inside)
  let draggingBody = null; // body being dragged (or null)
  const proxFactor = new Map(); // body.id -> 0..1 (only while dragging)

  function approxRadius(body) {
    if (body.circleRadius) return body.circleRadius;
    let r = 0,
      cx = body.position.x,
      cy = body.position.y;
    const vs = body.vertices || [];
    for (let i = 0; i < vs.length; i++) {
      const dx = vs[i].x - cx,
        dy = vs[i].y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > r) r = d;
    }
    return r || 32;
  }

  function prepareInteractiveBody(body) {
    const base = (body.render && body.render.fillStyle) || null;
    const hover = base && hoverMap[base] ? hoverMap[base] : base;
    body.plugin = body.plugin || {};
    body.plugin.baseFill = base;
    body.plugin.hoverFill = hover;
    body.plugin.approxR = approxRadius(body);
    // ensure no stroke "glow"
    body.render.lineWidth = 0;
    body.render.strokeStyle = "transparent";
    interactiveBodies.push(body);
  }

  function setHoverState(body, hovering) {
    const base = body.plugin && body.plugin.baseFill;
    const hover = body.plugin && body.plugin.hoverFill;
    if (!base) return;
    body.render.fillStyle = hovering ? hover || base : base;
    if (hovering) hoveredSet.add(body.id);
    else hoveredSet.delete(body.id);
  }

  // ---- Shapes only (circles / squares / triangles) ----
  function spawnWithDelay(body) {
    const delay = Math.random() * 500 + 200; // 200–700ms
    prepareInteractiveBody(body);
    setTimeout(() => World.add(world, body), delay);
  }

  // Dark base fills
  var shapeFills = ["#342D41", "#431C1F", "#26361D", "#443915"];
  var circleCount = 16,
    squareCount = 16,
    triangleCount = 16;

  // Circles
  for (let i = 0; i < circleCount; i++) {
    const fill = shapeFills[i % shapeFills.length];
    const startX = VIEW.centerX + ((Math.random() - 0.5) * VIEW.width) / 1.5;
    const startY = -100 - Math.random() * 400;
    const circle = Bodies.circle(startX, startY, 32, {
      restitution: 0.8,
      friction: 0.6,
      angle: Math.random() * 2 - 1,
      render: { fillStyle: fill },
    });
    spawnWithDelay(circle);
  }

  // Squares
  for (let i = 0; i < squareCount; i++) {
    const fill = shapeFills[i % shapeFills.length];
    const startX = VIEW.centerX + ((Math.random() - 0.5) * VIEW.width) / 1.5;
    const startY = -100 - Math.random() * 400;
    const square = Bodies.rectangle(startX, startY, 64, 64, {
      restitution: 0.8,
      friction: 0.6,
      angle: Math.random() * 2 - 1,
      chamfer: { radius: 20 },
      render: { fillStyle: fill },
    });
    spawnWithDelay(square);
  }

  // Triangles
  for (let i = 0; i < triangleCount; i++) {
    const fill = shapeFills[i % shapeFills.length];
    const startX = VIEW.centerX + ((Math.random() - 0.5) * VIEW.width) / 1.5;
    const startY = -100 - Math.random() * 400;
    const tri = Bodies.polygon(startX, startY, 3, 42, {
      restitution: 0.8,
      friction: 0.6,
      angle: Math.random() * 2 - 1,
      chamfer: { radius: 12 },
      render: { fillStyle: fill },
    });
    spawnWithDelay(tri);
  }

  // Let page scrolling work even when cursor is over the canvas
  ["wheel", "mousewheel", "DOMMouseScroll"].forEach((type) => {
    render.canvas.addEventListener(
      type,
      (e) => {
        // stop Matter's wheel handler from grabbing it, but keep default scroll
        e.stopImmediatePropagation();
      },
      { capture: true, passive: true }
    );
  });

  // Mouse drag (attach to the canvas so coords align perfectly)
  var mouse = Mouse.create(render.canvas);
  var mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.1,
      angularStiffness: 0.5,
      render: { visible: false },
    },
  });
  World.add(engine.world, mouseConstraint);
  render.mouse = mouse;

  // ---- Fix "sticky drag" on fast mouse moves (global hard release) + disable main-content ----
  function hardRelease() {
    if (mouseConstraint.body) mouseConstraint.body = null;
    if (mouseConstraint.constraint) {
      mouseConstraint.constraint.bodyB = null;
      mouseConstraint.constraint.pointB = { x: 0, y: 0 };
      mouseConstraint.constraint.angleB = 0;
    }
    draggingBody = null;
    render.canvas.style.cursor = "default";
    setMainContentPE(false); // restore interactions
  }

  // Capture pointer so we get pointerup even if off-canvas
  render.canvas.addEventListener(
    "pointerdown",
    (e) => {
      try {
        e.target.setPointerCapture?.(e.pointerId);
      } catch (_) {}
    },
    { passive: true }
  );
  render.canvas.addEventListener("lostpointercapture", hardRelease);
  window.addEventListener("pointerup", hardRelease, { passive: true });
  window.addEventListener("pointercancel", hardRelease, { passive: true });
  window.addEventListener("mouseup", hardRelease, { passive: true });
  window.addEventListener("blur", hardRelease, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") hardRelease();
  });
  window.addEventListener("touchend", hardRelease, { passive: true });
  window.addEventListener("touchcancel", hardRelease, { passive: true });

  // ---- Cursor + hover/proximity logic ----
  Events.on(engine, "afterUpdate", function () {
    const pos = mouse && mouse.position;
    if (!pos) return;

    // true "hover" (cursor inside shape path)
    const hits = Query.point(interactiveBodies, pos);
    const hitIds = new Set(hits.map((b) => b.id));

    hoveredSet.clear();
    let hoveringAny = false;

    for (const b of interactiveBodies) {
      const hovering = hitIds.has(b.id);
      if (hovering) hoveringAny = true;
      setHoverState(b, hovering);
    }

    // Proximity only when dragging
    proxFactor.clear();
    if (draggingBody) {
      const src = draggingBody;
      const srcR = src.plugin.approxR || 32;
      for (const b of interactiveBodies) {
        // dragged body: full power
        if (b.id === src.id) {
          proxFactor.set(b.id, 1);
          continue;
        }
        // others: based on distance from centers (rough, but fast)
        const dx = b.position.x - src.position.x;
        const dy = b.position.y - src.position.y;
        const dist =
          Math.sqrt(dx * dx + dy * dy) - (b.plugin.approxR || 0) - srcR;
        if (dist < PROX_RADIUS) {
          const f = 1 - Math.max(0, dist) / PROX_RADIUS; // 0..1
          proxFactor.set(b.id, Math.max(0, Math.min(1, f)));
        }
      }
    }

    // Cursor when hovering any shape (unless actively dragging)
    if (!mouseConstraint.body) {
      render.canvas.style.cursor = hoveringAny ? "grab" : "default";
    }
  });

  Events.on(mouseConstraint, "startdrag", function (e) {
    draggingBody = e.body || null;
    render.canvas.style.cursor = "grabbing";
    setMainContentPE(true); // disable interactions behind the canvas while dragging
  });

  Events.on(mouseConstraint, "enddrag", function () {
    draggingBody = null;
    // after drag, if still hovering, keep grab; else default
    const pos = mouse && mouse.position;
    if (!pos) {
      render.canvas.style.cursor = "default";
    } else {
      const hits = Query.point(interactiveBodies, pos);
      render.canvas.style.cursor = hits.length ? "grab" : "default";
    }
    setMainContentPE(false); // re-enable interactions
  });

  // ---- Glow pass (drawn after normal render) ----
  function drawBodyPath(ctx, body) {
    ctx.beginPath();
    if (body.circleRadius) {
      ctx.arc(
        body.position.x,
        body.position.y,
        body.circleRadius,
        0,
        Math.PI * 2
      );
    } else {
      const verts = body.vertices;
      if (!verts || !verts.length) return;
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
      ctx.closePath();
    }
  }

  Events.on(render, "afterRender", function () {
    const ctx = render.context;
    if (!ctx) return;

    Render.startViewTransform(render);

    if (draggingBody) {
      // Power transfer mode: dragged body + nearby bodies get glow scaled by proxFactor
      for (const b of interactiveBodies) {
        const f = proxFactor.get(b.id) || 0;
        if (f <= 0) continue;
        const hoverColor = b.plugin && b.plugin.hoverFill;
        if (!hoverColor) continue;

        const blur = MIN_BLUR + (MAX_BLUR - MIN_BLUR) * f;
        const alpha = MIN_ALPHA + (MAX_ALPHA - MIN_ALPHA) * f;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = hoverColor;
        ctx.shadowBlur = blur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = hoverColor;

        drawBodyPath(ctx, b);
        ctx.fill();
        ctx.restore();
      }
    } else {
      // Hover-only mode: ONLY hovered shapes glow (no proximity)
      for (const b of interactiveBodies) {
        if (!hoveredSet.has(b.id)) continue;
        const hoverColor = b.plugin && b.plugin.hoverFill;
        if (!hoverColor) continue;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = hoverColor;
        ctx.shadowBlur = 36;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.globalAlpha = 0.22; // subtle but visible
        ctx.fillStyle = hoverColor;

        drawBodyPath(ctx, b);
        ctx.fill();
        ctx.restore();
      }
    }

    Render.endViewTransform(render);
  });

  // Reset world on toggle (prevent multiple bindings)
  function resetWorld() {
    window.removeEventListener("scroll", onScroll);
    setMainContentPE(false); // safety restore
    World.clear(world);
    Engine.clear(engine);
    Render.stop(render);
    Runner.stop(runner);
    if (render.canvas && render.canvas.parentNode) {
      render.canvas.parentNode.removeChild(render.canvas);
    }
    render.canvas = null;
    render.context = null;
    render.textures = {};
    toggleProjectType();
    makeWorld();
  }

  $(".project-toggle")
    .off("click.world")
    .on("click.world", function (e) {
      e.preventDefault();
      resetWorld();
      console.log("clicked");
    });
}

// ---- Utilities ----
function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this,
      args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    }, wait);
    if (immediate && !timeout) func.apply(context, args);
  };
}

var refreshWorld = debounce(function () {
  location.reload();
}, 500);
window.addEventListener("resize", refreshWorld);

// Toggling Projects
var currentProjectType = "professional";
var personal = $(".personal").parents(".matter-body");
var professional = $(".professional").parents(".matter-body");
var isHidden = "is--hidden";

function toggleProjectType() {
  if (currentProjectType === "personal") {
    currentProjectType = "professional";
    personal.addClass(isHidden);
    professional.removeClass(isHidden);
  } else {
    currentProjectType = "personal";
    personal.removeClass(isHidden);
    professional.addClass(isHidden);
  }
  console.log(currentProjectType);
}

// Initialize world
$(document).ready(function () {
  personal.addClass(isHidden);
  makeWorld();
});

// ================== SFX (Howler with rate limiting) ==================
const sounds = {
  expand: "https://zi1efx.csb.app/src/files/Expand.m4a",
  collapse: "https://zi1efx.csb.app/src/files/Collapse.m4a",
  hover: "https://zi1efx.csb.app/src/files/Hover.m4a",
  click: "https://zi1efx.csb.app/src/files/Click.m4a",
  copy: "https://zi1efx.csb.app/src/files/Copy.m4a",
};

const SFXBus = (() => {
  const usingHowler = typeof Howl === "function";
  const pool = {};
  const lastPlayed = {};
  const timers = {};

  Object.keys(sounds).forEach((name) => {
    if (usingHowler) {
      pool[name] = new Howl({ src: [sounds[name]], volume: 1 });
    } else {
      const a = new Audio(sounds[name]);
      a.preload = "auto";
      pool[name] = a;
    }
  });

  const defaults = { delay: 0, cooldown: 120, interrupt: false };

  function stop(name) {
    if (timers[name]) {
      clearTimeout(timers[name]);
      timers[name] = null;
    }
    const p = pool[name];
    if (!p) return;
    if (usingHowler) p.stop();
    else {
      p.pause();
      p.currentTime = 0;
    }
  }

  function play(name, opts = {}) {
    const { delay, cooldown, interrupt } = { ...defaults, ...opts };
    const p = pool[name];
    if (!p) return;

    if (timers[name]) {
      clearTimeout(timers[name]);
      timers[name] = null;
    }

    const trigger = () => {
      const now = Date.now();
      const last = lastPlayed[name] || 0;
      if (now - last < cooldown) return;
      if (interrupt) stop(name);
      if (usingHowler) p.play();
      else {
        p.currentTime = 0;
        p.play();
      }
      lastPlayed[name] = now;
    };

    if (delay > 0) timers[name] = setTimeout(trigger, delay);
    else trigger();
  }

  return { play, stop };
})();

// Bindings
$(document).on("mousedown", ".opens-modal", function (e) {
  e.preventDefault();
  SFXBus.play("expand", { delay: 500, cooldown: 250, interrupt: true });
});

$(document).on("click", ".modal__scrim", function () {
  SFXBus.play("collapse", { delay: 300, cooldown: 250, interrupt: true });
});

$(document).on("mousedown", ".external-link", function (e) {
  e.preventDefault();
  SFXBus.play("click", { cooldown: 120, interrupt: true });
});

$(document).on("click", ".copy-email", function () {
  SFXBus.play("copy", { delay: 300, cooldown: 250, interrupt: true });
});

// pointerenter avoids repeat firing on child nodes vs mouseenter
$(document).on("pointerenter", "a, .hover-sound", function () {
  SFXBus.play("hover", { cooldown: 50 });
});

// ================== Clipboard ==================
$(document).on("click", ".copy-email", function (e) {
  e.preventDefault();

  const $btn = $(this);
  if ($btn.data("cooling")) return;

  $btn
    .data("cooling", true)
    .addClass("is-cooling")
    .css("pointer-events", "none");

  const email = $btn.data("email");

  (navigator.clipboard && navigator.clipboard.writeText
    ? navigator.clipboard.writeText(email)
    : Promise.reject(new Error("Clipboard API not available"))
  )
    .catch((err) => {
      console.error("Failed to copy:", err);
    })
    .finally(() => {
      setTimeout(() => {
        $btn
          .data("cooling", false)
          .removeClass("is-cooling")
          .css("pointer-events", "");
      }, 1600);
    });
});

// ================== Work-item vertical offsets (relative to first's top) ==================
(function () {
  const items = Array.from(document.querySelectorAll(".work-item"));
  if (items.length === 0) return;

  // Read first item's computed top (in px). If 'auto', treat as 0.
  const firstCS = getComputedStyle(items[0]);
  const baseTop = Number.isNaN(parseFloat(firstCS.top))
    ? 0
    : parseFloat(firstCS.top);

  // Ensure the first is positioned so 'top' applies; keep its original top.
  if (firstCS.position === "static") {
    items[0].style.position = "relative";
  }

  // Apply offsets to subsequent items: baseTop + i*8px
  for (let i = 1; i < items.length; i++) {
    const el = items[i];
    const cs = getComputedStyle(el);
    if (cs.position === "static") el.style.position = "relative";
    el.style.top = baseTop + i * 8 + "px";
  }
})();

// ================== Fathom event tracking (simple) ==================
(function () {
  const ATTR_EVENT = "fathom-event";
  const ATTR_PROPS = "fathom-event-props";

  // Pick the available Fathom API (v2 function or legacy callable)
  function getTrackFn() {
    if (window.fathom?.trackEvent)
      return (t, p) => window.fathom.trackEvent(t, p);
    if (typeof window.fathom === "function")
      return (t, p) => window.fathom("trackEvent", t, p);
    return null;
  }

  document.addEventListener(
    "click",
    (e) => {
      const el = e.target.closest(`[${ATTR_EVENT}]`);
      if (!el) return;

      const title = el.getAttribute(ATTR_EVENT);
      if (!title) return;

      let props;
      const raw = el.getAttribute(ATTR_PROPS);
      if (raw) {
        try {
          props = JSON.parse(raw);
        } catch (_) {}
      }

      const track = getTrackFn();
      if (track) track(title, props); // silently no-op if Fathom isn't ready
    },
    { capture: true }
  );
})();
