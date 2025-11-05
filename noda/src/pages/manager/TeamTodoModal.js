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

const TeamTodoModal = ({ isOpen, toggle, departmentId }) => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);

  // 부서 할일 조회
  const fetchDepartmentTodos = async () => {
    if (!departmentId) {
      console.warn("⚠️ 부서 ID가 없습니다.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BACKEND_URL}/todos/department/${departmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ 부서 할일 응답:", res.data);

      if (res.data.success) {
        setTodos(res.data.data || []);
      }
    } catch (error) {
      console.error("❌ 팀 할일 목록 조회 실패:", error);
      alert("팀 할일 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 모달 열릴 때 할일 조회
  useEffect(() => {
    if (isOpen && departmentId) {
      fetchDepartmentTodos();
    }
  }, [isOpen, departmentId]);

  // 할일 상태 배지 색상
  const getStatusBadgeColor = (status) => {
    if (status === "done") return "success";
    if (status === "in_progress") return "warning";
    return "secondary";
  };

  // 할일 상태 한글 변환
  const getStatusLabel = (status) => {
    const labels = {
      todo: "할 일",
      in_progress: "진행 중",
      done: "완료",
    };
    return labels[status] || status;
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>
        <span className="fw-bold">✅ 팀 할 일</span>
      </ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="danger" />
            <p className="mt-3">팀 할일을 불러오는 중...</p>
          </div>
        ) : todos.length > 0 ? (
          <>
            <div className="mb-3">
              <h6>
                총 <span className="text-danger fw-bold">{todos.length}</span>개의 할 일
              </h6>
            </div>

            <div className="table-responsive">
              <Table hover bordered>
                <thead className="table-light">
                  <tr>
                    <th className="text-center" style={{ width: "50px" }}>
                      NO
                    </th>
                    <th>할 일 제목</th>
                    <th>담당자</th>
                    <th className="text-center" style={{ width: "120px" }}>
                      상태
                    </th>
                    <th className="text-center" style={{ width: "120px" }}>
                      마감일
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {todos.map((todo, index) => (
                    <tr key={todo._id}>
                      <td className="text-center">{index + 1}</td>
                      <td className="fw-bold">{todo.title}</td>
                      <td>{todo.user?.name || "담당자 없음"}</td>
                      <td className="text-center">
                        <Badge
                          color={getStatusBadgeColor(todo.status)}
                          pill
                        >
                          {getStatusLabel(todo.status)}
                        </Badge>
                      </td>
                      <td className="text-center small text-muted">
                        {todo.dueDate
                          ? new Date(todo.dueDate).toLocaleDateString("ko-KR")
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
            <p className="mb-0">📭 팀 할 일이 없습니다.</p>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};

export default TeamTodoModal;