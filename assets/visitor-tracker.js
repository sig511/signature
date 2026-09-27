(() => {
  const config = window.SIGNATURE_SUPABASE;
  const isWebPage = ["http:", "https:"].includes(window.location.protocol);
  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const privacyOptOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === "1";
  const currentParams = new URLSearchParams(window.location.search);
  const isEmbeddedBoard = currentParams.get("embedded") === "1";
  const isAdminPreview = currentParams.get("admin_preview") === "1";

  if (
    !config?.url ||
    !config?.publishableKey ||
    !isWebPage ||
    isLocalHost ||
    privacyOptOut ||
    isEmbeddedBoard ||
    isAdminPreview
  ) {
    return;
  }

  const visitorStorageKey = "signature-anonymous-visitor-id";
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function createVisitorId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const randomValue = Math.floor(Math.random() * 16);
      const value = character === "x" ? randomValue : (randomValue & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  function getVisitorId() {
    try {
      const savedId = window.localStorage.getItem(visitorStorageKey);
      if (savedId && uuidPattern.test(savedId)) return savedId;
      const newId = createVisitorId();
      window.localStorage.setItem(visitorStorageKey, newId);
      return newId;
    } catch {
      return createVisitorId();
    }
  }

  function classifyExternalReferrer(hostValue) {
    const host = String(hostValue || "").toLowerCase().replace(/^www\./, "").slice(0, 255);
    if (!host) return { source: "unknown", host: "" };
    if (/(^|\.)google\./.test(host)) return { source: "google", host };
    if (/(^|\.)naver\.com$/.test(host)) return { source: "naver", host };
    if (/(^|\.)(daum\.net|kakao\.com)$/.test(host)) return { source: "daum", host };
    if (/(^|\.)bing\.com$/.test(host)) return { source: "bing", host };
    if (/(^|\.)(yahoo\.|zum\.com$)/.test(host)) return { source: "other_search", host };
    return { source: "external", host };
  }

  function getReferrerInfo() {
    try {
      const handedOffHost = window.sessionStorage.getItem("signatureExternalReferrerHost") || "";
      window.sessionStorage.removeItem("signatureExternalReferrerHost");
      if (handedOffHost) return classifyExternalReferrer(handedOffHost);
    } catch {}

    if (!document.referrer) return { source: "direct", host: "" };

    try {
      const referrerUrl = new URL(document.referrer);
      const host = referrerUrl.hostname.toLowerCase().replace(/^www\./, "").slice(0, 255);
      if (referrerUrl.origin === window.location.origin) return { source: "internal", host };
      return classifyExternalReferrer(host);
    } catch {
      return { source: "unknown", host: "" };
    }
  }
  const referrer = getReferrerInfo();
  const sectionValue = new URLSearchParams(window.location.search).get("section") || "";
  const safeSection = /^[a-z0-9-]{1,80}$/i.test(sectionValue) ? sectionValue : "";
  const basePath = window.location.pathname || "/";
  const pagePath = `${basePath}${safeSection ? `?section=${encodeURIComponent(safeSection)}` : ""}`.slice(0, 500);
  const isMobilePagePath =
    basePath.includes("/pc-mobile-") ||
    /\/m-(?:index|company|contact)-refined\.html$/i.test(basePath);
  const userAgentMobile = navigator.userAgentData?.mobile === true;
  const narrowTouchScreen = window.matchMedia("(max-width: 900px) and (pointer: coarse)").matches;
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  const deviceType =
    isMobilePagePath || userAgentMobile || narrowTouchScreen || mobileUserAgent ? "mobile" : "pc";

  fetch(`${config.url}/rest/v1/site_visits`, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${config.publishableKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      visitor_id: getVisitorId(),
      path: pagePath,
      device_type: deviceType,
      referrer_source: referrer.source,
      referrer_host: referrer.host || null,
    }),
    keepalive: true,
  }).catch(() => {});
})();
