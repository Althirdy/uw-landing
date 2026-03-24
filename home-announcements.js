const HOME_API_BASE_URL = window.API_BASE_URL || "https://api.ddev.site";

const homeEls = {
  loading: document.getElementById("home-announcements-loading"),
  empty: document.getElementById("home-announcements-empty"),
  grid: document.getElementById("home-announcements-grid"),
};

function homeEscapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function homeFormatRelativeTime(isoDate) {
  if (!isoDate) return "Unknown date";

  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return "Unknown date";

  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  const diffMinutes = Math.floor(Math.abs(diffMs) / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(target);
}

function homeCategoryClass(rawCategory) {
  const category = (rawCategory || "general").toString().toLowerCase();
  if (category.includes("safe")) return "bg-primary/10 text-primary";
  if (category.includes("infra")) return "bg-tertiary/10 text-tertiary";
  if (category.includes("comm")) return "bg-secondary/10 text-secondary";
  return "bg-surface-container text-on-surface";
}

function homeCard(item) {
  const id = homeEscapeHtml(item.id || "");
  const category = homeEscapeHtml(item.category || "General");
  const title = homeEscapeHtml(item.title || "Untitled Announcement");
  const content = homeEscapeHtml(item.content || "No details available.");
  const dateLabel = homeEscapeHtml(homeFormatRelativeTime(item.publishedAt));
  const categoryClass = homeCategoryClass(item.category);
  const readMoreHref = `./Announcement/index.html?announcement=${encodeURIComponent(item.id || "")}&page=1`;

  return `
    <article class="reveal delay-200 bg-[#151b2a] rounded-2xl p-6 border border-outline-variant/10 hover:border-primary/50 transition-all group flex flex-col h-full" data-item-id="${id}">
      <div class="flex justify-between items-center mb-4 gap-3">
        <span class="px-3 py-1 rounded-full ${categoryClass} text-[10px] font-bold uppercase tracking-widest">${category}</span>
        <span class="text-on-surface-variant text-[11px]">${dateLabel}</span>
      </div>
      <h3 class="text-xl font-headline font-bold text-white mb-3 group-hover:text-primary transition-colors">${title}</h3>
      <p class="text-on-surface-variant text-sm leading-relaxed mb-6 flex-grow line-clamp-4">${content}</p>
      <a class="text-primary font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all" href="${readMoreHref}">
        Read More
        <span class="material-symbols-outlined text-sm">arrow_forward</span>
      </a>
    </article>
  `;
}

function homeSetVisibility({ loading = false, empty = false, grid = false }) {
  homeEls.loading.classList.toggle("hidden", !loading);
  homeEls.empty.classList.toggle("hidden", !empty);
  homeEls.grid.classList.toggle("hidden", !grid);
}

async function loadHomeAnnouncements() {
  if (!homeEls.loading || !homeEls.empty || !homeEls.grid) return;

  homeSetVisibility({ loading: true, empty: false, grid: false });

  try {
    const response = await fetch(`${HOME_API_BASE_URL}/api/v1/public/announcements?page=1&per_page=3`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload.data) ? payload.data : [];

    if (!items.length) {
      homeSetVisibility({ loading: false, empty: true, grid: false });
      return;
    }

    homeEls.grid.innerHTML = items.slice(0, 3).map(homeCard).join("");
    homeSetVisibility({ loading: false, empty: false, grid: true });
    if (window.observeReveals) window.observeReveals(homeEls.grid);
  } catch (error) {
    console.error("Home announcements fetch error:", error);
    homeEls.empty.textContent = "Unable to load announcements right now.";
    homeSetVisibility({ loading: false, empty: true, grid: false });
  }
}

window.addEventListener("DOMContentLoaded", loadHomeAnnouncements);
