(() => {
  const languageLabels = { py: "Python", python: "Python", txt: "Text", text: "Text", c: "C", bash: "Bash" };

  function appendTokens(parent, tokens) {
    // 只用文本节点写入代码，保留缩进和特殊字符，不把示例内容当作 HTML。
    for (const token of tokens) {
      if (typeof token === "string") {
        parent.append(token);
      } else {
        const span = document.createElement("span");
        span.classList.add("token", token.type, ...[].concat(token.alias || []));
        appendTokens(span, [].concat(token.content));
        parent.append(span);
      }
    }
  }

  function makeCopyButton(source) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "article-code-copy";
    button.textContent = "Copy";
    button.setAttribute("aria-live", "polite");
    let reset;
    button.addEventListener("click", async () => {
      clearTimeout(reset);
      try {
        await navigator.clipboard.writeText(source);
        button.dataset.copied = "true";
        button.textContent = "Copied";
      } catch {
        delete button.dataset.copied;
        button.textContent = "Copy failed";
      }
      reset = setTimeout(() => {
        delete button.dataset.copied;
        button.textContent = "Copy";
      }, 2200);
    });
    return button;
  }

  const grammars = window.Prism?.languages ?? {};
  // 只着色 Python 笔记里可识别的行内调用；正则模式、文件名、纯文本保持原样。
  if (grammars.python && document.querySelector("pre > code:is(.language-py, .language-python)")) {
    document.querySelectorAll(".article-content :not(pre) > code").forEach((code) => {
      const source = code.textContent;
      if (!/^[\w(][\s\S]*\.[A-Za-z_]\w*\([^\n]*\)$|^[A-Za-z_]\w*\([^\n]*\)$/.test(source) || source.includes("(?")) return;
      const fragment = document.createDocumentFragment();
      appendTokens(fragment, window.Prism.tokenize(source, grammars.python));
      code.replaceChildren(fragment);
    });
  }
  document.querySelectorAll(".article-content pre:not(.mermaid) > code").forEach((code) => {
    const pre = code.parentElement;
    const language = [...code.classList].find((name) => name.startsWith("language-"))?.slice(9);
    const source = code.textContent;
    const grammar = language && Object.hasOwn(grammars, language) ? grammars[language] : null;

    if (grammar) {
      const highlighted = document.createDocumentFragment();
      appendTokens(highlighted, window.Prism.tokenize(source, grammar));
      code.replaceChildren(highlighted);
    }

    const block = document.createElement("div");
    block.className = "article-code";
    const bar = document.createElement("div");
    bar.className = "article-code-bar";
    const label = document.createElement("span");
    label.className = "article-code-language";
    label.textContent = Object.hasOwn(languageLabels, language) ? languageLabels[language] : (language || "Code");
    bar.append(label);
    if (navigator.clipboard?.writeText) bar.append(makeCopyButton(source));
    pre.replaceWith(block);
    block.append(bar, pre);
  });
})();
