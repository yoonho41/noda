import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  Table,
  Spinner,
  Badge,
} from "reactstrap";
import axios from "axios";
import config from "../../config";

const BACKEND_URL = config.baseURLApi;

const ProjectListModal = ({ isOpen, toggle, departmentId }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // 부서 프로젝트 조회
  const fetchDepartmentProjects = async () => {
    if (!departmentId) {
      console.warn("⚠️ 부서 ID가 없습니다.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BACKEND_URL}/projects/department/${departmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ 부서 프로젝트 응답:", res.data);

      if (res.data.success) {
        setProjects(res.data.data || []);
      }
    } catch (error) {
      console.error("❌ 프로젝트 목록 조회 실패:", error);
      alert("프로젝트 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 모달 열릴 때 프로젝트 조회
  useEffect(() => {
    if (isOpen && departmentId) {
      fetchDepartmentProjects();
    }
  }, [isOpen, departmentId]);

  // 프로젝트 상태 배지 색상
  const getStatusBadgeColor = (status) => {
    if (status === "completed") return "success";
    if (status === "in_progress") return "primary";
    if (status === "planning") return "secondary";
    return "warning";
  };

  // 프로젝트 상태 한글 변환
  const getStatusLabel = (status) => {
    const labels = {
      planning: "계획 중",
      in_progress: "진행 중",
      completed: "완료됨",
      on_hold: "보류",
    };
    return labels[status] || status;
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>
        <span className="fw-bold">🚀 부서 프로젝트</span>
      </ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
            <p className="mt-3">프로젝트 목록을 불러오는 중...</p>
          </div>
        ) : projects.length > 0 ? (
          <>
            <div className="mb-3">
              <h6>
                총 <span className="text-primary fw-bold">{projects.length}</span>개의 프로젝트
              </h6>
            </div>

            <div className="table-responsive">
              <Table hover bordered>
                <thead className="table-light">
                  <tr>
                    <th className="text-center" style={{ width: "50px" }}>
                      NO
                    </th>
                    <th>프로젝트명</th>
                    <th>담당자</th>
                    <th className="text-center" style={{ width: "120px" }}>
                      상태
                    </th>
                    <th className="text-center" style={{ width: "120px" }}>
                      시작일
                    </th>
                    <th className="text-center" style={{ width: "120px" }}>
                      종료일
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project, index) => (
                    <tr key={project._id}>
                      <td className="text-center">{index + 1}</td>
                      <td className="fw-bold">{project.projectName}</td>
                      <td>
                        {project.manager?.name || "담당자 없음"}
                      </td>
                      <td className="text-center">
                        <Badge
                          color={getStatusBadgeColor(project.status)}
                          pill
                        >
                          {getStatusLabel(project.status)}
                        </Badge>
                      </td>
                      <td className="text-center small text-muted">
                        {project.startDate
                          ? new Date(project.startDate).toLocaleDateString("ko-KR")
                          : "-"}
                      </td>
                      <td className="text-center small text-muted">
                        {project.endDate
                          ? new Date(project.endDate).toLocaleDateString("ko-KR")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        ) : (
          <div className="text-center py-5 text-muted">
            <p className="mb-0">📭 진행 중인 프로젝트가 없습니다.</p>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};

export default ProjectListModal;