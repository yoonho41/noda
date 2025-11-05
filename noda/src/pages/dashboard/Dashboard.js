// src/pages/dashboard/Dashboard.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useHistory } from "react-router-dom"; // ✅ v5용으로 수정!
import { Col, Row, Button, Spinner, Progress } from "reactstrap";
import Widget from "../../components/Widget/Widget";
import config from "../../config";
import LineCharts from "../charts/line/LineCharts";
import userIcon from "../../assets/dashboard/heartViolet.svg";
import approvalIcon from "../../assets/dashboard/heartYellow.svg";
import projectIcon from "../../assets/dashboard/heartTeal.svg";
import todoIcon from "../../assets/dashboard/heartRed.svg";
import userImg from "../../assets/user.svg";

// ✅ 추가: 역할별 대시보드 import
import AdminDashboard from "../admin/AdminDashboard";
import ManagerDashboard from "../manager/ManagerDashboard";

// ✅ 백엔드 기본 URL 설정
const BACKEND_URL = config.baseURLApi;
const API_BASE = BACKEND_URL.endsWith("/api") ? BACKEND_URL : `${BACKEND_URL}/api`;

export default function Dashboard() {
  const history = useHistory(); // ✅ v5용으로 수정!

  const [currentUser, setCurrentUser] = useState({
    name: "Loading...",
    email: "",
    role: "user",
    profileImage: userImg,
  });

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ URL에 token이 있으면 자동 저장
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      console.log("✅ URL에서 토큰 감지:", token.slice(0, 20) + "...");
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      console.log("✅ 토큰 저장 및 Axios 헤더 등록 완료");

      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // ✅ 대시보드 데이터 및 사용자 정보 로드
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.warn("⚠️ 토큰 없음: 로그인 필요");
          setLoading(false);
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        console.log("📡 요청 URL:", API_BASE);

        const [userRes, dashRes] = await Promise.all([
          axios.get(`${API_BASE}/auth/me`, { headers }),
          axios.get(`${API_BASE}/dashboard/employee`, { headers }),
        ]);

        // ✅ 사용자 정보 설정
        if (userRes.data.success && userRes.data.user) {
          const userData = userRes.data.user;
          setCurrentUser({
            name: userData.name,
            email: userData.email,
            role: userData.role || "user",
            profileImage: userData.profileImage || userImg,
          });
        }

        // ✅ 대시보드 데이터 설정
        if (dashRes.data.success && dashRes.data.data) {
          setStats(dashRes.data.data);
        } else {
          console.warn("⚠️ 대시보드 데이터 없음:", dashRes.data);
        }
      } catch (err) {
        console.error("❌ 대시보드 데이터 로드 실패:", err.response?.data || err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // ✅ 로딩 표시
  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner color="primary" />
        <p className="mt-3">대시보드 데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  // ✅ 역할별 분기 처리
  if (currentUser.role?.toLowerCase() === "admin") {
    return <AdminDashboard />;
  }

  if (currentUser.role?.toLowerCase() === "manager") {
    return <ManagerDashboard />;
  }

  // ✅ 데이터가 없을 때
  if (!stats) {
    return (
      <div className="text-center mt-5 text-danger">
        데이터를 불러오지 못했습니다. 관리자에게 문의하세요.
      </div>
    );
  }

  const { todos, approvals } = stats;

  // ✅ 렌더링 (일반 사용자용)
  return (
    <div className="dashboard-content">
      {/* ✅ 공용 대시보드 헤더 */}
      <h2 className="mb-2 fw-bold">👤 User Dashboard</h2>
      <p className="text-muted mb-4">
        개인 일정, 결재 요청, 프로젝트 진행 현황을 관리할 수 있습니다.
      </p>

      {/* ✅ 주요 통계 카드 (정렬 통일 버전) */}
      <Row className="mt-4 text-center">
        {/* 내 할 일 현황 */}
        <Col md={3}>
          <Widget className="py-4 d-flex flex-column align-items-center justify-content-between h-100">
            <div>
              <img src={todoIcon} alt="todo" width="40" className="mb-3" />
              <h6 className="fw-bold mb-2">내 할 일 현황</h6>
              <p className="text-muted small mb-2">현재 진행 중인 할 일입니다.</p>
            </div>
            <div>
              <p className="fw-semibold text-danger mb-2">
                ✅ 완료 {todos.completed}/{todos.total}
              </p>
              {/* ✅ 캘린더로 이동하는 버튼 (v5용) */}
              <Button 
                color="danger" 
                size="sm" 
                className="px-3"
                onClick={() => history.push('/template/calendar')}
              >
                할 일 관리
              </Button>
            </div>
          </Widget>
        </Col>

        {/* 결재 문서 현황 */}
        <Col md={3}>
          <Widget className="py-4 d-flex flex-column align-items-center justify-content-between h-100">
            <div>
              <img src={approvalIcon} alt="approvals" width="40" className="mb-3" />
              <h6 className="fw-bold mb-2">결재 문서 현황</h6>
              <p className="text-muted small mb-2">본인이 작성한 결재 문서 현황입니다.</p>
            </div>
            <div>
              <p className="fw-semibold text-warning mb-2">
                📄 {approvals.pending}건 대기 중
              </p>
              <Button color="warning" size="sm" className="px-3 text-white">
                결재문서 보기
              </Button>
            </div>
          </Widget>
        </Col>

        {/* 진행률 */}
        <Col md={3}>
          <Widget className="py-4 d-flex flex-column align-items-center justify-content-between h-100">
            <div>
              <img src={projectIcon} alt="progress" width="40" className="mb-3" />
              <h6 className="fw-bold mb-2">진행률</h6>
              <p className="text-muted small mb-2">내 전체 할 일 진행률입니다.</p>
            </div>
            <div style={{ width: "80%" }}>
              <Progress
                color="info"
                value={todos.completionRate || 0}
                style={{ height: "8px", borderRadius: "5px" }}
              />
              <p className="mt-2 fw-semibold text-info">
                {todos.completionRate}% 완료
              </p>
            </div>
          </Widget>
        </Col>

        {/* 내 역할 */}
        <Col md={3}>
          <Widget className="py-4 d-flex flex-column align-items-center justify-content-between h-100">
            <div>
              <img src={userIcon} alt="user" width="40" className="mb-3" />
              <h6 className="fw-bold mb-2">내 역할</h6>
              <p className="text-muted small mb-2">일반 사용자입니다.</p>
            </div>
            <p className="text-muted small">
              자신의 일정, 결재 요청, 프로젝트 진행을 관리합니다.
            </p>
          </Widget>
        </Col>
      </Row>

      {/* 최근 등록된 할 일 */}
      <Row className="mt-5">
        <Col md={12}>
          <Widget className="p-4 shadow-sm rounded-4">
            <h6 className="fw-bold mb-3 d-flex align-items-center">
              <span style={{ fontSize: "20px", marginRight: "8px" }}>🗓️</span>
              최근 등록된 할 일
            </h6>
            <hr className="mb-4" />

            {stats.recentTodos && stats.recentTodos.length > 0 ? (
              <ul className="list-unstyled mb-0">
                {stats.recentTodos.map((todo, idx) => (
                  <li
                    key={idx}
                    className="py-2 px-3 mb-2 rounded d-flex justify-content-between align-items-center"
                    style={{ backgroundColor: "#f9fafb" }}
                  >
                    <div>
                      <strong className="text-dark">{todo.title}</strong>{" "}
                      <span
                        className={`badge bg-${
                          todo.status === "done"
                            ? "success"
                            : todo.status === "in_progress"
                            ? "warning"
                            : "secondary"
                        }`}
                      >
                        {todo.status === "done"
                          ? "완료"
                          : todo.status === "in_progress"
                          ? "진행 중"
                          : "대기"}
                      </span>
                    </div>
                    <small className="text-muted">
                      {new Date(todo.createdAt).toLocaleDateString("ko-KR")}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted text-center m-0">
                📭 최근 등록된 할 일이 없습니다.
              </p>
            )}
          </Widget>
        </Col>
      </Row>

      {/* 차트 */}
      <Row className="mt-5">
        <Col md={12}>
          <LineCharts />
        </Col>
      </Row>
    </div>
  );
}