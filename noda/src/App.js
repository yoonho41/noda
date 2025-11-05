import axios from "axios";  // App.js 맨 위에 추가
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Switch, Route, Redirect } from "react-router";
import { ToastContainer } from "react-toastify";
import { ConnectedRouter } from "connected-react-router";
import { getHistory } from "./index";
import { AdminRoute, UserRoute, AuthRoute } from "./RouteComponents";
import AiAssi from "./pages/ai/AiAssi";
import ErrorPage from "./pages/error/ErrorPage.js";
import LayoutComponent from "./components/Layout/Layout.js";
import Login from "./pages/auth/login/Login";
import Register from "./pages/auth/register/Register.js";

// ✅ 추가: OAuthCallback 페이지 import
import OAuthCallback from "./pages/auth/OAuthCallback";

import "./styles/app.scss";
import AdminDashboard from "./pages/admin/AdminDashboard.js";
import ManagerDashboard from "./pages/manager/ManagerDashboard.js";

const App = (props) => {
  const [initialized, setInitialized] = useState(false);

  // ✅ OAuth 로그인 후 token 파라미터 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      console.log("✅ OAuth 토큰 저장 완료:", token);

      // ✅ 쿼리스트링 제거
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // ✅ 초기화 완료 표시
    setInitialized(true);
  }, []);

  // ✅ 아직 토큰 저장/초기화 중이면 잠깐 로딩화면
  if (!initialized) {
    return <div style={{ textAlign: "center", marginTop: "20%" }}>Loading...</div>;
  }

  return (
    <div>
      <ToastContainer />
      <ConnectedRouter history={getHistory()}>
        <Switch>
          {/* ✅ 새로 추가된 OAuth 콜백 라우트 */}
          <Route path="/auth/callback" component={OAuthCallback} />

          <Route path="/" exact render={() => <Redirect to="/template/dashboard" />} />
          <Route path="/template" exact render={() => <Redirect to="/template/dashboard" />} />

          <UserRoute
            path="/template"
            dispatch={props.dispatch}
            component={LayoutComponent}
          />
          <AdminRoute
            path="/template/admin"
            currentUser={props.currentUser}
            dispatch={props.dispatch}
            component={LayoutComponent}
          />
          <Route path="/ai" component={AiAssi} />
          <AuthRoute path="/login" exact component={Login} />
          <AuthRoute path="/register" exact component={Register} />
          <Route path="/error" exact component={ErrorPage} />

          <Redirect from="*" to="/template/dashboard" />
          <Route path="*" exact render={() => <Redirect to="/error" />} />
        </Switch>
      </ConnectedRouter>
    </div>
  );
};

const mapStateToProps = (state) => ({
  currentUser: state.auth.currentUser,
  loadingInit: state.auth.loadingInit,
});

export default connect(mapStateToProps)(App);
