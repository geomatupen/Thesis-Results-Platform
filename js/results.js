(function () {
  const manifest = window.RESULTS_MANIFEST;
  if (!manifest) {
    document.body.innerHTML = "<main class='research-container results-view'>Results data could not be loaded.</main>";
    return;
  }

  const state = {
    homeRunId: "ridge-5k",
    homeCategory: "all",
    compareRunId: manifest.runs[0]?.id || "",
    compareProject: manifest.runs[0]?.items[0]?.project || "",
    checkpointTab: "chart",
  };

  const $ = (id) => document.getElementById(id);
  const homeView = $("home-view");
  const comparisonView = $("comparison-view");
  const homeRunFilter = $("home-run-filter");
  const homeCategoryFilter = $("home-category-filter");
  const homeCards = $("home-cards");
  const compareRun = $("compare-run");
  const compareProject = $("compare-project");
  const swipeSlider = $("swipe-slider");
  const imageCompare = $("image-compare");
  const previewCheckpointLabel = $("preview-checkpoint-label");
  const checkpointChartTab = $("checkpoint-chart-tab");
  const checkpointDataTab = $("checkpoint-data-tab");
  const checkpointChartPanel = $("checkpoint-chart-panel");
  const checkpointDataPanel = $("checkpoint-data-panel");
  const configModal = $("config-modal");
  const configModalButton = $("config-modal-button");
  const configModalClose = $("config-modal-close");
  const open3DViewer = $("open-3d-viewer");

  function assetPath(path) {
    if (!path) return "";
    return path.replace(/^assets\/previews\//, "assets/results/previews/");
  }

  function viewerUrl(runId, project, layer = "model") {
    return `splat_viewer.html?run=${encodeURIComponent(runId)}&project=${encodeURIComponent(project)}&layer=${encodeURIComponent(layer)}`;
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
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${formatNumber(value, unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function lpipsDelta(item) {
    return Number(item.metrics.lpips.model) - Number(item.metrics.lpips.baseline);
  }

  function categoryLabel(category) {
    const labels = {
      highest: "Highest improvement",
      lowest: "Lowest improvement",
    };
    return labels[category] || category;
  }

  function shortCategoryLabel(category) {
    const labels = {
      highest: "High",
      lowest: "Low",
    };
    return labels[category] || category;
  }

  function isShowcaseItem(item) {
    return item.category === "highest" || item.category === "lowest";
  }

  function getRun(id) {
    return manifest.runs.find((run) => run.id === id) || manifest.runs[0];
  }

  function getItem(runId, project) {
    const run = getRun(runId);
    const items = run.items.filter(isShowcaseItem);
    return items.find((item) => item.project === project) || items[0];
  }

  function selectOptions(select, options, value) {
    select.innerHTML = options
      .map((option) => `<option value="${option.value}" ${option.value === value ? "selected" : ""}>${option.label}</option>`)
      .join("");
  }

  function previewOptions(item) {
    const checkpoints = item.assets.previews.checkpoints || [];
    if (checkpoints.length) {
      return checkpoints
        .map((preview) => ({ step: Number(preview.step), baseline: preview.baseline, model: preview.model }))
        .sort((a, b) => a.step - b.step);
    }
    return [
      {
        step: Number(item.checkpoint),
        baseline: item.assets.previews.baseline,
        model: item.assets.previews.model,
      },
    ];
  }

  function allCardPairs() {
    return manifest.runs.flatMap((run) => run.items.filter(isShowcaseItem).map((item) => ({ run, item })));
  }

  function openComparison(runId, project) {
    state.compareRunId = runId;
    state.compareProject = project;
    window.location.hash = `comparison/${encodeURIComponent(runId)}/${encodeURIComponent(project)}`;
    render();
  }

  function renderHomeControls() {
    selectOptions(
      homeRunFilter,
      [{ value: "all", label: "All runs" }, ...manifest.runs.map((run) => ({ value: run.id, label: run.title }))],
      state.homeRunId,
    );
  }

  function renderHomeCards() {
    const cards = allCardPairs().filter(({ run, item }) => {
      const runMatches = state.homeRunId === "all" || run.id === state.homeRunId;
      const categoryMatches = state.homeCategory === "all" || item.category === state.homeCategory;
      return runMatches && categoryMatches;
    });

    homeCards.innerHTML = cards.length
      ? cards
          .map(({ run, item }) => {
            return `
              <article class="results-card">
                <button class="results-card-main" type="button" data-run="${run.id}" data-project="${item.project}">
                  <div class="results-card-media">
                    <img src="${assetPath(item.assets.previews.model)}" alt="${item.displayName} model-selected preview">
                    <div class="results-card-overlay">
                      <span>${run.title}</span>
                    </div>
                  </div>
                  <div class="results-card-body">
                    <h2>${item.displayName}</h2>
                    <span class="results-performance-label ${item.category}">${shortCategoryLabel(item.category)} improvement</span>
                    <p>
                      PSNR ${formatSigned(item.metrics.psnr.delta, 3)} -
                      SSIM ${formatSigned(item.metrics.ssim.delta, 4)} -
                      LPIPS delta ${formatSigned(lpipsDelta(item), 4)}
                    </p>
                  </div>
                </button>
                <div class="results-card-actions">
                  <a class="results-card-source" href="${item.sourceUrl}" target="_blank" rel="noreferrer">
                    Data source
                  </a>
                  <a class="results-card-3d" href="${viewerUrl(run.id, item.project, "model")}" aria-label="Open ${item.displayName} in 3D viewer" title="Open ${item.displayName} in 3D viewer">
                    <i class="fa-solid fa-cube" aria-hidden="true" title="Open ${item.displayName} in 3D viewer"></i>
                    View 3D
                  </a>
                </div>
              </article>
            `;
          })
          .join("")
      : "<p class='results-empty'>No results match this filter.</p>";

    homeCards.querySelectorAll("[data-run]").forEach((button) => {
      button.addEventListener("click", () => openComparison(button.dataset.run, button.dataset.project));
    });
  }

  function renderComparisonControls() {
    selectOptions(
      compareRun,
      manifest.runs.map((run) => ({ value: run.id, label: run.title })),
      state.compareRunId,
    );

    const run = getRun(state.compareRunId);
    const items = run.items.filter(isShowcaseItem);
    if (!items.some((item) => item.project === state.compareProject)) {
      state.compareProject = items[0]?.project || "";
    }

    selectOptions(
      compareProject,
      items.map((item) => ({ value: item.project, label: item.displayName })),
      state.compareProject,
    );
  }

  function metricTone(value, higherIsBetter) {
    if (value === null || value === undefined || Number(value) === 0) return "";
    const good = higherIsBetter ? Number(value) > 0 : Number(value) < 0;
    return good ? "is-good" : "is-bad";
  }

  function summaryCard(label, value, detail, toneClass) {
    return `
      <article>
        <span>${label}</span>
        <strong class="${toneClass || ""}">${value}</strong>
        <small>${detail}</small>
      </article>
    `;
  }

  function listRow(label, baseline, model, delta, digits) {
    const lowerIsBetter = label === "LPIPS" || label === "Loss";
    const toneClass = lowerIsBetter ? metricTone(delta, false) : metricTone(delta, true);
    return `
      <div class="results-list-row">
        <span class="results-metric-name">${label}</span>
        <span>${formatNumber(baseline, digits)}</span>
        <span>${formatNumber(model, digits)}</span>
        <span><b class="${toneClass}">${formatSigned(delta, digits)}</b></span>
      </div>
    `;
  }

  function metricTableHeader() {
    return `
      <div class="results-list-row results-list-header">
        <span>Metric</span>
        <span>Baseline</span>
        <span>Model</span>
        <span>Delta</span>
      </div>
    `;
  }

  function compactRow(label, value) {
    return `<div class="results-list-row"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function configModalRow(label, value) {
    return `
      <div class="results-config-row">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
  }

  function sharedRunConfig(run) {
    return {
      maxSteps: Number(run.checkpoint || 5000),
      evalInterval: 1000,
      logInterval: 100,
      densifyUntilIter: 4000,
      gaussianHardCap: 6000000,
      imagesMaxSize: 1400,
    };
  }

  function checkpointRows(run, item) {
    const itemRows = item.checkpointMetrics || [];
    if (itemRows.length) return itemRows;
    return (run.checkpointMetrics || []).filter((row) => row.project === item.project);
  }

  function renderSummary(run, item) {
    const lossDelta = item.metrics.loss.delta;
    $("summary-grid").innerHTML =
      summaryCard("PSNR delta", formatSigned(item.metrics.psnr.delta, 3), "higher is better", metricTone(item.metrics.psnr.delta, true)) +
      summaryCard("SSIM delta", formatSigned(item.metrics.ssim.delta, 4), "higher is better", metricTone(item.metrics.ssim.delta, true)) +
      summaryCard("LPIPS delta", formatSigned(lpipsDelta(item), 4), "lower is better", metricTone(lpipsDelta(item), false)) +
      summaryCard("Loss delta", formatSigned(lossDelta, 4), "lower is better", metricTone(lossDelta, false));

    $("compare-heading").textContent = item.displayName;
    $("compare-meta").textContent = `${run.title} - ${item.numberOfImages} images - ${categoryLabel(item.category)}`;
    if (open3DViewer) {
      open3DViewer.href = viewerUrl(run.id, item.project, "model");
      open3DViewer.setAttribute("aria-label", `Open ${item.displayName} ${run.title} in 3D viewer`);
    }
  }

  function renderMetricLists(item) {
    $("metric-list").innerHTML =
      metricTableHeader() +
      listRow("PSNR", item.metrics.psnr.baseline, item.metrics.psnr.model, item.metrics.psnr.delta, 3) +
      listRow("SSIM", item.metrics.ssim.baseline, item.metrics.ssim.model, item.metrics.ssim.delta, 4) +
      listRow("LPIPS", item.metrics.lpips.baseline, item.metrics.lpips.model, lpipsDelta(item), 4) +
      listRow("Loss", item.metrics.loss.baseline, item.metrics.loss.model, item.metrics.loss.delta, 4);

    $("config-list").innerHTML =
      compactRow("Geometry multiplier", `${formatNumber(item.config.geometryMultiplier, 3)}x`) +
      compactRow("Appearance multiplier", `${formatNumber(item.config.appearanceMultiplier, 3)}x`) +
      compactRow("Densification multiplier", `${formatNumber(item.config.densificationMultiplier, 3)}x`);
  }

  function renderConfigurationModal(run, item) {
    const setup = sharedRunConfig(run);
    $("config-modal-title").textContent = `${item.displayName} training configuration`;
    $("config-modal-body").innerHTML =
      configModalRow("Run", run.title) +
      configModalRow("Number of images", Number(item.numberOfImages).toLocaleString()) +
      configModalRow("Training steps", `${setup.maxSteps.toLocaleString()} steps`) +
      configModalRow("Densify until", `${setup.densifyUntilIter.toLocaleString()} steps`) +
      configModalRow("Evaluation interval", `Every ${setup.evalInterval.toLocaleString()} steps`) +
      configModalRow("Log interval", `Every ${setup.logInterval.toLocaleString()} steps`) +
      configModalRow("Gaussian hard cap", setup.gaussianHardCap.toLocaleString()) +
      configModalRow("Image max size", `${setup.imagesMaxSize.toLocaleString()} px`) +
      configModalRow("Baseline Gaussians", formatNumber(item.resources.gaussians.baseline, 0)) +
      configModalRow("Model Gaussians", formatNumber(item.resources.gaussians.model, 0)) +
      configModalRow("Runtime delta (model - baseline; negative is faster)", `${formatSigned(item.resources.runtimeSeconds.delta, 1)}s`);
  }

  function chartSvg(rows, metricKey, label, valueHigherIsBetter) {
    const digits = metricKey === "psnr" ? 3 : 4;
    const values = rows
      .map((row) => {
        const metric = row.metrics[metricKey];
        const delta = metricKey === "lpips" ? Number(metric.model) - Number(metric.baseline) : metric.delta;
        return { step: Number(row.step), baseline: metric.baseline, model: metric.model, delta };
      })
      .filter((row) => row.baseline !== null && row.model !== null);

    if (!values.length) {
      return `<article class="results-chart-card"><h3>${label}</h3><p>No checkpoint metrics available.</p></article>`;
    }

    const width = 560;
    const height = 260;
    const pad = { top: 28, right: 24, bottom: 54, left: 58 };
    const allValues = values.flatMap((row) => [Number(row.baseline), Number(row.model)]);
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const padding = (rawMax - rawMin || Math.max(Math.abs(rawMax), 1)) * 0.08;
    const min = rawMin - padding;
    const max = rawMax + padding;
    const range = max - min || 1;
    const minStep = Math.min(...values.map((row) => row.step));
    const maxStep = Math.max(...values.map((row) => row.step));
    const stepRange = maxStep - minStep || 1;
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;
    const x = (step) => pad.left + ((step - minStep) / stepRange) * chartWidth;
    const y = (value) => pad.top + (1 - (value - min) / range) * chartHeight;
    const line = (key) => values.map((row) => `${x(row.step)},${y(Number(row[key]))}`).join(" ");
    const finalDelta = values[values.length - 1].delta;
    const yTicks = Array.from({ length: 4 }, (_, index) => min + (range / 3) * index);
    const xTicks = values.map((row) => row.step);
    const directionNote = valueHigherIsBetter ? "Higher is better" : "Lower is better";
    const deltaLabel = "Final delta";
    const tooltipDeltaLabel = "delta";
    const chartColors = {
      background: "#ffffff",
      grid: "#d4e0e4",
      axis: "#5f6f78",
      baseline: "#5f6f78",
      model: "#9a5a2e",
      text: "#5f6f78",
    };
    const textStyle = "font-family: Inter, Arial, sans-serif; font-size: 10px;";
    const axisLabelStyle = "font-family: Inter, Arial, sans-serif; font-size: 11px; font-weight: 560;";

    return `
      <article class="results-chart-card">
        <div class="results-chart-heading">
          <div>
            <h3>${label}</h3>
            <small>${directionNote}</small>
          </div>
          <div class="results-chart-tools">
            <div class="results-chart-legend" aria-hidden="true">
              <span class="baseline-key">Baseline</span>
              <span class="model-key">Model-selected</span>
            </div>
            <div class="results-chart-downloads" aria-label="Download ${label} chart">
              <button class="results-chart-download" type="button" data-chart-format="svg" data-chart-label="${label}" aria-label="Download ${label} chart as SVG">SVG</button>
              <button class="results-chart-download" type="button" data-chart-format="png" data-chart-label="${label}" aria-label="Download ${label} chart as PNG">PNG</button>
            </div>
          </div>
        </div>
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${label} checkpoint chart" data-chart-export="true">
          <title>${label} over checkpoints. Baseline is shown as a line, model-selected checkpoints as a line with points.</title>
          <rect x="0" y="0" width="${width}" height="${height}" fill="${chartColors.background}" />
          ${yTicks
            .map((tick) => {
              const ty = y(tick);
              return `
                <line class="grid-line" x1="${pad.left}" y1="${ty}" x2="${width - pad.right}" y2="${ty}" stroke="${chartColors.grid}" stroke-width="1" opacity="0.72" />
                <text class="axis-tick y-tick" x="${pad.left - 10}" y="${ty + 4}" fill="${chartColors.text}" text-anchor="end" style="${textStyle}">${formatNumber(tick, digits)}</text>
              `;
            })
            .join("")}
          ${xTicks
            .map((step) => {
              const tx = x(step);
              return `
                <line class="tick-line" x1="${tx}" y1="${height - pad.bottom}" x2="${tx}" y2="${height - pad.bottom + 5}" stroke="${chartColors.axis}" stroke-width="1" opacity="0.72" />
                <text class="axis-tick x-tick" x="${tx}" y="${height - 30}" fill="${chartColors.text}" text-anchor="middle" style="${textStyle}">${Number(step).toLocaleString()}</text>
              `;
            })
            .join("")}
          <line class="axis-line" x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="${chartColors.axis}" stroke-width="1" opacity="0.72" />
          <line class="axis-line" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="${chartColors.axis}" stroke-width="1" opacity="0.72" />
          <text class="axis-label x-label" x="${pad.left + chartWidth / 2}" y="${height - 7}" fill="${chartColors.text}" text-anchor="middle" style="${axisLabelStyle}">Checkpoint step</text>
          <text class="axis-label y-label" x="8" y="${pad.top + chartHeight / 2}" transform="rotate(-90 8 ${pad.top + chartHeight / 2})" fill="${chartColors.text}" text-anchor="middle" style="${axisLabelStyle}">${label}</text>
          <polyline points="${line("baseline")}" class="baseline-line" fill="none" stroke="${chartColors.baseline}" stroke-width="2" />
          <polyline points="${line("model")}" class="model-line" fill="none" stroke="${chartColors.model}" stroke-width="2" />
          ${values
            .map(
              (row) => `
                <circle class="model-point" cx="${x(row.step)}" cy="${y(Number(row.model))}" r="4" fill="${chartColors.model}" tabindex="0">
                  <title>${label} at ${Number(row.step).toLocaleString()} steps: baseline ${formatNumber(row.baseline, digits)}, model ${formatNumber(row.model, digits)}, ${tooltipDeltaLabel} ${formatSigned(row.delta, digits)}</title>
                </circle>
              `,
            )
            .join("")}
        </svg>
        <p>${deltaLabel} <strong class="${metricTone(finalDelta, valueHigherIsBetter)}">${formatSigned(finalDelta, digits)}</strong></p>
      </article>
    `;
  }

  function renderCheckpointSection(run, item) {
    const rows = checkpointRows(run, item).sort((a, b) => Number(a.step) - Number(b.step));
    $("chart-grid").innerHTML =
      chartSvg(rows, "psnr", "PSNR", true) +
      chartSvg(rows, "ssim", "SSIM", true) +
      chartSvg(rows, "lpips", "LPIPS", false) +
      chartSvg(rows, "loss", "Loss", false);

    $("checkpoint-table").innerHTML = rows.length
      ? `
        <table>
          <thead>
            <tr>
              <th>Step</th>
              <th>PSNR base</th>
              <th>PSNR model</th>
              <th>SSIM base</th>
              <th>SSIM model</th>
              <th>LPIPS base</th>
              <th>LPIPS model</th>
              <th>Loss base</th>
              <th>Loss model</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${Number(row.step).toLocaleString()}</td>
                    <td>${formatNumber(row.metrics.psnr.baseline, 3)}</td>
                    <td>${formatNumber(row.metrics.psnr.model, 3)}</td>
                    <td>${formatNumber(row.metrics.ssim.baseline, 4)}</td>
                    <td>${formatNumber(row.metrics.ssim.model, 4)}</td>
                    <td>${formatNumber(row.metrics.lpips.baseline, 4)}</td>
                    <td>${formatNumber(row.metrics.lpips.model, 4)}</td>
                    <td>${formatNumber(row.metrics.loss.baseline, 4)}</td>
                    <td>${formatNumber(row.metrics.loss.model, 4)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      `
      : "<p class='results-empty'>No checkpoint metrics available for this run.</p>";

    renderCheckpointTabs();
  }

  function renderCheckpointTabs() {
    const isChart = state.checkpointTab === "chart";
    checkpointChartTab.classList.toggle("is-active", isChart);
    checkpointDataTab.classList.toggle("is-active", !isChart);
    checkpointChartTab.setAttribute("aria-selected", String(isChart));
    checkpointDataTab.setAttribute("aria-selected", String(!isChart));
    checkpointChartPanel.classList.toggle("hidden", !isChart);
    checkpointDataPanel.classList.toggle("hidden", isChart);
  }

  function renderVisuals(item) {
    const previews = previewOptions(item);
    const selected = previews[previews.length - 1] || {
      step: Number(item.checkpoint),
      baseline: item.assets.previews.baseline,
      model: item.assets.previews.model,
    };
    previewCheckpointLabel.textContent = `${Number(selected.step).toLocaleString()} steps`;
    $("original-preview").src = assetPath(selected.baseline);
    $("swipe-baseline").src = assetPath(selected.baseline);
    $("swipe-model").src = assetPath(selected.model);
    $("source-link").href = item.sourceUrl;
    updateSwipe();
  }

  function renderComparison() {
    renderComparisonControls();
    const run = getRun(state.compareRunId);
    const item = getItem(state.compareRunId, state.compareProject);
    if (!run || !item) return;

    renderSummary(run, item);
    renderMetricLists(item);
    renderConfigurationModal(run, item);
    renderCheckpointSection(run, item);
    renderVisuals(item);
  }

  function updateSwipe() {
    if (!imageCompare || !swipeSlider) return;
    imageCompare.style.setProperty("--split", `${swipeSlider.value}%`);
  }

  function chartFilename(label, extension) {
    const run = getRun(state.compareRunId);
    const item = getItem(state.compareRunId, state.compareProject);
    const filename = [run?.id, item?.project, label, "checkpoint-chart"]
      .filter(Boolean)
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return `${filename || "checkpoint-chart"}.${extension}`;
  }

  function svgSource(svg) {
    const copy = svg.cloneNode(true);
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("width", "1120");
    copy.setAttribute("height", "520");
    return new XMLSerializer().serializeToString(copy);
  }

  function triggerDownload(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function downloadSvgChart(svg, label) {
    const source = svgSource(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, chartFilename(label, "svg"));
    URL.revokeObjectURL(url);
  }

  function downloadPngChart(svg, label) {
    const source = svgSource(svg);
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.addEventListener("load", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1120;
      canvas.height = 520;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        triggerDownload(pngUrl, chartFilename(label, "png"));
        URL.revokeObjectURL(pngUrl);
      }, "image/png");
    });

    image.addEventListener("error", () => {
      URL.revokeObjectURL(url);
    });

    image.src = url;
  }

  function downloadChart(button) {
    const card = button.closest(".results-chart-card");
    const svg = card?.querySelector("svg");
    if (!svg) return;

    const label = button.dataset.chartLabel || "chart";
    const format = button.dataset.chartFormat || "svg";
    if (format === "png") {
      downloadPngChart(svg, label);
    } else {
      downloadSvgChart(svg, label);
    }
  }

  function parseRoute() {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || hash === "home") return "home";
    const parts = hash.split("/");
    if (parts[0] === "comparison") {
      if (parts[1]) state.compareRunId = decodeURIComponent(parts[1]);
      if (parts[2]) state.compareProject = decodeURIComponent(parts.slice(2).join("/"));
      return "comparison";
    }
    return "home";
  }

  function render() {
    const view = parseRoute();
    homeView.classList.toggle("hidden", view !== "home");
    comparisonView.classList.toggle("hidden", view !== "comparison");
    renderHomeControls();
    renderHomeCards();
    renderComparison();
  }

  function init() {
    render();

    homeRunFilter.addEventListener("change", () => {
      state.homeRunId = homeRunFilter.value;
      renderHomeCards();
    });
    homeCategoryFilter.addEventListener("change", () => {
      state.homeCategory = homeCategoryFilter.value;
      renderHomeCards();
    });
    compareRun.addEventListener("change", () => {
      state.compareRunId = compareRun.value;
      state.compareProject = getRun(state.compareRunId).items[0]?.project || "";
      openComparison(state.compareRunId, state.compareProject);
    });
    compareProject.addEventListener("change", () => {
      state.compareProject = compareProject.value;
      openComparison(state.compareRunId, state.compareProject);
    });
    checkpointChartTab.addEventListener("click", () => {
      state.checkpointTab = "chart";
      renderCheckpointTabs();
    });
    checkpointDataTab.addEventListener("click", () => {
      state.checkpointTab = "data";
      renderCheckpointTabs();
    });
    $("chart-grid").addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest(".results-chart-download");
      if (button) downloadChart(button);
    });
    configModalButton.addEventListener("click", () => {
      if (configModal.showModal) {
        configModal.showModal();
      } else {
        configModal.setAttribute("open", "");
      }
    });
    configModalClose.addEventListener("click", () => {
      configModal.close();
    });
    configModal.addEventListener("click", (event) => {
      if (event.target === configModal) configModal.close();
    });
    swipeSlider.addEventListener("input", updateSwipe);
    window.addEventListener("hashchange", render);
  }

  init();
})();
