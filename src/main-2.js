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

  /** Viewport **/
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
    MouseConstraint = Matter.MouseConstraint,
    Mouse = Matter.Mouse;

  // Engine & renderer
  var engine = Engine.create(),
    world = engine.world;

  var render = Render.create({
    engine: engine,
    element: matterController,
    options: {
      width: window.innerWidth,
      height: window.innerHeight,
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

  Render.run(render);

  var runner = Runner.create();
  Runner.run(runner, engine);

  // Walls / ground (hidden)
  var wallopts = {
    isStatic: true,
    restitution: 0.2,
    friction: 1,
    render: { visible: false },
  };
  var groundopts = {
    isStatic: true,
    restitution: 0,
    friction: 2,
    render: { visible: false },
  };

  var ground = Bodies.rectangle(
    window.innerWidth / 2,
    window.innerHeight + 50,
    window.innerWidth + 200,
    100,
    groundopts
  );
  var ceiling = Bodies.rectangle(
    window.innerWidth / 2,
    -500,
    window.innerWidth + 200,
    100,
    wallopts
  );
  var wallRight = Bodies.rectangle(
    window.innerWidth + 50,
    window.innerHeight / 2 - 250,
    100,
    window.innerHeight + 500,
    wallopts
  );
  var wallLeft = Bodies.rectangle(
    -50,
    window.innerHeight / 2 - 250,
    100,
    window.innerHeight + 500,
    wallopts
  );

  World.add(world, [ground, ceiling, wallRight, wallLeft]);

  // ---- Shapes only (circles / squares / triangles) ----
  function spawnWithDelay(body) {
    const delay = Math.random() * 500 + 200; // 200–700ms
    setTimeout(() => World.add(world, body), delay);
  }

  // var shapeFills = ["#B795FF", "#FD3846", "#68B83D", "#FFCB13"];
  var shapeFills = ["#342D41", "#431C1F", "#26361D", "#443915"];
  var circleCount = 12,
    squareCount = 12,
    triangleCount = 12;

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

  // Mouse drag (optional)
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

  // Reset world on toggle (prevent multiple bindings)
  function resetWorld() {
    World.remove(engine.world, ground);
    setTimeout(function () {
      World.clear(world);
      Engine.clear(engine);
      Render.stop(render);
      Runner.stop(runner);
      render.canvas.remove();
      render.canvas = null;
      render.context = null;
      render.textures = {};
      toggleProjectType();
      makeWorld();
    }, 2000);
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

// Sound bus that dedupes delays, rate-limits, and can interrupt
const SFXBus = (() => {
  const usingHowler = typeof Howl === "function";
  const pool = {}; // name -> Howl or HTMLAudioElement
  const lastPlayed = {}; // name -> timestamp
  const timers = {}; // name -> timeout id

  // Build players
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

    // Clear any pending delayed play
    if (timers[name]) {
      clearTimeout(timers[name]);
      timers[name] = null;
    }

    const trigger = () => {
      const now = Date.now();
      const last = lastPlayed[name] || 0;
      if (now - last < cooldown) return; // rate limit

      if (interrupt) stop(name); // stop overlapping
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
  SFXBus.play("hover", { cooldown: 50 }); // set interrupt:true if you want zero overlap
});

// ================== Clipboard ==================
// Email copy (with 1s cooldown + visual "is-cooling" state)
$(document).on("click", ".copy-email", function (e) {
  e.preventDefault();

  const $btn = $(this);
  if ($btn.data("cooling")) return; // still cooling down

  // start cooldown + visual state
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
      // end cooldown after 1s
      setTimeout(() => {
        $btn
          .data("cooling", false)
          .removeClass("is-cooling")
          .css("pointer-events", "");
      }, 1600);
    });
});
