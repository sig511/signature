(() => {
  const config = window.SIGNATURE_SUPABASE;
  const isWebPage = ["http:", "https:"].includes(window.location.protocol);
  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const privacyOptOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === "1";

  if (!config?.url || !config?.publishableKey || !isWebPage || isLocalHost || privacyOptOut) {
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

  const sectionValue = new URLSearchParams(window.location.search).get("section") || "";
  const safeSection = /^[a-z0-9-]{1,80}$/i.test(sectionValue) ? sectionValue : "";
  const basePath = window.location.pathname || "/";
  const pagePath = `${basePath}${safeSection ? `?section=${encodeURIComponent(safeSection)}` : ""}`.slice(0, 500);

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
    }),
    keepalive: true,
  }).catch(() => {});
})();
