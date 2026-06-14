const DEFAULT_CONFIG = `#S-Tier Ranking Board

tiers: [S, A, B, C, D, F]

## Facets

| Facet | Weight | Max |
| --- | ---: | ---: |
| First impression | 1.0 | 10 |
| Core features | 1.2 | 10 |
| Ease of use | 1.1 | 10 |
| Performance | 1.2 | 10 |
| Reliability | 1.2 | 10 |
| Visual polish | 1.0 | 10 |
| Flexibility | 0.9 | 10 |
| Learning curve | 0.8 | 10 |
| Workflow fit | 1.0 | 10 |
| Final vibe | 0.9 | 10 |

## Candidates

| Name | Image | Description | Tier | First impression | Core features | Ease of use | Performance | Reliability | Visual polish | Flexibility | Learning curve | Workflow fit | Final vibe |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Atlas | ./assets/candidates/atlas.svg | A polished all-rounder with strong defaults and broad appeal. | Unranked | 9 | 9 | 8 | 8 | 9 | 8 | 8 | 7 | 9 | 8 |
| Beacon | ./assets/candidates/beacon.svg | A friendly pick that looks refined and gets new users moving quickly. | Unranked | 8 | 7 | 9 | 7 | 8 | 9 | 7 | 8 | 8 | 8 |
| Comet | ./assets/candidates/comet.svg | A fast, focused option with confident day-to-day performance. | Unranked | 7 | 8 | 8 | 9 | 8 | 7 | 8 | 7 | 8 | 7 |
| Drift | ./assets/candidates/drift.svg | A flexible contender that rewards setup time and deeper customization. | Unranked | 6 | 7 | 7 | 8 | 7 | 6 | 8 | 6 | 7 | 6 |
| Ember | ./assets/candidates/ember.svg | A stylish candidate with a memorable first impression and a few tradeoffs. | Unranked | 9 | 8 | 7 | 7 | 7 | 9 | 6 | 8 | 7 | 9 |
| Flux | ./assets/candidates/flux.svg | A power-user option with unusual flexibility but a steeper learning curve. | Unranked | 5 | 6 | 6 | 7 | 6 | 7 | 9 | 5 | 6 | 6 |
| Grove | ./assets/candidates/grove.svg | A calm, reliable choice that feels balanced across most categories. | Unranked | 8 | 8 | 8 | 7 | 7 | 8 | 7 | 7 | 8 | 7 |
| Halo | ./assets/candidates/halo.svg | A visually pleasant option that is easy to explain on camera. | Unranked | 6 | 6 | 7 | 6 | 7 | 8 | 6 | 8 | 6 | 7 |
| Ion | ./assets/candidates/ion.svg | A compact option that performs well once its workflow clicks. | Unranked | 7 | 6 | 7 | 8 | 8 | 6 | 8 | 6 | 7 | 6 |
| Juniper | ./assets/candidates/juniper.svg | A budget-feeling pick that can still surprise in the right niche. | Unranked | 5 | 5 | 6 | 6 | 5 | 6 | 6 | 7 | 5 | 6 |
`;

const state = {
  title: "S-Tier Ranking Board",
  tiers: ["S", "A", "B", "C", "D", "F"],
  facets: [],
  candidates: [],
  selectedId: null,
  configText: DEFAULT_CONFIG
};

const els = {
  app: document.querySelector("[data-app-shell]"),
  title: document.querySelector("[data-title]"),
  resetConfig: document.querySelector("[data-reset-config]"),
  tierBoard: document.querySelector("[data-tier-board]"),
  unrankedList: document.querySelector("[data-unranked-list]"),
  unrankedCount: document.querySelector("[data-unranked-count]"),
  modal: document.querySelector("[data-modal]"),
  detailCard: document.querySelector("[data-detail-card]")
};

let drag = null;
let toastTimer = 0;
let modalTitleFrame = 0;

boot();

async function boot() {
  wireStaticControls();
  const text = await loadMarkdownConfig({ fallbackToDefault: true });
  applyConfig(text);
}

function wireStaticControls() {
  els.resetConfig.addEventListener("click", resetFromDisk);

  els.modal.addEventListener("click", (event) => {
    if (event.target === els.modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!els.modal.hidden) closeModal();
    }
  });

  window.addEventListener("resize", () => {
    if (!els.modal.hidden) {
      window.cancelAnimationFrame(modalTitleFrame);
      modalTitleFrame = window.requestAnimationFrame(fitModalTitle);
    }
  });
}

async function loadMarkdownConfig({ fallbackToDefault = false } = {}) {
  try {
    const response = await fetch(`./config.md?refresh=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`config.md returned ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    if (fallbackToDefault) {
      showToast("Using bundled config because config.md was not fetched.");
      return DEFAULT_CONFIG;
    }
    throw error;
  }
}

async function resetFromDisk() {
  els.resetConfig.disabled = true;
  try {
    const markdown = await loadMarkdownConfig();
    applyConfig(markdown);
    showToast("Reset from config.md.");
  } catch {
    showToast("Could not refresh config.md.");
  } finally {
    els.resetConfig.disabled = false;
  }
}

function applyConfig(markdown) {
  const parsed = parseConfig(markdown);
  state.title = parsed.title;
  state.tiers = parsed.tiers;
  state.facets = parsed.facets;
  state.candidates = parsed.candidates;
  state.configText = markdown;
  state.selectedId = null;
  closeModal();
  render();
}

function parseConfig(markdown) {
  const lines = markdown.split(/\r?\n/);
  const titleLine = lines.find((line) => line.trim().startsWith("#"));
  const title = titleLine ? titleLine.trim() : "S-Tier Ranking Board";
  const tiers = parseListSetting(lines, "tiers", ["S", "A", "B", "C", "D", "F"]);
  const facetRows = parseMarkdownTable(lines, "## Facets");
  const primaryCandidateRows = parseMarkdownTable(lines, "## Candidates");
  const candidateRows = primaryCandidateRows.length
    ? primaryCandidateRows
    : parseMarkdownTable(lines, "## Clients");

  let facets = facetRows.map((row) => ({
    name: row.Facet || row.facet || row.Name || row.name,
    weight: toNumber(row.Weight ?? row.weight, 1),
    max: Math.max(1, toNumber(row.Max ?? row.max, 10))
  })).filter((facet) => facet.name);

  if (!candidateRows.length) {
    throw new Error("The config needs a ## Candidates table.");
  }

  if (!facets.length) {
    const reserved = new Set(["Name", "Image", "Description", "Tier"]);
    facets = Object.keys(candidateRows[0])
      .filter((header) => !reserved.has(header))
      .map((header) => ({ name: header, weight: 1, max: 10 }));
  }

  const candidates = candidateRows.map((row, index) => {
    const name = row.Name || row.name || `Candidate ${index + 1}`;
    const scores = {};
    facets.forEach((facet) => {
      scores[facet.name] = clamp(toNumber(row[facet.name], 0), 0, facet.max);
    });
    return {
      id: `${slugify(name)}-${index + 1}`,
      name,
      image: row.Image || row.image || "./assets/candidates/atlas.svg",
      description: row.Description || row.description || "",
      tier: normalizeTier(row.Tier || row.tier || "Unranked", tiers),
      scores
    };
  });

  return { title, tiers, facets, candidates };
}

function parseScalarSetting(lines, key, fallback) {
  const prefix = `${key}:`;
  const found = lines.find((line) => line.trim().toLowerCase().startsWith(prefix.toLowerCase()));
  if (!found) return fallback;
  const value = found.slice(found.indexOf(":") + 1).trim();
  return value || fallback;
}

function parseListSetting(lines, key, fallback) {
  const raw = parseScalarSetting(lines, key, "");
  if (!raw) return fallback;
  const match = raw.match(/^\[(.*)\]$/);
  const source = match ? match[1] : raw;
  const values = source.split(",").map((value) => value.trim()).filter(Boolean);
  return values.length ? values : fallback;
}

function parseMarkdownTable(lines, heading) {
  const start = lines.findIndex((line) => line.trim().toLowerCase() === heading.toLowerCase());
  if (start === -1) return [];
  const table = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line && !table.length) continue;
    if (!line.startsWith("|")) {
      if (table.length) break;
      continue;
    }
    table.push(splitTableRow(line));
  }

  if (table.length < 2) return [];
  const headers = table[0];
  return table.slice(2).map((cells) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    return row;
  });
}

function splitTableRow(line) {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function normalizeTier(value, tiers) {
  const normalized = String(value || "Unranked").trim();
  const match = tiers.find((tier) => tier.toLowerCase() === normalized.toLowerCase());
  if (match) return match;
  return "Unranked";
}

function render() {
  els.title.textContent = state.title;
  renderTierBoard();
  renderUnranked();
}

function renderTierBoard() {
  els.tierBoard.replaceChildren();
  state.tiers.forEach((tier) => {
    const lane = document.createElement("section");
    lane.className = "tier-lane";
    lane.dataset.tierLane = tier;

    const label = document.createElement("div");
    label.className = "tier-label";
    label.dataset.tier = tier;
    label.textContent = tier;

    const cards = document.createElement("div");
    cards.className = "tier-cards";
    cards.dataset.dropZone = tier;
    cards.dataset.tierCards = tier;

    const candidates = state.candidates.filter((candidate) => candidate.tier === tier);
    if (candidates.length) {
      candidates.forEach((candidate) => cards.append(createCandidateCard(candidate)));
    } else {
      const empty = document.createElement("div");
      empty.className = "tier-empty";
      empty.textContent = "drop";
      cards.append(empty);
    }

    lane.append(label, cards);
    els.tierBoard.append(lane);
  });
}

function renderUnranked() {
  const unranked = state.candidates.filter((candidate) => candidate.tier === "Unranked");
  els.unrankedList.replaceChildren();
  unranked.forEach((candidate) => els.unrankedList.append(createCandidateRow(candidate)));
  els.unrankedCount.textContent = `${unranked.length} ${unranked.length === 1 ? "candidate" : "candidates"}`;
}

function createCandidateCard(candidate) {
  const card = document.createElement("article");
  card.className = "candidate-card";
  card.dataset.candidateId = candidate.id;
  card.dataset.draggableCandidate = candidate.id;
  card.innerHTML = `
    <img src="${escapeAttr(candidate.image)}" alt="${escapeAttr(candidate.name)} image">
    <span class="score-pill" data-score-pill="${escapeAttr(candidate.id)}">${overallScore(candidate)}</span>
    <h3>${escapeHtml(candidate.name)}</h3>
  `;
  attachPointer(card, candidate.id);
  return card;
}

function createCandidateRow(candidate) {
  const row = document.createElement("article");
  row.className = "candidate-row";
  row.dataset.candidateId = candidate.id;
  row.dataset.draggableCandidate = candidate.id;
  row.innerHTML = `
    <img src="${escapeAttr(candidate.image)}" alt="${escapeAttr(candidate.name)} image">
    <div>
      <h3>${escapeHtml(candidate.name)}</h3>
      <p>${escapeHtml(candidate.description)}</p>
    </div>
    <span class="score-pill" data-score-pill="${escapeAttr(candidate.id)}">${overallScore(candidate)}</span>
  `;
  attachPointer(row, candidate.id);
  return row;
}

function attachPointer(element, candidateId) {
  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button,input,textarea")) return;
    event.preventDefault();
    drag = {
      candidateId,
      source: element,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      ghost: null,
      activeZone: null
    };
    element.setPointerCapture?.(event.pointerId);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp, { once: true });
  });
}

function onPointerMove(event) {
  if (!drag) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  const distance = Math.hypot(dx, dy);

  if (!drag.moved && distance > 6) {
    drag.moved = true;
    drag.ghost = drag.source.cloneNode(true);
    drag.ghost.classList.add("drag-ghost");
    drag.source.classList.add("drag-hidden");
    document.body.append(drag.ghost);
  }

  if (!drag.moved) return;
  drag.ghost.style.left = `${event.clientX}px`;
  drag.ghost.style.top = `${event.clientY}px`;

  const zone = dropZoneFromPoint(event.clientX, event.clientY);
  setActiveDropZone(zone);
}

function onPointerUp(event) {
  if (!drag) return;

  document.removeEventListener("pointermove", onPointerMove);
  setActiveDropZone(null);

  const wasDrag = drag.moved;
  const candidateId = drag.candidateId;
  const zone = wasDrag ? dropZoneFromPoint(event.clientX, event.clientY) : null;

  drag.ghost?.remove();
  drag.source.classList.remove("drag-hidden");
  drag = null;

  if (wasDrag && zone) {
    moveCandidate(candidateId, zone.dataset.dropZone);
  } else if (!wasDrag) {
    openModal(candidateId);
  }
}

function dropZoneFromPoint(x, y) {
  const element = document.elementFromPoint(x, y);
  return element?.closest("[data-drop-zone]") || null;
}

function setActiveDropZone(zone) {
  if (drag?.activeZone === zone) return;
  document.querySelectorAll(".drop-active").forEach((element) => element.classList.remove("drop-active"));
  if (zone) zone.classList.add("drop-active");
  if (drag) drag.activeZone = zone;
}

function moveCandidate(candidateId, tier) {
  const candidate = getCandidate(candidateId);
  if (!candidate) return;
  candidate.tier = normalizeTier(tier, state.tiers);
  renderTierBoard();
  renderUnranked();
  syncConfigFromState();
}

function openModal(candidateId) {
  const candidate = getCandidate(candidateId);
  if (!candidate) return;
  state.selectedId = candidateId;
  els.app.classList.add("modal-open");
  els.modal.hidden = false;
  renderModal(candidate);
}

function closeModal() {
  state.selectedId = null;
  els.app.classList.remove("modal-open");
  els.modal.hidden = true;
}

function renderModal(candidate) {
  const commonMax = state.facets.every((facet) => facet.max === state.facets[0]?.max)
    ? state.facets[0]?.max
    : null;
  const reviewRows = state.facets.map((facet) => {
    const value = candidate.scores[facet.name] ?? 0;
    const id = `facet-${slugify(facet.name)}`;
    const percent = Math.round((clamp(value, 0, facet.max) / facet.max) * 100);
    return `
      <tr>
        <th scope="row">
          <div class="review-feature-heading">
            <label for="${escapeAttr(id)}">${escapeHtml(facet.name)}</label>
            <span>Weight ${escapeHtml(formatNumber(facet.weight))}</span>
          </div>
          <div class="score-meter" aria-hidden="true">
            <span data-score-meter="${escapeAttr(facet.name)}" style="width: ${percent}%"></span>
          </div>
        </th>
        <td>
          <input id="${escapeAttr(id)}" type="number" min="0" max="${facet.max}" step="1" inputmode="numeric"
            autocomplete="off" autocapitalize="off" spellcheck="false"
            data-bwignore="true" data-lpignore="true" data-1p-ignore
            value="${escapeAttr(String(value))}" aria-label="${escapeAttr(`${facet.name} score out of ${facet.max}`)}"
            data-score-input="${escapeAttr(facet.name)}">
        </td>
      </tr>
    `;
  }).join("");
  const scoreLabel = commonMax
    ? `Score <span>/ ${escapeHtml(formatNumber(commonMax))}</span>`
    : "Score";
  const rank = overallRank(candidate);

  els.detailCard.innerHTML = `
    <div class="detail-media">
      <img src="${escapeAttr(candidate.image)}" alt="${escapeAttr(candidate.name)} image">
    </div>
    <div class="detail-body">
      <button class="modal-close" type="button" aria-label="Close">x</button>
      <div class="detail-meta">
        <div class="detail-kicker" data-modal-score>OVERALL ${overallScore(candidate)}</div>
        <div class="rank-kicker" data-modal-rank>${escapeHtml(formatRank(rank))}</div>
      </div>
      <h2 data-modal-title>${escapeHtml(candidate.name)}</h2>
      <p class="detail-description">${escapeHtml(candidate.description)}</p>
      <div class="review-table-wrap" aria-label="Review feature scores">
        <table class="review-table">
          <thead>
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">${scoreLabel}</th>
            </tr>
          </thead>
          <tbody>
            ${reviewRows}
          </tbody>
        </table>
      </div>
    </div>
  `;

  fitModalTitle();
  els.detailCard.querySelector(".modal-close").addEventListener("click", closeModal);
  els.detailCard.querySelectorAll("[data-score-input]").forEach((input) => {
    input.addEventListener("input", () => {
      const facetName = input.dataset.scoreInput;
      const facet = state.facets.find((item) => item.name === facetName);
      if (!input.value.trim()) return;
      candidate.scores[facetName] = clamp(toNumber(input.value, 0), 0, facet?.max ?? 10);
      input.value = candidate.scores[facetName];
      const meter = els.detailCard.querySelector(`[data-score-meter="${cssEscape(facetName)}"]`);
      if (meter && facet) {
        meter.style.width = `${Math.round((candidate.scores[facetName] / facet.max) * 100)}%`;
      }
      updateScoresForCandidate(candidate);
      syncConfigFromState();
    });
  });
}

function fitModalTitle() {
  const title = els.detailCard.querySelector("[data-modal-title]");
  if (!title) return;

  title.style.fontSize = "";
  const baseSize = parseFloat(window.getComputedStyle(title).fontSize) || 64;
  const minSize = 24;
  title.style.fontSize = `${baseSize}px`;

  const availableWidth = title.clientWidth;
  if (!availableWidth || title.scrollWidth <= availableWidth) return;

  let fittedSize = Math.max(minSize, Math.floor(baseSize * (availableWidth / title.scrollWidth)));
  title.style.fontSize = `${fittedSize}px`;

  while (title.scrollWidth > availableWidth && fittedSize > minSize) {
    fittedSize -= 1;
    title.style.fontSize = `${fittedSize}px`;
  }
}

function updateScoresForCandidate(candidate) {
  const score = overallScore(candidate);
  document.querySelectorAll(`[data-score-pill="${cssEscape(candidate.id)}"]`).forEach((pill) => {
    pill.textContent = score;
  });
  const modalScore = els.detailCard.querySelector("[data-modal-score]");
  if (modalScore) {
    modalScore.textContent = `OVERALL ${score}`;
  }
  const modalRank = els.detailCard.querySelector("[data-modal-rank]");
  if (modalRank) {
    modalRank.textContent = formatRank(overallRank(candidate));
  }
}

function overallScore(candidate) {
  const weighted = state.facets.reduce((total, facet) => {
    const value = clamp(toNumber(candidate.scores[facet.name], 0), 0, facet.max);
    return total + (value / facet.max) * 100 * facet.weight;
  }, 0);
  const weight = state.facets.reduce((total, facet) => total + facet.weight, 0) || 1;
  return Math.round(weighted / weight);
}

function overallRank(candidate) {
  const score = overallScore(candidate);
  const scores = state.candidates.map((item) => overallScore(item));
  const higher = scores.filter((itemScore) => itemScore > score).length;
  const tied = scores.filter((itemScore) => itemScore === score).length;
  return {
    rank: higher + 1,
    total: state.candidates.length,
    tied: tied > 1
  };
}

function formatRank(rank) {
  const label = rank.tied ? "TIED" : "RANK";
  return `${label} #${rank.rank} / ${rank.total}`;
}

function syncConfigFromState() {
  state.configText = exportMarkdown();
}

function exportMarkdown() {
  const facetHeader = "| Facet | Weight | Max |\n| --- | ---: | ---: |";
  const facetRows = state.facets
    .map((facet) => `| ${cell(facet.name)} | ${formatNumber(facet.weight)} | ${formatNumber(facet.max)} |`)
    .join("\n");

  const scoreHeaders = state.facets.map((facet) => facet.name);
  const candidateHeader = ["Name", "Image", "Description", "Tier", ...scoreHeaders];
  const candidateAlign = ["---", "---", "---", "---", ...scoreHeaders.map(() => "---:")];
  const candidateRows = state.candidates.map((candidate) => {
    const values = [
      candidate.name,
      candidate.image,
      candidate.description,
      candidate.tier,
      ...scoreHeaders.map((facet) => formatNumber(candidate.scores[facet] ?? 0))
    ];
    return `| ${values.map(cell).join(" | ")} |`;
  }).join("\n");

return `${state.title}

tiers: [${state.tiers.join(", ")}]

## Facets

${facetHeader}
${facetRows}

## Candidates

| ${candidateHeader.map(cell).join(" | ")} |
| ${candidateAlign.join(" | ")} |
${candidateRows}
`;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  els.app.append(toast);
  toastTimer = window.setTimeout(() => toast.remove(), 2300);
}

function getCandidate(candidateId) {
  return state.candidates.find((candidate) => candidate.id === candidateId);
}

function cell(value) {
  return String(value ?? "").replace(/\|/g, "/").trim();
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value) {
  return Number.isInteger(Number(value)) ? String(Number(value)) : String(Number(value).toFixed(2)).replace(/0+$/, "").replace(/\.$/, "");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "candidate";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}
