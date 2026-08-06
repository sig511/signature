const boardConfig = window.SIGNATURE_SUPABASE || {};
const supabaseClient = window.supabase.createClient(
  boardConfig.url,
  boardConfig.publishableKey
);

const body = document.body;
const boardName = body.dataset.boardName || "";
const boardType = body.dataset.boardType || "";

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
let postEdit = document.querySelector(".post-edit");
const boardSeedTag = document.getElementById("board-seed");

const TEXT = {
  totalPrefix: "총 ",
  totalSuffix: "건",
  fillAll: "모든 항목을 입력해 주세요.",
  registeredSuffix: " 게시글이 등록되었습니다.",
  updatedSuffix: " 게시글이 수정되었습니다.",
  loadFailed: "목록을 불러오지 못했습니다.",
  requestFailed: "요청 처리 중 오류가 발생했습니다.",
  passwordTitle: "비밀번호 확인",
  passwordMessage: "작성시 등록하신 비밀번호를 입력해주세요.",
  passwordPlaceholder: "비밀번호",
  cancel: "취소",
  confirm: "확인",
  show: "보기",
  hide: "숨김",
  wrongPassword: "비밀번호가 올바르지 않습니다.",
  adminReplyTitle: "시그니처행정사 답변",
  replyTag: "[답변]",
  secretMeta: " | 비밀글",
  anonymousAuthFailed: "익명 게시판 연결에 실패했습니다. Supabase에서 Anonymous 로그인 허용을 켜 주세요.",
  deleteConfirm: "이 글을 삭제하시겠습니까?",
  deleteDone: "게시글이 삭제되었습니다.",
  empty: "등록된 게시글이 없습니다.",
  edit: "수정",
  editTitle: "수정하기",
  attachmentLabel: "첨부파일",
};

let postsCache = [];
let currentPost = null;
let currentSession = null;
let editingPostId = null;
let editingPassword = "";
const ATTACHMENT_BUCKET = "board-attachments";

function parseSeedPosts() {
  if (!boardSeedTag) return [];

  try {
    const parsed = JSON.parse(boardSeedTag.textContent.trim());
    if (!Array.isArray(parsed)) return [];

    return parsed.map((post) => ({
      id: String(post.id || ""),
      title: String(post.title || ""),
      author: String(post.author || ""),
      content: String(post.content || ""),
      created_at: String(post.created_at || post.createdAt || ""),
      is_secret: Boolean(post.is_secret || post.secret),
      admin_reply: String(post.admin_reply || ""),
      replied_at: String(post.replied_at || ""),
      source: "seed",
    }));
  } catch {
    return [];
  }
}

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
  requestAnimationFrame(notifyParentHeight);
  setTimeout(notifyParentHeight, 120);
  setTimeout(notifyParentHeight, 280);
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

function ensureUiStyles() {
  if (document.getElementById("signature-server-board-style")) return;

  const style = document.createElement("style");
  style.id = "signature-server-board-style";
  style.textContent = `
    .password-field-wrap { position: relative; }
    .password-field-wrap input { padding-right: 70px !important; }
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
      background: rgba(12, 22, 35, 0.5);
      z-index: 9999;
    }
    .secret-modal.is-open { display: flex; }
    .secret-modal-dialog {
      width: min(408px, calc(100% - 32px));
      padding: 30px 30px 32px;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 8px 24px rgba(12, 22, 35, 0.18);
    }
    .secret-modal-title {
      margin: 0 0 18px;
      color: #111;
      font-size: 1.08rem;
      font-weight: 500;
    }
    .secret-modal-copy {
      margin: 0 0 18px;
      color: #222;
      line-height: 1.6;
      font-size: 0.98rem;
    }
    #secret-password-input {
      width: 100%;
      height: 44px;
      padding: 0 56px 0 14px;
      border: 1px solid #d5d9df;
      border-radius: 4px;
      color: #17324c;
      font: inherit;
      background: #fff;
      box-sizing: border-box;
    }
    #secret-password-input::placeholder {
      color: #8b95a1;
    }
    .secret-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 18px;
    }
    .secret-modal-button {
      min-width: 64px;
      height: 44px;
      padding: 0 20px;
      border-radius: 4px;
      border: 1px solid #d5d9df;
      background: #fff;
      color: #17324c;
      font-weight: 700;
      cursor: pointer;
    }
    .secret-modal-button.confirm {
      border-color: #204b72;
      background: #204b72;
      color: #fff;
    }
    .board-reply-row td {
      padding: 12px 14px 14px;
      background: #fbfdff;
      border-top: 0;
      color: #496078;
      font-size: 0.96rem;
    }
    .board-reply-row td:first-child {
      color: transparent;
    }
    .board-reply-cell {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-left: 0;
    }
    .board-reply-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 34px;
      height: 20px;
      padding: 0 6px;
      border-radius: 999px;
      background: #3a434d;
      color: #fff;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.01em;
      flex: 0 0 auto;
    }
    .board-file-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: transparent;
      color: #204b72;
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0 auto;
    }
    .board-reply-title {
      color: #3a5168;
      line-height: 1.6;
    }
    .post-attachment {
      margin-top: 18px;
      padding-top: 18px;
      border-top: 1px solid rgba(13,39,66,0.08);
    }
    .post-attachment strong {
      display: block;
      margin-bottom: 8px;
      color: #204b72;
    }
    .post-attachment a {
      color: #204b72;
      font-weight: 700;
      text-decoration: underline;
      word-break: break-all;
    }
  `;

  document.head.appendChild(style);
}

function ensureEditButton() {
  if (postEdit) return postEdit;
  const actionWrap = document.querySelector(".post-view-actions");
  if (!actionWrap) return null;
  postEdit = document.createElement("button");
  postEdit.type = "button";
  postEdit.className = "board-cancel post-edit hidden";
  postEdit.textContent = TEXT.edit;
  actionWrap.insertBefore(postEdit, postDelete || null);
  return postEdit;
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
  button.textContent = TEXT.show;
  button.addEventListener("click", () => {
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    button.textContent = showing ? TEXT.show : TEXT.hide;
  });
  wrapper.appendChild(button);
}

function enhancePasswordInputs() {
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    attachToggleToPasswordInput(input);
  });
}

function requestSecretPassword(message) {
  return new Promise((resolve) => {
    let modal = document.getElementById("secret-password-modal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "secret-password-modal";
      modal.className = "secret-modal";
      modal.innerHTML = `
        <div class="secret-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="secret-modal-title">
          <h3 id="secret-modal-title" class="secret-modal-title">${TEXT.passwordTitle}</h3>
          <p class="secret-modal-copy"></p>
          <input id="secret-password-input" type="password" placeholder="${TEXT.passwordPlaceholder}" />
          <div class="secret-modal-actions">
            <button type="button" class="secret-modal-button confirm">${TEXT.confirm}</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const passwordInput = modal.querySelector("#secret-password-input");
      const confirmButton = modal.querySelector(".confirm");

      attachToggleToPasswordInput(passwordInput);

      confirmButton.addEventListener("click", () => {
        modal.classList.remove("is-open");
        const resolver = modal._resolver;
        modal._resolver = null;
        if (resolver) {
          resolver(passwordInput.value.trim());
        }
      });

      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          modal.classList.remove("is-open");
          const resolver = modal._resolver;
          modal._resolver = null;
          if (resolver) {
            resolver("");
          }
        }
      });

      passwordInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          confirmButton.click();
        }
      });
    }

    const copy = modal.querySelector(".secret-modal-copy");
    const passwordInput = modal.querySelector("#secret-password-input");
    const toggle = modal.querySelector(".password-toggle");
    copy.textContent = message;
    passwordInput.value = "";
    passwordInput.type = "password";
    modal._resolver = resolve;
    if (toggle) toggle.textContent = TEXT.show;
    modal.classList.add("is-open");
    setTimeout(() => passwordInput.focus(), 0);
  });
}

async function ensureAnonymousSession() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (sessionData.session) {
    currentSession = sessionData.session;
    return currentSession;
  }

  const { data, error } = await supabaseClient.auth.signInAnonymously();
  if (error || !data.session) {
    throw new Error(`${TEXT.anonymousAuthFailed} ${error?.message || ""}`.trim());
  }

  currentSession = data.session;
  return currentSession;
}

async function authHeaders() {
  const session = await ensureAnonymousSession();
  return session;
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function uploadAttachment(file, postId) {
  if (!file) {
    return {
      attachment_name: null,
      attachment_path: null,
      attachment_type: null,
      attachment_size: null,
    };
  }

  await authHeaders();
  const safeName = String(file.name || "attachment").replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${boardType}/${postId}/${Date.now()}-${safeName}`;
  const { error } = await supabaseClient.storage.from(ATTACHMENT_BUCKET).upload(filePath, file, {
    upsert: true,
  });

  if (error) {
    throw new Error(error.message || TEXT.requestFailed);
  }

  return {
    attachment_name: file.name || safeName,
    attachment_path: filePath,
    attachment_type: file.type || "",
    attachment_size: Number(file.size || 0),
  };
}

async function removeAttachment(path) {
  if (!path) return;
  await authHeaders();
  await supabaseClient.storage.from(ATTACHMENT_BUCKET).remove([path]);
}

async function createAttachmentUrl(path) {
  if (!path) return "";
  await authHeaders();
  const { data, error } = await supabaseClient.storage.from(ATTACHMENT_BUCKET).createSignedUrl(path, 1800);
  if (error) {
    throw new Error(error.message || TEXT.requestFailed);
  }
  return data?.signedUrl || "";
}

async function listPosts() {
  await authHeaders();
  const { data, error } = await supabaseClient
    .from("board_posts")
    .select("id, board_type, title, author, is_secret, created_at, admin_reply, replied_at, attachment_name, attachment_path, attachment_type, attachment_size, reply_attachment_name, reply_attachment_path, reply_attachment_type, reply_attachment_size")
    .eq("board_type", boardType)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || TEXT.loadFailed);
  }

  return Array.isArray(data) ? data : [];
}

async function getPost(postId) {
  await authHeaders();
  const { data, error } = await supabaseClient
    .from("board_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error) {
    throw new Error(error.message || TEXT.requestFailed);
  }

  return data;
}

async function createPost({ author, password, title, content, secret }) {
  await authHeaders();
  const passwordHash = await sha256(password);
  const { data, error } = await supabaseClient
    .from("board_posts")
    .insert({
      board_type: boardType,
      author,
      title,
      content,
      is_secret: secret,
      password_hash: passwordHash,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || TEXT.requestFailed);
  }

  return data;
}

async function updatePost({ postId, password, author, title, content, secret, attachmentFile }) {
  await authHeaders();
  const passwordHash = await sha256(password);
  const { data: post, error: loadError } = await supabaseClient
    .from("board_posts")
    .select("id, password_hash, attachment_path")
    .eq("id", postId)
    .single();

  if (loadError || !post) {
    throw new Error(TEXT.requestFailed);
  }

  if (passwordHash !== post.password_hash) {
    throw new Error(TEXT.wrongPassword);
  }

  let attachmentPayload = {
    attachment_name: null,
    attachment_path: post.attachment_path || null,
    attachment_type: null,
    attachment_size: null,
  };

  if (attachmentFile) {
    if (post.attachment_path) {
      await removeAttachment(post.attachment_path);
    }
    attachmentPayload = await uploadAttachment(attachmentFile, postId);
  }

  const { data, error } = await supabaseClient
    .from("board_posts")
    .update({
      author,
      title,
      content,
      is_secret: secret,
      ...attachmentPayload,
    })
    .eq("id", postId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error.message || TEXT.requestFailed);
  }

  return data;
}

async function removePost(postId) {
  await authHeaders();
  const { data: post } = await supabaseClient.from("board_posts").select("attachment_path").eq("id", postId).single();
  if (post?.attachment_path) {
    await removeAttachment(post.attachment_path);
  }
  const { data, error } = await supabaseClient
    .from("board_posts")
    .delete()
    .eq("id", postId)
    .select("id");
  if (error || !Array.isArray(data) || data.length === 0) {
    throw new Error(error.message || TEXT.requestFailed);
  }
}

function renderList() {
  boardList.innerHTML = "";
  boardCount.textContent = `${TEXT.totalPrefix}${postsCache.length}${TEXT.totalSuffix}`;
  emptyBox.classList.toggle("hidden", postsCache.length > 0);
  emptyBox.textContent = TEXT.empty;

  postsCache.forEach((post, index) => {
    const tr = document.createElement("tr");
    const hasReply = Boolean(post.admin_reply && post.admin_reply.trim());
    const hasAttachment = Boolean(post.attachment_name && post.attachment_path);
    const hasReplyAttachment = Boolean(post.reply_attachment_name && post.reply_attachment_path);
    const lockHtml = post.is_secret
      ? '<span class="secret-lock" aria-label="secret">&#128274;</span>'
      : '<span class="secret-lock"></span>';

    tr.innerHTML = `
      <td>${postsCache.length - index}</td>
      <td><button class="row-link" type="button" data-post-id="${post.id}">${lockHtml}<span class="row-link-text">${escapeHtml(post.title)}</span></button></td>
      <td>${escapeHtml(post.author)}</td>
      <td>${escapeHtml(String(post.created_at || "").slice(0, 10))}</td>
      <td>${hasAttachment ? '<span class="board-file-icon" aria-label="첨부파일">💾</span>' : ''}</td>
    `;
    boardList.appendChild(tr);

    if (hasReply) {
      const replyRow = document.createElement("tr");
      replyRow.className = "board-reply-row";
      replyRow.innerHTML = `
        <td></td>
        <td>
          <div class="board-reply-cell">
            <span class="board-reply-badge">RE</span>
            <span class="board-reply-title">문의 답변: ${escapeHtml(post.title)}</span>
          </div>
        </td>
        <td>시그니처행정사</td>
        <td>${escapeHtml(String(post.replied_at || post.created_at || "").slice(0, 10))}</td>
        <td>${hasReplyAttachment ? '<span class="board-file-icon" aria-label="답변 첨부파일">💾</span>' : ''}</td>
      `;
      boardList.appendChild(replyRow);
    }
  });

  boardList.querySelectorAll(".row-link").forEach((button) => {
    button.addEventListener("click", () => {
      openPost(button.dataset.postId);
    });
  });

  scheduleHeightSync();
}

function renderPost(post) {
  currentPost = post;

  const replyHtml =
    post.admin_reply && post.admin_reply.trim()
      ? `<div style="margin-top:18px;padding-top:18px;border-top:1px solid rgba(13,39,66,0.08);"><strong style="display:block;margin-bottom:8px;color:#204b72;">${TEXT.adminReplyTitle}</strong>${formatContent(post.admin_reply)}${
          post.reply_attachment_url && post.reply_attachment_name
            ? `<div class="post-attachment"><strong>답변 첨부파일</strong><a href="${escapeHtml(post.reply_attachment_url)}" target="_blank" rel="noreferrer">${escapeHtml(post.reply_attachment_name)}</a></div>`
            : ""
        }</div>`
      : "";
  const attachmentHtml =
    post.attachment_url && post.attachment_name
      ? `<div class="post-attachment"><strong>${TEXT.attachmentLabel}</strong><a href="${escapeHtml(post.attachment_url)}" target="_blank" rel="noreferrer">${escapeHtml(post.attachment_name)}</a></div>`
      : "";

  postViewMeta.textContent = `${post.author} | ${String(post.created_at || "").slice(0, 10)}${post.is_secret ? TEXT.secretMeta : ""}`;
  postViewTitle.textContent = post.title;
  postViewBody.innerHTML = `${formatContent(post.content)}${attachmentHtml}${replyHtml}`;
  postView.classList.remove("hidden");
  postDelete.classList.toggle("hidden", post.source === "seed");
  ensureEditButton()?.classList.toggle("hidden", post.source === "seed");

  scheduleHeightSync();
  postView.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetWriteFormState() {
  editingPostId = null;
  editingPassword = "";
  if (writeForm) {
    const heading = writeForm.querySelector("h3");
    if (heading) heading.textContent = `${boardName} 작성`;
    const submitButton = writeForm.querySelector('.board-action[type="submit"]');
    if (submitButton) submitButton.textContent = "접수하기";
  }
}

function startEditPost(post, password) {
  if (!writeForm || !post) return;
  editingPostId = post.id;
  editingPassword = password;
  const heading = writeForm.querySelector("h3");
  if (heading) heading.textContent = `${boardName} ${TEXT.editTitle}`;
  const submitButton = writeForm.querySelector('.board-action[type="submit"]');
  if (submitButton) submitButton.textContent = "수정 저장";

  writeForm.querySelector('input[name="author"]').value = post.author || "";
  writeForm.querySelector('input[name="password"]').value = password || "";
  writeForm.querySelector('input[name="title"]').value = post.title || "";
  writeForm.querySelector('textarea[name="content"]').value = post.content || "";
  writeForm.querySelector('input[name="attachment"]').value = "";
  const secretInput = writeForm.querySelector('input[name="secret"]');
  if (secretInput) secretInput.checked = Boolean(post.is_secret);

  writePanel.classList.remove("hidden");
  scheduleHeightSync();
  writePanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadPosts() {
  const seedPosts = parseSeedPosts();

  try {
    postsCache = await listPosts();
    if (!postsCache.length && seedPosts.length) {
      postsCache = seedPosts;
    }
  } catch (error) {
    if (seedPosts.length) {
      postsCache = seedPosts;
    } else {
      throw error;
    }
  }

  await Promise.all(
    postsCache.map(async (post) => {
      if (post.source === "seed") return;
      if (!post.is_secret && post.attachment_path) {
        try {
          post.attachment_url = await createAttachmentUrl(post.attachment_path);
        } catch {
          post.attachment_url = "";
        }
      }
    })
  );
  renderList();
}

async function openPost(postId, knownPassword = "") {
  const summary = postsCache.find((post) => post.id === postId);
  if (!summary) return;

  if (summary.source === "seed") {
    renderPost(summary);
    return;
  }

  let password = knownPassword;
  if (summary.is_secret && !password) {
    password = await requestSecretPassword(TEXT.passwordMessage);
    if (!password) return;
  }

  const post = await getPost(postId);
  if (post.is_secret) {
    const passwordHash = await sha256(password);
    if (passwordHash !== post.password_hash) {
      throw new Error(TEXT.wrongPassword);
    }
  }

  if (post.attachment_path) {
    post.attachment_url = await createAttachmentUrl(post.attachment_path);
  }
  if (post.reply_attachment_path) {
    post.reply_attachment_url = await createAttachmentUrl(post.reply_attachment_path);
  }

  renderPost(post);
}

async function deleteCurrentPost() {
  if (!currentPost) return;
  if (currentPost.source === "seed") return;

  const confirmed = window.confirm(TEXT.deleteConfirm);
  if (!confirmed) return;

  let password = "";
  if (currentPost.is_secret) {
    password = await requestSecretPassword(TEXT.passwordMessage);
    if (!password) return;
  }

  if (currentPost.is_secret) {
    const passwordHash = await sha256(password);
    if (passwordHash !== currentPost.password_hash) {
      throw new Error(TEXT.wrongPassword);
    }
  }

  await removePost(currentPost.id);

  currentPost = null;
  postView.classList.add("hidden");
  postDelete.classList.add("hidden");
  ensureEditButton()?.classList.add("hidden");
  await loadPosts();
  window.alert(TEXT.deleteDone);
  window.location.reload();
}

writeButton?.addEventListener("click", () => {
  writePanel.classList.remove("hidden");
  scheduleHeightSync();
  writePanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

writeCancel?.addEventListener("click", () => {
  writePanel.classList.add("hidden");
  resetWriteFormState();
  scheduleHeightSync();
});

writeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(writeForm);
  const author = String(formData.get("author") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const secret = formData.get("secret") === "on";
  const attachmentFile = writeForm.querySelector('input[name="attachment"]')?.files?.[0] || null;

  if (!author || !password || !title || !content) {
    window.alert(TEXT.fillAll);
    return;
  }

  let post;
  if (editingPostId) {
    post = await updatePost({
      postId: editingPostId,
      password: editingPassword || password,
      author,
      title,
      content,
      secret,
      attachmentFile,
    });
  } else {
    post = await createPost({
      author,
      password,
      title,
      content,
      secret,
    });
    if (attachmentFile) {
      const attachmentPayload = await uploadAttachment(attachmentFile, post.id);
      const { data, error } = await supabaseClient
        .from("board_posts")
        .update(attachmentPayload)
        .eq("id", post.id)
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message || TEXT.requestFailed);
      }
      post = data;
    }
  }

  writeForm.reset();
  const secretInput = writeForm.querySelector('input[name="secret"]');
  if (secretInput) {
    secretInput.checked = true;
  }
  enhancePasswordInputs();
  writePanel.classList.add("hidden");
  window.alert(`${boardName}${editingPostId ? TEXT.updatedSuffix : TEXT.registeredSuffix}`);
  const reopenPassword = editingPostId ? editingPassword || password : secret ? password : "";
  resetWriteFormState();

  await loadPosts();
  await openPost(post.id, reopenPassword);
});

postDelete?.addEventListener("click", () => {
  deleteCurrentPost().catch((error) => {
    window.alert(error.message || TEXT.requestFailed);
  });
});

ensureEditButton()?.addEventListener("click", async () => {
  if (!currentPost) return;
  let password = "";
  if (currentPost.is_secret) {
    password = await requestSecretPassword(TEXT.passwordMessage);
    if (!password) return;
  }

  if (currentPost.is_secret) {
    const passwordHash = await sha256(password);
    if (passwordHash !== currentPost.password_hash) {
      window.alert(TEXT.wrongPassword);
      return;
    }
  }

  startEditPost(currentPost, password);
});

ensureUiStyles();
enhancePasswordInputs();
resetWriteFormState();

window.addEventListener("load", async () => {
  try {
    await loadPosts();
  } catch (error) {
    if (postsCache.length > 0) {
      emptyBox.classList.add("hidden");
      emptyBox.textContent = TEXT.empty;
    } else {
      emptyBox.classList.remove("hidden");
      emptyBox.textContent = error.message || TEXT.loadFailed;
    }
  } finally {
    scheduleHeightSync();
  }
});

window.addEventListener("resize", scheduleHeightSync);

