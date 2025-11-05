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

const ApprovalMyListModal = ({ isOpen, toggle }) => {
  const [myApprovals, setMyApprovals] = useState([]);
  const [loading, setLoading] = useState(false);

  // 내가 작성한 문서 조회
  const fetchMyApprovals = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/approvals/my-drafts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ 내가 작성한 결재 문서:", res.data);

      if (res.data.success) {
        setMyApprovals(res.data.data.documents);
      }
    } catch (error) {
      console.error("❌ 문서 목록 조회 실패:", error);
      alert("내 결재 문서를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 모달 열릴 때 데이터 조회
  useEffect(() => {
    if (isOpen) fetchMyApprovals();
  }, [isOpen]);

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      case "pending":
        return "warning";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: "초안",
      pending: "결재 중",
      approved: "승인 완료",
      rejected: "반려됨",
    };
    return labels[status] || status;
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>
        <span className="fw-bold">📝 내가 작성한 결재 문서</span>
      </ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center py-5">
            <Spinner color="warning" />
            <p className="mt-3">문서를 불러오는 중...</p>
          </div>
        ) : myApprovals.length > 0 ? (
          <>
            <div className="mb-3">
              <h6>
                총{" "}
                <span className="text-warning fw-bold">
                  {myApprovals.length}
                </span>
                건의 문서
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
                  {myApprovals.map((doc, index) => (
                    <tr key={doc._id}>
                      <td className="text-center">{index + 1}</td>
                      <td className="fw-bold">{doc.title}</td>
                      <td className="text-center">
                        <Badge color={getStatusBadgeColor(doc.overallStatus)} pill>
                          {getStatusLabel(doc.overallStatus)}
                        </Badge>
                      </td>
                      <td className="text-center small text-muted">
                        {new Date(doc.createdAt).toLocaleDateString("ko-KR")}
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
            <p className="mb-0">📭 작성한 문서가 없습니다.</p>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};

export default ApprovalMyListModal;
