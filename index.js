const observerOptions = {
  root: null,
  rootMargin: "0px",
  threshold: 0.15,
};

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("active");
      entry.target.querySelectorAll(".reveal:not(.active)").forEach((el) => {
        el.classList.add("active");
      });
    }
  });
}, observerOptions);

function observeReveals(scope = document) {
  scope.querySelectorAll(".reveal").forEach((el) => {
    if (el.dataset.revealBound === "1") return;
    el.dataset.revealBound = "1";
    revealObserver.observe(el);
  });
}

window.observeReveals = observeReveals;

observeReveals(document);

window.addEventListener("load", () => {
  document.querySelectorAll(".reveal").forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      section.classList.add("active");
      section.querySelectorAll(".reveal").forEach((el) => el.classList.add("active"));
    }
  });
});
