import React, { useEffect, useState } from "react";
import { Row, Col, Button, Spinner } from "reactstrap";
import Widget from "../../components/Widget/Widget";
import axios from "axios";
import config from "../../config";

import userIcon from "../../assets/dashboard/heartViolet.svg";
import teamIcon from "../../assets/dashboard/heartTeal.svg";
import settingsIcon from "../../assets/dashboard/heartYellow.svg";
import PieCharts from "../charts/pie/PieCharts";
import UserManagementModal from "./UserManagementModal";
import DepartmentManagementModal from "./DepartmentManagementModal";  // ✅ 추가
import LogManagementModal from "./LogManagementModal";  // ✅ 추가


// ✅ 백엔드 URL 자동 인식 (/api 중복 방지)
const BACKEND_URL = config.baseURLApi;
const API_BASE = BACKEND_URL.endsWith("/api") ? BACKEND_URL : `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDepartments: 0,
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userModalOpen, setUserModalOpen] = useState(false); // ✅ 추가: 사용자 관리 모달 상태
  const [deptModalOpen, setDeptModalOpen] = useState(false);  // ✅ 추가
  const [logModalOpen, setLogModalOpen] = useState(false);  // ✅ 추가 로그 관리 모달

  // ✅ URL에 token이 있으면 자동 저장
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      console.log("✅ URL에서 토큰 감지:", token.slice(0, 20) + "...");
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      console.log("✅ 토큰 저장 및 Axios 헤더 등록 완료");

      // token 파라미터 제거 (주소 정리)
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);


  // ✅ 관리자 대시보드 데이터 로드
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.warn("⚠️ 토큰 없음: 로그인 필요");
          setLoading(false);
          return;
        }

        console.log("📡 요청 URL:", API_BASE);

        // 병렬 요청 (유저 + 부서 + 로그)
        const [usersRes, deptRes, logsRes] = await Promise.all([
          axios.get(`${API_BASE}/users`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }),
          axios.get(`${API_BASE}/departments`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }),
          axios
            .get(`${API_BASE}/admin/logs`, {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true,
            })
            .catch(() => ({ data: { data: { logs: [] } } })),
        ]);

        setStats({
          totalUsers:
            usersRes.data.data?.count ||
            usersRes.data.data?.users?.length ||
            0,
          totalDepartments:
            deptRes.data.data?.count ||
            deptRes.data.data?.departments?.length ||
            0,
        });

        setLogs(logsRes.data.data?.logs || []);
      } catch (error) {
        console.error("❌ 관리자 대시보드 데이터 로드 실패:", error.response?.data || error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner color="primary" />
        <p className="mt-3">관리자 데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard p-4">
      <h2 className="mb-4">👑 Admin Dashboard</h2>
      <p>전체 사용자, 부서, 권한을 관리할 수 있습니다.</p>

     {/* 관리자 주요 통계 카드 */}
<Row className="mt-4 text-center">
  {/* 사용자 관리 */}
  <Col md={4}>
    <Widget className="py-4 d-flex flex-column align-items-center justify-content-between h-100">
      <div>
        <img src={userIcon} alt="user" width="40" className="mb-3" />
        <h6 className="fw-bold mb-2">사용자 관리</h6>
        <p className="text-muted small mb-2">
          전체 회원 목록을 조회하고, 권한(role)을 변경하거나 삭제할 수 있습니다.
        </p>
      </div>
      <div>
        <p className="fw-semibold text-primary mb-2">
          👥 총 사용자 수: {stats.totalUsers.toLocaleString()}명
        </p>
        <Button color="primary" size="sm" className="px-3 rounded-pill"
        onClick={() => setUserModalOpen(true)}>
          사용자 관리 바로가기
        </Button>
      </div>
    </Widget>
  </Col>

  {/* 부서 관리 */}
  <Col md={4}>
    <Widget className="py-4 d-flex flex-column align-items-center justify-content-between h-100">
      <div>
        <img src={teamIcon} alt="team" width="40" className="mb-3" />
        <h6 className="fw-bold mb-2">부서 관리</h6>
        <p className="text-muted small mb-2">
          부서를 추가/삭제하고, 구성원을 지정할 수 있습니다.
        </p>
      </div>
      <div>
        <p className="fw-semibold text-info mb-2">
          🏢 총 부서 수: {stats.totalDepartments.toLocaleString()}개
        </p>
        <Button color="info" size="sm" className="px-3 rounded-pill"
           onClick={() => setDeptModalOpen(true)}  // ✅ 추가
        >
          부서 관리 바로가기
        </Button>
      </div>
    </Widget>
  </Col>

  {/* 시스템 설정 */}
  <Col md={4}>
    <Widget className="py-4 d-flex flex-column align-items-center justify-content-between h-100">
      <div>
        <img src={settingsIcon} alt="settings" width="40" className="mb-3" />
        <h6 className="fw-bold mb-2">시스템 설정</h6>
        <p className="text-muted small mb-2">
          로그 기록 확인 및 시스템 기본 설정을 변경할 수 있습니다.
        </p>
      </div>
      <Button color="warning" size="sm" className="px-3 rounded-pill text-white" 
      onClick={() => setLogModalOpen(true)}  // ✅ 추가
      >
        설정 관리
      </Button>
    </Widget>
  </Col>
</Row>

     {/* 관리자 로그 섹션 */}
<Row className="mt-5">
  <Col md={12}>
    <Widget className="p-4 shadow-sm rounded-4">
      <h6 className="fw-bold mb-3 d-flex align-items-center">
        <span style={{ fontSize: "20px", marginRight: "8px" }}>🗂️</span>
        최근 활동 로그
      </h6>
      <hr className="mb-4" />

      {logs.length > 0 ? (
        <ul className="list-unstyled mb-0">
          {logs.slice(0, 5).map((log, idx) => (
            <li
              key={idx}
              className="py-2 px-3 mb-2 rounded d-flex justify-content-between align-items-center"
              style={{ backgroundColor: "#f9fafb" }}
            >
              <span className="text-dark small fw-medium">{log.message}</span>
              <small className="text-muted">
                {new Date(log.createdAt).toLocaleString("ko-KR")}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted text-center m-0">
          📭 최근 활동 로그가 없습니다.
        </p>
      )}
    </Widget>
  </Col>
</Row>

      {/* 차트 */}
      <Row className="mt-5">
        <Col md={12}>
          <PieCharts />
        </Col>
      </Row>

       {/* ✅ 추가: 사용자 관리 모달 */}
      <UserManagementModal 
        isOpen={userModalOpen}
        toggle={() => setUserModalOpen(false)}
      />

      {/* ✅ 추가: 부서 관리 모달 */}
      <DepartmentManagementModal 
        isOpen={deptModalOpen}
        toggle={() => setDeptModalOpen(false)}
      />

      {/* ✅ 추가: 로그 관리 모달 */}
      <LogManagementModal 
        isOpen={logModalOpen}
        toggle={() => setLogModalOpen(false)}
      />

    </div>
  );
};

export default AdminDashboard;
