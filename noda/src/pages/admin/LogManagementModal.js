import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  Table,
  Button,
  Badge,
  Spinner,
  Input,
  FormGroup,
  Label,
  Row,
  Col,
} from "reactstrap";
import axios from "axios";
import config from "../../config";

const BACKEND_URL = config.baseURLApi;

const LogManagementModal = ({ isOpen, toggle }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    action: "",
    search: "",
    startDate: "",
    endDate: "",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalLogs: 0,
  });

  // 로그 조회
  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = {
        page,
        limit: 20,
        ...filters,
      };

      const res = await axios.get(`${BACKEND_URL}/admin/logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      console.log("✅ 로그 응답:", res.data);

      setLogs(res.data.data.logs || []);
      setPagination({
        currentPage: res.data.data.currentPage,
        totalPages: res.data.data.totalPages,
        totalLogs: res.data.data.totalLogs,
      });
    } catch (error) {
      console.error("❌ 로그 조회 실패:", error);
      alert("로그를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 모달이 열릴 때 로그 조회
  useEffect(() => {
    if (isOpen) {
      fetchLogs(1);
    }
  }, [isOpen]);

  // 필터 변경
  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  // 검색
  const handleSearch = () => {
    fetchLogs(1);
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setFilters({
      action: "",
      search: "",
      startDate: "",
      endDate: "",
    });
    setTimeout(() => fetchLogs(1), 100);
  };

  // 액션 타입 한글 변환
  const getActionLabel = (action) => {
    const labels = {
      LOGIN: "로그인",
      LOGOUT: "로그아웃",
      ROLE_CHANGE: "권한 변경",
      DEPARTMENT_CHANGE: "부서 변경",
      USER_CREATE: "사용자 생성",
      USER_UPDATE: "사용자 수정",
      USER_ACTIVATE: "사용자 활성화",
      USER_DEACTIVATE: "사용자 비활성화",
      DEPT_CREATE: "부서 생성",
      DEPT_UPDATE: "부서 수정",
      DEPT_DELETE: "부서 삭제",
      SYSTEM: "시스템",
    };
    return labels[action] || action;
  };

  // 액션 타입 배지 색상
  const getActionBadgeColor = (action) => {
    if (action?.includes("CREATE")) return "success";
    if (action?.includes("DELETE") || action?.includes("DEACTIVATE")) return "danger";
    if (action?.includes("UPDATE") || action?.includes("CHANGE")) return "warning";
    if (action === "LOGIN") return "info";
    if (action === "LOGOUT") return "secondary";
    return "primary";
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        <span className="fw-bold">📋 로그 관리</span>
      </ModalHeader>
      <ModalBody>
        {/* 필터 영역 */}
        <div className="mb-4 p-3 border rounded bg-light">
          <Row>
            <Col md={3}>
              <FormGroup>
                <Label className="small fw-bold">액션 타입</Label>
                <Input
                  type="select"
                  bsSize="sm"
                  value={filters.action}
                  onChange={(e) => handleFilterChange("action", e.target.value)}
                >
                  <option value="">전체</option>
                  <option value="LOGIN">로그인</option>
                  <option value="LOGOUT">로그아웃</option>
                  <option value="ROLE_CHANGE">권한 변경</option>
                  <option value="DEPARTMENT_CHANGE">부서 변경</option>
                  <option value="USER_CREATE">사용자 생성</option>
                  <option value="USER_DEACTIVATE">사용자 비활성화</option>
                  <option value="DEPT_CREATE">부서 생성</option>
                  <option value="DEPT_UPDATE">부서 수정</option>
                </Input>
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup>
                <Label className="small fw-bold">시작 날짜</Label>
                <Input
                  type="date"
                  bsSize="sm"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                />
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup>
                <Label className="small fw-bold">종료 날짜</Label>
                <Input
                  type="date"
                  bsSize="sm"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                />
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup>
                <Label className="small fw-bold">검색</Label>
                <div className="d-flex gap-2">
                  <Input
                    type="text"
                    bsSize="sm"
                    placeholder="메시지 검색..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </FormGroup>
            </Col>
          </Row>
          <div className="d-flex gap-2 mt-2">
            <Button color="primary" size="sm" onClick={handleSearch}>
              🔍 검색
            </Button>
            <Button color="secondary" size="sm" outline onClick={handleResetFilters}>
              🔄 초기화
            </Button>
          </div>
        </div>

        {/* 통계 */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">
            총 <span className="text-primary fw-bold">{pagination.totalLogs.toLocaleString()}</span>개의 로그
          </h6>
          <Button
            color="secondary"
            size="sm"
            outline
            onClick={() => fetchLogs(pagination.currentPage)}
          >
            새로고침
          </Button>
        </div>

        {/* 로그 테이블 */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
            <p className="mt-3">로그를 불러오는 중...</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <Table hover bordered className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="text-center" style={{ width: "50px" }}>NO</th>
                    <th className="text-center" style={{ width: "120px" }}>액션</th>
                    <th>메시지</th>
                    <th style={{ width: "150px" }}>사용자</th>
                    <th className="text-center" style={{ width: "180px" }}>시간</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length > 0 ? (
                    logs.map((log, index) => (
                      <tr key={log._id}>
                        <td className="text-center small">
                          {(pagination.currentPage - 1) * 20 + index + 1}
                        </td>
                        <td className="text-center">
                          <Badge color={getActionBadgeColor(log.action)} pill>
                            {getActionLabel(log.action)}
                          </Badge>
                        </td>
                        <td className="small">{log.message}</td>
                        <td>
                          <div className="small">
                            <div className="fw-bold">{log.user?.name || "-"}</div>
                            <div className="text-muted" style={{ fontSize: "0.85em" }}>
                              {log.user?.email || "-"}
                            </div>
                          </div>
                        </td>
                        <td className="text-center small text-muted">
                          {new Date(log.createdAt).toLocaleString("ko-KR")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        📭 로그가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>

            {/* 페이지네이션 */}
            {pagination.totalPages > 1 && (
              <div className="d-flex justify-content-center align-items-center mt-3 gap-2">
                <Button
                  size="sm"
                  color="primary"
                  outline
                  disabled={pagination.currentPage === 1}
                  onClick={() => fetchLogs(pagination.currentPage - 1)}
                >
                  ← 이전
                </Button>
                <span className="fw-bold">
                  {pagination.currentPage} / {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  color="primary"
                  outline
                  disabled={pagination.currentPage === pagination.totalPages}
                  onClick={() => fetchLogs(pagination.currentPage + 1)}
                >
                  다음 →
                </Button>
              </div>
            )}
          </>
        )}
      </ModalBody>
    </Modal>
  );
};

export default LogManagementModal;