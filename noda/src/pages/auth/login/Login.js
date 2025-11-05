import React, { useState } from "react";  // React와 useState 훅 임포트
import PropTypes from "prop-types";  // PropTypes 사용
import { withRouter, Link } from "react-router-dom";  // 리다이렉션 및 URL 파라미터 처리
import { connect } from "react-redux";  // Redux와 연결
import axios from "axios";  // HTTP 요청을 위한 axios 라이브러리
import {
  Container,
  Row,
  Col,
  Button,
  FormGroup,
  FormText,
  Input,
} from "reactstrap";  // Reactstrap UI 컴포넌트들

import Widget from "../../../components/Widget/Widget";  // 커스텀 위젯 컴포넌트
import Footer from "../../../components/Footer/Footer";  // Footer 컴포넌트
import SofiaLogo from "../../../components/Icons/SofiaLogo";  // 로고 컴포넌트
import GoogleIcon from "../../../components/Icons/AuthIcons/GoogleIcon";  // 구글 아이콘 컴포넌트
import KakaoIcon from "../../../components/Icons/AuthIcons/KakaoIcon";  // 카카오 아이콘 컴포넌트
import loginImage from "../../../assets/loginImage.svg";  // 로그인 이미지

const BACKEND_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000"; // 서버 IP


const Login = (props) => {
  const [state, setState] = useState({ email: "", password: "" });  // 이메일과 비밀번호 상태 관리
  const [error, setError] = useState("");  // 에러 메시지 상태 관리

  // 로그인 요청 함수
  const doLogin = async (e) => {
    e.preventDefault();  // 폼 제출 시 페이지 리로드 방지
    setError("");  // 에러 메시지 초기화

    try {
      // 로그인 요청 보내기
      const res = await axios.post(
        `${BACKEND_URL}/api/auth/login`,
        { email: state.email, password: state.password },
        { withCredentials: true }  // 쿠키를 사용하여 인증 정보 전달
      );

      if (res.data.success) {
        const { token, user, redirectUrl } = res.data.data;

        // 토큰이 있으면 로컬스토리지에 저장
        if (token) localStorage.setItem("token", token);
        if (user) {
          // 로그인 성공 시 user와 role을 localStorage에 저장
          localStorage.setItem("user", JSON.stringify(user)); // 전체 사용자 정보 저장
          localStorage.setItem("userId", user._id); // AiAssi.js에서 사용할 userId 따로 저장
          localStorage.setItem("teamId", user.teamId || "defaultTeam"); // 팀 정보가 있다면 저장
          localStorage.setItem("name", user.name); //메인에 이름 띄우는 정보          
        }

        // ✅ 역할 기반 자동 리다이렉트
        if (redirectUrl) {
          props.history.push(redirectUrl);  // 특정 리다이렉트 URL로 이동
        } else if (user?.role === "admin") {
          props.history.push("/template/admin");  // 관리자 대시보드로 이동
        } else if (user?.role === "manager") {
          props.history.push("/template/manager");  // 팀 리더 대시보드로 이동
        } else {
          props.history.push("/template/dashboard");  // 일반 사용자 대시보드로 이동
        }
      } else {
        // 로그인 실패 시 에러 메시지 처리
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      }
    } catch (err) {
      console.error(err);  // 에러 로깅
      setError(err.response?.data?.message || "서버 오류가 발생했습니다.");
    }
  };

  // 구글 로그인 버튼 클릭 시
  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google`;  // 구글 OAuth 로그인 페이지로 리다이렉트
  };

  // 카카오 로그인 버튼 클릭 시
  const handleKakaoLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/kakao`;  // 카카오 OAuth 로그인 페이지로 리다이렉트
  };

  return (
    <div className="auth-page">
      <Container className="col-12">
        <Row className="d-flex align-items-center">
          <Col xs={12} lg={6}>
            <Widget className="widget-auth widget-p-lg">
              {/* 로그인 페이지 헤더 */}
              <div className="d-flex align-items-center justify-content-between py-3">
                <p className="auth-header mb-0">Login</p>
                <div className="logo-block">
                  <SofiaLogo />
                  <p className="mb-0">NODA</p>
                </div>
              </div>

              {/* 에러 메시지 표시 */}
              {error && <p style={{ color: "red" }}>{error}</p>}

              {/* 로그인 폼 */}
              <form onSubmit={doLogin}>
                <FormGroup className="my-3">
                  <FormText>Email</FormText>
                  <Input
                    id="email"
                    className="input-transparent pl-3"
                    value={state.email}
                    onChange={(e) =>
                      setState({ ...state, email: e.target.value })
                    }
                    type="email"
                    required
                    placeholder="이메일을 입력하세요"
                  />
                </FormGroup>

                <FormGroup className="my-3">
                  <FormText>Password</FormText>
                  <Input
                    id="password"
                    className="input-transparent pl-3"
                    value={state.password}
                    onChange={(e) =>
                      setState({ ...state, password: e.target.value })
                    }
                    type="password"
                    required
                    placeholder="비밀번호를 입력하세요"
                  />
                </FormGroup>

                {/* 로그인 버튼 */}
                <div className="bg-widget d-flex justify-content-center">
                  <Button className="rounded-pill my-3" type="submit" color="secondary-red">
                    Login
                  </Button>
                </div>

                <p className="dividing-line my-3">&#8195;Or&#8195;</p>

                {/* 소셜 로그인 버튼들 */}
                <div className="d-flex align-items-center my-3">
                  <p className="social-label mb-0">Login with</p>
                  <div className="socials">
                    <a onClick={handleGoogleLogin} style={{ cursor: "pointer" }}>
                      <GoogleIcon />
                    </a>
                    <a onClick={handleKakaoLogin} style={{ cursor: "pointer" }}>
                      <KakaoIcon />
                    </a>
                  </div>
                </div>

                {/* 회원가입 페이지로 이동 링크 */}
                <Link
                  to="/register"
                  style={{
                    display: "block",
                    textAlign: "center",
                    marginTop: "10px",
                  }}
                >
                  Don’t have an account? Sign Up here
                </Link>
              </form>
            </Widget>
          </Col>

          {/* 오른쪽 이미지 */}
          <Col xs={0} lg={6} className="right-column">
            <img src={loginImage} alt="Login" style={{ maxWidth: "100%" }} />
          </Col>
        </Row>
      </Container>
      <Footer />  {/* 푸터 컴포넌트 */}
    </div>
  );
};

Login.propTypes = {
  history: PropTypes.object.isRequired,  // history prop 타입 정의
};

export default withRouter(connect()(Login));  // Router와 Redux와 연결
