function formatDate(value) {
  if (!value) return "Undated";
  return String(value).slice(0, 10).replaceAll("-", ".");
}

function renderList(listId, items) {
  const list = document.getElementById(listId);
  if (!list) return;

  if (!items.length) {
    list.innerHTML = '<li class="empty-state">No published content yet.</li>';
    return;
  }

  list.innerHTML = items.map((item, index) => `
    <li>
      <a href="${item.href}">
        <span class="item-number">${String(index + 1).padStart(2, "0")}</span>
        <span class="content-title">${item.title}</span>
        <span class="content-meta">${item.category || item.kind}<br>${formatDate(item.date)}</span>
        <span class="row-arrow" aria-hidden="true">↗</span>
      </a>
    </li>
  `).join("");
}

async function loadContentIndex() {
  const status = document.querySelector(".sync-status");

  try {
    const response = await fetch("content/index.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Content index returned ${response.status}`);

    const data = await response.json();
    const notes = Array.isArray(data.notes) ? data.notes : [];
    const blogs = Array.isArray(data.blog) ? data.blog : [];
    renderList("notes-list", notes);
    renderList("blog-list", blogs);
    document.getElementById("notes-count").textContent = String(notes.length).padStart(2, "0");
    document.getElementById("blogs-count").textContent = String(blogs.length).padStart(2, "0");

    if (status) status.textContent = `Archive updated ${formatDate(data.generatedAt)}.`;
  } catch (error) {
    renderList("notes-list", []);
    renderList("blog-list", []);
    if (status) status.textContent = "The content archive is temporarily unavailable.";
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", loadContentIndex);
