async function loadSharedLayout() {
  const root = document.body.dataset.root || ".";
  const page = document.body.dataset.page || "";
  const pathname = window.location.pathname.replace(/\\/g, "/");
  const isAnnouncementPage = page === "announcements";
  const isHomePage = !isAnnouncementPage && (pathname.endsWith("/index.html") || pathname.endsWith("/") || pathname === "");

  const navLinks = [];
  const setActiveNav = (key) => {
    navLinks.forEach((link) => {
      const isActive = link.dataset.nav === key;
      link.classList.toggle("text-primary", isActive);
      link.classList.toggle("text-slate-400", !isActive);
    });
  };

  const loadFragment = async (slotId, fragmentPath) => {
    const slot = document.getElementById(slotId);
    if (!slot) return;

    const response = await fetch(fragmentPath, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load ${fragmentPath}: ${response.status}`);
    }

    const html = (await response.text()).replaceAll("{{ROOT}}", root);
    slot.innerHTML = html;
  };

  await Promise.all([
    loadFragment("site-header", `${root}/components/header.html`),
    loadFragment("site-footer", `${root}/components/footer.html`),
  ]);

  document.querySelectorAll("#site-header .nav-link").forEach((link) => {
    navLinks.push(link);
  });

  if (!navLinks.length) return;

  if (isAnnouncementPage) {
    setActiveNav("announcements");
    return;
  }

  if (!isHomePage) {
    if (page) setActiveNav(page);
    return;
  }

  const sectionTargets = [
    { id: "features", nav: "features" },
    { id: "how-it-works", nav: "how-it-works" },
  ]
    .map((item) => ({ ...item, el: document.getElementById(item.id) }))
    .filter((item) => item.el);

  const hashNavMap = {
    "#features": "features",
    "#how-it-works": "how-it-works",
  };

  const setActiveByScroll = () => {
    let active = "features";
    const threshold = window.scrollY + 130;
    sectionTargets.forEach((item) => {
      if (item.el.offsetTop <= threshold) active = item.nav;
    });
    setActiveNav(active);
  };

  if (hashNavMap[window.location.hash]) {
    setActiveNav(hashNavMap[window.location.hash]);
  } else {
    setActiveByScroll();
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      setActiveByScroll();
      ticking = false;
    });
  });

  window.addEventListener("hashchange", () => {
    const mapped = hashNavMap[window.location.hash];
    if (mapped) setActiveNav(mapped);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  loadSharedLayout().catch((error) => {
    console.error("Shared layout failed to load:", error);
  });
});
