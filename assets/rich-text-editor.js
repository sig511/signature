(() => {
  const allowedTags = new Set([
    "A", "B", "BR", "DIV", "EM", "FONT", "I", "LI", "OL", "P", "SPAN", "STRONG", "U", "UL"
  ]);
  const allowedFonts = new Set([
    "Arial", "Georgia", "Tahoma", "Times New Roman", "Verdana", "맑은 고딕", "굴림", "궁서", "바탕"
  ]);
  const allowedColors = /^#[0-9a-f]{6}$/i;
  const allowedSizes = new Set(["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"]);
  const allowedAlignments = new Set(["left", "center", "right", "justify"]);
  const editors = new WeakMap();

  const escapeHtml = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const looksLikeHtml = (value) => /<\/?(?:p|div|br|span|font|strong|b|em|i|u|ul|ol|li|a)(?:\s|>|\/)/i.test(value);

  const normalizeFont = (value) => {
    const font = String(value || "").replace(/["']/g, "").split(",")[0].trim();
    return allowedFonts.has(font) ? font : "";
  };

  const normalizeColor = (value) => {
    const color = String(value || "").trim();
    if (allowedColors.test(color)) return color;
    const rgb = color.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (!rgb) return "";
    const channels = rgb.slice(1).map(Number);
    if (channels.some((channel) => channel > 255)) return "";
    return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
  };

  const sanitizeHtml = (value) => {
    const source = String(value || "");
    if (!source) return "";
    if (!looksLikeHtml(source)) return escapeHtml(source).replaceAll("\n", "<br>");

    const template = document.createElement("template");
    template.innerHTML = source;

    const cleanNode = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.COMMENT_NODE) {
          child.remove();
          return;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) return;

        if (!allowedTags.has(child.tagName)) {
          child.replaceWith(document.createTextNode(child.textContent || ""));
          return;
        }

        const styles = {};
        const fontFamily = normalizeFont(child.style.fontFamily || (child.tagName === "FONT" ? child.getAttribute("face") : ""));
        const color = normalizeColor(child.style.color || (child.tagName === "FONT" ? child.getAttribute("color") : ""));
        let fontSize = child.style.fontSize;
        if (child.tagName === "FONT" && child.getAttribute("size")) {
          const sizeMap = { "1": "12px", "2": "14px", "3": "16px", "4": "18px", "5": "24px", "6": "28px", "7": "32px" };
          fontSize = sizeMap[child.getAttribute("size")] || fontSize;
        }
        const textAlign = child.style.textAlign;
        if (fontFamily) styles.fontFamily = fontFamily;
        if (color) styles.color = color;
        if (allowedSizes.has(fontSize)) styles.fontSize = fontSize;
        if (allowedAlignments.has(textAlign)) styles.textAlign = textAlign;

        const href = child.tagName === "A" ? child.getAttribute("href") || "" : "";
        Array.from(child.attributes).forEach((attribute) => child.removeAttribute(attribute.name));
        Object.assign(child.style, styles);
        if (child.tagName === "A" && /^(https?:|mailto:|tel:)/i.test(href)) {
          child.setAttribute("href", href);
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noopener noreferrer");
        }
        cleanNode(child);
      });
    };

    cleanNode(template.content);
    return template.innerHTML.trim();
  };

  const plainText = (value) => {
    const template = document.createElement("template");
    template.innerHTML = sanitizeHtml(value).replaceAll(/<br\s*\/?>/gi, "\n");
    return (template.content.textContent || "").replaceAll("\u00a0", " ").trim();
  };

  const createSelect = (label, options, command) => {
    const select = document.createElement("select");
    select.className = "rich-editor-select";
    select.setAttribute("aria-label", label);
    options.forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });
    select.addEventListener("change", () => {
      if (select.value) command(select.value);
      select.selectedIndex = 0;
    });
    return select;
  };

  const enhance = (textarea) => {
    if (!textarea || editors.has(textarea)) return editors.get(textarea);

    const wrapper = document.createElement("div");
    wrapper.className = "rich-editor";
    const toolbar = document.createElement("div");
    toolbar.className = "rich-editor-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "글 서식 도구");
    const surface = document.createElement("div");
    surface.className = "rich-editor-surface";
    surface.contentEditable = "true";
    surface.setAttribute("role", "textbox");
    surface.setAttribute("aria-multiline", "true");
    surface.dataset.placeholder = textarea.placeholder || "내용을 입력해 주세요";
    textarea.required = false;

    let savedRange = null;
    const rememberSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (surface.contains(range.commonAncestorContainer)) {
        savedRange = range.cloneRange();
      }
    };
    const restoreSelection = () => {
      if (!savedRange) return;
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRange);
    };

    const sync = () => {
      const cleaned = sanitizeHtml(surface.innerHTML);
      textarea.value = plainText(cleaned) ? cleaned : "";
      textarea.dispatchEvent(new Event("richtextchange", { bubbles: true }));
    };
    const run = (command, value = null) => {
      surface.focus();
      restoreSelection();
      document.execCommand(command, false, value);
      sync();
      rememberSelection();
    };
    const button = (label, text, command, value = null) => {
      const control = document.createElement("button");
      control.type = "button";
      control.className = "rich-editor-button";
      control.setAttribute("aria-label", label);
      control.title = label;
      control.textContent = text;
      control.addEventListener("mousedown", (event) => event.preventDefault());
      control.addEventListener("click", () => run(command, value));
      return control;
    };

    toolbar.append(
      createSelect("글씨체", [["", "글씨체"], ["맑은 고딕", "맑은 고딕"], ["굴림", "굴림"], ["궁서", "궁서체"], ["바탕", "바탕"], ["Arial", "Arial"], ["Georgia", "Georgia"], ["Times New Roman", "Times New Roman"]], (value) => run("fontName", value)),
      createSelect("글씨 크기", [["", "크기"], ["2", "작게"], ["3", "보통"], ["4", "크게"], ["5", "매우 크게"], ["6", "제목"]], (value) => run("fontSize", value))
    );

    const colorLabel = document.createElement("label");
    colorLabel.className = "rich-editor-color-label";
    colorLabel.title = "글씨 색상";
    colorLabel.innerHTML = '<span aria-hidden="true">A</span><input type="color" value="#17324c" aria-label="글씨 색상" />';
    colorLabel.querySelector("input").addEventListener("input", (event) => run("foreColor", event.target.value));
    toolbar.append(
      colorLabel,
      button("굵게", "B", "bold"),
      button("기울임", "I", "italic"),
      button("밑줄", "U", "underline"),
      button("왼쪽 정렬", "≡", "justifyLeft"),
      button("가운데 정렬", "≣", "justifyCenter"),
      button("오른쪽 정렬", "≡", "justifyRight"),
      button("글머리표", "• 목록", "insertUnorderedList"),
      button("번호 목록", "1. 목록", "insertOrderedList"),
      button("서식 지우기", "서식 제거", "removeFormat")
    );

    textarea.classList.add("rich-editor-source");
    textarea.setAttribute("aria-hidden", "true");
    textarea.tabIndex = -1;
    textarea.insertAdjacentElement("afterend", wrapper);
    wrapper.append(toolbar, surface);

    const setValue = (value) => {
      const cleaned = sanitizeHtml(value);
      surface.innerHTML = cleaned;
      textarea.value = plainText(cleaned) ? cleaned : "";
    };
    setValue(textarea.value);
    surface.addEventListener("input", sync);
    surface.addEventListener("blur", sync);
    surface.addEventListener("keyup", rememberSelection);
    surface.addEventListener("mouseup", rememberSelection);
    surface.addEventListener("paste", () => setTimeout(sync, 0));
    textarea.form?.addEventListener("reset", () => setTimeout(() => setValue(textarea.defaultValue || ""), 0));

    const api = { surface, sync, setValue, getValue: () => textarea.value };
    editors.set(textarea, api);
    return api;
  };

  const initialize = (scope = document) => {
    scope.querySelectorAll('textarea[data-rich-text="true"]').forEach(enhance);
  };

  window.SignatureRichText = {
    enhance,
    initialize,
    sanitize: sanitizeHtml,
    format: sanitizeHtml,
    toPlainText: plainText,
    setValue(textarea, value) {
      const editor = enhance(textarea);
      editor?.setValue(value);
    },
    sync(textarea) {
      editors.get(textarea)?.sync();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initialize());
  } else {
    initialize();
  }
})();
