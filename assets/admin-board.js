const adminSupabase = window.supabase.createClient(
  window.SIGNATURE_SUPABASE.url,
  window.SIGNATURE_SUPABASE.publishableKey
);

const loginCard = document.getElementById("admin-login-card");
const loginForm = document.getElementById("admin-login-form");
const dashboard = document.getElementById("admin-dashboard");
const logoutButton = document.getElementById("admin-logout-button");
const countBox = document.getElementById("admin-board-count");
const postList = document.getElementById("admin-post-list");
const emptyBox = document.getElementById("admin-empty");
const detailTitle = document.getElementById("admin-detail-title");
const detailMeta = document.getElementById("admin-detail-meta");
const detailBody = document.getElementById("admin-detail-body");
const deleteButton = document.getElementById("admin-delete-button");
const secretBadge = document.getElementById("admin-secret-badge");
const replyCard = document.getElementById("admin-reply-card");
const replyInput = document.getElementById("admin-reply-input");
const replyFileInput = document.getElementById("admin-reply-file");
const replyFileLink = document.getElementById("admin-reply-file-link");
const replySaveButton = document.getElementById("admin-reply-save");
const sharedAdminKey = "signature-admin-auth";
const sharedAdminLogoutKey = "signature-admin-logged-out";
const adminEmailKey = "signature-admin-email";
const boardSessionKeys = [
  "signature-admin-notice",
  "signature-admin-quote",
  "signature-admin-reservation",
];

const ADMIN_TEXT = {
  countPrefix: "총 ",
  countSuffix: "건",
  choosePost: "게시글을 선택해 주세요.",
  choosePostGuide: "목록에서 글을 클릭하면 비밀글 포함 전체 내용을 확인할 수 있습니다.",
  noPostSelected: "아직 선택된 글이 없습니다.",
  secret: "비밀글",
  public: "일반글",
  replyTag: "[답변]",
  deleteConfirm: "이 글을 삭제하시겠습니까?",
  deleteDone: "게시글이 삭제되었습니다.",
  replySaved: "답변이 저장되었습니다.",
  loginFailed: "관리자 로그인에 실패했습니다.",
  loadFailed: "목록을 불러오지 못했습니다.",
  deleteFailed: "삭제하지 못했습니다.",
  replyFailed: "답변을 저장하지 못했습니다.",
};

let activeBoardKey = "quote";
let currentPostId = null;
let postsCache = [];
let adminSession = null;

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

async function createAttachmentUrl(path) {
  if (!path) return "";
  const { data, error } = await adminSupabase.storage.from("board-attachments").createSignedUrl(path, 1800);
  if (error) {
    throw new Error(error.message || ADMIN_TEXT.loadFailed);
  }
  return data?.signedUrl || "";
}

async function uploadReplyAttachment(file, postId, oldPath = "") {
  if (!file) {
    return {
      reply_attachment_name: null,
      reply_attachment_path: oldPath || null,
      reply_attachment_type: null,
      reply_attachment_size: null,
    };
  }

  const safeName = String(file.name || "attachment").replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `reply/${postId}/${Date.now()}-${safeName}`;
  if (oldPath) {
    await adminSupabase.storage.from("board-attachments").remove([oldPath]);
  }
  const { error } = await adminSupabase.storage.from("board-attachments").upload(filePath, file, {
    upsert: true,
  });
  if (error) {
    throw new Error(error.message || ADMIN_TEXT.replyFailed);
  }

  return {
    reply_attachment_name: file.name || safeName,
    reply_attachment_path: filePath,
    reply_attachment_type: file.type || "",
    reply_attachment_size: Number(file.size || 0),
  };
}

async function authHeaders() {
  if (!adminSession) {
    const { data } = await adminSupabase.auth.getSession();
    adminSession = data.session || null;
  }

  return adminSession;
}

async function ensureAdminSession() {
  const session = await authHeaders();
  if (!session?.access_token) {
    throw new Error("관리자 로그인이 필요합니다.");
  }

  return session;
}

async function listPosts(boardKey) {
  await ensureAdminSession();
  const { data, error } = await adminSupabase
    .from("board_posts")
    .select("id, board_type, title, author, is_secret, created_at, admin_reply, reply_attachment_name, reply_attachment_path")
    .eq("board_type", boardKey)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || ADMIN_TEXT.loadFailed);
  }

  return Array.isArray(data) ? data : [];
}

async function getPost(postId) {
  await ensureAdminSession();
  const { data, error } = await adminSupabase
    .from("board_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error) {
    throw new Error(error.message || ADMIN_TEXT.loadFailed);
  }

  return data;
}

async function deletePost(postId) {
  await ensureAdminSession();
  const { error } = await adminSupabase.from("board_posts").delete().eq("id", postId);
  if (error) {
    throw new Error(error.message || ADMIN_TEXT.deleteFailed);
  }
}

async function updateReply(postId, adminReply) {
  await ensureAdminSession();
  const currentPost = await getPost(postId);
  const replyFile = replyFileInput?.files?.[0] || null;
  const replyAttachmentPayload = await uploadReplyAttachment(
    replyFile,
    postId,
    currentPost?.reply_attachment_path || ""
  );
  const { error } = await adminSupabase
    .from("board_posts")
    .update({
      admin_reply: adminReply,
      replied_at: adminReply ? new Date().toISOString() : null,
      ...replyAttachmentPayload,
    })
    .eq("id", postId);

  if (error) {
    throw new Error(error.message || ADMIN_TEXT.replyFailed);
  }
}

function renderDetail(post) {
  if (!post) {
    currentPostId = null;
    detailTitle.textContent = ADMIN_TEXT.choosePost;
    detailMeta.textContent = ADMIN_TEXT.choosePostGuide;
    detailBody.textContent = ADMIN_TEXT.noPostSelected;
    deleteButton.classList.add("hidden");
    secretBadge.classList.add("hidden");
    replyCard.classList.add("hidden");
    replyInput.value = "";
    return;
  }

  currentPostId = post.id;
  const attachmentHtml =
    post.attachment_url && post.attachment_name
      ? `<div style="margin-top:18px;padding-top:18px;border-top:1px solid rgba(13,39,66,0.08);"><strong style="display:block;margin-bottom:8px;color:#204b72;">첨부파일</strong><a href="${escapeHtml(post.attachment_url)}" target="_blank" rel="noreferrer" style="color:#204b72;font-weight:700;text-decoration:underline;word-break:break-all;">${escapeHtml(post.attachment_name)}</a></div>`
      : "";
  const replyAttachmentHtml =
    post.reply_attachment_url && post.reply_attachment_name
      ? `<div style="margin-top:18px;padding-top:18px;border-top:1px solid rgba(13,39,66,0.08);"><strong style="display:block;margin-bottom:8px;color:#204b72;">답변 첨부파일</strong><a href="${escapeHtml(post.reply_attachment_url)}" target="_blank" rel="noreferrer" style="color:#204b72;font-weight:700;text-decoration:underline;word-break:break-all;">${escapeHtml(post.reply_attachment_name)}</a></div>`
      : "";
  detailTitle.textContent = post.title || "";
  detailMeta.textContent = `${post.author || ""} | ${String(post.created_at || "").slice(0, 10)}${post.is_secret ? " | 비밀글" : ""}`;
  detailBody.innerHTML = `${formatContent(post.content || "")}${attachmentHtml}${replyAttachmentHtml}`;
  deleteButton.classList.remove("hidden");
  secretBadge.classList.toggle("hidden", !post.is_secret);
  replyCard.classList.remove("hidden");
  replyInput.value = post.admin_reply || "";
  if (replyFileInput) replyFileInput.value = "";
  if (replyFileLink) {
    if (post.reply_attachment_url && post.reply_attachment_name) {
      replyFileLink.href = post.reply_attachment_url;
      replyFileLink.textContent = post.reply_attachment_name;
      replyFileLink.classList.remove("hidden");
    } else {
      replyFileLink.href = "#";
      replyFileLink.textContent = "";
      replyFileLink.classList.add("hidden");
    }
  }
}

function renderList() {
  postList.innerHTML = "";
  countBox.textContent = `${ADMIN_TEXT.countPrefix}${postsCache.length}${ADMIN_TEXT.countSuffix}`;
  emptyBox.classList.toggle("hidden", postsCache.length > 0);

  postsCache.forEach((post, index) => {
    const tr = document.createElement("tr");
    const replyTag = post.admin_reply ? ` <span style="color:#b0602d;font-weight:800;">${ADMIN_TEXT.replyTag}</span>` : "";
    const lockHtml = post.is_secret
      ? '<span class="secret-lock" aria-label="secret">&#128274;</span>'
      : '<span class="secret-lock"></span>';

    tr.innerHTML = `
      <td>${postsCache.length - index}</td>
      <td>
        <button class="admin-list-button" type="button" data-post-id="${post.id}">
          <strong>${lockHtml}${escapeHtml(post.title)}${replyTag}</strong>
          <div class="admin-list-meta">${post.is_secret ? ADMIN_TEXT.secret : ADMIN_TEXT.public}</div>
        </button>
      </td>
      <td>${escapeHtml(post.author)}</td>
      <td>${escapeHtml(String(post.created_at || "").slice(0, 10))}</td>
    `;

    postList.appendChild(tr);
  });

  postList.querySelectorAll(".admin-list-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const post = await getPost(button.dataset.postId);
      if (post?.attachment_path) {
        post.attachment_url = await createAttachmentUrl(post.attachment_path);
      }
      if (post?.reply_attachment_path) {
        post.reply_attachment_url = await createAttachmentUrl(post.reply_attachment_path);
      }
      renderDetail(post || null);
    });
  });

  const selectedPostStillVisible = currentPostId && postsCache.some((post) => post.id === currentPostId);
  if (!selectedPostStillVisible) {
    renderDetail(null);
  }
}

async function loadPosts() {
  postsCache = await listPosts(activeBoardKey);
  renderList();
}

function switchBoard(boardKey) {
  activeBoardKey = boardKey;
  currentPostId = null;
  renderDetail(null);
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.boardKey === boardKey);
  });

  loadPosts().catch((error) => {
    window.alert(error.message || ADMIN_TEXT.loadFailed);
  });
}

async function showDashboard() {
  loginCard.classList.add("hidden");
  dashboard.classList.remove("hidden");
  await loadPosts();
}

async function deleteCurrentPost() {
  if (!currentPostId) return;
  if (!window.confirm(ADMIN_TEXT.deleteConfirm)) return;

  await deletePost(currentPostId);

  currentPostId = null;
  await loadPosts();
  window.alert(ADMIN_TEXT.deleteDone);
}

async function saveReply() {
  if (!currentPostId) return;

  await updateReply(currentPostId, replyInput.value.trim());

  await loadPosts();
  const post = await getPost(currentPostId);
  if (post?.attachment_path) {
    post.attachment_url = await createAttachmentUrl(post.attachment_path);
  }
  if (post?.reply_attachment_path) {
    post.reply_attachment_url = await createAttachmentUrl(post.reply_attachment_path);
  }
  renderDetail(post || null);
  window.alert(ADMIN_TEXT.replySaved);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = String(formData.get("adminEmail") || "").trim();
  const password = String(formData.get("adminPassword") || "").trim();

  const { error } = await adminSupabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    window.alert(ADMIN_TEXT.loginFailed);
    return;
  }

  const { data } = await adminSupabase.auth.getSession();
  adminSession = data.session || null;
  localStorage.setItem(sharedAdminKey, "true");
  localStorage.removeItem(sharedAdminLogoutKey);
  localStorage.setItem(adminEmailKey, email);
  await showDashboard();
});

logoutButton.addEventListener("click", async () => {
  await adminSupabase.auth.signOut();
  adminSession = null;
  localStorage.removeItem(sharedAdminKey);
  localStorage.setItem(sharedAdminLogoutKey, "true");
  boardSessionKeys.forEach((key) => sessionStorage.removeItem(key));
  window.location.reload();
});

document.querySelectorAll(".admin-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    switchBoard(tab.dataset.boardKey);
  });
});

deleteButton.addEventListener("click", () => {
  deleteCurrentPost().catch((error) => {
    window.alert(error.message || ADMIN_TEXT.deleteFailed);
  });
});

replySaveButton.addEventListener("click", () => {
  saveReply().catch((error) => {
    window.alert(error.message || ADMIN_TEXT.replyFailed);
  });
});

window.addEventListener("load", async () => {
  if (localStorage.getItem(sharedAdminLogoutKey) === "true") {
    adminSession = null;
    localStorage.removeItem(sharedAdminKey);
    boardSessionKeys.forEach((key) => sessionStorage.removeItem(key));
    try {
      await adminSupabase.auth.signOut();
    } catch {}
    return;
  }

  const { data } = await adminSupabase.auth.getSession();
  adminSession = data.session || null;
  if (adminSession) {
    localStorage.setItem(sharedAdminKey, "true");
    localStorage.removeItem(sharedAdminLogoutKey);
    await showDashboard();
  } else {
    localStorage.removeItem(sharedAdminKey);
    localStorage.setItem(sharedAdminLogoutKey, "true");
    boardSessionKeys.forEach((key) => sessionStorage.removeItem(key));
  }
});
