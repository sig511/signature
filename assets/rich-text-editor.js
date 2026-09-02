(() => {
  const allowedTags = new Set([
    "A", "B", "BR", "DIV", "EM", "FONT", "I", "IMG", "LI", "OL", "P", "SPAN", "STRONG", "U", "UL"
  ]);
  const allowedFonts = new Set([
    "Arial", "Georgia", "Tahoma", "Times New Roman", "Verdana", "맑은 고딕", "굴림", "궁서", "바탕"
  ]);
  const allowedColors = /^#[0-9a-f]{6}$/i;
  const allowedSizes = new Set(["12px", "13px", "14px", "15px", "16px", "18px", "19px", "20px", "24px", "28px", "32px", "48px"]);
  const allowedAlignments = new Set(["left", "center", "right", "justify"]);
  const editors = new WeakMap();

  const escapeHtml = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const looksLikeHtml = (value) => /<\/?(?:p|div|br|span|font|strong|b|em|i|u|ul|ol|li|a|img)(?:\s|>|\/)/i.test(value);

  const safeImageSource = (value) => {
    const source = String(value || "").trim();
    return /^(?:https?:\/\/|data:image\/(?:png|jpe?g|webp|gif);base64,)/i.test(source) ? source : "";
  };

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

        if (child.tagName === "IMG") {
          const source = safeImageSource(child.getAttribute("src"));
          if (!source) {
            child.remove();
            return;
          }
          const alt = String(child.getAttribute("alt") || "첨부 이미지").slice(0, 120);
          const width = ["25%", "50%", "75%", "100%"].includes(child.style.width)
            ? child.style.width
            : "50%";
          const marginLeft = child.style.marginLeft === "auto" ? "auto" : "0px";
          const marginRight = child.style.marginRight === "auto" ? "auto" : "0px";
          Array.from(child.attributes).forEach((attribute) => child.removeAttribute(attribute.name));
          child.setAttribute("src", source);
          child.setAttribute("alt", alt);
          child.style.width = width;
          child.style.maxWidth = "100%";
          child.style.height = "auto";
          child.style.display = "block";
          child.style.marginLeft = marginLeft;
          child.style.marginRight = marginRight;
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
        const fontWeight = String(child.style.fontWeight || "").toLowerCase();
        const fontStyle = String(child.style.fontStyle || "").toLowerCase();
        if (fontFamily) styles.fontFamily = fontFamily;
        if (color) styles.color = color;
        if (allowedSizes.has(fontSize)) styles.fontSize = fontSize;
        if (allowedAlignments.has(textAlign)) styles.textAlign = textAlign;
        if (child.tagName === "B" || child.tagName === "STRONG" || ["600", "700", "800", "900", "bold", "bolder"].includes(fontWeight)) {
          styles.fontWeight = "700";
        }
        if (child.tagName === "I" || child.tagName === "EM" || fontStyle === "italic" || fontStyle === "oblique") {
          styles.fontStyle = "italic";
        }

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

  const hasContent = (value) => {
    const template = document.createElement("template");
    template.innerHTML = sanitizeHtml(value);
    return Boolean((template.content.textContent || "").replaceAll("\u00a0", " ").trim() || template.content.querySelector("img"));
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
    });
    return select;
  };

  const compressImage = (file) =>
    new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("이미지 파일만 선택할 수 있습니다."));
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        reject(new Error("이미지는 12MB 이하의 파일을 선택해 주세요."));
        return;
      }

      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDimension = 1400;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/webp", 0.82);
        if (dataUrl.length > 2.5 * 1024 * 1024) {
          reject(new Error("이미지 용량이 너무 큽니다. 더 작은 이미지를 사용해 주세요."));
          return;
        }
        resolve(dataUrl);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("이미지를 불러오지 못했습니다."));
      };
      image.src = objectUrl;
    });

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
      textarea.value = hasContent(cleaned) ? cleaned : "";
      textarea.dispatchEvent(new Event("richtextchange", { bubbles: true }));
    };
    const run = (command, value = null) => {
      surface.focus();
      restoreSelection();
      document.execCommand(command, false, value);
      sync();
      rememberSelection();
    };
    const applyFontSize = (size) => {
      surface.focus();
      restoreSelection();
      document.execCommand("fontSize", false, "7");
      surface.querySelectorAll('font[size="7"]').forEach((font) => {
        font.removeAttribute("size");
        font.style.fontSize = size;
      });
      sync();
      rememberSelection();
    };
    const button = (label, text, command, value = null) => {
      const control = document.createElement("button");
      control.type = "button";
      control.className = `rich-editor-button rich-editor-command-${command}`;
      control.setAttribute("aria-label", label);
      control.title = label;
      if (text instanceof Node) control.appendChild(text);
      else control.textContent = text;
      control.addEventListener("mousedown", (event) => event.preventDefault());
      control.addEventListener("click", () => run(command, value));
      return control;
    };
    const alignmentIcon = (alignment) => {
      const icon = document.createElement("span");
      icon.className = `rich-editor-align-icon is-${alignment}`;
      icon.setAttribute("aria-hidden", "true");
      ["long", "short", "long", "short"].forEach((length) => {
        const line = document.createElement("span");
        line.className = `rich-editor-align-line is-${length}`;
        icon.appendChild(line);
      });
      return icon;
    };
    const actionButton = (label, text, action) => {
      const control = document.createElement("button");
      control.type = "button";
      control.className = "rich-editor-button";
      control.setAttribute("aria-label", label);
      control.title = label;
      control.textContent = text;
      control.addEventListener("mousedown", (event) => event.preventDefault());
      control.addEventListener("click", action);
      return control;
    };

    const pickerGroup = [];
    const closePicker = ({ trigger, panel }) => {
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    };
    const createPicker = (className, label, triggerText) => {
      const picker = document.createElement("div");
      picker.className = `rich-editor-picker ${className}`;
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "rich-editor-picker-trigger";
      trigger.setAttribute("aria-label", label);
      trigger.setAttribute("aria-expanded", "false");
      trigger.innerHTML = `${triggerText}<span aria-hidden="true">⌄</span>`;
      const panel = document.createElement("div");
      panel.className = "rich-editor-picker-panel";
      panel.hidden = true;
      trigger.addEventListener("mousedown", (event) => event.preventDefault());
      trigger.addEventListener("click", () => {
        const willOpen = panel.hidden;
        pickerGroup.forEach((item) => {
          if (item.panel !== panel) closePicker(item);
        });
        panel.hidden = !willOpen;
        trigger.setAttribute("aria-expanded", String(!panel.hidden));
      });
      picker.append(trigger, panel);
      const pickerApi = { picker, trigger, panel };
      pickerGroup.push(pickerApi);
      return pickerApi;
    };

    const sizePicker = createPicker("rich-editor-size-picker", "글씨 크기", "10pt");
    [
      ["12px", "9pt"], ["13px", "10pt"], ["15px", "11pt"], ["16px", "12pt"],
      ["19px", "14pt"], ["24px", "18pt"], ["32px", "24pt"], ["48px", "36pt"]
    ].forEach(([size, label]) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "rich-editor-size-option";
      option.style.fontSize = size;
      option.textContent = `가나다라마바사 (${label})`;
      option.addEventListener("mousedown", (event) => event.preventDefault());
      option.addEventListener("click", () => {
        applyFontSize(size);
        sizePicker.trigger.firstChild.textContent = label;
        sizePicker.panel.hidden = true;
        sizePicker.trigger.setAttribute("aria-expanded", "false");
      });
      sizePicker.panel.appendChild(option);
    });

    const palette = [
      "#ff0000", "#ff6b00", "#ffc400", "#9be000", "#00c9df", "#006cff", "#3d2cff", "#f000c8", "#000000",
      "#ffd6d6", "#ffe0c2", "#fff1b8", "#dcf4a7", "#c8f1f5", "#cbdcff", "#d8d1ff", "#f8c9ef", "#d9d9d9",
      "#ff9c9c", "#ffb48f", "#ffe67a", "#bce86b", "#8ddce8", "#86afff", "#a899ff", "#ef8de0", "#ababab",
      "#f35d5d", "#ed7d45", "#d6aa00", "#75a900", "#14899a", "#145ac7", "#3323a8", "#9b167f", "#555555",
      "#a90808", "#a43d00", "#927000", "#4d7100", "#066272", "#083c91", "#241476", "#71065b", "#222222"
    ];
    const colorPicker = createPicker("rich-editor-color-picker", "글씨 색상", '<span class="rich-editor-color-a">가</span>');
    palette.forEach((color) => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "rich-editor-color-swatch";
      swatch.style.backgroundColor = color;
      swatch.setAttribute("aria-label", `글씨 색상 ${color}`);
      swatch.addEventListener("mousedown", (event) => event.preventDefault());
      swatch.addEventListener("click", () => {
        run("foreColor", color);
        colorPicker.trigger.style.color = color;
        colorPicker.panel.hidden = true;
        colorPicker.trigger.setAttribute("aria-expanded", "false");
      });
      colorPicker.panel.appendChild(swatch);
    });

    document.addEventListener("mousedown", (event) => {
      pickerGroup.forEach((item) => {
        if (!item.picker.contains(event.target)) closePicker(item);
      });
    });

    toolbar.append(
      createSelect("글씨체", [["맑은 고딕", "맑은 고딕"], ["굴림", "굴림"], ["궁서", "궁서체"], ["바탕", "바탕"], ["Arial", "Arial"], ["Georgia", "Georgia"], ["Times New Roman", "Times New Roman"]], (value) => run("fontName", value)),
      sizePicker.picker
    );
    toolbar.append(
      colorPicker.picker,
      button("굵게", "가", "bold"),
      button("기울임", "가", "italic"),
      button("밑줄", "가", "underline"),
      button("왼쪽 정렬", alignmentIcon("left"), "justifyLeft"),
      button("가운데 정렬", alignmentIcon("center"), "justifyCenter"),
      button("오른쪽 정렬", alignmentIcon("right"), "justifyRight"),
      button("글머리표", "• 목록", "insertUnorderedList"),
      button("번호 목록", "1. 목록", "insertOrderedList"),
      button("서식 지우기", "서식 제거", "removeFormat")
    );

    let selectedImage = null;
    const imageInput = document.createElement("input");
    imageInput.type = "file";
    imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
    imageInput.className = "rich-editor-image-input";
    imageInput.setAttribute("aria-label", "이미지 파일 선택");

    const imageTools = document.createElement("span");
    imageTools.className = "rich-editor-image-tools";
    imageTools.hidden = true;

    const selectImage = (image) => {
      selectedImage?.classList.remove("is-selected");
      selectedImage = image instanceof HTMLImageElement ? image : null;
      selectedImage?.classList.add("is-selected");
      imageTools.hidden = !selectedImage;
    };
    const resizeImage = (width) => {
      if (!selectedImage) return;
      selectedImage.style.width = width;
      sync();
    };
    const alignImage = (alignment) => {
      if (!selectedImage) return;
      selectedImage.style.display = "block";
      if (alignment === "left") {
        selectedImage.style.marginLeft = "0px";
        selectedImage.style.marginRight = "auto";
      } else if (alignment === "right") {
        selectedImage.style.marginLeft = "auto";
        selectedImage.style.marginRight = "0px";
      } else {
        selectedImage.style.marginLeft = "auto";
        selectedImage.style.marginRight = "auto";
      }
      sync();
    };
    const insertImage = (source, alt) => {
      surface.focus();
      restoreSelection();
      const image = document.createElement("img");
      image.src = source;
      image.alt = alt || "첨부 이미지";
      image.style.width = "50%";
      image.style.maxWidth = "100%";
      image.style.height = "auto";
      image.style.display = "block";
      image.style.marginLeft = "auto";
      image.style.marginRight = "auto";
      const spacer = document.createElement("br");
      const selection = window.getSelection();
      let range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
      if (!range || !surface.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(surface);
        range.collapse(false);
      }
      range.deleteContents();
      range.insertNode(spacer);
      range.insertNode(image);
      range.setStartAfter(spacer);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      savedRange = range.cloneRange();
      selectImage(image);
      sync();
    };

    imageInput.addEventListener("change", async () => {
      const file = imageInput.files?.[0];
      imageInput.value = "";
      if (!file) return;
      try {
        const source = await compressImage(file);
        if (surface.innerHTML.length + source.length > 5 * 1024 * 1024) {
          throw new Error("한 게시글에 저장할 수 있는 이미지 총용량을 초과했습니다.");
        }
        insertImage(source, file.name);
      } catch (error) {
        window.alert(error.message || "이미지를 삽입하지 못했습니다.");
      }
    });

    imageTools.append(
      actionButton("이미지 너비 25%", "25%", () => resizeImage("25%")),
      actionButton("이미지 너비 50%", "50%", () => resizeImage("50%")),
      actionButton("이미지 너비 75%", "75%", () => resizeImage("75%")),
      actionButton("이미지 너비 100%", "100%", () => resizeImage("100%")),
      actionButton("이미지 왼쪽 정렬", "이미지 ←", () => alignImage("left")),
      actionButton("이미지 가운데 정렬", "이미지 ↔", () => alignImage("center")),
      actionButton("이미지 오른쪽 정렬", "이미지 →", () => alignImage("right")),
      actionButton("이미지 삭제", "이미지 삭제", () => {
        if (!selectedImage) return;
        selectedImage.remove();
        selectImage(null);
        sync();
      })
    );
    toolbar.append(
      actionButton("이미지 삽입", "이미지 넣기", () => imageInput.click()),
      imageInput,
      imageTools
    );

    textarea.classList.add("rich-editor-source");
    textarea.setAttribute("aria-hidden", "true");
    textarea.tabIndex = -1;
    textarea.insertAdjacentElement("afterend", wrapper);
    wrapper.append(toolbar, surface);

    const setValue = (value) => {
      const cleaned = sanitizeHtml(value);
      surface.innerHTML = cleaned;
      textarea.value = hasContent(cleaned) ? cleaned : "";
      selectImage(null);
    };
    setValue(textarea.value);
    surface.addEventListener("input", sync);
    surface.addEventListener("blur", sync);
    surface.addEventListener("keyup", rememberSelection);
    surface.addEventListener("mouseup", rememberSelection);
    surface.addEventListener("paste", () => setTimeout(sync, 0));
    surface.addEventListener("click", (event) => {
      selectImage(event.target instanceof HTMLImageElement ? event.target : null);
    });
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
