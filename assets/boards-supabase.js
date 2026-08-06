const boardConfig = window.SIGNATURE_SUPABASE || {};

const body = document.body;
const boardKey = body?.dataset.boardKey || "";
const boardName = body?.dataset.boardName || "게시판";
const boardType = body?.dataset.boardType || "";
const legacyStorageKey = boardKey ? `signature-board-${boardKey}` : "";

const boardList = document.querySelector(".board-list");
const boardCount = document.querySelector(".board-count");
const writeButton = document.querySelector(".write-button");
const writePanel = document.querySelector(".board-write-panel");
const writeForm = document.querySelector(".write-form");
const writeCancel = document.querySelector(".write-cancel");
const emptyBox = document.querySelector(".board-empty");
const postView = document.querySelector(".post-view");
const postViewMeta = document.querySelector(".post-view-meta");
const postViewTitle = document.querySelector(".post-view-title");
const postViewBody = document.querySelector(".post-view-body");
const postDelete = document.querySelector(".post-delete");

let postsCache = [];
let currentPost = null;
let currentOpenedPassword = "";

function notifyParentHeight() {
  const root = document.documentElement;
  const pageBody = document.body;
  const height = Math.max(
    pageBody ? pageBody.scrollHeight : 0,
    pageBody ? pageBody.offsetHeight : 0,
    root ? root.scrollHeight : 0,
    root ? root.offsetHeight : 0
  );

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "signature-board-height", height }, "*");
  }
}

function scheduleHeightSync() {
  notifyParentHeight();
  window.requestAnimationFrame(notifyParentHeight);
  window.setTimeout(notifyParentHeight, 100);
  window.setTimeout(notifyParentHeight, 260);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatContent(content) {
  return escapeHtml(content).replaceAll("\n", "<br>");
}

function updateUrl(postId) {
  const url = new URL(window.location.href);
  if (postId) {
    url.searchParams.set("post", postId);
  } else {
    url.searchParams.delete("post");
  }
  window.history.replaceState({}, "", url);
}

function loadLegacyPosts() {
  if (!legacyStorageKey) return [];

  try {
    const saved = window.localStorage.getItem(legacyStorageKey);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((post) => ({
        id: post.id || `legacy-${Math.random().toString(36).slice(2)}`,
        title: post.title || "",
        author: post.author || "",
        content: post.content || "",
        password: post.password || "",
        is_secret: Boolean(post.secret),
        created_at: post.createdAt || "",
        _source: "legacy",
      }))
      .sort((a, b) => (String(a.created_at) < String(b.created_at) ? 1 : -1));
  } catch {
    return [];
  }
}

function saveLegacyPosts(posts) {
  if (!legacyStorageKey) return;

  const nextPosts = posts
    .filter((post) => post._source === "legacy")
    .map((post) => ({
      id: post.id,
      title: post.title,
      author: post.author,
      content: post.content,
      password: post.password || "",
      secret: Boolean(post.is_secret),
      createdAt: post.created_at,
    }));

  window.localStorage.setItem(legacyStorageKey, JSON.stringify(nextPosts));
}

function injectUiStyles() {
  if (document.getElementById("signature-board-supabase-style")) return;

  const style = document.createElement("style");
  style.id = "signature-board-supabase-style";
  style.textContent = `
    .password-field-wrap {
      position: relative;
    }

    .password-field-wrap input {
      padding-right: 64px !important;
    }

    .password-toggle {
      position: absolute;
      top: 50%;
      right: 12px;
      transform: translateY(-50%);
      border: 0;
      background: transparent;
      color: #6d7f92;
      font: inherit;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
    }

    .secret-modal {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(12, 22, 35, 0.48);
      z-index: 9999;
    }

    .secret-modal.is-open {
      display: flex;
    }

    .secret-modal-dialog {
      width: min(460px, 100%);
      padding: 24px;
      border-radius: 20px;
      background: #ffffff;
      box-shadow: 0 24px 48px rgba(9, 26, 45, 0.18);
    }

    .secret-modal-title {
      margin: 0 0 10px;
      color: #17324c;
      font-size: 1.08rem;
      font-weight: 800;
    }

    .secret-modal-copy {
      margin: 0 0 14px;
      color: #5f7286;
      line-height: 1.7;
    }

    .secret-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 16px;
    }

    .secret-modal-button {
      min-width: 92px;
      height: 42px;
      border-radius: 999px;
      border: 1px solid rgba(13, 39, 66, 0.12);
      background: #ffffff;
      color: #17324c;
      font-weight: 700;
      cursor: pointer;
    }

    .secret-modal-button.confirm {
      border: 0;
      background: linear-gradient(145deg, #204b72 0%, #163750 100%);
      color: #ffffff;
    }
  `;

  document.head.appendChild(style);
}

function attachToggleToPasswordInput(input) {
  if (!input || input.dataset.toggleReady === "true") return;

  input.dataset.toggleReady = "true";
  const wrapper = document.createElement("div");
  wrapper.className = "password-field-wrap";
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "password-toggle";
  button.textContent = "보기";
  button.setAttribute("aria-label", "비밀번호 보기");
  button.addEventListener("click", () => {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    button.textContent = isPassword ? "숨김" : "보기";
  });
  wrapper.appendChild(button);
}

function enhancePasswordInputs() {
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    attachToggleToPasswordInput(input);
  });
}

function requestSecretPassword() {
  return new Promise((resolve) => {
    let modal = document.getElementById("secret-password-modal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "secret-password-modal";
      modal.className = "secret-modal";
      modal.innerHTML = `
        <div class="secret-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="secret-modal-title">
          <h3 id="secret-modal-title" class="secret-modal-title">비밀글 확인</h3>
          <p class="secret-modal-copy">글 비밀번호를 입력해 주세요.</p>
          <input id="secret-password-input" type="password" placeholder="비밀번호 입력" />
          <div class="secret-modal-actions">
            <button type="button" class="secret-modal-button cancel">취소</button>
            <button type="button" class="secret-modal-button confirm">확인</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const passwordInput = modal.querySelector("#secret-password-input");
      attachToggleToPasswordInput(passwordInput);

      modal.querySelector(".cancel").addEventListener("click", () => {
        modal.classList.remove("is-open");
        resolve("");
      });

      modal.querySelector(".confirm").addEventListener("click", () => {
        const value = passwordInput.value.trim();
        modal.classList.remove("is-open");
        resolve(value);
      });

      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          modal.classList.remove("is-open");
          resolve("");
        }
      });

      passwordInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          modal.querySelector(".confirm").click();
        }
      });
    }

    const input = modal.querySelector("#secret-password-input");
    const toggle = modal.querySelector(".password-toggle");
    input.value = "";
    input.type = "password";
    if (toggle) toggle.textContent = "보기";
    modal.classList.add("is-open");
    window.setTimeout(() => input.focus(), 0);
  });
}

async function apiRequest(action, options = {}) {
  const method = options.method || "GET";
  const url = new URL(boardConfig.functionUrl);
  url.searchParams.set("action", action);

  if (options.boardType) {
    url.searchParams.set("boardType", options.boardType);
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: boardConfig.publishableKey,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "요청 처리 중 오류가 발생했습니다.");
  }

  return result;
}

async function loadPostsViaRest() {
  const url = `${boardConfig.url}/rest/v1/board_post_summaries?board_type=eq.${encodeURIComponent(boardType)}&select=*&order=created_at.desc`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: boardConfig.publishableKey,
      Authorization: `Bearer ${boardConfig.publishableKey}`,
    },
  });

  const result = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error("목록을 불러오지 못했습니다.");
  }

  return Array.isArray(result) ? result : [];
}

function buildRowsHtml(posts) {
  return posts
    .map((post, index) => {
      const number = posts.length - index;
      const lock = post.is_secret ? '<span class="secret-lock" aria-label="비밀글">🔒</span>' : '<span class="secret-lock"></span>';

      return `
        <tr>
          <td>${number}</td>
          <td>
            <button class="row-link" type="button" data-post-id="${escapeHtml(post.id || "")}">
              ${lock}
              <span class="row-link-text">${escapeHtml(post.title || "")}</span>
            </button>
          </td>
          <td>${escapeHtml(post.author || "")}</td>
          <td>${escapeHtml(String(post.created_at || "").slice(0, 10))}</td>
        </tr>
      `;
    })
    .join("");
}

function bindRowClicks() {
  boardList.querySelectorAll(".row-link").forEach((button) => {
    button.addEventListener("click", () => {
      openPost(button.dataset.postId || "");
    });
  });
}

function renderCurrentPost(post, openedPassword = "") {
  currentPost = post;
  currentOpenedPassword = openedPassword;

  const secretTag = post.is_secret ? " | 비밀글" : "";
  const date = String(post.created_at || post.createdAt || "").slice(0, 10);
  postViewMeta.textContent = `${post.author || ""} | ${date}${secretTag}`;
  postViewTitle.textContent = post.title || "";
  postViewBody.innerHTML = formatContent(post.content || "");
  postView.classList.remove("hidden");

  if (post._source === "legacy") {
    postDelete.classList.remove("hidden");
  } else {
    postDelete.classList.add("hidden");
  }

  updateUrl(post.id || "");
  scheduleHeightSync();
  postView.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderList() {
  boardList.innerHTML = "";
  boardCount.textContent = `총 ${postsCache.length}건`;
  emptyBox.classList.toggle("hidden", postsCache.length > 0);

  if (postsCache.length === 0) {
    postView.classList.add("hidden");
    postDelete.classList.add("hidden");
    updateUrl("");
    scheduleHeightSync();
    return;
  }

  boardList.innerHTML = buildRowsHtml(postsCache);
  bindRowClicks();
  scheduleHeightSync();
}

async function loadPosts() {
  try {
    postsCache = await loadPostsViaRest();
  } catch {
    postsCache = [];
  }

  if (!postsCache.length) {
    postsCache = loadLegacyPosts();
  }

  renderList();
}

async function openPost(postId, knownPassword = "") {
  const post = postsCache.find((item) => item.id === postId);
  if (!post) return;

  if (post._source === "legacy") {
    let password = knownPassword;
    if (post.is_secret && !password) {
      password = await requestSecretPassword();
      if (!password) return;
    }

    if (post.is_secret && password !== post.password) {
      window.alert("비밀번호가 올바르지 않습니다.");
      return;
    }

    renderCurrentPost(post, password);
    return;
  }

  let password = knownPassword;
  if (post.is_secret && !password) {
    password = await requestSecretPassword();
    if (!password) return;
  }

  try {
    const result = await apiRequest("open", {
      method: "POST",
      body: { postId, password },
    });

    renderCurrentPost(
      {
        id: result.post.id,
        title: result.post.title,
        author: result.post.author,
        content: result.post.content,
        is_secret: Boolean(result.post.secret),
        created_at: result.post.createdAt,
        _source: "supabase",
      },
      password
    );
  } catch (error) {
    window.alert(error.message || "게시글을 열지 못했습니다.");
  }
}

function deleteLegacyCurrentPost() {
  if (!currentPost || currentPost._source !== "legacy") return;

  const confirmDelete = window.confirm("이 글을 삭제하시겠습니까?");
  if (!confirmDelete) return;

  const remaining = loadLegacyPosts().filter((post) => post.id !== currentPost.id);
  saveLegacyPosts(remaining);
  postsCache = remaining;
  postView.classList.add("hidden");
  postDelete.classList.add("hidden");
  currentPost = null;
  currentOpenedPassword = "";
  updateUrl("");
  renderList();
}

writeButton?.addEventListener("click", () => {
  writePanel?.classList.remove("hidden");
  scheduleHeightSync();
  writePanel?.scrollIntoView({ behavior: "smooth", block: "start" });
});

writeCancel?.addEventListener("click", () => {
  writePanel?.classList.add("hidden");
  scheduleHeightSync();
});

postDelete?.addEventListener("click", () => {
  deleteLegacyCurrentPost();
});

writeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(writeForm);
  const author = String(formData.get("author") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const secret = formData.get("secret") === "on";

  if (!author || !password || !title || !content) {
    window.alert("모든 항목을 입력해 주세요.");
    return;
  }

  try {
    const result = await apiRequest("create", {
      method: "POST",
      body: {
        boardType,
        author,
        password,
        title,
        content,
        secret,
      },
    });

    writeForm.reset();
    const secretCheckbox = writeForm.querySelector('input[name="secret"]');
    if (secretCheckbox) secretCheckbox.checked = true;
    enhancePasswordInputs();
    writePanel?.classList.add("hidden");
    window.alert(`${boardName} 게시글이 등록되었습니다.`);

    await loadPosts();
    if (result.post && result.post.id) {
      await openPost(result.post.id, secret ? password : "");
    }
  } catch (error) {
    window.alert(error.message || "게시글 등록 중 오류가 발생했습니다.");
  }
});

window.addEventListener("load", async () => {
  injectUiStyles();
  enhancePasswordInputs();

  try {
    await loadPosts();
  } catch (error) {
    if (emptyBox) {
      emptyBox.classList.remove("hidden");
      emptyBox.textContent = error.message || "목록을 불러오지 못했습니다.";
    }
  } finally {
    scheduleHeightSync();
  }

  const initialPostId = new URLSearchParams(window.location.search).get("post");
  if (initialPostId) {
    window.setTimeout(() => openPost(initialPostId), 0);
  }
});

window.addEventListener("resize", scheduleHeightSync);
