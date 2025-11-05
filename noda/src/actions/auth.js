import axios from "axios";  // axios로 HTTP 요청
import config from "../config";  // 환경설정 가져오기
import jwt from "jsonwebtoken";  // JWT 토큰 생성
import { toast } from "react-toastify";  // 알림 메세지
import { push } from "connected-react-router";  // 페이지 리다이렉션
import Errors from "../components/FormItems/error/errors";  // 오류 처리 컴포넌트
import { mockUser } from "./mock.js";  // mockUser (백엔드 미사용 시 더미 사용자 데이터)

// 🔸 액션 타입 정의
export const AUTH_FAILURE = "AUTH_FAILURE";  // 인증 실패 액션
export const LOGIN_REQUEST = "LOGIN_REQUEST";  // 로그인 요청 액션
export const LOGIN_SUCCESS = "LOGIN_SUCCESS";  // 로그인 성공 액션
export const LOGOUT_REQUEST = "LOGOUT_REQUEST";  // 로그아웃 요청 액션
export const LOGOUT_SUCCESS = "LOGOUT_SUCCESS";  // 로그아웃 성공 액션
export const RESET_REQUEST = "RESET_REQUEST";  // 비밀번호 초기화 요청 액션
export const RESET_SUCCESS = "RESET_SUCCESS";  // 비밀번호 초기화 성공 액션
export const PASSWORD_RESET_EMAIL_REQUEST = "PASSWORD_RESET_EMAIL_REQUEST";  // 비밀번호 재설정 이메일 요청 액션
export const PASSWORD_RESET_EMAIL_SUCCESS = "PASSWORD_RESET_EMAIL_SUCCESS";  // 비밀번호 재설정 이메일 성공 액션
export const AUTH_INIT_SUCCESS = "AUTH_INIT_SUCCESS";  // 인증 초기화 성공 액션
export const AUTH_INIT_ERROR = "AUTH_INIT_ERROR";  // 인증 초기화 실패 액션
export const REGISTER_REQUEST = "REGISTER_REQUEST";  // 회원가입 요청 액션
export const REGISTER_SUCCESS = "REGISTER_SUCCESS";  // 회원가입 성공 액션

// 🔸 Axios 전역 설정 (기본 URL 및 쿠키 설정)
if (config.isBackend) {
  axios.defaults.baseURL = config.baseURLApi;  // API 요청 URL
  axios.defaults.withCredentials = true;  // 쿠키를 포함한 요청 설정

  // ✅ OAuth 로그인 이후에도 Authorization 헤더 자동 추가
const token = localStorage.getItem("token");
if (token) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}
}

// 🔸 사용자 정보 조회 (findMe)
async function findMe() {
  if (!config.isBackend) return mockUser;  // 백엔드가 없으면 mockUser 반환
  const token = localStorage.getItem("token");  // 토큰 확인
  if (!token) return null;
  try {
    const res = await axios.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },  // 토큰을 Authorization 헤더로 전달
    });
    if (res.data.user) {
      localStorage.setItem("user", JSON.stringify(res.data.user));  // 사용자 정보 저장
    }
    return res.data.user || res.data;
  } catch (err) {
    console.error("❌ 사용자 정보 조회 실패:", err);
    return null;
  }
}

// 🔸 에러 액션 생성자
export function authError(payload) {
  return { type: AUTH_FAILURE, payload };  // 에러 발생 시 액션 반환
}

// 🔸 초기 로그인 상태 확인 (토큰 유지 로그인)
export function doInit() {
  return async (dispatch) => {
    try {
      let currentUser = null;
      if (!config.isBackend) {
        currentUser = mockUser;  // mockUser 반환 (백엔드가 없으면 더미 데이터 사용)
      } else {
        const token = localStorage.getItem("token");  // 로컬스토리지에서 토큰 가져오기
        if (token) {
          currentUser = await findMe();  // findMe로 최신 사용자 정보 조회
        }
      }
      dispatch({ type: AUTH_INIT_SUCCESS, payload: { currentUser } });  // 사용자 정보 저장
    } catch (error) {
      console.error("❌ 인증 초기화 실패:", error);
      Errors.handle(error);  // 오류 처리
      localStorage.removeItem("token");  // 토큰 삭제
      localStorage.removeItem("user");  // 사용자 정보 삭제
      delete axios.defaults.headers.common["Authorization"];  // Authorization 헤더 삭제
      dispatch({ type: AUTH_INIT_ERROR, payload: error });  // 인증 초기화 실패 액션
      dispatch(push("/login"));  // 로그인 페이지로 리다이렉트
    }
  };
}

// 🔸 로그아웃
export function logoutUser() {
  return async (dispatch) => {
    dispatch({ type: LOGOUT_REQUEST });
    
    // ✅ 서버에 로그아웃 요청 (로그 기록을 위해)
    try {
      const token = localStorage.getItem("token");
      if (token && config.isBackend) {
        await axios.post("/auth/logout", {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error("❌ 로그아웃 요청 실패:", error);
      // 로그아웃 요청 실패해도 로컬 로그아웃은 진행
    }
    
    // 로컬 로그아웃 처리
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    dispatch({ type: LOGOUT_SUCCESS });
    toast.info("로그아웃 되었습니다.");
    dispatch(push("/login"));
  };
}

// 🔸 로그인 성공 후 토큰/사용자 정보 처리
export function handleLoginSuccess(response) {
  return async (dispatch) => {
    try {
      const token = response.token || response.data?.token;  // 토큰 확인
      const user = response.user || response.data?.user;  // 사용자 정보 확인
      const redirectUrl = response.redirectUrl || response.data?.redirectUrl || "/template/dashboard";  // 리다이렉트 URL 설정
      if (!token || !user) {
        throw new Error("서버 응답에서 토큰 또는 사용자 정보를 찾을 수 없습니다.");  // 오류 처리
      }
      localStorage.setItem("token", token);  // 토큰 로컬스토리지에 저장
      localStorage.setItem("user", JSON.stringify(user));  // 사용자 정보 로컬스토리지에 저장
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;  // axios 기본 헤더에 토큰 설정
      dispatch({ type: LOGIN_SUCCESS });  // 로그인 성공 액션
      dispatch({ type: AUTH_INIT_SUCCESS, payload: { currentUser: user } });  // 사용자 정보 업데이트
      dispatch(push(redirectUrl));  // 리다이렉트
    } catch (err) {
      console.error("❌ 로그인 성공 후 처리 실패:", err);
      dispatch(authError(err));  // 오류 발생 시 처리
    }
  };
}

// 🔸 로그인 (일반 + 소셜)
export function loginUser(creds) {
  return async (dispatch) => {
    dispatch({ type: LOGIN_REQUEST });  // 로그인 요청 액션
    if (!config.isBackend) {
      dispatch(
        handleLoginSuccess({
          token: "mock-token",  // 더미 데이터 사용
          user: mockUser,
          redirectUrl: "/template/dashboard",  // 대시보드로 리다이렉트
        })
      );
      return;
    }
    try {
      if (creds.social) {
        // 소셜 로그인
        window.location.href = `${config.baseURLApi}/auth/signin/${creds.social}?redirect=${encodeURIComponent(
          config.redirectUrl
        )}`;  // 소셜 로그인 URL로 리다이렉트
      } else if (creds.email && creds.password) {
        // 일반 로그인
        const res = await axios.post("/auth/signin/local", creds);  // 일반 로그인 요청
        dispatch(handleLoginSuccess(res.data.data));  // 로그인 성공 후 처리
      } else {
        throw new Error("이메일과 비밀번호를 입력하세요.");  // 이메일과 비밀번호가 없을 경우 오류 처리
      }
    } catch (err) {
      Errors.handle(err);  // 오류 처리
      dispatch(authError(err.response?.data || err.message));  // 오류 발생 시 액션 처리
    }
  };
}

// 🔸 이메일 인증
export function verifyEmail(token) {
  return async (dispatch) => {
    try {
      const res = await axios.put("/auth/verify-email", { token });
      if (res.data.success) toast.success("이메일 인증이 완료되었습니다!");  // 인증 완료 알림
    } catch (err) {
      Errors.handle(err);  // 오류 처리
      toast.error("이메일 인증 중 오류가 발생했습니다.");  // 오류 알림
    } finally {
      dispatch(push("/login"));  // 로그인 페이지로 리다이렉트
    }
  };
}

// 🔸 비밀번호 초기화 요청
export function sendPasswordResetEmail(email) {
  return async (dispatch) => {
    try {
      dispatch({ type: PASSWORD_RESET_EMAIL_REQUEST });  // 비밀번호 초기화 요청 액션
      await axios.post("/auth/send-password-reset-email", { email });  // 비밀번호 초기화 이메일 전송
      dispatch({ type: PASSWORD_RESET_EMAIL_SUCCESS });  // 성공 액션
      toast.success("비밀번호 재설정 링크가 이메일로 전송되었습니다!");  // 알림
      dispatch(push("/login"));  // 로그인 페이지로 리다이렉트
    } catch (err) {
      Errors.handle(err);  // 오류 처리
      dispatch(authError(err.response?.data || err.message));  // 오류 액션
    }
  };
}

// 🔸 비밀번호 재설정
export function resetPassword(token, password) {
  return async (dispatch) => {
    try {
      dispatch({ type: RESET_REQUEST });  // 비밀번호 재설정 요청 액션
      await axios.put("/auth/password-reset", { token, password });  // 비밀번호 재설정 요청
      dispatch({ type: RESET_SUCCESS });  // 성공 액션
      toast.success("비밀번호가 성공적으로 변경되었습니다!");  // 알림
      dispatch(push("/login"));  // 로그인 페이지로 리다이렉트
    } catch (err) {
      Errors.handle(err);  // 오류 처리
      dispatch(authError(err.response?.data || err.message));  // 오류 액션
    }
  };
}

// 🔸 회원가입
export function registerUser(creds) {
  return async (dispatch) => {
    try {
      dispatch({ type: REGISTER_REQUEST });  // 회원가입 요청 액션
      const res = await axios.post("/auth/signup", creds);  // 회원가입 요청
      dispatch({ type: REGISTER_SUCCESS });  // 회원가입 성공 액션
      toast.success("회원가입이 완료되었습니다! 이메일을 확인하세요.");  // 성공 알림
      dispatch(push("/login"));  // 로그인 페이지로 리다이렉트
    } catch (err) {
      Errors.handle(err);  // 오류 처리
      dispatch(authError(err.response?.data || err.message));  // 오류 액션
    }
  };
}
