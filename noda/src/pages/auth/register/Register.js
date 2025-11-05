import React, { useState } from "react";
import PropTypes from "prop-types";
import { withRouter, Link } from "react-router-dom";
import { connect } from "react-redux";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Button,
  FormGroup,
  FormText,
  Input,
  Label,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter
} from "reactstrap"; // ✅ Reactstrap 컴포넌트 (Modal, Button, Input 등)

// ✅ 공통 컴포넌트 및 리소스 임포트
import Widget from "../../../components/Widget/Widget";
import Footer from "../../../components/Footer/Footer";
import SofiaLogo from "../../../components/Icons/SofiaLogo";
import registerImage from "../../../assets/registerImage.svg";
import PrivacyPolicy from "../../policy/PrivacyPolicy"; // 개인정보 처리방침 모달 내용

// ✅ 백엔드 URL 설정 (환경변수 없으면 로컬 기본값 사용)
const BACKEND_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Register = (props) => {
  // -------------------------------
  // 🔹 상태 관리 (useState 훅)
  // -------------------------------
  const [state, setState] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [isConsentChecked, setIsConsentChecked] = useState(false); // 약관 동의 체크박스
  const [error, setError] = useState(""); // 에러 메시지
  const [success, setSuccess] = useState(""); // 성공 메시지
  const [modal, setModal] = useState(false); // 개인정보 처리방침 모달

  // -------------------------------
  // 🔹 약관 동의 체크박스 변경 핸들러
  // -------------------------------
  const handleConsentChange = (e) => setIsConsentChecked(e.target.checked);

  // -------------------------------
  // 🔹 회원가입 처리 함수
  // -------------------------------
  const doRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // 약관 동의하지 않으면 등록 불가
    if (!isConsentChecked) {
      setError("개인정보 처리방침 및 이용약관에 동의해야 합니다.");
      return;
    }

    try {
      // ✅ 회원가입 API 요청
      const res = await axios.post(
        `${BACKEND_URL}/api/auth/register`,
        {
          name: state.name,
          email: state.email,
          password: state.password,
          role: state.role,
          isConsentChecked,
        },
        { withCredentials: true }
      );

      // ✅ 응답 성공 처리
      if (res.data.success) {
        const user = res.data.data?.user;
        const token = res.data.data?.token;

        // 로컬스토리지에 토큰 & 사용자 정보 저장
        if (token) localStorage.setItem("token", token);
        if (user) localStorage.setItem("user", JSON.stringify(user));

        setSuccess("회원가입이 완료되었습니다! 자동으로 이동합니다.");

        // ✅ 역할에 따라 자동 이동
        setTimeout(() => {
          if (user?.role === "admin") {
            props.history.push("/admin/dashboard");
          } else if (user?.role === "manager") {
            props.history.push("/manager/dashboard");
          } else {
            props.history.push("/template/dashboard");
          }
        }, 1000);
      } else {
        setError(res.data.message || "회원가입에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "서버 오류가 발생했습니다.");
    }
  };

  // -------------------------------
  // 🔹 소셜 로그인 (Google / Kakao)
  // -------------------------------
  const handleGoogleLogin = () =>
    (window.location.href = `${BACKEND_URL}/api/auth/google`);
  const handleKakaoLogin = () =>
    (window.location.href = `${BACKEND_URL}/api/auth/kakao`);

  // -------------------------------
  // 🔹 모달 열기/닫기 토글 함수
  // -------------------------------
  const toggleModal = () => setModal(!modal);

  // -------------------------------
  // 🔹 JSX 반환부
  // -------------------------------
  return (
    <div className="auth-page">
      <Container className="col-12">
        <Row className="d-flex align-items-center">
          {/* 왼쪽: 회원가입 폼 */}
          <Col xs={12} lg={6}>
            <Widget className="widget-auth widget-p-lg no-bg">
              {/* ✅ 상단 로고 및 타이틀 */}
              <div className="d-flex align-items-center justify-content-between py-3">
                <p className="auth-header mb-0">Sign Up</p>
                <div className="logo-block">
                  <SofiaLogo />
                  <p className="mb-0">NODA</p>
                </div>
              </div>

              {/* 에러 / 성공 메시지 */}
              {error && <p style={{ color: "red" }}>{error}</p>}
              {success && <p style={{ color: "green" }}>{success}</p>}

              {/* ✅ 회원가입 폼 시작 */}
              <form onSubmit={doRegister}>
                {/* 이름 */}
                <FormGroup>
                  <FormText>Name</FormText>
                  <Input
                    value={state.name}
                    onChange={(e) =>
                      setState({ ...state, name: e.target.value })
                    }
                    required
                    placeholder="이름을 입력하세요"
                  />
                </FormGroup>

                {/* 이메일 */}
                <FormGroup>
                  <FormText>Email</FormText>
                  <Input
                    value={state.email}
                    onChange={(e) =>
                      setState({ ...state, email: e.target.value })
                    }
                    type="email"
                    required
                    placeholder="이메일을 입력하세요"
                  />
                </FormGroup>

                {/* 비밀번호 */}
                <FormGroup>
                  <FormText>Password</FormText>
                  <Input
                    value={state.password}
                    onChange={(e) =>
                      setState({ ...state, password: e.target.value })
                    }
                    type="password"
                    required
                    placeholder="비밀번호를 입력하세요"
                  />
                </FormGroup>

                {/* 역할 선택 */}
                <FormGroup>
                  <FormText>Role</FormText>
                  <Input
                    type="select"
                    value={state.role}
                    onChange={(e) =>
                      setState({ ...state, role: e.target.value })
                    }
                  >
                    <option value="user">User</option>
                    <option value="manager">Project Manager</option>
                    <option value="admin">Admin</option>
                  </Input>
                </FormGroup>

                {/* ✅ 약관 동의 영역 */}
                <FormGroup check className="mt-3">
                  <Label check className="d-flex flex-column">
                    {/* 체크박스 */}
                    <div>
                      <Input
                        type="checkbox"
                        checked={isConsentChecked}
                        onChange={handleConsentChange}
                        className="me-2"
                      />
                      개인정보 처리방침 및 이용약관에 동의합니다.
                    </div>

                    {/* 🔽 약관 보기 버튼 (체크박스 아래로 이동) */}
                    <Button
                      type="button"
                      color="link"
                      onClick={toggleModal}
                      className="p-0 mt-2"
                      style={{
                        color: "#007bff",
                        fontSize: "0.9rem",
                        textDecoration: "underline",
                        width: "fit-content",
                      }}
                    >
                      약관 보기
                    </Button>
                  </Label>
                </FormGroup>

                {/* ✅ 회원가입 버튼 */}
                <Button
                  className="rounded-pill my-3 w-100"
                  type="submit"
                  color="secondary-red"
                  style={{ fontWeight: "600", padding: "10px 0" }}
                >
                  Create an account
                </Button>

                {/* ✅ 로그인으로 돌아가기 링크 (하단 중앙) */}
                <div className="text-center mt-2">
                  <Link
                    to="/login"
                    className="text-muted"
                    style={{
                      textDecoration: "none",
                      fontSize: "0.9rem",
                    }}
                  >
                    Enter the account? login here
                  </Link>
                </div>
              </form>
            </Widget>
          </Col>

          {/* 오른쪽: 일러스트 이미지 */}
          <Col xs={0} lg={6}>
            <img
              src={registerImage}
              alt="Register"
              style={{ maxWidth: "90%" }}
            />
          </Col>
        </Row>
      </Container>

      {/* 하단 푸터 */}
      <Footer />

      {/* ✅ 개인정보 처리방침 모달 */}
      <Modal isOpen={modal} toggle={toggleModal}>
        <ModalHeader toggle={toggleModal}>개인정보 처리방침</ModalHeader>
        <ModalBody>
          <PrivacyPolicy />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleModal}>
            닫기
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

// PropTypes 설정 (라우터 history 사용)
Register.propTypes = { history: PropTypes.object.isRequired };

// Redux 연결 및 라우터 적용
export default withRouter(connect()(Register));
