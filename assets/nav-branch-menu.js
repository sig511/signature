document.addEventListener("DOMContentLoaded", () => {
  const branchConfig = {
    "./business.html?section=general-procurement": [
      { href: "./business.html?section=general-procurement-overview", label: "공공조달 행정 개요" },
      { href: "./business.html?section=general-bid-registration", label: "입찰참가자격등록" },
      { href: "./business.html?section=general-item-registration", label: "품목등록/물품식별번호" },
      { href: "./business.html?section=general-mas", label: "다수공급자계약(MAS)" },
      { href: "./business.html?section=general-venture-nara", label: "벤처나라 제품 지정" },
      { href: "./business.html?section=general-gpass", label: "G-PASS기업 지정" },
      { href: "./business.html?section=general-excellent-product", label: "우수제품 지정" }
    ],
    "./business.html?section=general-compensation": [
      { href: "./business.html?section=general-land", label: "토지 등 손실보상" },
      { href: "./business.html?section=general-labor", label: "노동·산재보상" }
    ],
    "./business.html?section=medical-approval": [
      { href: "./business.html?section=medical-license", label: "제조·수입업 허가" },
      { href: "./business.html?section=medical-approval-item", label: "품목허가·인증·신고" },
      { href: "./business.html?section=medical-change", label: "변경허가·인증·신고" },
      { href: "./business.html?section=medical-renewal", label: "품목갱신" },
      { href: "./business.html?section=medical-docs", label: "인·허가 문서작성 대행" }
    ],
    "./business.html?section=medical-quality": [
      { href: "./business.html?section=medical-gmp", label: "GMP/ISO 13485 인증 컨설팅" },
      { href: "./business.html?section=medical-quality-docs", label: "QM·품질문서 등 작성 대행" }
    ],
    "./business.html?section=medical-global": [
      { href: "./business.html?section=medical-fda", label: "FDA 인·허가" },
      { href: "./business.html?section=medical-ce", label: "CE 인증" },
      { href: "./business.html?section=medical-sea", label: "동남아 인·허가" }
    ],
    "./pc-mobile-business.html?section=general-procurement": [
      { href: "./pc-mobile-business.html?section=general-procurement-overview", label: "공공조달 행정 개요" },
      { href: "./pc-mobile-business.html?section=general-bid-registration", label: "입찰참가자격등록" },
      { href: "./pc-mobile-business.html?section=general-item-registration", label: "품목등록/물품식별번호" },
      { href: "./pc-mobile-business.html?section=general-mas", label: "다수공급자계약(MAS)" },
      { href: "./pc-mobile-business.html?section=general-venture-nara", label: "벤처나라 제품 지정" },
      { href: "./pc-mobile-business.html?section=general-gpass", label: "G-PASS기업 지정" },
      { href: "./pc-mobile-business.html?section=general-excellent-product", label: "우수제품 지정" }
    ],
    "./pc-mobile-business.html?section=general-compensation": [
      { href: "./pc-mobile-business.html?section=general-land", label: "토지 등 손실보상" },
      { href: "./pc-mobile-business.html?section=general-labor", label: "노동·산재보상" }
    ],
    "./pc-mobile-business.html?section=medical-approval": [
      { href: "./pc-mobile-business.html?section=medical-license", label: "제조·수입업 허가" },
      { href: "./pc-mobile-business.html?section=medical-approval-item", label: "품목허가·인증·신고" },
      { href: "./pc-mobile-business.html?section=medical-change", label: "변경허가·인증·신고" },
      { href: "./pc-mobile-business.html?section=medical-renewal", label: "품목갱신" },
      { href: "./pc-mobile-business.html?section=medical-docs", label: "인·허가 문서작성 대행" }
    ],
    "./pc-mobile-business.html?section=medical-quality": [
      { href: "./pc-mobile-business.html?section=medical-gmp", label: "GMP/ISO 13485 인증 컨설팅" },
      { href: "./pc-mobile-business.html?section=medical-quality-docs", label: "QM·품질문서 등 작성 대행" }
    ],
    "./pc-mobile-business.html?section=medical-global": [
      { href: "./pc-mobile-business.html?section=medical-fda", label: "FDA 인·허가" },
      { href: "./pc-mobile-business.html?section=medical-ce", label: "CE 인증" },
      { href: "./pc-mobile-business.html?section=medical-sea", label: "동남아 인·허가" }
    ]
  };

  const nav = document.querySelector(".main-nav");
  const navItems = Array.from(document.querySelectorAll(".main-nav-item"));
  const isTouchStyleNav = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (!nav || navItems.length === 0) {
    return;
  }

  const normalizeHref = (href) => href.replace(/&amp;/g, "&");

  const getDropdown = (item) => item.querySelector(":scope > .main-nav-dropdown");

  const closeBranch = (branch) => {
    branch.classList.remove("is-open");

    const toggle = branch.querySelector(".main-nav-dropdown-branch-toggle");
    const children = branch.querySelector(".main-nav-dropdown-children");
    const label = branch.querySelector(".main-nav-dropdown-branch-link")?.textContent?.trim() || "";

    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", `${label} 하위 메뉴 열기`);
      toggle.textContent = "+";
    }

    if (children) {
      children.hidden = true;
    }
  };

  const closeAllBranches = (scope = document, exceptBranch = null) => {
    scope.querySelectorAll(".main-nav-dropdown-branch.is-open").forEach((branch) => {
      if (branch !== exceptBranch) {
        closeBranch(branch);
      }
    });
  };

  const closeNavItem = (item) => {
    item.classList.remove("is-open");

    if (isTouchStyleNav) {
      const dropdown = getDropdown(item);
      if (dropdown) {
        dropdown.hidden = true;
      }
    }
  };

  const openNavItem = (item) => {
    navItems.forEach((navItem) => {
      if (navItem !== item) {
        closeNavItem(navItem);
      }
    });

    item.classList.add("is-open");

    if (isTouchStyleNav) {
      const dropdown = getDropdown(item);
      if (dropdown) {
        dropdown.hidden = false;
      }
    }
  };

  const closeAllNavItems = () => {
    navItems.forEach(closeNavItem);
  };

  document.querySelectorAll(".main-nav-dropdown").forEach((dropdown) => {
    if (isTouchStyleNav) {
      dropdown.hidden = true;
    }

    const parentNavItem = dropdown.closest(".main-nav-item");

    Array.from(dropdown.querySelectorAll(":scope > a")).forEach((link) => {
      const normalizedHref = normalizeHref(link.getAttribute("href") || "");
      const children = branchConfig[normalizedHref];

      if (!children) {
        return;
      }

      const label = (link.textContent || "").trim();
      const branch = document.createElement("div");
      branch.className = "main-nav-dropdown-branch";

      const head = document.createElement("div");
      head.className = "main-nav-dropdown-branch-head";

      const branchLink = document.createElement("button");
      branchLink.type = "button";
      branchLink.className = "main-nav-dropdown-branch-link";
      branchLink.textContent = label;

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "main-nav-dropdown-branch-toggle";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", `${label} 하위 메뉴 열기`);
      toggle.textContent = "+";

      const childList = document.createElement("div");
      childList.className = "main-nav-dropdown-children";
      childList.hidden = true;

      children.forEach((item) => {
        const childLink = document.createElement("a");
        childLink.href = item.href;
        childLink.textContent = item.label;
        childList.appendChild(childLink);
      });

      const toggleBranch = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (parentNavItem) {
          openNavItem(parentNavItem);
        }

          const isOpen = toggle.getAttribute("aria-expanded") === "true";

        if (isOpen) {
          closeBranch(branch);
          return;
        }

        branch.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", `${label} 하위 메뉴 닫기`);
          toggle.textContent = "-";
          childList.hidden = false;
          closeAllBranches(dropdown, branch);
        };

      branch.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });

      branch.addEventListener("click", (event) => {
        event.stopPropagation();
      });

      toggle.addEventListener("click", toggleBranch);

      branchLink.addEventListener("click", toggleBranch);

      head.append(branchLink, toggle);
      branch.append(head, childList);
      link.replaceWith(branch);
    });
  });

  navItems.forEach((item) => {
    const topLink = item.querySelector(":scope > a");
    const dropdown = getDropdown(item);

    if (!topLink || !dropdown) {
      return;
    }

    const handleOpen = () => {
      openNavItem(item);

      if (!item.querySelector(".main-nav-dropdown-branch")) {
        closeAllBranches();
      }
    };

    if (isTouchStyleNav) {
      topLink.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (item.classList.contains("is-open")) {
          closeNavItem(item);
          closeAllBranches(dropdown);
          return;
        }

        handleOpen();
      });

      item.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    } else {
      item.addEventListener("pointerenter", handleOpen);
      item.addEventListener("focusin", handleOpen);
    }
  });

  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest(".main-nav-item")) {
      return;
    }

    closeAllNavItems();
    closeAllBranches();
  });
});
