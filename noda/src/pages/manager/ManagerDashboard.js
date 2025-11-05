import React, { useEffect, useState } from "react";
import { Row, Col, Button, Spinner } from "reactstrap";
import Widget from "../../components/Widget/Widget"; // 커스텀 위젯 컴포넌트
import axios from "axios";  // HTTP 요청용
import config from "../../config";  // API URL 설정

// 대시보드 아이콘
import teamIcon from "../../assets/dashboard/heartTeal.svg";
import approvalIcon from "../../assets/dashboard/heartYellow.svg";
import projectIcon from "../../assets/dashboard/heartViolet.svg";
import todoIcon from "../../assets/dashboard/heartRed.svg";
import BarCharts from "../charts/bar/BarCharts";  // 차트 컴포넌트

// ✅ 추가: 모달 컴포넌트 임포트
import TeamMembersModal from "./TeamMembersModal";
import ApprovalListModal from "./ApprovalListModal";  // ✅ 추가!
import ProjectListModal from "./ProjectListModal";  // ✅ 추가!
import TeamTodoModal from "./TeamTodoModal";  // ✅ 추가!


// ✅ 백엔드 URL 자동 인식 (/api 중복 방지)
const BACKEND_URL = config.baseURLApi;
const API_BASE = BACKEND_URL.endsWith("/api") ? BACKEND_URL : `${BACKEND_URL}/api`;

const ManagerDashboard = () => {
  const [data, setData] = useState(null);  // 대시보드 데이터
  const [loading, setLoading] = useState(true);  // 로딩 상태
  
  // ✅ 추가: 모달 상태 관리
  const [teamModalOpen, setTeamModalOpen] = useState(false);  
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);  // ✅ 추가!
  const [todoModalOpen, setTodoModalOpen] = useState(false);  // ✅ 추가!  

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


  // ✅ 팀 리더 대시보드 데이터 가져오기
  useEffect(() => {
    const fetchManagerDashboard = async () => {
      try {
        const token = localStorage.getItem("token"); // 토큰 가져오기
        if (!token) {
          console.warn("⚠️ 토큰 없음: 로그인 필요");
          setLoading(false);
          return;
        }

        console.log("📡 요청 URL:", `${API_BASE}/dashboard/manager`);
        console.log("🔑 토큰 존재 여부:", token ? "✅ 있음" : "❌ 없음");

        const res = await axios.get(`${API_BASE}/dashboard/manager`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        console.log("✅ 매니저 대시보드 응답:", res.data);

        if (res.data.success) {
          setData(res.data.data);
        } else {
          console.warn("⚠️ 매니저 대시보드 데이터 없음:", res.data);
        }
      } catch (error) {
        console.error("❌ 매니저 대시보드 불러오기 실패:", error.response?.data || error);
      } finally {
        setLoading(false);
      }
    };

    fetchManagerDashboard();
  }, []);

  // 로딩 중
  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner color="info" />
        <p className="mt-3">팀 리더 데이터를 불러오는 중...</p>
      </div>
    );
  }

  // 데이터 없음
  if (!data) {
    return (
      <div className="text-center mt-5 text-danger">
        데이터를 불러오지 못했습니다. 관리자에게 문의하세요.
      </div>
    );
  }

  const { team, approvals, projects, teamTodos } = data;

  return (
    <div className="manager-dashboard p-4">
      <h2 className="mb-4">👔 Project Manager Dashboard</h2>
      <p>부서 현황, 결재 요청, 팀 프로젝트 및 할 일 진행 상태를 한눈에 확인할 수 있습니다.</p>

     {/* 상단 주요 통계 카드 */}
<Row className="mt-4 text-center">
  {/* 팀 현황 */}
  <Col md={3}>
    <Widget className="py-4 d-flex flex-column align-items-center justify-content-between h-100">
      <div>
        <img src={teamIcon} alt="team" width="40" className="mb-3" />
        <h6 className="fw-bold mb-2">팀 현황</h6>
        <p className="text-muted small mb-2">현재 관리 중인 부서입니다.</p>
      </div>
      <div>
        <p className="fw-semibold text-info mb-2">
          🏢 {team.name} ({team.memberCount}명)
        </p>
        <Button color="info" size="sm" className="px-3 rounded-pill"
        onClick={() => setTeamModalOpen(true)} 
        >        
          팀원 관리
        </Button>
      </div>
    </Widget>
  </Col>

  {/* 결재 대기 문서 */}
  <Col md={3}>
    <Widget className="py-4 d-flex flex-column align-items-center justify-content-between h-100">
      <div>
        <img src={approvalIcon} alt="approvals" width="40" className="mb-3" />
        <h6 className="fw-bold mb-2">결재 대기 문서</h6>
        <p className="text-muted small mb-2">
          내가 결재해야 할 문서 수를 확인할 수 있습니다.
        </p>
      </div>
      <div>
        <p className="fw-semibold text-warning mb-2">
          📄 {approvals.pending}건 대기 중
        </p>
        <Button color="warning" size="sm" className="px-3 rounded-pill text-white" 
        onClick={() => setApprovalModalOpen(true)}>
          결재함 바로가기
        </Button>
      </div>
    </Widget>
  </Col>

  {/* 프로젝트 현황 */}
  <Col md={3}>
    <Widget className="py-4 d-flex flex-column align-items-center justify-content-between h-100">
      <div>
        <img src={projectIcon} alt="projects" width="40" className="mb-3" />
        <h6 className="fw-bold mb-2">프로젝트 현황</h6>
        <p className="text-muted small mb-2">부서 내 진행 중인 프로젝트 수를 확인합니다.</p>
      </div>
      <div>
        <p className="fw-semibold text-primary mb-2">
          🚀 {projects.active}/{projects.total}
        </p>
        <Button color="primary" size="sm" className="px-3 rounded-pill"
        onClick={() => setProjectModalOpen(true)}  // ✅ 추가!
        >
          프로젝트 보기
        </Button>
      </div>
    </Widget>
  </Col>

  {/* 팀 할 일 현황 */}
  <Col md={3}>
    <Widget className="py-4 d-flex flex-column align-items-center justify-content-between h-100">
      <div>
        <img src={todoIcon} alt="todos" width="40" className="mb-3" />
        <h6 className="fw-bold mb-2">팀 할 일 현황</h6>
        <p className="text-muted small mb-2">부서 구성원의 전체 할 일 진행률을 확인합니다.</p>
      </div>
      <div>
        <p className="fw-semibold text-danger mb-2">
          ✅ {teamTodos.completionRate}% 완료
        </p>
        <Button color="danger" size="sm" className="px-3 rounded-pill"
        onClick={() => setTodoModalOpen(true)}  // ✅ 추가!
        >
          팀 할 일 보기
        </Button>
      </div>
    </Widget>
  </Col>
</Row>

      {/* 부서별 프로젝트 현황 차트 */}
      <Row className="mt-5">
        <Col md={12}>
          <BarCharts />
        </Col>
      </Row>

      {/* ✅ 추가: 팀 현황 보기 컴포넌트 */}
      <TeamMembersModal 
        isOpen={teamModalOpen}
        toggle={() => setTeamModalOpen(false)}
        departmentId={data?.team?.departmentId}
      />

      {/* ✅ 추가: 전자 결재 컴포넌트 */}
      <ApprovalListModal 
        isOpen={approvalModalOpen}
        toggle={() => setApprovalModalOpen(false)}
      />
      {/* ✅ 추가: 프로젝트 현황 컴포넌트 */}
        <ProjectListModal 
        isOpen={projectModalOpen}
        toggle={() => setProjectModalOpen(false)}
        departmentId={data?.team?.departmentId}
      />
        {/* ✅ 추가: 팀 할일 현황 컴포넌트 */}
        <TeamTodoModal 
        isOpen={todoModalOpen}
        toggle={() => setTodoModalOpen(false)}
        departmentId={data?.team?.departmentId}
      />

    </div>
  );
};

export default ManagerDashboard;
