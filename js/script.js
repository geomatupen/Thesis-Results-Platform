const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("#site-nav");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

initTabs(document);
initImageCompare(document);
initChartSwitches(document);
initOutputCards(document);
initGaussianFacts(document);
initThesisTopbar();
initThesisMobileNav();
initHeroScrollCue();

function initThesisTopbar() {
  const topbar = document.querySelector(".thesis-topbar");
  if (!topbar) return;

  const updateTopbar = () => {
    topbar.classList.toggle("is-scrolled", window.scrollY > 80);
  };

  window.addEventListener("scroll", updateTopbar, { passive: true });
  updateTopbar();
}

function initThesisMobileNav() {
  const toggle = document.querySelector(".thesis-nav-toggle");
  const nav = document.querySelector(".thesis-topnav");
  if (!toggle || !nav) return;

  const icon = toggle.querySelector("i");

  const setOpen = (isOpen) => {
    nav.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");

    if (icon) {
      icon.classList.toggle("fa-bars", !isOpen);
      icon.classList.toggle("fa-xmark", isOpen);
    }
  };

  toggle.addEventListener("click", () => {
    setOpen(!nav.classList.contains("is-open"));
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      setOpen(false);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
      setOpen(false);
    }
  });
}

function initHeroScrollCue() {
  const hero = document.querySelector(".story-hero");
  const cue = document.querySelector(".hero-scroll-cue");
  const topLink = document.querySelector(".footer-top-link");
  if (!hero || !cue) return;

  const setVisible = (visible) => {
    cue.classList.toggle("is-visible", visible);
    cue.setAttribute("aria-hidden", String(!visible));
    cue.tabIndex = visible ? 0 : -1;

    if (topLink) {
      topLink.classList.toggle("is-visible", !visible);
      topLink.setAttribute("aria-hidden", String(visible));
      topLink.tabIndex = visible ? -1 : 0;
    }
  };

  const updateByViewport = () => {
    const rect = hero.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
    const visibleRatio = Math.max(0, visibleHeight) / Math.max(rect.height, 1);
    setVisible(visibleRatio >= 0.8);
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.intersectionRatio >= 0.8),
      { threshold: [0, 0.8, 1] },
    );
    observer.observe(hero);
  } else {
    window.addEventListener("scroll", updateByViewport, { passive: true });
    window.addEventListener("resize", updateByViewport);
    updateByViewport();
  }
}

function initGaussianFacts(root) {
  const panel = root.querySelector("[data-gaussian-facts]");
  if (!panel) return;

  const heading = panel.querySelector("[data-gaussian-fact-heading]");
  const text = panel.querySelector("[data-gaussian-fact-text]");
  const previous = panel.querySelector("[data-gaussian-fact-prev]");
  const next = panel.querySelector("[data-gaussian-fact-next]");
  if (!heading || !text || !previous || !next) return;

  const facts = [
    {
      heading: "Drone images to 3D scene",
      text: "Drone images are first processed to estimate camera positions and sparse scene structure. These outputs provide the starting point for 3DGS training."
    },
    {
      heading: "Scene as Gaussians",
      text: "3DGS represents the scene using many small 3D Gaussians. These Gaussians are adjusted during training to reproduce the input views."
    },
    {
      heading: "What is learned",
      text: "Each Gaussian has position, scale, rotation, opacity, and color-related information. These values change during optimization."
    },
    {
      heading: "Why settings matter",
      text: "Training settings control how quickly Gaussians move, how their appearance changes, and when new Gaussians are added or removed."
    },
    {
      heading: "Why defaults are not always enough",
      text: "Default 3DGS settings are useful starting values, but drone-image projects are not all the same. They can differ in overlap, viewing angle, texture, vegetation, terrain, image detail, and acquisition pattern. Because of these differences, the same settings may not give equally good results for every reconstruction."
    },
    {
      heading: "Thesis idea",
      text: "This thesis tests whether previous drone-image reconstruction experiments can help choose better starting settings for new projects. Project descriptors are used to summarize project conditions, and Ridge Regression and MLP scoring models are trained to score candidate multiplier settings before the final 3DGS test run."
    },
    {
      heading: "Recommendation note",
      text: "The recommended multipliers are informed starting values for quality-oriented reconstruction. They are not guaranteed optimal settings, and they do not necessarily reduce runtime or the number of Gaussians."
    },
    {
      heading: "This visual on the right",
      text: "The home visual is an illustrative Gaussian-style point display made from a photograph. It is used to suggest Gaussian behaviour, but it is not a real 3DGS reconstruction or trained splat."
    }
  ];
  const rotationDelayMs = 7800;
  let index = 0;
  let timer = window.setInterval(showNextFact, rotationDelayMs);

  const showFact = () => {
    heading.textContent = facts[index].heading;
    text.textContent = facts[index].text;
  };

  function stopTimer() {
    window.clearInterval(timer);
  }

  function showPreviousFact() {
    index = (index - 1 + facts.length) % facts.length;
    showFact();
  }

  function showNextFact() {
    index = (index + 1) % facts.length;
    showFact();
  }

  previous.addEventListener("click", () => {
    stopTimer();
    showPreviousFact();
  });

  next.addEventListener("click", () => {
    stopTimer();
    showNextFact();
  });
}

function initTabs(root) {
  root.querySelectorAll("[data-tabs]").forEach((tabs) => {
    if (tabs.dataset.tabsReady === "true") return;
    tabs.dataset.tabsReady = "true";

    const buttons = tabs.querySelectorAll("[data-tab]");
    const panels = tabs.querySelectorAll("[data-panel]");

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.getAttribute("data-tab");

        buttons.forEach((item) => {
          const isActive = item === button;
          item.classList.toggle("is-active", isActive);
          if (item.hasAttribute("aria-selected")) item.setAttribute("aria-selected", String(isActive));
        });
        panels.forEach((panel) => {
          panel.classList.toggle("is-active", panel.getAttribute("data-panel") === target);
        });
      });
    });
  });
}

function initImageCompare(root) {
  root.querySelectorAll(".image-compare").forEach((compare) => {
    if (compare.dataset.compareReady === "true") return;
    compare.dataset.compareReady = "true";

    const slider = compare.querySelector("input[type='range']");
    if (!(slider instanceof HTMLInputElement)) return;

    const update = () => {
      compare.style.setProperty("--split", `${slider.value}%`);
    };

    slider.addEventListener("input", update);
    update();
  });
}

function initChartSwitches(root) {
  root.querySelectorAll("[data-chart-switch]").forEach((switcher) => {
    if (switcher.dataset.chartSwitchReady === "true") return;
    switcher.dataset.chartSwitchReady = "true";

    const buttons = switcher.querySelectorAll("[data-chart-target]");
    const panels = switcher.querySelectorAll("[data-chart-panel]");

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.getAttribute("data-chart-target");

        buttons.forEach((item) => item.classList.toggle("is-active", item === button));
        panels.forEach((panel) => {
          panel.classList.toggle("is-active", panel.getAttribute("data-chart-panel") === target);
        });
      });
    });
  });
}

const modal = document.querySelector("#figure-modal");
const modalImage = modal?.querySelector("img");
const modalCaption = modal?.querySelector("figcaption");
const modalClose = modal?.querySelector(".modal-close");
const modalActions = modal?.querySelector(".figure-modal-actions");
const modalOpenLink = modal?.querySelector(".figure-modal-open");
const modalDownloadLink = modal?.querySelector(".figure-modal-download");
const detailModal = document.querySelector("#detail-modal");
const detailModalContent = detailModal?.querySelector(".detail-modal-content");
const homeThemeButtons = document.querySelectorAll("[data-home-theme]");
const siteThemeButtons = document.querySelectorAll("[data-site-theme]");
const allowedThemes = new Set(["cloud", "dark"]);

applyStoredTheme();

document.querySelectorAll("[data-modal-src]").forEach((button) => {
  bindFigureModal(button);
});

function bindFigureModal(button) {
  button.addEventListener("click", () => openFigureModal(button));
}

function openFigureModal(button) {
  if (!modal || !modalImage || !modalCaption) return;

  const image = button.querySelector("img");
  const src = button.getAttribute("data-modal-src") || image?.getAttribute("src") || "";
  const title = button.getAttribute("data-modal-title") || image?.getAttribute("alt") || "Expanded figure";

  openFigureSource(src, title);
}

function openFigureSource(src, title, options = {}) {
  if (!modal || !modalImage || !modalCaption || !src) return;

  modalImage.setAttribute("src", src);
  modalImage.setAttribute("alt", title);
  modalCaption.textContent = title;

  if (modalActions && modalOpenLink && modalDownloadLink) {
    const showActions = Boolean(options.showActions);
    modalActions.hidden = !showActions;
    modalOpenLink.href = src;
    modalDownloadLink.href = src;
    modalDownloadLink.download = options.downloadName || "";
  }

  if (typeof modal.showModal === "function") {
    modal.showModal();
  }
}

function openDetailTemplate(target) {
  if (!detailModal || !detailModalContent || !target) return;

  const template = document.querySelector(`#${CSS.escape(target)}`);
  if (!(template instanceof HTMLTemplateElement)) return;

  detailModalContent.replaceChildren(template.content.cloneNode(true));
  detailModalContent.querySelectorAll("[data-modal-src]").forEach(bindFigureModal);
  initTabs(detailModalContent);
  initImageCompare(detailModalContent);
  initChartSwitches(detailModalContent);
  initOutputCards(detailModalContent);

  if (typeof detailModal.showModal === "function") {
    detailModal.showModal();
  }
}

function initOutputCards(root) {
  root.querySelectorAll("[data-output-preview], .output-card-clickable[data-detail-target]").forEach((card) => {
    if (card.dataset.outputCardReady === "true") return;
    card.dataset.outputCardReady = "true";

    const openCard = (event) => {
      const interactive = event.target?.closest?.("a, button, input, textarea, select, summary");
      if (interactive) return;

      const src = card.getAttribute("data-output-preview");
      const title = card.getAttribute("data-output-title") || card.querySelector("h3")?.textContent || "Output preview";
      const detailTarget = card.getAttribute("data-detail-target");

      if (src) {
        openFigureSource(src, title, {
          showActions: card.getAttribute("data-output-actions") === "true",
          downloadName: card.getAttribute("data-output-download") || "",
        });
      } else if (detailTarget) {
        openDetailTemplate(detailTarget);
      }
    };

    card.addEventListener("click", openCard);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCard(event);
      }
    });
  });
}

modalClose?.addEventListener("click", () => modal?.close());
detailModal?.querySelector(".modal-close")?.addEventListener("click", () => detailModal.close());

document.querySelectorAll("button[data-detail-target], a[data-detail-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.getAttribute("data-detail-target") || "";
    openDetailTemplate(target);
  });
});

modal?.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.close();
  }
});

detailModal?.addEventListener("click", (event) => {
  if (event.target === detailModal) {
    detailModal.close();
  }
});

homeThemeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const theme = button.getAttribute("data-home-theme") || "cloud";
    setTheme(theme);
    suppressThemeTooltip(button);
    button.blur();
  });
});

siteThemeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const theme = button.getAttribute("data-site-theme") || "cloud";
    setTheme(theme);
    suppressThemeTooltip(button);
    button.blur();
  });
});

[...homeThemeButtons, ...siteThemeButtons].forEach((button) => {
  button.addEventListener("mouseleave", () => {
    button.classList.remove("theme-tooltip-suppressed");
  });
});

function suppressThemeTooltip(button) {
  button.classList.add("theme-tooltip-suppressed");
}

function applyStoredTheme() {
  let storedTheme = "";
  let manualTheme = "";
  let sessionTheme = "";
  let lastHomeTheme = "";
  try {
    storedTheme = localStorage.getItem("thesis-theme") || "";
    manualTheme = localStorage.getItem("thesis-theme-manual") || "";
    sessionTheme = sessionStorage.getItem("thesis-session-theme") || "";
    lastHomeTheme = sessionStorage.getItem("thesis-last-home-theme") || "";
  } catch (error) {
    storedTheme = "";
    manualTheme = "";
    sessionTheme = "";
    lastHomeTheme = "";
  }

  if (document.body.classList.contains("portal-page")) {
    const navType = getNavigationType();
    const shouldRandomize = navType === "reload" || !allowedThemes.has(sessionTheme);
    const randomTheme = allowedThemes.has(lastHomeTheme)
      ? (lastHomeTheme === "cloud" ? "dark" : "cloud")
      : pickRandomTheme();
    const nextTheme = shouldRandomize
      ? randomTheme
      : (allowedThemes.has(sessionTheme) ? sessionTheme : storedTheme);

    try {
      sessionStorage.setItem("thesis-session-theme", nextTheme);
      if (shouldRandomize) {
        sessionStorage.setItem("thesis-last-home-theme", nextTheme);
      }
    } catch (error) {
      // Session persistence is optional; the selected theme still applies.
    }

    setTheme(nextTheme, false);
    return;
  }

  if (manualTheme === "true" && allowedThemes.has(storedTheme)) {
    setTheme(storedTheme, false);
    return;
  }

  setTheme(allowedThemes.has(sessionTheme) ? sessionTheme : (allowedThemes.has(storedTheme) ? storedTheme : "cloud"), false);
}

function getNavigationType() {
  const navEntries = performance.getEntriesByType?.("navigation") || [];
  return navEntries[0]?.type || "";
}

function pickRandomTheme() {
  try {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % 2 === 0 ? "cloud" : "dark";
  } catch (error) {
    return Math.random() < 0.5 ? "cloud" : "dark";
  }
}

function setTheme(theme, persist = true) {
  const nextTheme = allowedThemes.has(theme) ? theme : "cloud";
  if (document.body.classList.contains("portal-page")) {
    document.body.setAttribute("data-home-theme", nextTheme);
  }
  if (document.body.hasAttribute("data-site-theme")) {
    document.body.setAttribute("data-site-theme", nextTheme);
  }
  if (persist) {
    try {
      localStorage.setItem("thesis-theme", nextTheme);
      localStorage.setItem("thesis-theme-manual", "true");
      sessionStorage.setItem("thesis-session-theme", nextTheme);
    } catch (error) {
      // Theme persistence is optional; the current page still updates.
    }
  }
  updateThemeButtons(homeThemeButtons, nextTheme, "data-home-theme");
  updateThemeButtons(siteThemeButtons, nextTheme, "data-site-theme");
}

function updateThemeButtons(buttons, activeTheme, attributeName) {
  buttons.forEach((item) => {
    const isActive = item.getAttribute(attributeName) === activeTheme;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal?.open) {
    modal.close();
  }
  if (event.key === "Escape" && detailModal?.open) {
    detailModal.close();
  }
});

const portraitCanvas = document.querySelector("#home-canvas, #portrait-canvas");

if (portraitCanvas instanceof HTMLCanvasElement) {
  initGaussianPortrait(portraitCanvas);
}

function initGaussianPortrait(canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const photoSrc = canvas.getAttribute("data-photo-src");
  if (!photoSrc) return;

  const image = new Image();
  image.src = photoSrc;

  const state = {
    width: 0,
    height: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    points: [],
    zoom: 0.42,
    targetZoom: 0.42,
    minZoom: 0.28,
    pointerX: 0,
    pointerY: 0,
    drift: 0,
    hasWheelZoomed: false,
    firstWheelLockUntil: 0,
    firstWheelTarget: 0.68,
  };

  const zoomButton = document.querySelector("#portal-zoom");
  const portal = canvas.closest(".gaussian-portal") || canvas;

  image.addEventListener("load", () => {
    buildPoints();
    resize();
    requestAnimationFrame(draw);
  });

  window.addEventListener("resize", () => {
    resize();
    buildPoints();
  });

  portal.addEventListener("wheel", (event) => {
    event.preventDefault();
    const now = performance.now();
    if (!state.hasWheelZoomed) {
      state.hasWheelZoomed = true;
      state.firstWheelLockUntil = now + 1200;
      state.targetZoom = Math.max(state.targetZoom, state.firstWheelTarget);
    } else if (now < state.firstWheelLockUntil) {
      return;
    } else {
      state.targetZoom = clamp(state.targetZoom + (event.deltaY < 0 ? 0.11 : -0.11), state.minZoom, 1);
    }
    updateNodeVisibility();
  }, { passive: false });

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    state.pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    state.pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  const toggleZoom = () => {
    state.targetZoom = state.targetZoom < 0.75 ? 1 : state.minZoom;
    updateNodeVisibility();
  };

  zoomButton?.addEventListener("click", toggleZoom);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    state.width = Math.max(1, Math.floor(rect.width));
    state.height = Math.max(1, Math.floor(rect.height));
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function buildPoints() {
    const sampleWidth = 240;
    const sampleHeight = Math.max(1, Math.round(sampleWidth * (image.naturalHeight / image.naturalWidth)));
    const offscreen = document.createElement("canvas");
    const offscreenContext = offscreen.getContext("2d", { willReadFrequently: true });
    if (!offscreenContext) return;

    offscreen.width = sampleWidth;
    offscreen.height = sampleHeight;
    offscreenContext.drawImage(image, 0, 0, sampleWidth, sampleHeight);

    let pixels;
    try {
      pixels = offscreenContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
    } catch (error) {
      console.warn("Could not sample portrait pixels. Try viewing through a local static server.", error);
      state.points = [];
      return;
    }
    const points = [];
    const stride = 2;

    for (let y = 0; y < sampleHeight; y += stride) {
      for (let x = 0; x < sampleWidth; x += stride) {
        const index = (y * sampleWidth + x) * 4;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const brightness = (r + g + b) / 3;
        const saturation = Math.max(r, g, b) - Math.min(r, g, b);
        const transparent = pixels[index + 3] !== undefined && pixels[index + 3] < 24;
        const isNearImageEdge = x < sampleWidth * 0.08 || x > sampleWidth * 0.92 || y < sampleHeight * 0.08;
        const isBackground = transparent || (brightness > 226 && saturation < 30 && isNearImageEdge);

        if (isBackground && Math.random() > 0.02) continue;

        const nx = (x / sampleWidth - 0.5) * 2;
        const ny = (y / sampleHeight - 0.5) * 2;
        const depth = (255 - brightness) / 255;
        const edgeBias = Math.min(1, saturation / 80);

        points.push({
          x: nx,
          y: ny,
          z: depth + (Math.random() - 0.5) * 0.18,
          r,
          g,
          b,
          alpha: isBackground ? 0.02 : 0.68 + edgeBias * 0.28,
          seed: Math.random() * Math.PI * 2,
          keep: Math.random(),
          angle: (Math.random() - 0.5) * Math.PI,
          stretch: 1.15 + Math.random() * 2.05 + depth * 0.9,
          size: isBackground ? 0.72 : 1.08 + depth * 1.58,
        });
      }
    }

    state.points = points;
  }

  function draw(time = 0) {
    state.zoom += (state.targetZoom - state.zoom) * 0.065;
    state.drift = time * 0.0003;
    updateNodeVisibility();

    ctx.clearRect(0, 0, state.width, state.height);
    ctx.fillStyle = getHomeBackground();
    ctx.fillRect(0, 0, state.width, state.height);

    const scaleInfo = getPortraitScale();
    const portraitScale = scaleInfo.scale;
    const centerX = scaleInfo.centerX;
    const centerY = scaleInfo.centerY;
    const spreadProgress = smoothstep(0.38, 1, state.zoom);
    const spread = Math.pow(spreadProgress, 1.28) * Math.max(state.width, state.height) * 0.66;
    const blobBoost = 3.05 + smoothstep(0.34, 1, state.zoom) * 7.75;
    const parallaxX = state.pointerX * 10;
    const parallaxY = state.pointerY * 8;
    const photoAlpha = clamp(0.86 - smoothstep(state.minZoom, 0.48, state.zoom) * 0.86, 0, 0.86);
    const detailAlpha = clamp(1.46 - state.zoom * 0.82, 0.16, 1.46);
    const sparseGate = 1 - Math.pow(spreadProgress, 1.2) * 0.62;

    drawFittedPhoto(centerX, centerY, portraitScale, photoAlpha);

    for (const point of state.points) {
      if (point.keep > sparseGate && state.zoom > 0.34) continue;

      const wave = Math.sin(state.drift + point.seed) * 5.5 * state.zoom;
      const angle = Math.atan2(point.y, point.x);
      const radial = 0.35 + Math.hypot(point.x, point.y);
      const depthShift = point.z * spread;
      const screenSpreadX = Math.cos(angle + point.seed * 0.25) * depthShift * radial;
      const screenSpreadY = Math.sin(angle + point.seed * 0.25) * depthShift * radial * 0.82;
      const x = centerX + point.x * portraitScale + screenSpreadX + parallaxX * point.z + wave;
      const y = centerY + point.y * portraitScale + screenSpreadY + parallaxY * point.z;
      const radius = Math.max(2.7, point.size * blobBoost * (0.78 + point.z * 0.26));
      const alpha = Math.min(1, point.alpha * (1.34 + detailAlpha + state.zoom * 0.42));
      drawEllipticalGaussian(ctx, x, y, radius, point, alpha, state.zoom);
    }

    requestAnimationFrame(draw);
  }

  function getHomeBackground() {
    return getComputedStyle(document.body).getPropertyValue("--home-bg").trim() || "#dfe8ec";
  }

  function getPortraitScale() {
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const availableWidth = state.width * (state.width < 760 ? 0.72 : 0.43);
    const availableHeight = state.height * 0.82;
    const displayHeight = Math.min(availableHeight, availableWidth / imageRatio);
    return {
      scale: displayHeight / 2,
      centerX: state.width * (state.width < 760 ? 0.5 : 0.68),
      centerY: state.height * 0.52,
    };
  }

  function drawFittedPhoto(centerX, centerY, scale, alpha) {
    if (alpha <= 0) return;

    const displayHeight = scale * 2;
    const displayWidth = displayHeight * (image.naturalWidth / image.naturalHeight);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = "blur(2px) saturate(1.08) brightness(1.02)";
    ctx.drawImage(image, centerX - displayWidth / 2, centerY - displayHeight / 2, displayWidth, displayHeight);
    ctx.filter = "none";
    ctx.restore();
  }

  function updateNodeVisibility() {
    const titleOpacity = clamp(1 - (state.zoom - 0.56) / 0.16, 0, 1);
    const actionOpacity = clamp((state.zoom - 0.78) / 0.18, 0, 1);
    portal.style.setProperty("--portal-title-opacity", titleOpacity.toFixed(3));
    portal.style.setProperty("--portal-title-events", titleOpacity > 0.4 ? "auto" : "none");
    portal.style.setProperty("--portal-skip-opacity", actionOpacity.toFixed(3));
    portal.style.setProperty("--portal-skip-events", actionOpacity > 0.78 ? "auto" : "none");
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeInOut(value) {
  return value * value * (3 - 2 * value);
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function drawEllipticalGaussian(ctx, x, y, radius, point, alpha, zoom) {
  const sharpness = 1 - smoothstep(0.28, 0.46, zoom) * 0.32;
  const homeFactor = 1 - smoothstep(0.32, 0.62, zoom);
  const major = radius * (point.stretch * (1 - homeFactor * 0.62)) * sharpness;
  const minor = radius * (0.72 + point.z * 0.16 + homeFactor * 0.26) * sharpness;
  const glow = 0.82 + zoom * 0.5;
  const lift = 72 * homeFactor;
  const r = Math.min(255, point.r + lift);
  const g = Math.min(255, point.g + lift);
  const b = Math.min(255, point.b + lift);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(point.angle + Math.sin(point.seed + zoom * 2) * 0.08);
  ctx.scale(major * glow, minor * glow);

  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
  gradient.addColorStop(0.16, `rgba(${r}, ${g}, ${b}, ${alpha * 0.9})`);
  gradient.addColorStop(0.38, `rgba(${r}, ${g}, ${b}, ${alpha * 0.28})`);
  gradient.addColorStop(0.66, `rgba(${r}, ${g}, ${b}, ${alpha * 0.05})`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
