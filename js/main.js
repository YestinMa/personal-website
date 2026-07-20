document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const navigation = document.querySelector(".site-nav");

  if (toggle && navigation) {
    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isOpen));
      navigation.classList.toggle("is-open", !isOpen);
    });

    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        toggle.setAttribute("aria-expanded", "false");
        navigation.classList.remove("is-open");
      });
    });
  }

  const name = document.querySelector(".display-name");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!name || reduceMotion.matches) return;

  let frame = 0;
  let targetX = 0;
  let targetY = 0;

  // 将指针位置映射到极小位移，并通过动画帧合并高频事件，保持排版稳定。
  const renderOffset = () => {
    name.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
    frame = 0;
  };

  window.addEventListener("pointermove", (event) => {
    targetX = ((event.clientX / window.innerWidth) - 0.5) * 8;
    targetY = ((event.clientY / window.innerHeight) - 0.5) * 8;
    if (!frame) frame = window.requestAnimationFrame(renderOffset);
  }, { passive: true });

  document.addEventListener("mouseleave", () => {
    targetX = 0;
    targetY = 0;
    if (!frame) frame = window.requestAnimationFrame(renderOffset);
  });
});

(() => {
  const currentMainScript = document.currentScript;
  if (!(currentMainScript instanceof HTMLScriptElement)) return;
  const siteRoot = new URL("../", currentMainScript.src);

  document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector('link[data-desktop-pet-style]')) return;
    const petStyles = document.createElement("link");
    petStyles.rel = "stylesheet";
    petStyles.href = new URL("css/desktop-pet.css?v=1.8.2", siteRoot).href;
    petStyles.dataset.desktopPetStyle = "true";
    const petModuleUrl = new URL("js/desktop-pet.js?v=1.8.2", siteRoot).href;
    // 样式就绪后再加载组件，避免慢速网络下未应用 CSS 的桌宠短暂闪现。
    petStyles.addEventListener("load", () => {
      void import(petModuleUrl).catch((error) => console.error(`桌宠模块加载失败：${petModuleUrl}`, error));
    }, { once: true });
    petStyles.addEventListener("error", () => {
      console.error(`桌宠样式加载失败：${petStyles.href}`);
    }, { once: true });
    document.head.append(petStyles);
  });
})();
