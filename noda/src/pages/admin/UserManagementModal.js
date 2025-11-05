import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  Table,
  Button,
  Badge,
  Spinner,
} from "reactstrap";
import axios from "axios";
import config from "../../config";

const BACKEND_URL = config.baseURLApi;

const UserManagementModal = ({ isOpen, toggle }) => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  // 사용자 + 부서 목록 조회
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      const [userRes, deptRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${BACKEND_URL}/departments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      console.log('✅ 사용자 응답:', userRes.data);
      console.log('✅ 부서 응답:', deptRes.data);

      setUsers(userRes.data.data.users || []);
      setDepartments(deptRes.data.data.departments || []);
    } catch (error) {
      console.error("❌ 데이터 조회 실패:", error);
      alert("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // 권한 변경
  const handleRoleChange = async (userId, newRole, currentRole) => {
    if (newRole === currentRole) return;

    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${BACKEND_URL}/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("권한이 변경되었습니다!");
      fetchData();
    } catch (error) {
      console.error("❌ 권한 변경 실패:", error);
      alert("권한 변경에 실패했습니다.");
    }
  };

  // 부서 변경
  const handleDepartmentChange = async (userId, newDeptId, userName) => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${BACKEND_URL}/users/${userId}`,
        { department: newDeptId || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (newDeptId) {
        await axios.post(
          `${BACKEND_URL}/departments/${newDeptId}/members`,
          { userId },
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => {});
      }

      alert(`${userName}의 부서가 변경되었습니다!`);
      fetchData();
    } catch (error) {
      console.error("❌ 부서 변경 실패:", error);
      alert(error.response?.data?.message || "부서 변경에 실패했습니다.");
    }
  };

  // 사용자 비활성화
  const handleDeactivate = async (userId, userName) => {
    if (!window.confirm(`${userName} 사용자를 비활성화하시겠습니까?`)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("사용자가 비활성화되었습니다.");
      fetchData();
    } catch (error) {
      console.error("❌ 사용자 비활성화 실패:", error);
      alert("사용자 비활성화에 실패했습니다.");
    }
  };

  // 사용자 활성화
  const handleActivate = async (userId, userName) => {
    if (!window.confirm(`${userName} 사용자를 활성화하시겠습니까?`)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${BACKEND_URL}/users/${userId}/activate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("사용자가 활성화되었습니다.");
      fetchData();
    } catch (error) {
      console.error("❌ 사용자 활성화 실패:", error);
      alert("사용자 활성화에 실패했습니다.");
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "danger";
      case "manager":
        return "warning";
      default:
        return "info";
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "admin":
        return "관리자";
      case "manager":
        return "매니저";
      default:
        return "사용자";
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        <span className="fw-bold">👥 사용자 관리</span>
      </ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
            <p className="mt-3">사용자 목록을 불러오는 중...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover bordered className="mb-0">
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: "50px" }}>NO</th>
                  <th>이름</th>
                  <th>이메일</th>
                  <th className="text-center">권한</th>
                  <th className="text-center" style={{ width: "150px" }}>부서</th>
                  <th className="text-center">상태</th>
                  <th className="text-center">가입일</th>
                  <th className="text-center" style={{ width: "250px" }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user, index) => (
                    <tr key={user._id}>
                      <td className="text-center">{index + 1}</td>
                      <td>{user.name}</td>
                      <td className="small">{user.email || "-"}</td>
                      <td className="text-center">
                        <Badge color={getRoleBadgeColor(user.role)} pill>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </td>
                      
                      {/* ✅ 부서 드롭다운 */}
                      <td className="text-center">
                        <select
                          className="form-select form-select-sm"
                          value={user.department?._id || ""}
                          onChange={(e) =>
                            handleDepartmentChange(user._id, e.target.value, user.name)
                          }
                          disabled={!user.isActive}
                        >
                          <option value="">미배정</option>
                          {departments.map((dept) => (
                            <option key={dept._id} value={dept._id}>
                              {dept.departmentName}
                            </option>
                          ))}
                        </select>
                      </td>
                      
                      <td className="text-center">
                        <Badge color={user.isActive ? "success" : "secondary"} pill>
                          {user.isActive ? "활성" : "비활성"}
                        </Badge>
                      </td>
                      <td className="text-center small text-muted">
                        {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="text-center">
                        <select
                          className="form-select form-select-sm d-inline-block me-2"
                          style={{ width: "100px" }}
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user._id, e.target.value, user.role)
                          }
                          disabled={!user.isActive}
                        >
                          <option value="user">사용자</option>
                          <option value="manager">매니저</option>
                          <option value="admin">관리자</option>
                        </select>

                        {user.isActive ? (
                          <Button
                            color="danger"
                            size="sm"
                            outline
                            onClick={() => handleDeactivate(user._id, user.name)}
                          >
                            비활성화
                          </Button>
                        ) : (
                          <Button
                            color="success"
                            size="sm"
                            onClick={() => handleActivate(user._id, user.name)}
                          >
                            활성화
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      등록된 사용자가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};

export default UserManagementModal;