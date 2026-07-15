function createNavItem(link, className = "") {
  const item = document.createElement("li");
  if (className) item.className = className;
  item.append(link);
  return item;
}

function buildHeadingId(text, usedIds) {
  const base = text
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

  // 同名标题依次追加序号，确保目录链接在长笔记中仍然唯一且稳定。
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) id = `${base}-${suffix++}`;
  usedIds.add(id);
  return id;
}

function populateToc() {
  const headings = [...document.querySelectorAll(".article-content h1, .article-content h2, .article-content h3")];
  const targets = document.querySelectorAll("[data-toc-list]");
  const usedIds = new Set();

  const links = headings.map((heading) => {
    heading.id = heading.id || buildHeadingId(heading.textContent, usedIds);
    return { id: heading.id, label: heading.textContent, level: heading.tagName.slice(1) };
  });

  targets.forEach((target) => {
    target.replaceChildren(...links.map((entry) => {
      const link = document.createElement("a");
      link.href = `#${entry.id}`;
      link.textContent = entry.label;
      link.dataset.headingId = entry.id;
      return createNavItem(link, `toc-level-${entry.level}`);
    }));
  });

  if (!("IntersectionObserver" in window) || !headings.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      document.querySelectorAll("[data-heading-id]").forEach((link) => {
        link.classList.toggle("is-active", link.dataset.headingId === entry.target.id);
      });
    });
  }, { rootMargin: "-12% 0px -72%", threshold: 0 });
  headings.forEach((heading) => observer.observe(heading));
}

async function populateNoteNavigation() {
  const targets = document.querySelectorAll("[data-note-list]");
  if (!targets.length) return;

  try {
    const response = await fetch("../content/index.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Content index returned ${response.status}`);
    const data = await response.json();
    const currentFile = decodeURIComponent(window.location.pathname.split("/").pop());
    const notes = Array.isArray(data.notes) ? data.notes : [];

    targets.forEach((target) => {
      target.replaceChildren(...notes.map((note) => {
        const link = document.createElement("a");
        const fileName = decodeURIComponent(note.href.split("/").pop());
        link.href = `../${note.href}`;
        link.textContent = note.title;
        if (fileName === currentFile) {
          link.classList.add("is-active");
          link.setAttribute("aria-current", "page");
        }
        return createNavItem(link);
      }));
    });
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  populateToc();
  populateNoteNavigation();
});
