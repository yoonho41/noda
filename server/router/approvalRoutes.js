const express = require('express');  // Express 모듈을 임포트
const router = express.Router();  // Express 라우터 객체 생성
const ApprovalDocument = require('../models/ApprovalDocument');  // 결재 문서 모델을 임포트
const User = require('../models/User');  // User 모델을 임포트
const {
  protect,  // 인증을 위한 미들웨어
  adminOnly,  // 관리자만 접근 가능한 미들웨어
  managerOrAdmin,  // 관리자나 매니저만 접근 가능한 미들웨어
} = require('../middleware/authMiddleware');  // 인증 관련 미들웨어 임포트

// ✅ 모든 요청에 인증 미들웨어 적용
router.use(protect);  // 모든 라우트에서 인증 미들웨어 사용

// ===============================================
// 1. 내가 작성한 결재 문서 목록 (GET /api/approvals/my-drafts)
// ===============================================
router.get('/my-drafts', async (req, res) => {  // 내가 작성한 결재 문서 목록을 조회하는 라우트
  try {
    const { status } = req.query;  // 쿼리 파라미터로 결재 문서 상태 필터링
    const filter = { drafter: req.user._id };  // 현재 로그인한 사용자의 문서만 조회

    if (status) filter.overallStatus = status;  // 상태 필터가 있다면 필터 추가

    // 결재 문서 조회
    const documents = await ApprovalDocument.find(filter)
      .populate('drafter', 'name email role')  // 작성자 정보 조회
      .populate('approvalLine.approver', 'name email role')  // 결재자 정보 조회
      .populate('department', 'departmentName')  // 부서명 조회
      .sort({ createdAt: -1 });  // 최신 순으로 정렬

    res.json({
      success: true,
      data: { documents, count: documents.length },  // 조회된 문서 목록과 개수 반환
    });
  } catch (error) {
    console.error('Get my drafts error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '문서 목록 조회 중 오류가 발생했습니다.',  // 오류 발생 시 메시지 반환
    });
  }
});

// ===============================================
// 2. 내가 결재해야 할 문서 목록 (GET /api/approvals/pending)
// ===============================================
router.get('/pending', async (req, res) => {  // 내가 결재해야 할 문서 목록을 조회하는 라우트
  try {
    // 결재자가 현재 로그인한 사용자이고, 결재 상태가 대기 중인 문서들만 조회
    const documents = await ApprovalDocument.find({
      'approvalLine.approver': req.user._id,
      overallStatus: 'pending',  // 전체 상태가 대기 중인 문서
    })
      .populate('drafter', 'name email role')  // 작성자 정보 조회
      .populate('approvalLine.approver', 'name email role')  // 결재자 정보 조회
      .populate('department', 'departmentName')  // 부서명 조회
      .sort({ submittedAt: -1 });  // 제출된 날짜 기준 내림차순 정렬

    // 실제로 결재할 차례인 문서만 필터링
    const myPendingDocs = documents.filter((doc) => {
      const myApproval = doc.approvalLine.find(
        (line) =>
          line.approver._id.toString() === req.user._id.toString() &&  // 결재자 ID가 현재 사용자와 일치
          line.order === doc.currentApproverOrder &&  // 결재 순서가 현재 문서의 결재 순서와 일치
          line.status === 'pending'  // 결재 상태가 대기 중
      );
      return myApproval !== undefined;  // 결재할 차례인 문서만 반환
    });

    res.json({
      success: true,
      data: { documents: myPendingDocs, count: myPendingDocs.length },  // 필터링된 문서 목록과 개수 반환
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '대기 문서 조회 중 오류가 발생했습니다.',  // 오류 발생 시 메시지 반환
    });
  }
});

// ===============================================
// 3. 전체 결재 문서 조회 (GET /api/approvals) - 매니저/관리자 전용
// ===============================================
router.get('/', managerOrAdmin, async (req, res) => {  // 관리자나 매니저만 접근 가능
  try {
    const { status, documentType } = req.query;  // 쿼리 파라미터로 상태와 문서 유형 필터링
    const filter = {};  // 필터 객체

    if (status) filter.overallStatus = status;  // 결재 상태 필터 추가
    if (documentType) filter.documentType = documentType;  // 문서 유형 필터 추가

    // 모든 결재 문서 조회
    const documents = await ApprovalDocument.find(filter)
      .populate('drafter', 'name email role')  // 작성자 정보 조회
      .populate('approvalLine.approver', 'name email role')  // 결재자 정보 조회
      .populate('department', 'departmentName')  // 부서명 조회
      .sort({ createdAt: -1 });  // 최신 순으로 정렬

    res.json({
      success: true,
      data: { documents, count: documents.length },  // 조회된 문서 목록과 개수 반환
    });
  } catch (error) {
    console.error('Get all approvals error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '문서 목록 조회 중 오류가 발생했습니다.',  // 오류 발생 시 메시지 반환
    });
  }
});

// ===============================================
// 4. 특정 결재 문서 상세 조회 (GET /api/approvals/:documentId)
// ===============================================
router.get('/:documentId', async (req, res) => {  // 특정 결재 문서 상세 조회
  try {
    const document = await ApprovalDocument.findById(req.params.documentId)  // 결재 문서 ID로 조회
      .populate('drafter', 'name email role profileImage')  // 작성자 정보 조회
      .populate('approvalLine.approver', 'name email role profileImage')  // 결재자 정보 조회
      .populate('referrers', 'name email role')  // 참조자 정보 조회
      .populate('department', 'departmentName');  // 부서명 조회

    if (!document) {  // 문서를 찾을 수 없으면 404 응답
      return res.status(404).json({
        success: false,
        message: '문서를 찾을 수 없습니다.',  // 문서 미존재시 메시지
      });
    }

    // 권한 체크: 작성자, 결재자, 참조자, 관리자만 조회 가능
    const isAuthor = document.drafter._id.toString() === req.user._id.toString();  // 작성자 확인
    const isApprover = document.approvalLine.some(
      (line) => line.approver._id.toString() === req.user._id.toString()  // 결재자 확인
    );
    const isReferrer = document.referrers.some(
      (ref) => ref._id.toString() === req.user._id.toString()  // 참조자 확인
    );
    const isAdmin = req.user.role === 'admin';  // 관리자 확인

    if (!isAuthor && !isApprover && !isReferrer && !isAdmin) {  // 권한이 없으면 403 응답
      return res.status(403).json({
        success: false,
        message: '문서 조회 권한이 없습니다.',  // 권한 부족 메시지
      });
    }

    res.json({
      success: true,
      data: { document },  // 문서 정보 반환
    });
  } catch (error) {
    console.error('Get approval document error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '문서 조회 중 오류가 발생했습니다.',  // 오류 발생 시 메시지 반환
    });
  }
});

// ===============================================
// 5. 문서 번호 생성 (GET /api/approvals/generate-number)
// ===============================================
router.get('/utils/generate-number', async (req, res) => {  // 문서 번호 자동 생성
  try {
    const today = new Date();  // 오늘 날짜
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');  // 날짜 형식 (YYYYMMDD)

    // 오늘 생성된 문서 수
    const count = await ApprovalDocument.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),  // 오늘 00:00:00 이후
        $lt: new Date(today.setHours(23, 59, 59, 999)),  // 오늘 23:59:59 이전
      },
    });

    const documentNumber = `DOC-${dateStr}-${String(count + 1).padStart(
      3,
      '0'
    )}`;  // 문서 번호 형식 (DOC-YYYYMMDD-001)

    res.json({
      success: true,
      data: { documentNumber },  // 생성된 문서 번호 반환
    });
  } catch (error) {
    console.error('Generate document number error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '문서 번호 생성 중 오류가 발생했습니다.',  // 오류 발생 시 메시지 반환
    });
  }
});

// ===============================================
// 6. 결재자 목록 조회 (GET /api/approvals/utils/approvers)
// ===============================================
router.get('/utils/approvers', async (req, res) => {  // 결재자 목록을 조회하는 라우트
  try {
    // 매니저 이상 권한을 가진 사용자만 결재자로 선택 가능
    const approvers = await User.find({
      role: { $in: ['manager', 'admin'] },  // 매니저나 관리자 권한을 가진 사용자
      isActive: true,  // 활성화된 사용자만
    })
      .select('name email role department profileImage')  // 필요한 정보만 조회
      .populate('department', 'departmentName')  // 부서명 조회
      .sort({ role: -1, name: 1 });  // 역할 우선 정렬 후 이름 순으로 정렬

    res.json({
      success: true,
      data: { approvers },  // 결재자 목록 반환
    });
  } catch (error) {
    console.error('Get approvers error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '결재자 목록 조회 중 오류가 발생했습니다.',  // 오류 발생 시 메시지 반환
    });
  }
});

// ===============================================
// 7. 결재 문서 생성 (POST /api/approvals)
// ===============================================
router.post('/', async (req, res) => {  // 새로운 결재 문서 생성
  try {
    const {
      title,
      documentType,
      content,
      approvalLine,
      referrers,
      documentNumber,
    } = req.body;

    // 결재 라인 필수 확인
    if (!approvalLine || approvalLine.length === 0) {
      return res.status(400).json({
        success: false,
        message: '결재 라인을 설정해주세요.',  // 결재 라인 미설정 시
      });
    }

    // 결재 순서 자동 할당
    const formattedApprovalLine = approvalLine.map((approver, index) => ({
      approver: approver.approverId || approver,
      order: index + 1,  // 결재 순서
      status: 'pending',  // 결재 상태 대기 중
    }));

    const document = await ApprovalDocument.create({
      documentNumber,
      title,
      documentType,
      content,
      drafter: req.user._id,  // 작성자 ID
      approvalLine: formattedApprovalLine,
      referrers: referrers || [],  // 참조자
      department: req.user.department,  // 부서
      overallStatus: 'draft',  // 초기 상태는 초안
    });

    res.status(201).json({
      success: true,
      message: '결재 문서가 생성되었습니다.',  // 문서 생성 완료 메시지
      data: { document },  // 생성된 문서 반환
    });
  } catch (error) {
    console.error('Create approval document error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '문서 생성 중 오류가 발생했습니다.',  // 오류 발생 시 메시지 반환
    });
  }
});

// ===============================================
// 8. 결재 문서 상신 (POST /api/approvals/:documentId/submit)
// ===============================================
router.post('/:documentId/submit', async (req, res) => {  // 결재 문서 상신
  try {
    const document = await ApprovalDocument.findById(req.params.documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '문서를 찾을 수 없습니다.',  // 문서 미존재 시
      });
    }

    // 작성자 본인만 상신 가능
    if (document.drafter.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '문서 작성자만 상신할 수 있습니다.',  // 작성자 외 상신 금지
      });
    }

    await document.submit();  // 상신 처리

    res.json({
      success: true,
      message: '결재 문서가 상신되었습니다.',  // 상신 완료 메시지
      data: { document },
    });
  } catch (error) {
    console.error('Submit document error:', error);  // 오류 로그 출력
    res.status(400).json({
      success: false,
      message: error.message || '문서 상신 중 오류가 발생했습니다.',  // 오류 발생 시 메시지
    });
  }
});

// ===============================================
// 9. 결재 승인 (POST /api/approvals/:documentId/approve)
// ===============================================
router.post('/:documentId/approve', async (req, res) => {  // 결재 승인
  try {
    const { comment } = req.body;  // 결재 코멘트
    const document = await ApprovalDocument.findById(req.params.documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '문서를 찾을 수 없습니다.',  // 문서 미존재 시
      });
    }

    await document.approve(req.user._id, comment || '');  // 결재 승인 처리

    res.json({
      success: true,
      message: '결재가 승인되었습니다.',  // 승인 완료 메시지
      data: { document },
    });
  } catch (error) {
    console.error('Approve document error:', error);  // 오류 로그 출력
    res.status(400).json({
      success: false,
      message: error.message || '결재 승인 중 오류가 발생했습니다.',  // 오류 발생 시 메시지
    });
  }
});

// ===============================================
// 10. 결재 반려 (POST /api/approvals/:documentId/reject)
// ===============================================
router.post('/:documentId/reject', async (req, res) => {  // 결재 반려
  try {
    const { comment } = req.body;  // 반려 사유

    if (!comment) {
      return res.status(400).json({
        success: false,
        message: '반려 사유를 입력해주세요.',  // 반려 사유 미입력 시
      });
    }

    const document = await ApprovalDocument.findById(req.params.documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '문서를 찾을 수 없습니다.',  // 문서 미존재 시
      });
    }

    await document.reject(req.user._id, comment);  // 결재 반려 처리

    res.json({
      success: true,
      message: '결재가 반려되었습니다.',  // 반려 완료 메시지
      data: { document },
    });
  } catch (error) {
    console.error('Reject document error:', error);  // 오류 로그 출력
    res.status(400).json({
      success: false,
      message: error.message || '결재 반려 중 오류가 발생했습니다.',  // 오류 발생 시 메시지
    });
  }
});

module.exports = router;  // 라우터 내보내기
