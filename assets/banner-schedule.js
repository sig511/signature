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
  const shouldShowBusinessBanner =
    isWeekdayInKorea && !isHolidayInKorea && koreaHour >= 9 && koreaHour < 18;
  const bannerLink = document.querySelector(".brand-banner-link");
  const bannerImage = bannerLink?.querySelector(".brand-banner-image");
  const businessBannerSrc = bannerLink?.dataset.businessBannerSrc;
  const defaultBannerSrc = bannerLink?.dataset.defaultBannerSrc;

  document.body.classList.toggle("business-hours-banner", shouldShowBusinessBanner);

  if (bannerImage && businessBannerSrc && defaultBannerSrc) {
    bannerImage.src = shouldShowBusinessBanner ? businessBannerSrc : defaultBannerSrc;
  }
})();
