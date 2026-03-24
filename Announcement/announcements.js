// Update this value per environment (local/staging/prod) as needed.
const API_BASE_URL = window.API_BASE_URL || "https://api.ddev.site";
const ANNOUNCEMENTS_PER_PAGE = 9;
const REQUEST_TIMEOUT_MS = 10000;
const SEARCH_DEBOUNCE_MS = 300;
const FALLBACK_IMAGE = "../assets/brgy-update.jpg";

const urlParams = new URLSearchParams(window.location.search);
const requestedAnnouncementId = urlParams.get("announcement");
const parsedInitialPage = Number.parseInt(urlParams.get("page") || "1", 10);
const initialPage = Number.isFinite(parsedInitialPage) && parsedInitialPage > 0 ? parsedInitialPage : 1;
const initialSearch = (urlParams.get("search") || "").trim();
const initialCategory = (urlParams.get("category") || "").trim().toLowerCase();

const state = {
  page: initialPage,
  total: 0,
  currentPage: initialPage,
  lastPage: 1,
  perPage: ANNOUNCEMENTS_PER_PAGE,
  items: [],
  openedFromQuery: false,
  search: initialSearch,
  category: initialCategory,
  categories: [],
};

const els = {
  grid: document.getElementById("announcement-grid"),
  loading: document.getElementById("announcement-loading"),
  empty: document.getElementById("announcement-empty"),
  emptyText: document.querySelector("#announcement-empty p"),
  error: document.getElementById("announcement-error"),
  retry: document.getElementById("announcement-retry"),
  pagination: document.getElementById("pagination-controls"),
  summary: document.getElementById("pagination-summary"),
  search: document.getElementById("announcement-search"),
  chips: document.getElementById("announcement-category-chips"),
  modal: document.getElementById("announcement-modal"),
  modalBackdrop: document.getElementById("announcement-modal-backdrop"),
  modalClose: document.getElementById("announcement-modal-close"),
  modalTitle: document.getElementById("modal-title"),
  modalMeta: document.getElementById("modal-meta"),
  modalCategory: document.getElementById("modal-category"),
  modalImage: document.getElementById("modal-image"),
  modalContent: document.getElementById("modal-content"),
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "General";

  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeCategory(value) {
  return String(value || "").trim().toLowerCase();
}

function formatPublishedDate(isoDate) {
  if (!isoDate) return "Unknown date";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);
}

function getCategoryStyle(rawCategory) {
  const category = normalizeCategory(rawCategory);

  if (category.includes("safe")) {
    return {
      textClass: "text-primary",
      badgeClass: "bg-primary/20 border-primary/30 text-primary",
    };
  }

  if (category.includes("infra")) {
    return {
      textClass: "text-tertiary",
      badgeClass: "bg-tertiary/20 border-tertiary/30 text-tertiary",
    };
  }

  if (category.includes("comm")) {
    return {
      textClass: "text-secondary",
      badgeClass: "bg-secondary/20 border-secondary/30 text-secondary",
    };
  }

  return {
    textClass: "text-on-surface",
    badgeClass: "bg-surface-container-high/60 border-outline-variant/40 text-on-surface",
  };
}

function setStateVisibility({ isLoading = false, isError = false, isEmpty = false }) {
  els.loading.classList.toggle("hidden", !isLoading);
  els.error.classList.toggle("hidden", !isError);
  els.empty.classList.toggle("hidden", !isEmpty);
  els.grid.classList.toggle("hidden", isLoading || isError || isEmpty);
}

function updateUrlState() {
  const params = new URLSearchParams(window.location.search);

  if (state.page > 1) params.set("page", String(state.page));
  else params.delete("page");

  if (state.search) params.set("search", state.search);
  else params.delete("search");

  if (state.category) params.set("category", state.category);
  else params.delete("category");

  if (requestedAnnouncementId && !state.openedFromQuery) {
    params.set("announcement", requestedAnnouncementId);
  } else {
    params.delete("announcement");
  }

  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", next);
}

function buildCard(item) {
  const safeTitle = escapeHtml(item.title || "Untitled Announcement");
  const safeContent = escapeHtml(item.content || "No details available.");
  const safeCategory = escapeHtml(toLabel(item.category || "General"));
  const safeId = escapeHtml(item.id || "N/A");
  const safeDate = escapeHtml(formatPublishedDate(item.publishedAt));
  const image = item.media || FALLBACK_IMAGE;
  const hasImage = Boolean(item.media);
  const styles = getCategoryStyle(item.category);

  return `
    <article class="announcement-card reveal active group relative flex flex-col card-glass overflow-hidden transition-all duration-500 hover:translate-y-[-4px]" data-item-id="${safeId}">
      <div class="aspect-video overflow-hidden relative">
        <img
          alt="${safeTitle}"
          class="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
          src="${escapeHtml(image)}"
          loading="lazy"
          onerror="this.onerror=null; this.src='${FALLBACK_IMAGE}'"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-[#0c1321] via-transparent to-transparent"></div>
        <div class="absolute top-4 left-4">
          <span class="px-3 py-1 backdrop-blur-md font-label text-[10px] font-black uppercase tracking-widest rounded-full border ${styles.badgeClass}">${safeCategory}</span>
        </div>
        ${hasImage ? "" : '<div class="absolute right-3 bottom-3 text-[10px] uppercase tracking-widest font-bold text-outline bg-surface-container/80 px-2 py-1 rounded">No media</div>'}
      </div>
      <div class="p-8 flex-grow flex flex-col">
        <time class="font-headline text-xs text-outline tracking-widest mb-4">${safeDate}</time>
        <h3 class="font-headline text-2xl font-bold text-white mb-4 leading-tight ${styles.textClass} transition-colors">${safeTitle}</h3>
        <p class="text-on-surface-variant body-md line-clamp-3 mb-8">${safeContent}</p>
        <div class="mt-auto pt-6 border-t border-outline-variant/10 flex items-center justify-between">
          <span class="font-label text-xs font-bold uppercase text-outline">Ref: ${safeId}</span>
          <button type="button" class="details-trigger ${styles.textClass} flex items-center gap-2 group/link" data-item-id="${safeId}">
            <span class="font-label text-xs font-bold uppercase tracking-widest">Details</span>
            <span class="material-symbols-outlined text-sm transition-transform group-hover/link:translate-x-1">arrow_forward</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderGrid(items) {
  if (!items.length) {
    if (els.emptyText) {
      els.emptyText.textContent = state.search || state.category
        ? "No announcements matched your current filter/search."
        : "Public announcements will appear here once published by your barangay team.";
    }
    setStateVisibility({ isEmpty: true });
    return;
  }

  els.grid.innerHTML = items.map(buildCard).join("");
  setStateVisibility({});
  if (window.observeReveals) window.observeReveals(els.grid);
}

function paginationWindow(current, last) {
  const pages = new Set([1, last]);
  for (let page = current - 2; page <= current + 2; page += 1) {
    if (page > 1 && page < last) pages.add(page);
  }
  return [...pages].sort((a, b) => a - b);
}

function buildPageButton(page, label = String(page), isActive = false, disabled = false) {
  const disabledAttrs = disabled ? "disabled aria-disabled=\"true\"" : "";
  const activeClasses = isActive
    ? "bg-primary text-on-primary border-primary"
    : "bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container";

  return `<button type="button" data-page="${page}" class="px-3 py-2 min-w-10 rounded-md border text-sm font-semibold transition-colors ${activeClasses}" ${disabledAttrs}>${label}</button>`;
}

function renderPagination() {
  const { currentPage, lastPage, perPage, total } = state;
  if (lastPage <= 1) {
    els.pagination.innerHTML = "";
  } else {
    const pages = paginationWindow(currentPage, lastPage);
    let html = buildPageButton(Math.max(1, currentPage - 1), "Prev", false, currentPage <= 1);

    pages.forEach((page, index) => {
      const prevPage = pages[index - 1];
      if (index > 0 && page - prevPage > 1) {
        html += '<span class="px-2 text-outline">...</span>';
      }
      html += buildPageButton(page, String(page), page === currentPage, false);
    });

    html += buildPageButton(Math.min(lastPage, currentPage + 1), "Next", false, currentPage >= lastPage);
    els.pagination.innerHTML = html;
  }

  const viewed = Math.min(currentPage * perPage, total);
  els.summary.textContent = `Showing ${viewed} of ${total} Total Notifications`;
}

function renderCategoryChips() {
  const dynamic = state.categories
    .filter((item) => item)
    .map((category) => {
      const safeValue = escapeHtml(category);
      const safeLabel = escapeHtml(toLabel(category));
      const isActive = normalizeCategory(state.category) === normalizeCategory(category);
      const activeClass = isActive
        ? "bg-primary text-on-primary"
        : "bg-surface-container-low text-on-surface-variant ghost-border hover:bg-surface-container";

      return `
        <button
          type="button"
          data-category="${safeValue}"
          class="category-chip px-6 py-2.5 rounded-full font-label text-xs font-bold uppercase tracking-widest transition-all ${activeClass}"
        >
          ${safeLabel}
        </button>
      `;
    })
    .join("");

  const allActive = state.category === "";
  const allClass = allActive
    ? "bg-primary text-on-primary"
    : "bg-surface-container-low text-on-surface-variant ghost-border hover:bg-surface-container";

  els.chips.innerHTML = `
    <button
      type="button"
      data-category=""
      class="category-chip px-6 py-2.5 rounded-full font-label text-xs font-bold uppercase tracking-widest transition-all ${allClass}"
    >
      All News
    </button>
    ${dynamic}
  `;
}

function openModal(item) {
  const category = toLabel(item.category || "General");
  els.modalCategory.textContent = category;
  els.modalTitle.textContent = item.title || "Untitled Announcement";
  els.modalMeta.textContent = `${formatPublishedDate(item.publishedAt)} • ${item.publishedBy || "Barangay 176-E"}`;
  els.modalContent.textContent = item.content || "No details available.";

  if (item.media) {
    els.modalImage.src = item.media;
    els.modalImage.classList.remove("hidden");
  } else {
    els.modalImage.removeAttribute("src");
    els.modalImage.classList.add("hidden");
  }

  els.modal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function closeModal() {
  els.modal.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

function openModalFromQueryIfNeeded() {
  if (!requestedAnnouncementId || state.openedFromQuery) return;

  const matchedItem = state.items.find((item) => String(item.id) === String(requestedAnnouncementId));
  if (!matchedItem) return;

  openModal(matchedItem);
  state.openedFromQuery = true;
  updateUrlState();
}

async function fetchAnnouncements(page = 1) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(ANNOUNCEMENTS_PER_PAGE),
  });

  if (state.search) params.set("search", state.search);
  if (state.category) params.set("category", state.category);

  const url = `${API_BASE_URL}/api/v1/public/announcements?${params.toString()}`;

  try {
    setStateVisibility({ isLoading: true });

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload.data) ? payload.data : [];
    const pagination = payload.pagination || {};
    const categories = Array.isArray(payload?.meta?.categories) ? payload.meta.categories : [];

    state.items = items;
    state.currentPage = Number(pagination.current_page || page);
    state.lastPage = Number(pagination.last_page || 1);
    state.perPage = Number(pagination.per_page || ANNOUNCEMENTS_PER_PAGE);
    state.total = Number(pagination.total || items.length);
    state.page = state.currentPage;
    state.categories = categories.map((item) => normalizeCategory(item)).filter(Boolean);

    renderCategoryChips();
    renderGrid(items);
    renderPagination();
    openModalFromQueryIfNeeded();
    updateUrlState();
  } catch (error) {
    console.error("Announcement fetch error:", error);
    setStateVisibility({ isError: true });
    els.summary.textContent = "Unable to fetch announcements";
    els.pagination.innerHTML = "";
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function debounce(fn, waitMs) {
  let timeoutId;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), waitMs);
  };
}

function attachEvents() {
  els.retry.addEventListener("click", () => {
    fetchAnnouncements(state.page);
  });

  els.search.value = state.search;

  const debouncedSearch = debounce(() => {
    const next = els.search.value.trim();
    state.search = next;
    state.page = 1;
    fetchAnnouncements(1);
  }, SEARCH_DEBOUNCE_MS);

  els.search.addEventListener("input", debouncedSearch);

  els.chips.addEventListener("click", (event) => {
    const chip = event.target.closest(".category-chip");
    if (!chip) return;

    state.category = normalizeCategory(chip.dataset.category || "");
    state.page = 1;
    fetchAnnouncements(1);
  });

  els.pagination.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page]");
    if (!button || button.disabled) return;
    const nextPage = Number(button.dataset.page);
    if (Number.isNaN(nextPage) || nextPage === state.page) return;
    fetchAnnouncements(nextPage);
  });

  els.grid.addEventListener("click", (event) => {
    const trigger = event.target.closest(".details-trigger");
    const card = event.target.closest(".announcement-card");
    const itemId = trigger?.dataset.itemId || card?.dataset.itemId;
    if (!itemId) return;

    const item = state.items.find((entry) => String(entry.id) === String(itemId));
    if (item) openModal(item);
  });

  els.modalClose.addEventListener("click", closeModal);
  els.modalBackdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.modal.classList.contains("hidden")) {
      closeModal();
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  attachEvents();
  fetchAnnouncements(initialPage);
});
