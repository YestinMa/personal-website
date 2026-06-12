function formatDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function renderList(listId, items) {
  const list = document.getElementById(listId);
  if (!list) return;

  if (!items.length) {
    list.innerHTML = '<li class="empty-state">No published content yet.</li>';
    return;
  }

  list.innerHTML = items
    .map(
      (item) => `
        <li>
          <a href="${item.href}">
            <span class="content-title">${item.title}</span>
            <span class="content-date">${formatDate(item.date)}</span>
          </a>
        </li>
      `,
    )
    .join("");
}

async function loadContentIndex() {
  const note = document.querySelector(".notion-note");

  try {
    const response = await fetch("content/index.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load content index: ${response.status}`);
    }

    const data = await response.json();
    renderList("blog-list", data.blog || []);
    renderList("notes-list", data.notes || []);

    if (note) {
      const blogCount = Array.isArray(data.blog) ? data.blog.length : 0;
      const notesCount = Array.isArray(data.notes) ? data.notes.length : 0;
      const lastSync = formatDate(data.generatedAt) || "Not synced yet";
      note.textContent = `Synced from Notion: ${blogCount} blog item(s), ${notesCount} note item(s). Last sync: ${lastSync}.`;
    }
  } catch (error) {
    renderList("blog-list", []);
    renderList("notes-list", []);
    if (note) {
      note.textContent = `Unable to load synced content index. ${error.message}`;
    }
  }
}

document.addEventListener("DOMContentLoaded", loadContentIndex);
