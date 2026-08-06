const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") || "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
const inquiryMailTo = Deno.env.get("INQUIRY_NOTIFICATION_TO") || "";
const inquiryMailFrom = Deno.env.get("INQUIRY_NOTIFICATION_FROM") || "";
const attachmentBucket = Deno.env.get("INQUIRY_ATTACHMENT_BUCKET") || "board-attachments";
const emailAttachmentLimitBytes = Number(Deno.env.get("INQUIRY_EMAIL_ATTACHMENT_LIMIT_BYTES") || 9 * 1024 * 1024);

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

async function adminFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((result as { message?: string; error?: string }).message || (result as { error?: string }).error || "Supabase request failed.");
  }

  return result;
}

async function getUserFromToken(req: Request) {
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

async function createSignedUrl(path: string) {
  const result = await adminFetch(
    `/storage/v1/object/sign/${attachmentBucket}/${encodeURIComponent(path).replaceAll("%2F", "/")}`,
    {
      method: "POST",
      body: JSON.stringify({ expiresIn: 60 * 60 * 24 * 7 }),
    }
  );

  const signedPath = (result as { signedURL?: string }).signedURL || "";
  return signedPath ? `${supabaseUrl}/storage/v1${signedPath}` : "";
}

async function downloadAttachment(path: string) {
  const encodedPath = encodeURIComponent(path).replaceAll("%2F", "/");
  const response = await fetch(`${supabaseUrl}/storage/v1/object/authenticated/${attachmentBucket}/${encodedPath}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to download the inquiry attachment.");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function buildMailHtml(payload: Record<string, unknown>, signedUrl: string) {
  const line = (label: string, value: unknown) =>
    `<tr><th align="left" style="padding:8px 12px;border:1px solid #d9e2ec;background:#f7fafc;">${escapeHtml(label)}</th><td style="padding:8px 12px;border:1px solid #d9e2ec;">${escapeHtml(String(value || "-"))}</td></tr>`;

  return `
    <div style="font-family:Arial,'Noto Sans KR',sans-serif;color:#17324c;">
      <h2 style="margin:0 0 16px;">A new inquiry has been submitted.</h2>
      <table style="border-collapse:collapse;width:100%;max-width:820px;">
        ${line("Name", payload.name)}
        ${line("Phone", payload.phone)}
        ${line("Email", payload.email)}
        ${line("Category", payload.category)}
        ${line("Title", payload.title)}
        ${line("Referral path", payload.referral_path)}
        ${line("Nationality", payload.visa_nationality)}
        ${line("Last departure date", payload.visa_departure)}
        ${line("Current stay", payload.visa_stay)}
        ${line("Current visa status", payload.visa_status)}
        ${line("Past overstay or record", payload.visa_record)}
        ${line("Attachment", payload.attachment_name)}
        ${line("Supabase path", payload.attachment_path)}
      </table>
      <div style="margin-top:18px;padding:16px;border:1px solid #d9e2ec;border-radius:12px;background:#ffffff;white-space:pre-wrap;line-height:1.7;">${escapeHtml(String(payload.content || ""))}</div>
      ${signedUrl ? `<p style="margin-top:16px;">Attachment download: <a href="${signedUrl}">${escapeHtml(String(payload.attachment_name || "attachment"))}</a></p>` : ""}
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ message: "Unsupported request." }, 405);
  }

  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return json({ message: "Inquiry authentication could not be verified." }, 401);
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const category = String(body.category || "").trim();
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();

    if (!name || !phone || !email || !category || !title || !content) {
      return json({ message: "Required fields are missing." }, 400);
    }

    const payload = {
      name,
      phone,
      email,
      category,
      visa_nationality: body.visa_nationality ? String(body.visa_nationality).trim() : null,
      visa_departure: body.visa_departure ? String(body.visa_departure).trim() : null,
      visa_stay: body.visa_stay ? String(body.visa_stay).trim() : null,
      visa_status: body.visa_status ? String(body.visa_status).trim() : null,
      visa_record: body.visa_record ? String(body.visa_record).trim() : null,
      title,
      content,
      referral_path: body.referral_path ? String(body.referral_path).trim() : null,
      attachment_name: body.attachment_name ? String(body.attachment_name).trim() : null,
      attachment_path: body.attachment_path ? String(body.attachment_path).trim() : null,
      attachment_type: body.attachment_type ? String(body.attachment_type).trim() : null,
      attachment_size: body.attachment_size ? Number(body.attachment_size) : null,
    };

    const rows = await adminFetch("/rest/v1/inquiry_submissions?select=id,created_at", {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!resendApiKey || !inquiryMailTo || !inquiryMailFrom) {
      return json({
        ok: true,
        saved: true,
        emailed: false,
        submission: Array.isArray(rows) ? rows[0] : rows,
        message: "The inquiry was saved, but email settings are not configured yet.",
      });
    }

    const signedUrl = payload.attachment_path ? await createSignedUrl(payload.attachment_path) : "";
    const attachments = [];

    if (
      payload.attachment_path &&
      payload.attachment_name &&
      payload.attachment_size &&
      payload.attachment_size <= emailAttachmentLimitBytes
    ) {
      const base64Content = await downloadAttachment(payload.attachment_path);
      attachments.push({
        filename: payload.attachment_name,
        content: base64Content,
      });
    }

    const mailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: inquiryMailFrom,
        to: [inquiryMailTo],
        subject: `[Website Inquiry] ${title}`,
        html: buildMailHtml(payload, signedUrl),
        text: [
          "A new inquiry has been submitted.",
          `Name: ${payload.name}`,
          `Phone: ${payload.phone}`,
          `Email: ${payload.email}`,
          `Category: ${payload.category}`,
          `Title: ${payload.title}`,
          "",
          `${payload.content}`,
          "",
          payload.attachment_name ? `Attachment: ${payload.attachment_name}` : "",
          signedUrl ? `Attachment download: ${signedUrl}` : "",
        ].filter(Boolean).join("\n"),
        attachments,
      }),
    });

    const mailResult = await mailResponse.json().catch(() => ({}));
    if (!mailResponse.ok) {
      return json({
        ok: true,
        saved: true,
        emailed: false,
        submission: Array.isArray(rows) ? rows[0] : rows,
        message: (mailResult as { message?: string }).message || "The inquiry was saved, but sending the email failed.",
      });
    }

    return json({
      ok: true,
      saved: true,
      emailed: true,
      submission: Array.isArray(rows) ? rows[0] : rows,
      email: mailResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return json({ message }, 500);
  }
});
