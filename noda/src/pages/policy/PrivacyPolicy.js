import React from "react";
import { Container } from "reactstrap";

const PrivacyPolicy = () => {
  return (
    <Container className="mt-5 mb-5" style={{ maxWidth: "800px" }}>
      <h2 className="mb-4">개인정보 처리방침</h2>

      <p>
        NODA(이하 "회사")는 사용자의 개인정보를 중요하게 생각하며, 아래와 같이
        개인정보를 처리하고 있습니다.
      </p>

      <h4 className="mt-4">1. 개인정보 수집 항목</h4>
      <ul>
        <li>필수항목: 이름, 이메일, 비밀번호</li>
        <li>선택항목: 프로필 이미지, 부서정보 등</li>
      </ul>

      <h4 className="mt-4">2. 수집 목적</h4>
      <p>
        수집한 개인정보는 회원 관리, 서비스 제공, 고객 문의 대응을 위한
        목적으로만 사용됩니다.
      </p>

      <h4 className="mt-4">3. 보유 및 이용기간</h4>
      <p>
        사용자의 회원 탈퇴 시 즉시 파기되며, 관련 법령에 의해 보존이 필요한
        경우 해당 법령에 따릅니다.
      </p>

      <h4 className="mt-4">4. 개인정보 보호책임자</h4>
      <p>
        문의: <strong>privacy@noda.com</strong>
      </p>

      <p className="mt-5 text-muted">
        본 방침은 2025년 10월 27일부터 시행됩니다.
      </p>
    </Container>
  );
};

export default PrivacyPolicy;
