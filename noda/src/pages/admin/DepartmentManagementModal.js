import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Table,
  Button,
  Badge,
  Spinner,
  Form,
  FormGroup,
  Label,
  Input,
} from "reactstrap";
import axios from "axios";
import config from "../../config";

const BACKEND_URL = config.baseURLApi;

const DepartmentManagementModal = ({ isOpen, toggle }) => {
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);  // ✅ 추가: 사용자 목록
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({
    departmentName: "",
    description: "",
    manager: "",  // ✅ 추가: 부서장 ID
  });

   // ✅ 부서 목록 + 사용자 목록 조회
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      // 병렬로 부서와 사용자 조회
      const [deptRes, userRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/departments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${BACKEND_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setDepartments(deptRes.data.data.departments || []);
      setUsers(userRes.data.data.users || []);  // ✅ 사용자 목록 저장
    } catch (error) {
      console.error("❌ 데이터 조회 실패:", error);
      alert("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 모달이 열릴 때 부서 목록 조회
  useEffect(() => {
    if (isOpen) {
      fetchData();
      setIsAdding(false);
      setEditingDept(null);
    }
  }, [isOpen]);

  // 부서 추가
  const handleAdd = async (e) => {
    e.preventDefault();

    if (!formData.departmentName.trim()) {
      alert("부서명을 입력해주세요.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${BACKEND_URL}/departments`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("부서가 추가되었습니다!");
      setFormData({ departmentName: "", description: "" });
      setIsAdding(false);
      fetchData();
    } catch (error) {
      console.error("❌ 부서 추가 실패:", error);
      alert(error.response?.data?.message || "부서 추가에 실패했습니다.");
    }
  };

  // 부서 수정
  const handleEdit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BACKEND_URL}/departments/${editingDept._id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("부서 정보가 수정되었습니다!");
      setFormData({ departmentName: "", description: "" });
      setEditingDept(null);
      fetchData();
    } catch (error) {
      console.error("❌ 부서 수정 실패:", error);
      alert(error.response?.data?.message || "부서 수정에 실패했습니다.");
    }
  };

  // 부서 삭제
  const handleDelete = async (deptId, deptName) => {
    if (!window.confirm(`${deptName} 부서를 삭제하시겠습니까?`)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/departments/${deptId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("부서가 삭제되었습니다.");
      fetchData();
    } catch (error) {
      console.error("❌ 부서 삭제 실패:", error);
      alert(error.response?.data?.message || "부서 삭제에 실패했습니다.");
    }
  };

  // 수정 모드 시작
  const startEdit = (dept) => {
    setEditingDept(dept);
    setFormData({
      departmentName: dept.departmentName,
      description: dept.description || "",
      manager: dept.manager?._id || "",  // ✅ 부서장 ID
    });
    setIsAdding(false);
  };

  // 추가 모드 시작
  const startAdd = () => {
    setIsAdding(true);
    setEditingDept(null);
    setFormData({ departmentName: "", description: "" });
  };

  // 취소
  const handleCancel = () => {
    setIsAdding(false);
    setEditingDept(null);
    setFormData({ departmentName: "", description: "" });
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        <span className="fw-bold">🏢 부서 관리</span>
      </ModalHeader>
      <ModalBody>
        {/* 부서 추가/수정 폼 */}
        {(isAdding || editingDept) && (
          <div className="mb-4 p-3 border rounded bg-light">
            <h6 className="fw-bold mb-3">
              {editingDept ? "✏️ 부서 수정" : "➕ 부서 추가"}
            </h6>
            <Form onSubmit={editingDept ? handleEdit : handleAdd}>
              <FormGroup>
                <Label>부서명 *</Label>
                <Input
                  type="text"
                  value={formData.departmentName}
                  onChange={(e) =>
                    setFormData({ ...formData, departmentName: e.target.value })
                  }
                  placeholder="예: 개발팀"
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>부서 설명</Label>
                <Input
                  type="textarea"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="부서에 대한 설명을 입력하세요 (선택)"
                  rows="2"
                />
             </FormGroup>
              {/* ✅ 부서장 선택 추가 */}
              <FormGroup>
                <Label>부서장</Label>
                <Input
                  type="select"
                  value={formData.manager}
                  onChange={(e) =>
                    setFormData({ ...formData, manager: e.target.value })
                  }
                >
                  <option value="">선택 안 함</option>
                  {users
                    .filter((u) => u.isActive)  // 활성 사용자만
                    .map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email}) - {user.role === 'admin' ? '관리자' : user.role === 'manager' ? '매니저' : '사용자'}
                      </option>
                    ))}
                </Input>
                <small className="text-muted">
                  부서장으로 지정하면 해당 사용자의 권한이 자동으로 '매니저'로 변경됩니다.
                </small>
              </FormGroup>
              <div className="d-flex gap-2">
                <Button color="primary" type="submit" size="sm">
                  {editingDept ? "수정 완료" : "추가"}
                </Button>
                <Button color="secondary" size="sm" onClick={handleCancel}>
                  취소
                </Button>
              </div>
            </Form>
          </div>
        )}

        {/* 부서 추가 버튼 */}
        {!isAdding && !editingDept && (
          <div className="mb-3">
            <Button color="success" size="sm" onClick={startAdd}>
              ➕ 부서 추가
            </Button>
          </div>
        )}

        {/* 부서 목록 테이블 */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
            <p className="mt-3">부서 목록을 불러오는 중...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover bordered className="mb-0">
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: "50px" }}>No</th>
                  <th>부서명</th>
                  <th>설명</th>
                  <th className="text-center">인원</th>
                  <th className="text-center">부서장</th>
                  <th className="text-center">생성일</th>
                  <th className="text-center" style={{ width: "150px" }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {departments.length > 0 ? (
                  departments.map((dept, index) => (
                    <tr key={dept._id}>
                      <td className="text-center">{index + 1}</td>
                      <td className="fw-bold">{dept.departmentName}</td>
                      <td className="text-muted small">
                        {dept.description || "-"}
                      </td>
                      <td className="text-center">
                        <Badge color="info" pill>
                          {dept.members?.length || 0}명
                        </Badge>
                      </td>
                      <td className="text-center">
                        {dept.manager?.name || "-"}
                      </td>
                      <td className="text-center small text-muted">
                        {new Date(dept.createdAt).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="text-center">
                        <Button
                          color="warning"
                          size="sm"
                          outline
                          className="me-2"
                          onClick={() => startEdit(dept)}
                        >
                          수정
                        </Button>
                        <Button
                          color="danger"
                          size="sm"
                          outline
                          onClick={() => handleDelete(dept._id, dept.departmentName)}
                        >
                          삭제
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      등록된 부서가 없습니다.
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

export default DepartmentManagementModal;