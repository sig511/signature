(function () {
  const isEditableTarget = (target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"));
  };

  const stopEvent = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const installInteractionGuards = () => {
    ["contextmenu", "dragstart", "copy", "cut", "paste", "selectstart"].forEach((type) => {
      document.addEventListener(
        type,
        (event) => {
          if (isEditableTarget(event.target)) return;
          stopEvent(event);
        },
        { capture: true }
      );
    });

    document.addEventListener(
      "keydown",
      (event) => {
        if (isEditableTarget(event.target)) return;
        const key = String(event.key || "").toLowerCase();
        const ctrlOrMeta = event.ctrlKey || event.metaKey;
        const blockedCombo =
          (ctrlOrMeta && ["a", "c", "x", "s", "u", "p"].includes(key)) ||
          (ctrlOrMeta && event.shiftKey && ["i", "j", "c"].includes(key)) ||
          key === "f12";

        if (blockedCombo) {
          stopEvent(event);
        }
      },
      { capture: true }
    );
  };

  const disableTextSelection = () => {
    document.documentElement.style.webkitUserSelect = "none";
    document.documentElement.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    document.body.style.userSelect = "none";
    document.querySelectorAll("input, textarea, select").forEach((field) => {
      field.style.webkitUserSelect = "text";
      field.style.userSelect = "text";
    });
  };

  const disableImageDragging = () => {
    document.querySelectorAll("img").forEach((image) => {
      image.setAttribute("draggable", "false");
    });
  };

  const init = () => {
    disableTextSelection();
    disableImageDragging();
    installInteractionGuards();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
