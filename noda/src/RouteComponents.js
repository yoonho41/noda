import React from "react";
import { Redirect, Route } from "react-router-dom";
import { logoutUser } from "./actions/auth";
import hasToken from "./services/authService";

const getCurrentUser = () => {
  try {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("❌ 사용자 정보 파싱 실패:", error);
    return null;
  }
};

// ✅ 관리자 전용
export const AdminRoute = ({ currentUser, dispatch, component: Component, ...rest }) => {
  const user = currentUser || getCurrentUser();
  if (!user || !hasToken()) {
    dispatch && dispatch(logoutUser());
    return <Redirect to="/login" />;
  }
  if (user.role === "admin") return <Route {...rest} render={(p) => <Component {...p} />} />;
  return <Redirect to="/error" />;
};

// ✅ 팀리더 전용
export const ManagerRoute = ({ currentUser, dispatch, component: Component, ...rest }) => {
  const user = currentUser || getCurrentUser();
  if (!user || !hasToken()) {
    dispatch && dispatch(logoutUser());
    return <Redirect to="/login" />;
  }
  if (["manager", "admin"].includes(user.role))
    return <Route {...rest} render={(p) => <Component {...p} />} />;
  return <Redirect to="/error" />;
};

// ✅ 일반 사용자
export const UserRoute = ({ currentUser, dispatch, component: Component, ...rest }) => {
  const user = currentUser || getCurrentUser();
  if (!user || !hasToken()) {
    dispatch && dispatch(logoutUser());
    return <Redirect to="/login" />;
  }
  return <Route {...rest} render={(p) => <Component {...p} />} />;
};

// ✅ 로그인 / 회원가입 전용
export const AuthRoute = ({ component: Component, ...rest }) => {
  const user = getCurrentUser();
  if (hasToken() && user) {
    let redirectUrl = "/template/dashboard";
    if (user.role === "admin") redirectUrl = "/admin/dashboard";
    else if (user.role === "manager") redirectUrl = "/manager/dashboard";
    return <Redirect to={redirectUrl} />;
  }
  return <Route {...rest} render={(p) => <Component {...p} />} />;
};
