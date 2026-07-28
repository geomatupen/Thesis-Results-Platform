import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

(function () {
  const allowedThemes = new Set(["cloud", "dark"]);
  const params = new URLSearchParams(window.location.search);
  const activeTheme = applyViewerTheme(params);
  const manifest = window.RESULTS_MANIFEST;
  const canvasHost = document.getElementById("splat-canvas");
  const status = document.getElementById("viewer-status");
  const runSelect = document.getElementById("viewer-run");
  const projectSelect = document.getElementById("viewer-project");
  const layerSelect = document.getElementById("viewer-layer");
  const title = document.getElementById("viewer-title");
  const subtitle = document.getElementById("viewer-subtitle");
  const infoButton = document.getElementById("viewer-info");
  const helpButton = document.getElementById("viewer-help");
  const helpPanel = document.getElementById("viewer-help-panel");
  const resetButton = document.getElementById("viewer-reset");
  const fullscreenButton = document.getElementById("viewer-fullscreen");
  const panel = document.querySelector(".splat-viewer-panel");
  const panelToggle = document.getElementById("viewer-panel-toggle");
  const infoModal = document.getElementById("viewer-info-modal");
  const infoClose = document.getElementById("viewer-info-close");
  const infoTitle = document.getElementById("viewer-info-title");
  const infoBody = document.getElementById("viewer-info-body");

  const state = {
    runId: params.get("run") || "ridge-5k",
    projectId: params.get("project") || "pix4d-forensic",
    layer: params.get("layer") === "baseline" ? "baseline" : "model",
    sceneId: params.get("scene") || "",
  };

  let renderer;
  let scene;
  let camera;
  let controls;
  let spark;
  let activeSplat = null;
  let activeItem = null;
  let activeRun = null;
  let initialView = null;

  const externalSplatBaseUrl = "https://raw.githubusercontent.com/geomatupen/Bimba3d-re_research_outputs/main/splats_test";

  function applyViewerTheme(searchParams) {
    let theme = searchParams.get("theme") || "";

    try {
      if (!allowedThemes.has(theme)) {
        theme = localStorage.getItem("thesis-theme") || "";
      }
    } catch (error) {
      theme = "";
    }

    const nextTheme = allowedThemes.has(theme) ? theme : "dark";
    document.body.setAttribute("data-site-theme", nextTheme);

    try {
      localStorage.setItem("thesis-theme", nextTheme);
      localStorage.setItem("thesis-theme-manual", "true");
    } catch (error) {
      // Theme persistence is optional.
    }

    const backLink = document.querySelector(".splat-back-link");
    if (backLink) {
      backLink.setAttribute("href", `index.html?theme=${encodeURIComponent(nextTheme)}`);
    }

    return nextTheme;
  }

  const rawDataSources = {
    "maisonneuve-market": {
      name: "Heritage3DMTL - 12-Maisonneuve Market",
      url: "https://zenodo.org/records/13732644?preview_file=1-Montreal-City-Hall.zip",
      category: "Public dataset",
    },
    "thomas-more-church": {
      name: "Heritage3DMTL - 4-Thomas-More-Church",
      url: "https://zenodo.org/records/13732644?preview_file=1-Montreal-City-Hall.zip",
      category: "Public dataset",
    },
    "pix4d-forensic": {
      name: "Pix4D test - Forensic Dataset",
      url: "https://support.pix4d.com/hc/en-us/articles/360000235126",
      category: "Public dataset",
    },
  };

  if (!manifest) {
    setStatus("Results manifest could not be loaded.", false);
    return;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatNumber(value, digits = 3) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
    const number = Number(value);
    return number.toLocaleString(undefined, {
      minimumFractionDigits: Math.abs(number) < 1 ? digits : 0,
      maximumFractionDigits: digits,
    });
  }

  function formatSigned(value, digits = 3) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
    const number = Number(value);
    return `${number > 0 ? "+" : ""}${formatNumber(number, digits)}`;
  }

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let value = Number(bytes);
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index += 1;
    }
    return `${formatNumber(value, index === 0 ? 0 : 1)} ${units[index]}`;
  }

  function lpipsDelta(item) {
    return Number(item.metrics.lpips.model) - Number(item.metrics.lpips.baseline);
  }

  function getRun(runId) {
    return manifest.runs.find((run) => run.id === runId) || manifest.runs[0];
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/maisonuve/g, "maisonneuve")
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function isShowcaseItem(item) {
    return item.category === "highest" || item.category === "lowest";
  }

  function matchesProject(item, value) {
    const normalized = slugify(value);
    return (
      item.projectId === value ||
      item.project === value ||
      slugify(item.projectId) === normalized ||
      slugify(item.project) === normalized ||
      slugify(item.displayName) === normalized
    );
  }

  function getProject(projectId) {
    const normalized = slugify(projectId);
    return manifest.projects.find((project) => {
      return project.id === projectId || project.project === projectId || slugify(project.id) === normalized || slugify(project.project) === normalized || slugify(project.displayName) === normalized;
    }) || null;
  }

  function getItem(runId, projectId) {
    const run = getRun(runId);
    const items = run.items.filter(isShowcaseItem);
    return items.find((item) => matchesProject(item, projectId)) || items[0] || null;
  }

  function availableProjects(runId) {
    return getRun(runId).items
      .filter(isShowcaseItem)
      .map((item) => ({ id: item.projectId, label: item.displayName }));
  }

  function runWithProject(projectId) {
    return manifest.runs.find((run) => run.items.filter(isShowcaseItem).some((item) => matchesProject(item, projectId))) || null;
  }

  function sceneIdFor(item, layer) {
    const splat = item?.assets?.splats?.[layer];
    if (!splat?.role) return "";
    const step = String(item.checkpoint || splat.snapshots?.fileName?.match(/\d+/)?.[0] || 0).padStart(6, "0");
    return `${item.projectId}_${splat.role}_checkpoint-${step}`;
  }

  function sceneUrlFor(item, layer) {
    const splat = item?.assets?.splats?.[layer];
    if (splat?.radPath) {
      return `${externalSplatBaseUrl}/${String(splat.radPath).replace(/^\/+/, "")}`;
    }

    const sceneId = sceneIdFor(item, layer);
    if (!sceneId) return "";
    return `${externalSplatBaseUrl}/${sceneId}/${sceneId}-lod.rad`;
  }

  function selectionForScene(sceneId) {
    if (!sceneId) return null;
    for (const run of manifest.runs) {
      for (const item of run.items.filter(isShowcaseItem)) {
        for (const layer of ["model", "baseline"]) {
          if (sceneIdFor(item, layer) === sceneId) {
            return { runId: run.id, projectId: item.projectId, layer };
          }
        }
      }
    }
    return null;
  }

  function selectOptions(select, options, value) {
    select.innerHTML = options
      .map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
      .join("");
  }

  function syncControls() {
    const sceneSelection = selectionForScene(state.sceneId);
    if (sceneSelection) {
      state.runId = sceneSelection.runId;
      state.projectId = sceneSelection.projectId;
      state.layer = sceneSelection.layer;
      state.sceneId = "";
    }

    const requestedProject = state.projectId;
    const currentRunProjects = availableProjects(state.runId);
    if (requestedProject && !currentRunProjects.some((project) => project.id === requestedProject)) {
      const matchingRun = runWithProject(requestedProject);
      if (matchingRun) state.runId = matchingRun.id;
    }

    selectOptions(
      runSelect,
      manifest.runs.map((run) => ({ value: run.id, label: run.title })),
      state.runId,
    );

    const projects = availableProjects(state.runId);
    const matchingItem = getItem(state.runId, requestedProject);
    if (matchingItem && projects.some((project) => project.id === matchingItem.projectId)) {
      state.projectId = matchingItem.projectId;
    } else if (!projects.some((project) => project.id === state.projectId)) {
      state.projectId = projects[0]?.id || "";
    }
    selectOptions(projectSelect, projects.map((project) => ({ value: project.id, label: project.label })), state.projectId);
    layerSelect.value = state.layer;
  }

  function setStatus(message, quiet = true) {
    status.textContent = message;
    status.classList.toggle("is-quiet", quiet);
  }

  function updateUrl() {
    const next = new URL(window.location.href);
    next.searchParams.set("run", state.runId);
    next.searchParams.set("project", state.projectId);
    next.searchParams.set("layer", state.layer);
    window.history.replaceState({}, "", next);
  }

  function initRenderer() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071014);

    camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.01, 10000);
    renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    canvasHost.appendChild(renderer.domElement);

    spark = new SparkRenderer({
      renderer,
      pagedExtSplats: true,
      lodSplatScale: 1.0,
    });
    scene.add(spark);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.75;
    controls.panSpeed = 0.65;

    resetCamera();
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });
    window.addEventListener("resize", resizeRenderer);
  }

  function resizeRenderer() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function resetCamera() {
    if (initialView) {
      camera.position.copy(initialView.position);
      camera.quaternion.copy(initialView.quaternion);
      camera.zoom = initialView.zoom;
      controls.target.copy(initialView.target);
      controls.minDistance = initialView.minDistance;
      controls.maxDistance = initialView.maxDistance;
      camera.near = initialView.near;
      camera.far = initialView.far;
    } else {
      camera.position.set(0, 0, 5);
      controls.target.set(0, 0, 0);
      camera.near = 0.01;
      camera.far = 10000;
    }
    camera.updateProjectionMatrix();
    controls.update();
  }

  function saveInitialView() {
    initialView = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      target: controls.target.clone(),
      zoom: camera.zoom,
      near: camera.near,
      far: camera.far,
      minDistance: controls.minDistance,
      maxDistance: controls.maxDistance,
    };
  }

  async function frameActiveSplat() {
    if (!activeSplat) return;
    try {
      await activeSplat.initialized;
      const box = activeSplat.getBoundingBox(true);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      const maxSize = Math.max(size.x, size.y, size.z, 1);
      const presentationDistance = maxSize / (2 * Math.tan((camera.fov * Math.PI) / 360));
      controls.target.copy(center);
      controls.minDistance = Math.max(presentationDistance * 0.02, 0.001);
      controls.maxDistance = Math.max(presentationDistance * 8, 10);
      camera.near = Math.max(presentationDistance / 1000, 0.001);
      camera.far = Math.max(presentationDistance * 1000, 1000);
      camera.position.set(
        center.x,
        center.y - presentationDistance * 0.18,
        center.z + presentationDistance * 1.45,
      );
      camera.updateProjectionMatrix();
      controls.update();
      saveInitialView();
    } catch (error) {
      console.warn("Could not frame splat automatically:", error);
      initialView = null;
      camera.position.set(0, 0, 5);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }

  async function loadScene() {
    activeRun = getRun(state.runId);
    activeItem = getItem(state.runId, state.projectId);
    if (!activeRun || !activeItem) {
      setStatus("No scene is available for this selection.", false);
      return;
    }

    const sceneUrl = sceneUrlFor(activeItem, state.layer);
    title.textContent = activeItem.displayName;
    subtitle.textContent = `${activeRun.title} - ${state.layer === "model" ? "model-selected" : "baseline"} checkpoint`;
    updateUrl();
    renderInfo();

    if (activeSplat) {
      scene.remove(activeSplat);
      activeSplat.dispose?.();
      activeSplat = null;
    }
    initialView = null;

    setStatus("Streaming RAD scene...");
    try {
      const probe = await fetch(sceneUrl, { method: "HEAD", cache: "no-store" });
      if (!probe.ok) {
        throw new Error(`Scene file not found: ${sceneUrl}`);
      }

      activeSplat = new SplatMesh({
        url: sceneUrl,
        paged: true,
        onProgress: (event) => {
          if (event?.total && event.loaded) {
            setStatus(`Loading ${formatNumber((event.loaded / event.total) * 100, 0)}%...`, false);
          }
        },
      });
      scene.add(activeSplat);
      await activeSplat.initialized;
      await frameActiveSplat();
      setStatus("Scene ready. Drag to orbit, scroll to zoom.", false);
      window.setTimeout(() => setStatus("Scene ready.", true), 2200);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Scene could not be loaded.", false);
    }
  }

  function infoRow(label, value, wide = false) {
    return `
      <div class="splat-info-row ${wide ? "is-wide" : ""}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
  }

  function infoLinkRow(label, href, text, wide = false) {
    const safeHref = escapeHtml(href || "#");
    return `
      <div class="splat-info-row ${wide ? "is-wide" : ""}">
        <span>${escapeHtml(label)}</span>
        <strong><a href="${safeHref}" target="_blank" rel="noreferrer">${escapeHtml(text || href || "-")}</a></strong>
      </div>
    `;
  }

  function renderInfo() {
    if (!activeItem || !activeRun) return;
    const project = getProject(activeItem.projectId);
    const selected = activeItem.assets?.splats?.[state.layer];
    const source = rawDataSources[activeItem.projectId] || {
      name: project?.source || activeItem.source || "-",
      url: project?.sourceUrl || activeItem.sourceUrl || "-",
      category: activeItem.sourceType || "-",
    };
    infoTitle.textContent = `${activeItem.displayName} - ${activeRun.title}`;
    infoBody.innerHTML =
      infoRow("Displayed layer", state.layer === "model" ? "Model-selected reconstruction" : "Baseline reconstruction") +
      infoRow("Checkpoint", `${Number(activeItem.checkpoint).toLocaleString()} iterations`) +
      infoRow("Raw image data source", source.name) +
      infoRow("Data category", source.category) +
      infoRow("Images", Number(activeItem.numberOfImages).toLocaleString()) +
      infoRow("Geometry multiplier", `${formatNumber(activeItem.config.geometryMultiplier, 3)}x`) +
      infoRow("Appearance multiplier", `${formatNumber(activeItem.config.appearanceMultiplier, 3)}x`) +
      infoRow("Densification multiplier", `${formatNumber(activeItem.config.densificationMultiplier, 3)}x`) +
      infoRow("Original splat size", formatBytes(selected?.sizeBytes)) +
      infoRow("PSNR difference", formatSigned(activeItem.metrics.psnr.delta, 3)) +
      infoRow("SSIM difference", formatSigned(activeItem.metrics.ssim.delta, 4)) +
      infoRow("LPIPS improvement", formatSigned(lpipsDelta(activeItem), 4)) +
      infoRow("Gaussian count difference", formatSigned(activeItem.resources?.gaussians?.delta, 0)) +
      infoRow("Runtime difference (model - baseline; negative is faster)", `${formatSigned(activeItem.resources?.runtimeSeconds?.delta, 1)} seconds`) +
      infoLinkRow("Source link", source.url, source.url, true) +
      infoRow("Checkpoint note", "These are intermediate 5,000 or 7,000 iteration splats used for controlled thesis comparison. Longer training would normally improve visual completeness and rendering quality. Some floating cloud-like artifacts are expected at this stage and should be cleaned with bounding-box filtering or other splat post-processing before final presentation.", true) +
      infoRow("Metric note", "Differences compare model-selected and baseline runs at the same checkpoint. Positive PSNR/SSIM and LPIPS improvement values are better. For runtime, negative means the model-selected run was faster, while positive means it took longer.", true);
  }

  function bindEvents() {
    panelToggle.addEventListener("click", () => {
      const minimized = !panel.classList.contains("is-minimized");
      setPanelMinimized(minimized);
      sessionStorage.setItem("splatViewerPanelMinimized", minimized ? "1" : "0");
    });
    helpButton.addEventListener("click", () => {
      const hidden = helpPanel.hasAttribute("hidden");
      if (hidden) {
        helpPanel.removeAttribute("hidden");
      } else {
        helpPanel.setAttribute("hidden", "");
      }
      helpButton.setAttribute("aria-expanded", String(hidden));
    });
    renderer.domElement.addEventListener("pointerdown", hideHelpPanel, { passive: true });
    renderer.domElement.addEventListener("wheel", hideHelpPanel, { passive: true });
    renderer.domElement.addEventListener("touchstart", hideHelpPanel, { passive: true });
    runSelect.addEventListener("change", () => {
      state.runId = runSelect.value;
      syncControls();
      loadScene();
    });
    projectSelect.addEventListener("change", () => {
      state.projectId = projectSelect.value;
      loadScene();
    });
    layerSelect.addEventListener("change", () => {
      state.layer = layerSelect.value === "baseline" ? "baseline" : "model";
      loadScene();
    });
    resetButton.addEventListener("click", resetCamera);
    fullscreenButton.addEventListener("click", async () => {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    });
    document.addEventListener("fullscreenchange", syncFullscreenUi);
    infoButton.addEventListener("click", () => {
      renderInfo();
      if (infoModal.showModal) {
        infoModal.showModal();
      } else {
        infoModal.setAttribute("open", "");
      }
    });
    infoClose.addEventListener("click", () => infoModal.close());
    infoModal.addEventListener("click", (event) => {
      if (event.target === infoModal) infoModal.close();
    });
  }

  function hideHelpPanel() {
    helpPanel.setAttribute("hidden", "");
    helpButton.setAttribute("aria-expanded", "false");
  }

  function syncFullscreenUi() {
    const isFullscreen = Boolean(document.fullscreenElement);
    document.body.classList.toggle("is-model-fullscreen", isFullscreen);
    const label = isFullscreen ? "Exit fullscreen" : "Toggle fullscreen";
    fullscreenButton.setAttribute("aria-label", label);
    fullscreenButton.setAttribute("title", label);
    const icon = fullscreenButton.querySelector("i");
    if (icon) {
      icon.className = isFullscreen ? "fa-solid fa-compress" : "fa-solid fa-expand";
      icon.setAttribute("title", label);
    }
  }

  function setPanelMinimized(minimized) {
    panel.classList.toggle("is-minimized", minimized);
    panelToggle.setAttribute("aria-expanded", String(!minimized));
    const label = minimized ? "Expand viewer controls" : "Minimize viewer controls";
    panelToggle.setAttribute("aria-label", label);
    panelToggle.setAttribute("title", label);
    const icon = panelToggle.querySelector("i");
    if (icon) {
      icon.className = minimized ? "fa-solid fa-plus" : "fa-solid fa-minus";
      icon.setAttribute("title", label);
    }
  }

  syncControls();
  initRenderer();
  bindEvents();
  setPanelMinimized(sessionStorage.getItem("splatViewerPanelMinimized") === "1");
  syncFullscreenUi();
  loadScene();
})();
