import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  Table,
  Spinner,
  Badge,
  Button,
} from "reactstrap";
import axios from "axios";
import config from "../../config";

const BACKEND_URL = config.baseURLApi;

const ApprovalListModal = ({ isOpen, toggle }) => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);

  // 결재 대기 문서 조회
  const fetchPendingApprovals = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/approval`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ 결재 문서 응답:", res.data);

      if (res.data.success) {
        // 내가 결재해야 할 문서만 필터링
        const userId = JSON.parse(atob(token.split(".")[1]))._id;
        const myPendingApprovals = res.data.data.filter((doc) =>
          doc.approvalLine.some(
            (line) =>
              line.approver._id === userId &&
              line.status === "pending"
          )
        );
        setApprovals(myPendingApprovals);
      }
    } catch (error) {
      console.error("❌ 결재 문서 조회 실패:", error);
      alert("결재 문서를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 모달 열릴 때 데이터 조회
  useEffect(() => {
    if (isOpen) {
      fetchPendingApprovals();
    }
  }, [isOpen]);

  // 상태 배지 색상
  const getStatusBadgeColor = (status) => {
    if (status === "approved") return "success";
    if (status === "rejected") return "danger";
    return "warning";
  };

  // 상태 한글 변환
  const getStatusLabel = (status) => {
    const labels = {
      pending: "대기 중",
      approved: "승인됨",
      rejected: "반려됨",
    };
    return labels[status] || status;
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>
        <span className="fw-bold">📄 결재 대기 문서</span>
      </ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="warning" />
            <p className="mt-3">결재 문서를 불러오는 중...</p>
          </div>
        ) : approvals.length > 0 ? (
          <>
            <div className="mb-3">
              <h6>
                총 <span className="text-warning fw-bold">{approvals.length}</span>건의 결재 대기 문서
              </h6>
            </div>

            <div className="table-responsive">
              <Table hover bordered>
                <thead className="table-light">
                  <tr>
                    <th className="text-center" style={{ width: "50px" }}>
                      NO
                    </th>
                    <th>문서 제목</th>
                    <th>기안자</th>
                    <th className="text-center" style={{ width: "120px" }}>
                      상태
                    </th>
                    <th className="text-center" style={{ width: "120px" }}>
                      작성일
                    </th>
                    <th className="text-center" style={{ width: "100px" }}>
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((approval, index) => (
                    <tr key={approval._id}>
                      <td className="text-center">{index + 1}</td>
                      <td className="fw-bold">{approval.title}</td>
                      <td>{approval.drafter?.name || "알 수 없음"}</td>
                      <td className="text-center">
                        <Badge
                          color={getStatusBadgeColor(approval.overallStatus)}
                          pill
                        >
                          {getStatusLabel(approval.overallStatus)}
                        </Badge>
                      </td>
                      <td className="text-center small text-muted">
                        {new Date(approval.createdAt).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="text-center">
                        <Button color="info" size="sm" outline>
                          상세보기
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        ) : (
          <div className="text-center py-5 text-muted">
            <p className="mb-0">📭 결재 대기 중인 문서가 없습니다.</p>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};

export default ApprovalListModal;