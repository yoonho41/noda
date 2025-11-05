import axios from "axios";  // HTTP 요청을 처리하기 위한 axios 모듈
import config from "../config";  // 환경설정 파일
import jwt from "jsonwebtoken";  // JWT 토큰을 생성하고 검증하는 모듈
import { toast } from "react-toastify";  // 알림을 표시하는 라이브러리
import { push } from "connected-react-router";  // 페이지 리다이렉트
import Errors from "../components/FormItems/error/errors";  // 오류 처리를 위한 컴포넌트
import { mockUser } from "./mock.js";  // 백엔드가 없는 경우 사용되는 mock 데이터

// 🔸 액션 타입 정의
export const AUTH_FAILURE = "AUTH_FAILURE";  // 인증 실패 액션 타입
export const LOGIN_REQUEST = "LOGIN_REQUEST";  // 로그인 요청 액션 타입
export const LOGIN_SUCCESS = "LOGIN_SUCCESS";  // 로그인 성공 액션 타입
export const LOGOUT_REQUEST = "LOGOUT_REQUEST";  // 로그아웃 요청 액션 타입
export const LOGOUT_SUCCESS = "LOGOUT_SUCCESS";  // 로그아웃 성공 액션 타입
export const RESET_REQUEST = "RESET_REQUEST";  // 비밀번호 초기화 요청 액션 타입
export const RESET_SUCCESS = "RESET_SUCCESS";  // 비밀번호 초기화 성공 액션 타입
export const PASSWORD_RESET_EMAIL_REQUEST = "PASSWORD_RESET_EMAIL_REQUEST";  // 비밀번호 재설정 이메일 요청 액션 타입
export const PASSWORD_RESET_EMAIL_SUCCESS = "PASSWORD_RESET_EMAIL_SUCCESS";  // 비밀번호 재설정 이메일 성공 액션 타입
export const AUTH_INIT_SUCCESS = "AUTH_INIT_SUCCESS";  // 인증 초기화 성공 액션 타입
export const AUTH_INIT_ERROR = "AUTH_INIT_ERROR";  // 인증 초기화 실패 액션 타입
export const REGISTER_REQUEST = "REGISTER_REQUEST";  // 회원가입 요청 액션 타입
export const REGISTER_SUCCESS = "REGISTER_SUCCESS";  // 회원가입 성공 액션 타입
export const REGISTER_FAILURE = "REGISTER_FAILURE";  // 회원가입 실패 액션 타입

// 🔸 Axios 전역 설정
if (config.isBackend) {
  axios.defaults.baseURL = config.baseURLApi;  // API 요청을 보낼 기본 URL 설정
  axios.defaults.withCredentials = true;  // 쿠키를 포함한 요청을 위한 설정
}

// 🔸 사용자 정보 조회 (findMe)
async function findMe() {
  if (!config.isBackend) return mockUser;  // 백엔드가 없으면 mock 데이터를 반환
  const token = localStorage.getItem("token");  // 로컬 스토리지에서 토큰을 가져옴
  if (!token) return null;  // 토큰이 없으면 null 반환
  try {
    const res = await axios.get("/auth/me", {  // 서버에 현재 로그인된 사용자 정보 요청
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.data.user) {
      localStorage.setItem("user", JSON.stringify(res.data.user));  // 사용자 정보 저장
    }
    return res.data.user || res.data;  // 사용자 정보 반환
  } catch (err) {
    console.error("❌ 사용자 정보 조회 실패:", err);  // 오류 처리
    return null;
  }
}

// 🔸 에러 액션 생성자
export function authError(payload) {
  return { type: AUTH_FAILURE, payload };  // 인증 실패 액션 반환
}

// 🔸 초기 로그인 상태 확인 (토큰 유지 로그인)
export function doInit() {
  return async (dispatch) => {
    try {
      let currentUser = null;
      if (!config.isBackend) {
        currentUser = mockUser;  // 백엔드가 없으면 mockUser 사용
      } else {
        const token = localStorage.getItem("token");  // 로컬 스토리지에서 토큰 확인
        if (token) {
          currentUser = await findMe();  // findMe로 사용자 정보 조회
        }
      }
      dispatch({ type: AUTH_INIT_SUCCESS, payload: { currentUser } });  // 사용자 정보 저장
    } catch (error) {
      console.error("❌ 인증 초기화 실패:", error);  // 오류 처리
      Errors.handle(error);  // 오류 핸들링
      localStorage.removeItem("token");  // 로컬 스토리지에서 토큰 삭제
      localStorage.removeItem("user");  // 로컬 스토리지에서 사용자 정보 삭제
      delete axios.defaults.headers.common["Authorization"];  // Authorization 헤더 삭제
      dispatch({ type: AUTH_INIT_ERROR, payload: error });  // 인증 초기화 실패 액션
      dispatch(push("/login"));  // 로그인 페이지로 리다이렉트
    }
  };
}

// 🔸 로그아웃
export function logoutUser() {
  return (dispatch) => {
    dispatch({ type: LOGOUT_REQUEST });  // 로그아웃 요청 액션
    localStorage.removeItem("token");  // 로컬 스토리지에서 토큰 삭제
    localStorage.removeItem("user");  // 로컬 스토리지에서 사용자 정보 삭제
    delete axios.defaults.headers.common["Authorization"];  // Authorization 헤더 삭제
    dispatch({ type: LOGOUT_SUCCESS });  // 로그아웃 성공 액션
    toast.info("로그아웃 되었습니다.");  // 로그아웃 알림
    dispatch(push("/login"));  // 로그인 페이지로 리다이렉트
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
      localStorage.setItem("token", token);  // 토큰을 로컬 스토리지에 저장
      localStorage.setItem("user", JSON.stringify(user));  // 사용자 정보를 로컬 스토리지에 저장
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;  // axios 기본 헤더에 토큰 설정
      dispatch({ type: LOGIN_SUCCESS });  // 로그인 성공 액션
      dispatch({ type: AUTH_INIT_SUCCESS, payload: { currentUser: user } });  // 사용자 정보 업데이트
      dispatch(push(redirectUrl));  // 리다이렉트
    } catch (err) {
      console.error("❌ 로그인 성공 후 처리 실패:", err);  // 오류 처리
      dispatch(authError(err));  // 오류 액션 디스패치
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
        window.location.href = `${config.baseURLApi}/auth/signin/${creds.social}?redirect=${encodeURIComponent(
          config.redirectUrl
        )}`;  // 소셜 로그인 URL로 리다이렉트
      } else if (creds.email && creds.password) {
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
      const res = await axios.put("/auth/verify-email", { token });  // 이메일 인증 요청
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

// 🔸 회원가입 (성공/실패 조건 분리, 토큰 자동 처리)
export function registerUser(creds) {
  return async (dispatch) => {
    try {
      dispatch({ type: REGISTER_REQUEST });  // 회원가입 요청 액션
      const res = await axios.post("/auth/register", creds);  // 회원가입 요청
      if (res.data.success) {
        dispatch({ type: REGISTER_SUCCESS, payload: res.data.user || res.data });
        if (res.data.token && res.data.user) {  // 서버에서 토큰과 사용자 정보를 반환하면 저장
          localStorage.setItem("token", res.data.token);
          localStorage.setItem("user", JSON.stringify(res.data.user));
        }
        toast.success(res.data.message || "회원가입이 완료되었습니다! 이메일을 확인하세요.");
        dispatch(push("/login"));  // 로그인 페이지로 리다이렉트
      } else {
        const message = res.data.message || "회원가입 중 오류가 발생했습니다.";  // 오류 메시지
        toast.error(message);  // 오류 알림
        dispatch({ type: REGISTER_FAILURE, payload: message });
      }
    } catch (err) {
      console.error("❌ 회원가입 요청 실패:", err);  // 오류 처리
      Errors.handle(err);  // 오류 핸들링
      const message =
        err.response?.data?.message || err.message || "서버와 통신 중 오류가 발생했습니다.";  // 오류 메시지
      toast.error(message);  // 오류 알림
      dispatch(authError(message));  // 오류 액션
      dispatch({ type: REGISTER_FAILURE, payload: message });  // 회원가입 실패 액션
    }
  };
}
