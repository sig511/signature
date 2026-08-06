const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

const noticeAdminPassword = Deno.env.get("NOTICE_ADMIN_PASSWORD") || "signature2026!";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") || "";

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getBoardType(url) {
  const boardType = url.searchParams.get("boardType") || "";
  if (boardType !== "quote" && boardType !== "reservation" && boardType !== "notice") {
    throw new Error("Unsupported board type.");
  }
  return boardType;
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function adminFetch(path, options) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...(options || {}),
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...((options && options.headers) || {}),
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || result.error || "Supabase request failed.");
  }

  return result;
}

async function getUserFromToken(req) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return await response.json().catch(() => null);
}

function isAdminUser(user) {
  return Boolean(user && user.email && user.is_anonymous !== true);
}

function isNoticeAdmin(body) {
  return String(body?.adminPassword || "").trim() === noticeAdminPassword;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "list";

  try {
    const user = await getUserFromToken(req);
    const adminUser = isAdminUser(user);

    if (req.method === "GET" && action === "list") {
      const boardType = getBoardType(url);
      const posts = await adminFetch(
        `/rest/v1/board_post_summaries?board_type=eq.${boardType}&select=*&order=created_at.desc`
      );
      return json({ posts: Array.isArray(posts) ? posts : [] });
    }

    if (req.method === "POST" && action === "create") {
      const body = await req.json();
      const boardType = String(body.boardType || "");
      const author = String(body.author || "").trim();
      const password = String(body.password || "").trim();
      const title = String(body.title || "").trim();
      const content = String(body.content || "").trim();
      const secret = Boolean(body.secret);
      const noticeAdmin = isNoticeAdmin(body);

      if (!author || !password || !title || !content) {
        return json({ message: "Required fields are missing." }, 400);
      }

      if (boardType !== "quote" && boardType !== "reservation" && boardType !== "notice") {
        return json({ message: "Unsupported board type." }, 400);
      }

      if (boardType === "notice" && !adminUser && !noticeAdmin) {
        return json({ message: "Admin login is required." }, 401);
      }

      const normalizedAuthor = boardType === "notice" ? "시그니처행정사" : author;
      const normalizedSecret = boardType === "notice" ? false : secret;
      const passwordHash = await sha256(password || "notice-admin");
      const rows = await adminFetch(
        "/rest/v1/board_posts?select=id,board_type,title,author,is_secret,created_at,admin_reply",
        {
          method: "POST",
          headers: {
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            board_type: boardType,
            title,
            author: normalizedAuthor,
            content,
            is_secret: normalizedSecret,
            password_hash: passwordHash,
          }),
        }
      );

      return json({ post: Array.isArray(rows) ? rows[0] : rows }, 201);
    }

    if (req.method === "POST" && action === "open") {
      const body = await req.json();
      const postId = String(body.postId || "");
      const password = String(body.password || "");
      const noticeAdmin = isNoticeAdmin(body);
      const rows = await adminFetch(`/rest/v1/board_posts?id=eq.${postId}&select=*`);
      const post = Array.isArray(rows) ? rows[0] : null;

      if (!post) {
        return json({ message: "Post not found." }, 404);
      }

      if (post.is_secret && !adminUser) {
        const passwordHash = await sha256(password);
        if (passwordHash !== post.password_hash) {
          return json({ message: "Password is incorrect." }, 403);
        }
      }

      return json({ post });
    }

    if (req.method === "GET" && action === "adminList") {
      if (!adminUser) {
        return json({ message: "Admin login is required." }, 401);
      }

      const boardType = getBoardType(url);
      const posts = await adminFetch(
        `/rest/v1/board_posts?board_type=eq.${boardType}&select=id,board_type,title,author,is_secret,created_at,admin_reply&order=created_at.desc`
      );
      return json({ posts: Array.isArray(posts) ? posts : [] });
    }

    if (req.method === "POST" && action === "adminOpen") {
      if (!adminUser) {
        return json({ message: "Admin login is required." }, 401);
      }

      const body = await req.json();
      const postId = String(body.postId || "");
      const rows = await adminFetch(`/rest/v1/board_posts?id=eq.${postId}&select=*`);
      const post = Array.isArray(rows) ? rows[0] : null;

      if (!post) {
        return json({ message: "Post not found." }, 404);
      }

      return json({ post });
    }

    if (req.method === "POST" && action === "saveReply") {
      if (!adminUser) {
        return json({ message: "Admin login is required." }, 401);
      }

      const body = await req.json();
      const postId = String(body.postId || "");
      const adminReply = String(body.adminReply || "").trim();
      const rows = await adminFetch(`/rest/v1/board_posts?id=eq.${postId}&select=*`, {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          admin_reply: adminReply,
          replied_at: adminReply ? new Date().toISOString() : null,
        }),
      });

      return json({ post: Array.isArray(rows) ? rows[0] : rows });
    }

    if (req.method === "DELETE" && action === "delete") {
      const body = await req.json();
      const postId = String(body.postId || "");
      const password = String(body.password || "");
      const rows = await adminFetch(`/rest/v1/board_posts?id=eq.${postId}&select=*`);
      const post = Array.isArray(rows) ? rows[0] : null;

      if (!post) {
        return json({ message: "Post not found." }, 404);
      }

      if (post.board_type === "notice" && !adminUser && !noticeAdmin) {
        return json({ message: "Admin login is required." }, 401);
      }

      if (!adminUser && !noticeAdmin) {
        const passwordHash = await sha256(password);
        if (passwordHash !== post.password_hash) {
          return json({ message: "Password is incorrect." }, 403);
        }
      }

      await adminFetch(`/rest/v1/board_posts?id=eq.${postId}`, {
        method: "DELETE",
      });

      return json({ success: true });
    }

    if (req.method === "POST" && action === "update") {
      const noticeAdmin = isNoticeAdmin(body);
      if (!adminUser && !noticeAdmin) {
        return json({ message: "Admin login is required." }, 401);
      }

      const body = await req.json();
      const postId = String(body.postId || "");
      const title = String(body.title || "").trim();
      const content = String(body.content || "").trim();

      if (!postId || !title || !content) {
        return json({ message: "Required fields are missing." }, 400);
      }

      const existingRows = await adminFetch(`/rest/v1/board_posts?id=eq.${postId}&select=*`);
      const existingPost = Array.isArray(existingRows) ? existingRows[0] : null;

      if (!existingPost) {
        return json({ message: "Post not found." }, 404);
      }

      if (existingPost.board_type !== "notice") {
        return json({ message: "Unsupported board type." }, 400);
      }

      const rows = await adminFetch(`/rest/v1/board_posts?id=eq.${postId}&select=*`, {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          title,
          content,
          author: "시그니처행정사",
          is_secret: false,
        }),
      });

      return json({ post: Array.isArray(rows) ? rows[0] : rows });
    }

    return json({ message: "Unsupported request." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return json({ message }, 500);
  }
});
