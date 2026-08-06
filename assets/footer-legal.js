(() => {
  if (document.getElementById("privacy-policy-modal") || document.getElementById("disclaimer-modal")) return;

  const officeName = "시그니처 행정사사무소";
  const policyHtml = `
    <div class="legal-modal" id="privacy-policy-modal" aria-hidden="true">
      <div class="legal-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="privacy-policy-title">
        <div class="legal-modal-head">
          <h2 id="privacy-policy-title">개인정보처리방침</h2>
          <button type="button" class="legal-modal-close" aria-label="닫기">&times;</button>
        </div>
        <div class="legal-modal-body">
          <h3>1. 총칙</h3>
          <p>${officeName}(이하 "사무소")는 정보주체의 개인정보를 중요하게 생각하며, 관련 법령을 준수합니다. 본 방침은 홈페이지 이용 과정에서 수집되는 개인정보의 처리 기준과 보호 조치를 안내하기 위해 마련되었습니다.</p>
          <h3>2. 수집하는 개인정보 항목</h3>
          <p>사무소는 상담 문의, 견적 요청, 방문 상담 예약, 서비스 안내 과정에서 다음과 같은 정보를 수집할 수 있습니다.</p>
          <ul>
            <li>필수 항목: 성명, 연락처, 이메일, 문의 제목, 문의 내용</li>
            <li>선택 항목: 상담 분야, 비자 관련 추가 정보, 유입 경로, 첨부 파일</li>
            <li>자동 수집 항목: 접속 일시, 접속 환경 정보, 서비스 이용 기록</li>
          </ul>
          <h3>3. 개인정보의 수집 및 이용 목적</h3>
          <ul>
            <li>상담 요청, 견적 문의, 예약 접수 및 회신</li>
            <li>서비스 이용 검토, 민원 처리, 고객 응대 이력 관리</li>
            <li>서비스 품질 개선, 홈페이지 운영 및 보안 관리</li>
            <li>법령상 의무 이행 및 분쟁 대응</li>
          </ul>
          <h3>4. 개인정보의 보유 및 이용기간</h3>
          <p>수집된 개인정보는 처리 목적 달성 시까지 보유하고, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 안전하게 보관합니다. 보유기간이 경과하거나 처리 목적이 달성되면 지체 없이 파기합니다.</p>
          <h3>5. 개인정보의 제3자 제공</h3>
          <p>사무소는 원칙적으로 정보주체의 개인정보를 외부에 제공하지 않습니다. 다만, 정보주체의 동의가 있거나 법령상 근거가 있는 경우에 한하여 예외적으로 제공할 수 있습니다.</p>
          <h3>6. 개인정보 처리의 위탁</h3>
          <p>사무소는 원활한 홈페이지 운영과 상담 접수를 위하여 필요한 범위에서 일부 서비스를 이용할 수 있으며, 그 경우 관련 법령에 따라 위탁계약 체결 및 안전조치를 이행합니다.</p>
          <ul>
            <li>홈페이지/호스팅 운영 지원</li>
            <li>상담 접수 메일 처리 서비스</li>
            <li>파일 보관 및 데이터 저장 서비스</li>
          </ul>
          <h3>7. 정보주체의 권리와 행사 방법</h3>
          <p>정보주체는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지 등을 요청할 수 있습니다. 권리 행사는 이메일 또는 전화 문의를 통해 가능하며, 사무소는 관련 법령에 따라 지체 없이 조치합니다.</p>
          <h3>8. 개인정보의 파기 절차 및 방법</h3>
          <p>개인정보 보유기간이 경과하거나 처리 목적이 달성된 경우, 전자적 파일은 복구가 불가능한 방식으로 삭제하고 서면 자료는 분쇄 또는 소각 등의 방법으로 파기합니다.</p>
          <h3>9. 개인정보의 안전성 확보조치</h3>
          <ul>
            <li>개인정보 접근 권한의 최소화</li>
            <li>접근 통제, 비밀번호 관리, 보안 점검 실시</li>
            <li>전송구간 보호 및 저장 데이터 보호 조치</li>
            <li>개인정보 취급자에 대한 관리 및 교육</li>
          </ul>
          <h3>10. 쿠키 및 유사 기술</h3>
          <p>사무소는 홈페이지 이용 편의와 접속 통계 확인을 위해 쿠키 또는 유사 기술을 사용할 수 있습니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나 일부 기능 이용이 제한될 수 있습니다.</p>
          <h3>11. 개인정보 보호책임 및 문의</h3>
          <p>개인정보 보호 관련 문의는 아래 연락처로 접수하실 수 있습니다.</p>
          <ul>
            <li>상호: ${officeName}</li>
            <li>이메일: SIG511@naver.com</li>
            <li>전화: 010-7775-5116</li>
          </ul>
          <h3>12. 방침의 변경</h3>
          <p>본 개인정보처리방침은 법령, 서비스 내용, 운영 정책의 변경에 따라 수정될 수 있으며 변경사항은 홈페이지를 통해 공지합니다.</p>
          <p>시행일자: 2026년 4월 1일</p>
        </div>
        <div class="legal-modal-foot">
          <button type="button" class="legal-modal-confirm">닫기</button>
        </div>
      </div>
    </div>
  `;

  const disclaimerHtml = `
    <div class="legal-modal" id="disclaimer-modal" aria-hidden="true">
      <div class="legal-modal-dialog disclaimer-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
        <div class="legal-modal-head">
          <h2 id="disclaimer-title">면책공고</h2>
          <button type="button" class="legal-modal-close" aria-label="닫기">&times;</button>
        </div>
        <div class="legal-modal-body disclaimer-modal-body">
          <div class="disclaimer-modal-top">
            <div class="disclaimer-modal-copy">
              <p class="disclaimer-modal-title"><strong><u>면책 공고 (Disclaimer)</u></strong></p>
              <p>안녕하십니까?</p>
              <p>시그니처 행정사사무소 홈페이지를 방문해 주셔서 감사합니다!</p>
              <p>본 홈페이지에 게시된 모든 정보와 자료는 행정 법령, 제도 및 관련 절차 등에 대한 일반정보를 제공하기 위해 편의상 단순 참고용으로 작성된 것입니다.</p>
            </div>
            <div class="disclaimer-modal-hero-wrap">
              <img class="disclaimer-modal-hero" src="./assets/disclaimer-modal/image1.jpeg" alt="면책공고 안내 이미지" />
            </div>
          </div>
          <div class="disclaimer-modal-copy">
            <p>게시물의 내용은 작성 당시의 행정 관련 법령, 공개된 자료, 국내 및 국제 기준규격 등을 기초로 작성되었으며, 관련 법령, 유관기관의 규정, 고시 및 지침 등의 지속적인 개정 및 변경, 개별 사안의 세부적인 내용과 정황 및 사실관계 등 특수한 사정에 따라 실제 적용된 결과는 달라질 수 있으며, 이에 어떠한 경우에도 법률상 또는 행정상 최종 판단과 결정의 근거로 사용되어서는 안됩니다.</p>
            <p>또한, 행정사 등 행정 전문가와의 개별 상담이나 관련 행정기관에 질의 또는 확인 등이 없이, 본 홈페이지의 게시물만을 근거로 의사결정을 하거나 행정 절차 등을 진행하여 발생하는 직·간접적인 손해 또는 불이익 등에 대하여 당 사무소는 어떠한 법적 및 여타의 책임이 없음을 고지하오니 양지하여 주시기 바랍니다.</p>
            <p>감사합니다!</p>
            <p class="disclaimer-modal-signoff">시그니처 행정사사무소 배상</p>
          </div>
        </div>
        <div class="legal-modal-foot">
          <button type="button" class="legal-modal-confirm">닫기</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", policyHtml);
  document.body.insertAdjacentHTML("beforeend", disclaimerHtml);

  const bindModal = (modalId, triggerKey) => {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const closeButtons = modal.querySelectorAll(".legal-modal-close, .legal-modal-confirm");
    const openButtons = document.querySelectorAll(`[data-legal-modal="${triggerKey}"]`);

    const openModal = () => {
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };

    const closeModal = () => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };

    openButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        openModal();
      });
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("is-open")) {
        closeModal();
      }
    });
  };

  bindModal("privacy-policy-modal", "privacy");
  bindModal("disclaimer-modal", "disclaimer");
})();
