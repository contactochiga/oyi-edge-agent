(function () {
  const root = document.documentElement;
  const cards = Array.from(document.querySelectorAll("[data-scene]"));
  const nodes = Array.from(document.querySelectorAll(".infra-node"));

  function updateScroll() {
    const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / max));
    root.style.setProperty("--scroll", progress.toFixed(4));
    let activeScene = 0;
    cards.forEach(function (card, index) {
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.58) activeScene = index;
    });
    root.style.setProperty("--scene", String(activeScene));
    document.body.dataset.scene = String(activeScene);
  }

  function selectZone(name) {
    document.body.dataset.activeZone = name;
    nodes.forEach(function (node) {
      node.classList.toggle("selected", String(node.dataset.zone || "").toLowerCase().includes(name));
    });
  }

  document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-zone-button]");
    if (!button) return;
    selectZone(button.getAttribute("data-zone-button") || "");
  });

  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("resize", updateScroll);
  updateScroll();
})();
