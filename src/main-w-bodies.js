// matter.js
function makeWorld() {
  // Should reappear
  document.getElementById("matter").style.visibility = "visible";

  /** Set up relative positions and scales **/
  var VIEW = {};
  VIEW.width = window.innerWidth;
  VIEW.height = window.innerHeight;
  VIEW.centerX = VIEW.width / 2;
  VIEW.centerY = VIEW.height / 2;
  VIEW.offsetX = VIEW.width / 2;
  VIEW.offsetY = VIEW.height / 2;

  // Matter.js module aliases
  var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Common = Matter.Common,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Events = Matter.Events,
    Query = Matter.Query,
    MouseConstraint = Matter.MouseConstraint,
    Mouse = Matter.Mouse;

  // create engine
  var engine = Engine.create(),
    world = engine.world;

  // create renderer
  var render = Render.create({
    engine: engine,
    element: document.getElementById("matter-controller"),
    options: {
      width: window.innerWidth,
      height: window.innerHeight,
      background: "transparent", // transparent to hide
      wireframeBackground: "transparent", // transparent to hide
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

  // Disable to hide debug
  Render.run(render);

  // create runner
  var runner = Runner.create();
  Runner.run(runner, engine);

  var ceiling, wallLeft, wallRight, ground;

  // add walls
  var wallopts = {
    isStatic: true,
    restitution: 0.2,
    friction: 1,
    render: {
      fillStyle: fill,
    },
  };

  var groundopts = {
    isStatic: true,
    restitution: 0,
    friction: 2,
  };

  World.add(world, [
    // ground
    (ground = Bodies.rectangle(
      window.innerWidth / 2,
      window.innerHeight + 50,
      window.innerWidth + 200,
      100,
      groundopts
    )),
    // walls
    (ceiling = Bodies.rectangle(
      window.innerWidth / 2,
      -500,
      window.innerWidth + 200,
      100,
      wallopts
    )), // top
    (wallRight = Bodies.rectangle(
      window.innerWidth + 50,
      window.innerHeight / 2 - 250,
      100,
      window.innerHeight + 500,
      wallopts
    )), // right
    (wallLeft = Bodies.rectangle(
      -50,
      window.innerHeight / 2 - 250,
      100,
      window.innerHeight + 500,
      wallopts
    )), // left
  ]);

  var bodiesDom = document.querySelectorAll(".matter-body");
  var bodies = [];
  var shapes = [];

  var fills = ["#B795FF", "#FD3846", "#68B83D", "#FFCB13"];
  var fill;

  function spawnBodyWithDelay(body) {
    // const delay = Math.random() * 400 + 200; // between 200–600ms
    const delay = 800;
    setTimeout(() => World.add(world, body), delay);
  }

  for (let i = 0, l = bodiesDom.length; i < l; i++) {
    // pick your fill just like before, even if it's transparent
    let fill =
      i < fills.length
        ? fills[i]
        : fills[Math.floor(Math.random() * fills.length)];

    // randomize their spawn position a bit
    const startX =
      VIEW.centerX + (Math.random() * VIEW.width) / 2 - VIEW.width / 4;
    const startY = -100 - Math.random() * 400; // anywhere from –100 to –500

    const w = (VIEW.width * bodiesDom[i].offsetWidth) / window.innerWidth;
    const h = (VIEW.height * bodiesDom[i].offsetHeight) / window.innerHeight;

    const body = Bodies.rectangle(startX, startY, w, h, {
      restitution: 0.8,
      friction: 0.6,
      chamfer: { radius: 20 },
      // angle: Math.random() * 2 - 1,
      angle: 0,
      render: { fillStyle: "rgba(0,0,0,0)" },
    });

    bodiesDom[i].id = body.id;
    bodies.push(body);

    // ← stagger their insertion into the world
    spawnBodyWithDelay(body);
  }

  function spawnWithDelay(body) {
    const delay = Math.random() * 500 + 200; // 200–700ms
    setTimeout(() => World.add(world, body), delay);
  }

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

  // World.add(engine.world, bodies); // spawn projects
  // World.add(engine.world, shapes); // spawn shapes

  // Add mouse control
  var mouse = Mouse.create(render.canvas),
    mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.1,
        angularStiffness: 0.5,
        render: { visible: false },
      },
    });

  World.add(engine.world, mouseConstraint);

  // keep the mouse in sync with rendering
  render.mouse = mouse;

  var mouseX, mouseY, mouseXO, mouseYO, mouseXN, mouseYN;

  // Hover
  Events.on(mouseConstraint, "mousemove", function (e) {
    mouseX = e.mouse.absolute.x;
    mouseY = e.mouse.absolute.y;

    if (Query.point(bodies, { x: mouseX, y: mouseY }).length) {
      // remove exitsing hovers
      removeHovers();

      // apply new hover
      var underMouse = Query.point(bodies, { x: mouseX, y: mouseY })[0].id;
      document.getElementById(underMouse).className += " hover";
      document.body.style.cursor = "pointer";
    } else {
      removeHovers();
    }
  });

  function removeHovers() {
    var hovered = document.getElementsByClassName("hover");
    for (var i = 0; i < hovered.length; i++) {
      hovered[i].classList.remove("hover");
    }
    document.body.style.cursor = "auto";
  }

  // Press (1)
  Events.on(mouseConstraint, "mousedown", function (e) {
    mouseXO = e.mouse.absolute.x;
    mouseYO = e.mouse.absolute.y;
    $(".page-wrapper").css("pointer-events", "none");
  });

  // Press (2), part 1 and 2 checks is not end of drag
  Events.on(mouseConstraint, "mouseup", function (e) {
    mouseXN = e.mouse.absolute.x;
    mouseYN = e.mouse.absolute.y;
    $(".page-wrapper").css("pointer-events", "auto");

    if (mouseXO == mouseXN && mouseYO == mouseYN) {
      if (Query.point(bodies, { x: mouseXN, y: mouseYN }).length) {
        var underMouse = Query.point(bodies, { x: mouseXN, y: mouseYN })[0].id;
      }
      // if (underMouse) {
      //   // go to URL
      //   window.location.href = document
      //     .getElementById(underMouse)
      //     .getAttribute("data-url");
      // }
    }

    removeHovers();
  });

  window.requestAnimationFrame(update);

  function update() {
    // strips
    for (var i = 0, l = bodiesDom.length; i < l; i++) {
      var bodyDom = bodiesDom[i];
      var body = null;

      for (var j = 0, k = bodies.length; j < k; j++) {
        if (bodies[j].id == bodyDom.id) {
          body = bodies[j];
          break;
        }
      }

      if (body === null) continue;

      bodyDom.style.transform =
        "translate( " +
        (body.position.x - bodyDom.offsetWidth / 2) +
        "px, " +
        (body.position.y - bodyDom.offsetHeight / 2) +
        "px )";
      bodyDom.style.transform += "rotate( " + body.angle + "rad )";
      bodyDom.style.opacity = 1;
    }

    window.requestAnimationFrame(update);
  }

  function resetWorld() {
    World.remove(engine.world, ground);

    setTimeout(function () {
      // location.reload();
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

  $(".project-toggle").on("click", function (e) {
    e.preventDefault();
    resetWorld();
    console.log("clicked");
  });
}

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
$(document).on("click", ".copy-email", function () {
  const email = $(this).data("email");
  navigator.clipboard.writeText(email).catch((err) => {
    console.error("Failed to copy:", err);
  });
});
