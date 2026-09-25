(() => {
  const koreaNow = new Date();
  const koreaDateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(koreaNow);
  const koreaWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(koreaNow);
  const koreaHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hour12: false,
    }).format(koreaNow)
  );

  const koreaYear = koreaDateParts.find((part) => part.type === "year")?.value || "";
  const koreaMonth = koreaDateParts.find((part) => part.type === "month")?.value || "";
  const koreaDay = koreaDateParts.find((part) => part.type === "day")?.value || "";
  const koreaDateKey = `${koreaYear}-${koreaMonth}-${koreaDay}`;

  const businessBannerHolidaySet = new Set([
    "2026-01-01",
    "2026-02-16",
    "2026-02-17",
    "2026-02-18",
    "2026-03-02",
    "2026-05-01",
    "2026-05-05",
    "2026-05-25",
    "2026-06-03",
    "2026-07-17",
    "2026-08-17",
    "2026-09-24",
    "2026-09-25",
    "2026-09-26",
    "2026-10-05",
    "2026-10-09",
    "2026-12-25",
  ]);

  const isWeekdayInKorea = !["Sat", "Sun"].includes(koreaWeekday);
  const isHolidayInKorea = businessBannerHolidaySet.has(koreaDateKey);
  const bannerPreviewMode = new URLSearchParams(window.location.search).get("banner");
  const isScheduledBusinessHours =
    isWeekdayInKorea && !isHolidayInKorea && koreaHour >= 9 && koreaHour < 18;
  const shouldShowBusinessBanner =
    bannerPreviewMode === "business"
      ? true
      : bannerPreviewMode === "default"
        ? false
        : isScheduledBusinessHours;
  const bannerLink = document.querySelector(".brand-banner-link");
  const bannerImage = bannerLink?.querySelector(".brand-banner-image");
  const businessBannerSrc = bannerLink?.dataset.businessBannerSrc;
  const defaultBannerSrc = bannerLink?.dataset.defaultBannerSrc;

  document.body.classList.toggle("business-hours-banner", shouldShowBusinessBanner);
  document.body.classList.toggle(
    "business-banner-preview",
    bannerPreviewMode === "business"
  );

  if (bannerImage && businessBannerSrc && defaultBannerSrc) {
    bannerImage.src = shouldShowBusinessBanner ? businessBannerSrc : defaultBannerSrc;
  }

  const kakaoRailCard = document.querySelector(".floating-rail-kakao");

  if (kakaoRailCard && !document.querySelector(".floating-rail-naver")) {
    const naverTalkCard = document.createElement("a");
    naverTalkCard.href = "https://talk.naver.com/profile/wcuctzw";
    naverTalkCard.target = "_blank";
    naverTalkCard.rel = "noreferrer";
    naverTalkCard.className =
      "floating-rail-card floating-rail-kakao floating-rail-naver icon-card";
    naverTalkCard.setAttribute("aria-label", "네이버 톡톡 상담");
    naverTalkCard.innerHTML = `
      <img class="rail-kakao-image rail-naver-image" src="./naver%20images.png" alt="네이버 톡톡" />
      <strong class="floating-rail-kakao-text floating-rail-naver-text">
        <span>네이버 톡톡</span>
      </strong>
    `;
    kakaoRailCard.insertAdjacentElement("afterend", naverTalkCard);
  }
})();


