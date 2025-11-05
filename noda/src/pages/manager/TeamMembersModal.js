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

const TeamMembersModal = ({ isOpen, toggle, departmentId }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  // 팀원 목록 조회
  const fetchTeamMembers = async () => {
    if (!departmentId) {
      console.warn("⚠️ 부서 ID가 없습니다.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BACKEND_URL}/users/department/${departmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ 팀원 목록 응답:", res.data);

      if (res.data.success) {
        setMembers(res.data.data.users || []);
      }
    } catch (error) {
      console.error("❌ 팀원 목록 조회 실패:", error);
      alert("팀원 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 모달이 열릴 때 팀원 목록 조회
  useEffect(() => {
    if (isOpen && departmentId) {
      fetchTeamMembers();
    }
  }, [isOpen, departmentId]);

  // 역할 배지 색상
  const getRoleBadgeColor = (role) => {
    if (role === "admin") return "danger";
    if (role === "manager") return "warning";
    return "info";
  };

  // 역할 한글 변환
  const getRoleLabel = (role) => {
    const labels = {
      admin: "관리자",
      manager: "매니저",
      user: "일반",
    };
    return labels[role] || role;
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>
        <span className="fw-bold">👥 팀원 관리</span>
      </ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="info" />
            <p className="mt-3">팀원 목록을 불러오는 중...</p>
          </div>
        ) : members.length > 0 ? (
          <>
            <div className="mb-3">
              <h6>
                총 <span className="text-info fw-bold">{members.length}</span>명의 팀원
              </h6>
            </div>

            <div className="table-responsive">
              <Table hover bordered>
                <thead className="table-light">
                  <tr>
                    <th className="text-center" style={{ width: "50px" }}>
                      NO
                    </th>
                    <th>이름</th>
                    <th>이메일</th>
                    <th className="text-center" style={{ width: "100px" }}>
                      역할
                    </th>
                    <th className="text-center" style={{ width: "100px" }}>
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member, index) => (
                    <tr key={member._id}>
                      <td className="text-center">{index + 1}</td>
                      <td className="fw-bold">{member.name}</td>
                      <td className="text-muted small">{member.email}</td>
                      <td className="text-center">
                        <Badge color={getRoleBadgeColor(member.role)} pill>
                          {getRoleLabel(member.role)}
                        </Badge>
                      </td>
                      <td className="text-center">
                        {member.isActive ? (
                          <Badge color="success" pill>
                            활성
                          </Badge>
                        ) : (
                          <Badge color="secondary" pill>
                            비활성
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        ) : (
          <div className="text-center py-5 text-muted">
            <p className="mb-0">📭 소속된 팀원이 없습니다.</p>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};

export default TeamMembersModal;