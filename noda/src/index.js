import React from 'react';
import { createRoot } from "react-dom/client";
import { routerMiddleware } from "connected-react-router";
import { createStore, applyMiddleware, compose } from "redux";
import ReduxThunk from "redux-thunk";
import { Provider } from 'react-redux';
import * as serviceWorker from './serviceWorker';
import axios from "axios";

import App from './App';
import config from './config';
import createRootReducer from './reducers';
import { doInit } from "./actions/auth";
import { createBrowserHistory } from "history";

// ✅ Fake DB (삭제 가능 — 테스트 용도)
import './fakeDB';

// ===============================================
// 1️⃣ History 설정
// ===============================================
const history = createBrowserHistory();

export function getHistory() {
  return history;
}

// ===============================================
// 2️⃣ Axios 전역 설정 (가장 중요!!)
// ===============================================
axios.defaults.baseURL = config.baseURLApi; // ex: http://localhost:8080/api
axios.defaults.withCredentials = true; // ✅ 세션/쿠키 인증 유지 필수
axios.defaults.headers.common["Content-Type"] = "application/json";

// ✅ 로컬 스토리지에서 토큰 복원
const token = localStorage.getItem("token");
if (token) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  console.log("🔐 Axios 기본 토큰 설정 완료");
} else {
  console.log("⚠️ 저장된 토큰 없음 (비로그인 상태)");
}

// ✅ Axios 인터셉터: 요청 시 항상 최신 토큰 사용
axios.interceptors.request.use(
  (config) => {
    const currentToken = localStorage.getItem("token");
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    console.log("📤 요청:", config.method.toUpperCase(), config.url);
    console.log("🔑 토큰:", currentToken ? "있음" : "없음");
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Axios 인터셉터: 응답 에러 처리
axios.interceptors.response.use(
  (response) => {
    console.log("📥 응답 성공:", response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error("📥 응답 에러:", error.response?.status, error.response?.data);
    
    // 401 에러 시 자동 로그아웃
    if (error.response?.status === 401) {
      console.warn("⚠️ 인증 만료 - 로그아웃 처리");
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
      window.location.href = "/login";
    }
    
    return Promise.reject(error);
  }
);

// ===============================================
// 3️⃣ Redux Store 설정
// ===============================================
export const store = createStore(
  createRootReducer(history),
  compose(applyMiddleware(routerMiddleware(history), ReduxThunk))
);

// ✅ 초기 인증 상태 확인 (로그인 유지)
store.dispatch(doInit());

// ===============================================
// 4️⃣ React 렌더링
// ===============================================
const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);

// ===============================================
// 5️⃣ Service Worker 설정
// ===============================================
serviceWorker.unregister();