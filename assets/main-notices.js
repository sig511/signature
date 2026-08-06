(function () {
  const noticeList = document.getElementById("main-notice-list");
  const noticeMeta = document.getElementById("main-notice-meta");
  const noticeTitle = document.getElementById("main-notice-title");
  const noticeBody = document.getElementById("main-notice-body");
  const noticeView = document.getElementById("main-notice-view");
  const noticeClose = document.getElementById("main-notice-close");
  const noticePanel = document.querySelector(".news-panel");
  const seedTag = document.getElementById("board-seed");

  if (!noticeList || !noticeMeta || !noticeTitle || !noticeBody || !noticeView) return;

  const noticeSupabase =
    window.supabase && window.SIGNATURE_SUPABASE
      ? window.supabase.createClient(
          window.SIGNATURE_SUPABASE.url,
          window.SIGNATURE_SUPABASE.publishableKey
        )
      : null;

  let activeNoticeId = null;
  let noticeEntries = [];
  let noticeMap = {};

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatNoticeBody(value) {
    return escapeHtml(String(value || "")).replaceAll("\n", "<br />");
  }

  function formatNoticeDate(value) {
    const text = String(value || "").trim();
    return text.length >= 10 ? text.slice(5, 10) : text;
  }

  function formatDate(value) {
    const text = String(value || "").trim();
    return text.length >= 10 ? text.slice(0, 10) : text;
  }

  function parseSeed() {
    if (!seedTag) return [];
    try {
      const parsed = JSON.parse(seedTag.textContent.trim());
      return Array.isArray(parsed)
        ? parsed.map((post) => ({
            id: String(post.id || ""),
            title: String(post.title || ""),
            author: "시그니처행정사",
            content: String(post.content || ""),
            createdAt: formatDate(post.createdAt),
          }))
        : [];
    } catch {
      return [];
    }
  }

  async function ensureNoticeSession() {
    if (!noticeSupabase) return null;

    const { data: sessionData } = await noticeSupabase.auth.getSession();
    if (sessionData.session) return sessionData.session;

    const { data, error } = await noticeSupabase.auth.signInAnonymously();
    if (error || !data.session) {
      throw new Error("공지사항 연결에 실패했습니다.");
    }
    return data.session;
  }

  async function listServerNotices() {
    await ensureNoticeSession();
    const { data, error } = await noticeSupabase
      .from("board_posts")
      .select("id, title, author, content, created_at")
      .eq("board_type", "notice")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message || "공지 목록을 불러오지 못했습니다.");
    }

    return Array.isArray(data)
      ? data.map((notice) => ({
          id: String(notice.id || ""),
          title: String(notice.title || ""),
          author: String(notice.author || "시그니처행정사"),
          content: String(notice.content || ""),
          createdAt: formatDate(notice.created_at),
        }))
      : [];
  }

  function mergeEntries(seedEntries, serverEntries) {
    const merged = new Map();

    seedEntries.forEach((notice) => {
      merged.set(`seed:${notice.id}`, notice);
    });

    serverEntries.forEach((notice) => {
      const key = `${notice.title}|${notice.createdAt}`;
      for (const [mergedKey, mergedNotice] of merged.entries()) {
        if (`${mergedNotice.title}|${mergedNotice.createdAt}` === key) {
          merged.delete(mergedKey);
        }
      }
      merged.set(`server:${notice.id}`, notice);
    });

    return Array.from(merged.values()).sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    );
  }

  function closeNotice() {
    activeNoticeId = null;
    noticeView.classList.add("hidden");
    noticeView.classList.remove("is-open");
    noticeList.querySelectorAll(".notice-toggle").forEach((button) => {
      button.classList.remove("is-active");
    });
  }

  function openNotice(noticeId, triggerButton) {
    const notice = noticeMap[noticeId];
    if (!notice || !triggerButton || !noticePanel) return;

    noticeMeta.textContent = notice.meta;
    noticeTitle.textContent = notice.title;
    noticeBody.innerHTML = notice.body;

    const buttonRect = triggerButton.getBoundingClientRect();
    const panelRect = noticePanel.getBoundingClientRect();
    noticeView.style.top = `${buttonRect.bottom - panelRect.top + 12}px`;
    noticeView.classList.remove("hidden");
    noticeView.classList.add("is-open");

    noticeList.querySelectorAll(".notice-toggle").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.noticeId === noticeId);
    });

    activeNoticeId = noticeId;
  }

  async function renderMainNotices() {
    const seedEntries = parseSeed();
    let serverEntries = [];

    try {
      serverEntries = await listServerNotices();
    } catch {
      serverEntries = [];
    }

    noticeEntries = mergeEntries(seedEntries, serverEntries);
    noticeMap = Object.fromEntries(
      noticeEntries.map((notice) => [
        notice.id,
        {
          meta: `${notice.author || "시그니처행정사"} | ${notice.createdAt || ""}`,
          title: notice.title || "",
          body: formatNoticeBody(notice.content || ""),
        },
      ])
    );

    noticeList.innerHTML = noticeEntries
      .slice(0, 3)
      .map(
        (notice) => `
          <button class="notice-item notice-toggle" type="button" data-notice-id="${escapeHtml(notice.id)}">
            <span class="notice-title">${escapeHtml(notice.title || "")}</span>
            <span class="notice-date">${escapeHtml(formatNoticeDate(notice.createdAt))}</span>
          </button>
        `
      )
      .join("");

    noticeList.querySelectorAll(".notice-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const noticeId = button.dataset.noticeId;
        if (activeNoticeId === noticeId) {
          closeNotice();
          return;
        }
        openNotice(noticeId, button);
      });
    });

    if (noticeEntries[0]) {
      const firstNotice = noticeMap[noticeEntries[0].id];
      if (firstNotice) {
        noticeMeta.textContent = firstNotice.meta;
        noticeTitle.textContent = firstNotice.title;
        noticeBody.innerHTML = firstNotice.body;
      }
    }
  }

  noticeClose?.addEventListener("click", closeNotice);
  window.addEventListener("load", () => {
    renderMainNotices();
  });
})();
