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

function collectHeadingEntries() {
  const headings = [...document.querySelectorAll(".article-content h1, .article-content h2, .article-content h3, .article-content h4")];
  const usedIds = new Set(headings.map((heading) => heading.id).filter(Boolean));
  const rootLevel = headings.length
    ? Math.min(...headings.map((heading) => Number(heading.tagName.slice(1))))
    : null;
  let chapterId = "";

  return {
    headings,
    rootLevel,
    entries: headings.map((heading) => {
      heading.id = heading.id || buildHeadingId(heading.textContent, usedIds);
      const level = Number(heading.tagName.slice(1));
      if (level === rootLevel) chapterId = heading.id;
      return { heading, id: heading.id, label: heading.textContent.trim(), level, chapterId };
    }),
  };
}

function createTocLink(entry, rootLevel) {
  const link = document.createElement("a");
  link.href = `#${entry.id}`;
  link.textContent = entry.label;
  link.dataset.headingId = entry.id;
  link.dataset.chapterId = entry.chapterId;
  if (entry.level === rootLevel) link.dataset.tocRoot = "true";
  return link;
}

function populateFlatToc(entries, rootLevel) {
  document.querySelectorAll("[data-toc-list]").forEach((target) => {
    target.replaceChildren(...entries.map((entry) => (
      createNavItem(createTocLink(entry, rootLevel), `toc-level-${entry.level}`)
    )));
  });
}

function populateHierarchicalToc(entries, rootLevel) {
  // 先按标题级别生成树，再为桌面与移动目录分别渲染，避免只靠缩进表达层次。
  const roots = [];
  const stack = [];
  entries.forEach((entry) => {
    const node = { ...entry, children: [] };
    while (stack.length && stack.at(-1).level >= node.level) stack.pop();
    if (stack.length) stack.at(-1).children.push(node);
    else roots.push(node);
    stack.push(node);
  });

  const renderNodes = (nodes) => nodes.map((node) => {
    const item = createNavItem(createTocLink(node, rootLevel), `toc-level-${node.level}`);
    if (node.level === rootLevel) item.classList.add("toc-chapter");
    if (node.children.length) {
      const nested = document.createElement("ol");
      nested.className = "toc-children";
      nested.append(...renderNodes(node.children));
      item.append(nested);
    }
    return item;
  });

  document.querySelectorAll("[data-toc-list]").forEach((target) => {
    target.replaceChildren(...renderNodes(roots));
  });
}

function splitContentIntoChapters(content, entries, rootLevel) {
  const rootIds = new Set(entries.filter((entry) => entry.level === rootLevel).map((entry) => entry.id));
  const originalNodes = [...content.childNodes];
  const preface = [];
  const sections = [];
  const fragment = document.createDocumentFragment();
  let currentSection = null;

  // 每个最高级标题开始一个章节；标题前的来源说明并入第一章，保证原文顺序不变。
  originalNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && rootIds.has(node.id)) {
      currentSection = document.createElement("section");
      currentSection.className = "article-chapter";
      currentSection.dataset.chapterId = node.id;
      currentSection.setAttribute("aria-labelledby", node.id);
      if (!sections.length) currentSection.append(...preface);
      currentSection.append(node);
      sections.push(currentSection);
      fragment.append(currentSection);
      return;
    }

    if (currentSection) currentSection.append(node);
    else preface.push(node);
  });

  if (!sections.length) return [];
  content.replaceChildren(fragment);
  return sections;
}

function addConstructionPlaceholder(container) {
  // 只在没有正文、公式或媒体内容时占位；章节标题本身不算正文。
  const contentNodes = container.querySelectorAll("p, li, blockquote, pre, figure, table, .math-block, img, video, audio, iframe");
  const hasContent = [...contentNodes].some((node) => (
    node.textContent.trim() || node.matches("img, video, audio, iframe") || node.querySelector("img, video, audio, iframe")
  ));
  if (hasContent) return;

  const placeholder = document.createElement("p");
  placeholder.className = "article-construction-placeholder";
  placeholder.textContent = ".U・ᴥ・U 正在施工中.....";
  container.append(placeholder);
}

function readHashId() {
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return window.location.hash.slice(1);
  }
}

function initializeChapterNavigation(entries, rootLevel) {
  const content = document.querySelector(".article-content");
  if (!content || rootLevel === null) return;

  const chapters = entries.filter((entry) => entry.level === rootLevel);
  const sections = splitContentIntoChapters(content, entries, rootLevel);
  if (!sections.length) return;
  sections.forEach(addConstructionPlaceholder);

  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const sectionById = new Map(sections.map((section) => [section.dataset.chapterId, section]));
  const pagination = document.querySelector("[data-chapter-pagination]");
  const previousLink = document.querySelector("[data-chapter-prev]");
  const nextLink = document.querySelector("[data-chapter-next]");
  let observer = null;
  let activeChapterId = "";

  const updateTocState = (headingId, chapterId) => {
    document.querySelectorAll("[data-heading-id]").forEach((link) => {
      const isActive = link.dataset.headingId === headingId;
      link.classList.toggle("is-active", isActive);
      link.classList.toggle(
        "is-current-chapter",
        link.dataset.tocRoot === "true" && link.dataset.headingId === chapterId,
      );
      if (isActive) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const setPagerLink = (link, chapter, titleTarget) => {
    link.hidden = !chapter;
    if (!chapter) return;
    link.href = `#${chapter.id}`;
    link.dataset.chapterTarget = chapter.id;
    titleTarget.textContent = chapter.label;
  };

  const updatePagination = (chapterId) => {
    if (!pagination || !previousLink || !nextLink) return;
    const index = chapters.findIndex((chapter) => chapter.id === chapterId);
    pagination.hidden = chapters.length < 2;
    setPagerLink(previousLink, chapters[index - 1], previousLink.querySelector("strong"));
    setPagerLink(nextLink, chapters[index + 1], nextLink.querySelector("strong"));
  };

  const observeCurrentChapter = (section) => {
    if (observer) observer.disconnect();
    if (!("IntersectionObserver" in window)) return;
    observer = new IntersectionObserver((observedEntries) => {
      const visible = observedEntries.find((observed) => observed.isIntersecting);
      if (visible) updateTocState(visible.target.id, activeChapterId);
    }, { rootMargin: "-12% 0px -72%", threshold: 0 });
    section.querySelectorAll("h1, h2, h3, h4").forEach((heading) => observer.observe(heading));
  };

  const activate = (requestedId, shouldScroll = false) => {
    const requestedEntry = entryById.get(requestedId);
    const chapterId = requestedEntry?.chapterId || chapters[0].id;
    const targetId = requestedEntry?.id || chapterId;
    const activeSection = sectionById.get(chapterId);
    if (!activeSection) return;

    sections.forEach((section) => {
      const isCurrent = section === activeSection;
      section.hidden = !isCurrent;
      section.toggleAttribute("inert", !isCurrent);
    });
    activeChapterId = chapterId;
    updateTocState(targetId, chapterId);
    updatePagination(chapterId);
    observeCurrentChapter(activeSection);

    if (shouldScroll) {
      const target = document.getElementById(targetId);
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      requestAnimationFrame(() => target?.scrollIntoView({ behavior, block: "start" }));
    }
  };

  const navigate = (targetId) => {
    window.history.pushState(null, "", `#${encodeURIComponent(targetId)}`);
    activate(targetId, true);
    document.querySelectorAll(".article-mobile-nav details[open]").forEach((details) => {
      details.open = false;
    });
  };

  document.querySelector(".article-layout")?.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-heading-id], a[data-chapter-target]");
    if (!link) return;
    event.preventDefault();
    navigate(link.dataset.headingId || link.dataset.chapterTarget);
  });

  window.addEventListener("hashchange", () => activate(readHashId(), true));
  activate(readHashId(), Boolean(window.location.hash));
}

function populateArticleNavigation() {
  const { entries, headings, rootLevel } = collectHeadingEntries();
  if (!entries.length) {
    if (document.body.classList.contains("article-notes-page")) {
      const content = document.querySelector(".article-content");
      if (content) addConstructionPlaceholder(content);
    }
    // 空白占位笔记暂不显示无内容的章节栏，添加标题后会自动恢复。
    document.querySelectorAll("[data-toc-list]").forEach((list) => {
      const container = list.closest("aside, details");
      if (container) container.hidden = true;
    });
    return;
  }

  if (document.body.classList.contains("article-notes-page")) {
    // 笔记目录只展示章节与其下一层知识点，三级标题仍保留正文锚点。
    populateHierarchicalToc(entries.filter((entry) => entry.level <= rootLevel + 1), rootLevel);
    initializeChapterNavigation(entries, rootLevel);
    return;
  }

  populateFlatToc(entries, rootLevel);
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver((observedEntries) => {
    observedEntries.forEach((entry) => {
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

document.addEventListener("DOMContentLoaded", populateNoteNavigation);

// KaTeX 在 DOMContentLoaded 阶段替换标题内容，页面 load 后再读取可避免目录泄漏公式定界符。
if (document.readyState === "complete") {
  populateArticleNavigation();
} else {
  window.addEventListener("load", populateArticleNavigation, { once: true });
}


function initializeReadingFigures() {
  const occurrences = new Map();
  const scales = { small: 0.6, medium: 1, large: 1.65 };
  document.querySelectorAll(".article-content figure > img, .article-content figure > a > img").forEach((img) => {
    const figure = img.closest("figure");
    // 历史文章直接嵌入 img；保留图注和现有链接，只为本地裸图补原图入口。
    if (img.parentElement === figure && img.getAttribute("src")?.startsWith("../content/assets/")) {
      const link = document.createElement("a");
      link.href = img.src;
      link.target = "_blank";
      link.rel = "noopener";
      link.setAttribute("aria-label", "查看原图（新窗口）");
      img.replaceWith(link);
      link.append(img);
    }
    const src = img.getAttribute("src");
    const occurrence = occurrences.get(src) || 0;
    occurrences.set(src, occurrence + 1);
    const key = JSON.stringify(["figure-width", location.pathname, src, occurrence]);
    const frame = document.createElement("div");
    frame.className = "picture-frame";
    const media = img.closest("a") || img;
    media.replaceWith(frame);
    frame.append(media);
    let scale = 1;
    try {
      const width = Number(localStorage.getItem(key));
      if (width > 0 && Number.isFinite(width)) frame.style.width = width + "px";
      scale = scales[localStorage.getItem("article-picture:" + src)] || 1;
    } catch { /* 本地存储不可用时仍允许拖动。 */ }
    function initialSize() {
      if (!img.naturalWidth || frame.style.width) return;
      const base = Number(figure.dataset.notionWidth);
      frame.style.width = base ? (base * scale) + "px" :
        `min(${80 * scale}%, ${img.naturalWidth * scale}px, ${54 * scale * img.naturalWidth / img.naturalHeight}svh)`;
    }
    img.addEventListener("load", initialSize, {once:true});
    initialSize();
    function resize(width) {
      frame.style.width = Math.min(figure.clientWidth, Math.max(32, width)) + "px";
    }
    function save() {
      try { localStorage.setItem(key, parseFloat(frame.style.width)); }
      catch { frame.title = "浏览器未允许保存；本次调整仅在当前页面有效"; }
    }
    for (const side of [-1, 1]) {
      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "picture-grip " + (side < 0 ? "left" : "right");
      handle.title = "拖动调整图幅，也可使用左右方向键";
      handle.setAttribute("aria-label", (side < 0 ? "左" : "右") + "侧图幅调节柄");
      frame.append(handle);
      let drag;
      handle.onpointerdown = e => {
        if (!e.isPrimary || e.button !== 0) return;
        drag = [e.clientX, frame.getBoundingClientRect().width, frame.style.width];
        handle.setPointerCapture(e.pointerId);
        frame.classList.add("dragging");
        e.preventDefault();
      };
      // 图片始终居中，边缘移动一像素相当于总宽度变化两像素。
      handle.onpointermove = e => {
        if (drag && handle.hasPointerCapture(e.pointerId)) resize(drag[1] + 2 * side * (e.clientX - drag[0]));
      };
      handle.onpointerup = e => {
        if (!drag || !handle.hasPointerCapture(e.pointerId)) return;
        if (e.clientX !== drag[0]) { resize(drag[1] + 2 * side * (e.clientX - drag[0])); save(); }
        else frame.style.width = drag[2];
        drag = null;
        frame.classList.remove("dragging");
      };
      handle.onlostpointercapture = () => {
        if (drag) frame.style.width = drag[2];
        drag = null;
        frame.classList.remove("dragging");
      };
      handle.onkeydown = e => {
        if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
        e.preventDefault();
        resize(frame.getBoundingClientRect().width + (e.key === "ArrowRight" ? 1 : -1) * side * 12);
        save();
      };
    }
  });
}
document.addEventListener("DOMContentLoaded", initializeReadingFigures);

// 小屏阅读正文时给文字让出右下角，滚回页首或页尾后恢复桌宠。
const readingContent = document.querySelector(".article-notes-page .article-content");
if (readingContent && "IntersectionObserver" in window) {
  new IntersectionObserver(([entry]) => {
    document.body.classList.toggle("reading-body", entry.isIntersecting);
  }, { rootMargin: "0px 0px -12% 0px" }).observe(readingContent);
}
