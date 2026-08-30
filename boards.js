const ADMIN_PASSWORD = "signature2026!";
const SHARED_ADMIN_KEY = "signature-admin-auth";
const SHARED_ADMIN_LOGOUT_KEY = "signature-admin-logged-out";

const body = document.body;
const boardSeedTag = document.getElementById("board-seed");
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
const postEdit = document.querySelector(".post-edit");
const adminPanel = document.querySelector(".board-admin-panel");
const adminForm = document.querySelector(".admin-form");
const adminCancel = document.querySelector(".admin-cancel");
const passwordFieldLabel = writeForm?.querySelector(".notice-password-field");

const noticeSupabase =
  window.supabase && window.SIGNATURE_SUPABASE
    ? window.supabase.createClient(
        window.SIGNATURE_SUPABASE.url,
        window.SIGNATURE_SUPABASE.publishableKey
      )
    : null;

let isAdmin = false;
let postsCache = [];
let currentPostId = null;
let editingPostId = null;

function notifyParentHeight() {
  const root = document.documentElement;
  const pageBody = document.body;
  const height = Math.max(
    pageBody?.scrollHeight || 0,
    pageBody?.offsetHeight || 0,
    root?.scrollHeight || 0,
    root?.offsetHeight || 0
  );

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "signature-board-height", height }, "*");
  }
}

function scheduleHeightSync() {
  notifyParentHeight();
  requestAnimationFrame(() => notifyParentHeight());
  setTimeout(() => notifyParentHeight(), 120);
  setTimeout(() => notifyParentHeight(), 280);
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
  return window.SignatureRichText?.format(content) || escapeHtml(content).replaceAll("\n", "<br>");
}

function formatDate(value) {
  const text = String(value || "").trim();
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function normalizePinnedTitle(title, pinned) {
  const text = String(title || "");
  return pinned ? text.replace(/^고정\s*/, "") : text;
}

function parseSeedPosts() {
  if (!boardSeedTag) return [];
  try {
    const parsed = JSON.parse(boardSeedTag.textContent.trim());
    return Array.isArray(parsed)
      ? parsed.map((post) => ({
          id: String(post.id || ""),
          title: String(post.title || ""),
          author: "시그니처행정사",
          content: String(post.content || ""),
          createdAt: formatDate(post.createdAt),
          source: "seed",
        }))
      : [];
  } catch {
    return [];
  }
}

function normalizeServerPost(post) {
  const pinned = Boolean(post.is_pinned || post.pinned);
  return {
    id: String(post.id || ""),
    title: normalizePinnedTitle(post.title, pinned),
    author: String(post.author || "시그니처행정사"),
    content: String(post.content || ""),
    createdAt: formatDate(post.created_at || post.createdAt),
    pinned,
    source: "server",
  };
}

function mergeNoticePosts(seedPosts, serverPosts) {
  const merged = new Map();

  seedPosts.forEach((post) => {
    merged.set(`seed:${post.id}`, post);
  });

  serverPosts.forEach((post) => {
    const key = `${post.title}|${post.createdAt}`;
    for (const [mergedKey, mergedPost] of merged.entries()) {
      if (`${mergedPost.title}|${mergedPost.createdAt}` === key) {
        merged.delete(mergedKey);
      }
    }
    merged.set(`server:${post.id}`, post);
  });

  return Array.from(merged.values()).sort((a, b) => {
    const pinnedDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinnedDiff !== 0) return pinnedDiff;
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
}

async function ensureNoticeSession() {
  if (!noticeSupabase) return null;

  const { data: sessionData } = await noticeSupabase.auth.getSession();
  if (sessionData.session) return sessionData.session;

  const { data, error } = await noticeSupabase.auth.signInAnonymously();
  if (error || !data.session) {
    throw new Error("공지사항 저장 연결에 실패했습니다.");
  }
  return data.session;
}

function updateNoticeWriteUi() {
  if (!writeForm) return;
  if (passwordFieldLabel) {
    passwordFieldLabel.classList.toggle("hidden", isAdmin);
  }
  writeForm.author.readOnly = true;
  writeForm.author.value = "시그니처행정사";
  writeForm.password.required = !isAdmin;
  if (isAdmin) {
    writeForm.password.value = "";
  }
}

async function syncAdminState() {
  const forcedLogout = localStorage.getItem(SHARED_ADMIN_LOGOUT_KEY) === "true";
  if (forcedLogout) {
    isAdmin = false;
  } else {
    isAdmin =
      localStorage.getItem(SHARED_ADMIN_KEY) === "true" ||
      sessionStorage.getItem("signature-admin-notice") === "true";
  }
  updateNoticeWriteUi();
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

function findPost(postId) {
  return postsCache.find((post) => post.id === postId) || null;
}

function hidePanels() {
  writePanel?.classList.add("hidden");
  adminPanel?.classList.add("hidden");
}

function resetWriteForm() {
  editingPostId = null;
  writeForm?.reset();
  window.SignatureRichText?.setValue(writeForm?.content, "");
  if (writeForm) {
    writeForm.querySelector("h3").textContent = "새 공지사항 작성";
    writeForm.author.value = "시그니처행정사";
    if (writeForm.pinned) {
      writeForm.pinned.checked = false;
    }
    writeForm.secret.checked = false;
  }
  updateNoticeWriteUi();
}

function renderList() {
  boardList.innerHTML = "";
  boardCount.textContent = `총 ${postsCache.length}건`;
  emptyBox.classList.toggle("hidden", postsCache.length > 0);

  postsCache.forEach((post, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${post.pinned ? "공지" : postsCache.length - index}</td>
      <td><button class="row-link" type="button" data-post-id="${escapeHtml(post.id)}"><span class="row-link-text">${escapeHtml(post.title)}</span></button></td>
      <td>${escapeHtml(post.author)}</td>
      <td>${escapeHtml(post.createdAt)}</td>
    `;
    boardList.appendChild(tr);
  });

  boardList.querySelectorAll(".row-link").forEach((button) => {
    button.addEventListener("click", () => {
      openPost(button.dataset.postId);
    });
  });

  scheduleHeightSync();
}

function renderPost(post) {
  currentPostId = post.id;
  postViewMeta.textContent = `${post.author} | ${post.createdAt}`;
  postViewTitle.textContent = post.title;
  postViewBody.innerHTML = formatContent(post.content);
  postView.classList.remove("hidden");
  postDelete.classList.toggle("hidden", !isAdmin || post.source !== "server");
  postEdit.classList.toggle("hidden", !isAdmin || post.source !== "server");
  updateUrl(post.id);
  scheduleHeightSync();
}

async function listServerPosts() {
  await ensureNoticeSession();
  const { data, error } = await noticeSupabase
    .from("board_posts")
    .select("id, title, author, content, created_at, is_pinned")
    .eq("board_type", "notice")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "공지 목록을 불러오지 못했습니다.");
  }

  return Array.isArray(data) ? data.map(normalizeServerPost) : [];
}

async function createServerPost({ title, content, pinned }) {
  await ensureNoticeSession();
  const { data, error } = await noticeSupabase
    .from("board_posts")
    .insert({
      board_type: "notice",
      title,
      author: "시그니처행정사",
      content,
      is_pinned: Boolean(pinned),
      is_secret: false,
      password_hash: ADMIN_PASSWORD,
    })
    .select("id, title, author, content, created_at, is_pinned")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "공지 저장 중 오류가 발생했습니다.");
  }

  return normalizeServerPost(data);
}

async function updateServerPost(postId, { title, content, pinned }) {
  await ensureNoticeSession();
  const { data, error } = await noticeSupabase
    .from("board_posts")
    .update({
      title,
      content,
      author: "시그니처행정사",
      is_pinned: Boolean(pinned),
      is_secret: false,
    })
    .eq("id", postId)
    .select("id, title, author, content, created_at, is_pinned")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "공지 수정 중 오류가 발생했습니다.");
  }

  return normalizeServerPost(data);
}

async function deleteServerPost(postId) {
  await ensureNoticeSession();
  const { error } = await noticeSupabase.from("board_posts").delete().eq("id", postId);
  if (error) {
    throw new Error(error.message || "공지 삭제 중 오류가 발생했습니다.");
  }
}

async function loadPosts() {
  const seedPosts = parseSeedPosts();
  try {
    const serverPosts = await listServerPosts();
    postsCache = mergeNoticePosts(seedPosts, serverPosts);
  } catch {
    postsCache = seedPosts;
  }
  renderList();
}

async function openPost(postId) {
  const post = findPost(postId);
  if (!post) return;
  renderPost(post);
}

function startEditPost() {
  const post = findPost(currentPostId);
  if (!isAdmin || !post || post.source !== "server") return;

  editingPostId = post.id;
  hidePanels();
  writePanel.classList.remove("hidden");
  writeForm.querySelector("h3").textContent = "공지사항 수정";
  writeForm.author.value = "시그니처행정사";
  writeForm.title.value = post.title || "";
  window.SignatureRichText?.setValue(writeForm.content, post.content || "");
  if (writeForm.pinned) {
    writeForm.pinned.checked = Boolean(post.pinned);
  }
  writeForm.secret.checked = false;
  updateNoticeWriteUi();
  writePanel.scrollIntoView({ behavior: "smooth", block: "start" });
  scheduleHeightSync();
}

async function saveNotice() {
  const formData = new FormData(writeForm);
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const pinned = formData.get("pinned") === "on";

  if (!title || !content) {
    window.alert("모든 항목을 입력해 주세요.");
    return;
  }

  if (!isAdmin) {
    adminPanel.classList.remove("hidden");
    return;
  }

  try {
    const savedPost = editingPostId
      ? await updateServerPost(editingPostId, { title, content, pinned })
      : await createServerPost({ title, content, pinned });

    writePanel.classList.add("hidden");
    resetWriteForm();
    await loadPosts();
    await openPost(savedPost.id);
    window.alert(editingPostId ? "공지사항 게시글이 수정되었습니다." : "공지사항 게시글이 등록되었습니다.");
  } catch (error) {
    window.alert(error.message || "공지 저장 중 오류가 발생했습니다.");
  }
}

async function deleteCurrentPost() {
  const post = findPost(currentPostId);
  if (!post || post.source !== "server") return;
  if (!window.confirm("이 글을 삭제하시겠습니까?")) return;

  try {
    await deleteServerPost(currentPostId);
    currentPostId = null;
    postView.classList.add("hidden");
    updateUrl("");
    await loadPosts();
    window.alert("공지사항 게시글이 삭제되었습니다.");
  } catch (error) {
    window.alert(error.message || "공지 삭제 중 오류가 발생했습니다.");
  }
}

writeButton?.addEventListener("click", () => {
  if (!isAdmin) {
    adminPanel.classList.remove("hidden");
    writePanel.classList.add("hidden");
    return;
  }
  hidePanels();
  resetWriteForm();
  writePanel.classList.remove("hidden");
  writePanel.scrollIntoView({ behavior: "smooth", block: "start" });
  scheduleHeightSync();
});

writeCancel?.addEventListener("click", () => {
  writePanel.classList.add("hidden");
  resetWriteForm();
  scheduleHeightSync();
});

writeForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveNotice();
});

adminCancel?.addEventListener("click", () => {
  adminPanel.classList.add("hidden");
  scheduleHeightSync();
});

adminForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(adminForm);
  const password = String(formData.get("adminPassword") || "").trim();

  if (password !== ADMIN_PASSWORD) {
    window.alert("관리자 로그인에 실패했습니다.");
    return;
  }

  localStorage.setItem(SHARED_ADMIN_KEY, "true");
  localStorage.removeItem(SHARED_ADMIN_LOGOUT_KEY);
  sessionStorage.setItem("signature-admin-notice", "true");
  isAdmin = true;
  updateNoticeWriteUi();
  adminPanel.classList.add("hidden");
  window.alert("관리자 모드로 로그인되었습니다.");
});

postDelete?.addEventListener("click", () => {
  deleteCurrentPost();
});

postEdit?.addEventListener("click", () => {
  startEditPost();
});

window.addEventListener("load", async () => {
  await syncAdminState();
  resetWriteForm();
  await loadPosts();
  scheduleHeightSync();

  const initialPostId = new URLSearchParams(window.location.search).get("post");
  if (initialPostId) {
    await openPost(initialPostId);
  }
});

window.addEventListener("resize", scheduleHeightSync);
window.addEventListener("storage", async (event) => {
  if (
    event.key === SHARED_ADMIN_KEY ||
    event.key === SHARED_ADMIN_LOGOUT_KEY
  ) {
    await syncAdminState();
  }
});
