const mongoose = require('mongoose');  // Mongoose 모듈을 임포트

// --- 1. 스키마 정의 ---
// 결재 문서에 대한 데이터를 구조화한 스키마 정의
const approvalDocumentSchema = new mongoose.Schema({
    // 문서 고유 번호 (자동 생성됨)
    documentNumber: {
        type: String,
        unique: true, // 고유해야 함
        required: true  // 필수 필드
    },
    
    // 문서 제목
    title: {
        type: String,
        required: true,  // 필수 필드
        trim: true  // 저장 전에 양 끝의 공백 제거
    },
    
    // 문서 유형
    documentType: {
        type: String,
        enum: ['휴가신청', '지출결의', '업무보고', '구매요청', '기타'],  // 허용되는 문서 유형 목록
        required: true  // 필수 필드
    },
    
    // 문서 내용 본문
    content: {
        type: String,
        required: true  // 필수 필드
    },
    
    // 첨부 파일 목록 (하위 문서 배열)
    attachments: [{
        fileName: String,  // 파일 이름
        filePath: String,  // 파일 경로
        fileSize: Number,  // 파일 크기
        uploadedAt: {
            type: Date,
            default: Date.now  // 기본값은 현재 시각
        }
    }],
    
    // 작성자 (User 모델 참조, 필수)
    drafter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // 참조할 모델 이름 (User 모델)
        required: true  // 필수 필드 (문서 작성자)
    },
    
    // 결재 라인 (하위 문서 배열)
    approvalLine: [{
        // 결재자 (User 모델 참조, 필수)
        approver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',  // 참조할 모델 이름 (User 모델)
            required: true  // 필수 필드
        },
        
        // 결재 순서 (순차 결재에 사용)
        order: {
            type: Number,
            required: true  // 필수 필드
        },
        
        // 개별 결재자의 처리 상태
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'skipped'],  // 허용되는 결재 상태 목록
            default: 'pending'  // 기본값은 'pending'
        },
        approvedAt: Date,  // 결재 처리 시각 (승인/반려 공통)
        comment: String  // 결재 시 남긴 의견
    }],
    
    // 참조자 목록 (User 모델 참조 배열)
    referrers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'  // 참조할 모델 이름 (User 모델)
    }],
    
    // 전체 문서의 최종 상태
    overallStatus: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected', 'cancelled'],  // 문서 상태 목록
        default: 'draft'  // 기본값은 'draft' (초안 상태)
    },
    
    // 현재 결재를 진행해야 하는 결재자의 순서 번호
    currentApproverOrder: {
        type: Number,
        default: 1  // 결재 순서, 기본값은 1
    },
    
    submittedAt: Date,  // 상신 시각
    completedAt: Date,  // 최종 승인 완료 시각
    rejectedAt: Date,   // 최종 반려 시각
    cancelledAt: Date,  // 취소 시각
    
    // 작성자의 소속 부서 정보 (참조)
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'  // 참조할 모델 이름 (Department 모델)
    }
}, {
    // 스키마 옵션
    timestamps: true  // createdAt, updatedAt 필드를 자동으로 생성하고 관리
});

// --- 2. 미들웨어 (저장 전 실행) ---
// 'save' 이벤트 이전에 실행될 pre-hook 정의
approvalDocumentSchema.pre('save', async function(next) {
    // documentNumber가 없을 경우에만 자동 생성 로직 실행
    if (!this.documentNumber) {
        const today = new Date();
        // 날짜 문자열 생성 (YYYYMMDD)
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        
        // 당일 생성된 문서 개수 카운트
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(today.setHours(0, 0, 0, 0)),  // 오늘 자정부터
                $lt: new Date(today.setHours(23, 59, 59, 999))  // 오늘 23:59:59까지
            }
        });
        
        // 문서번호 형식: DOC-YYYYMMDD-00X
        this.documentNumber = `DOC-${dateStr}-${String(count + 1).padStart(3, '0')}`;
    }
    next();  // 다음 미들웨어로 진행
});

// --- 3. 인스턴스 메서드 ---
// 결재 승인 처리 메서드
approvalDocumentSchema.methods.approve = async function(approverId, comment = '') {
    // 현재 순서의 결재 라인에서 해당 결재자 찾기
    const approver = this.approvalLine.find(
        line => line.approver.toString() === approverId.toString() && 
        line.order === this.currentApproverOrder
    );

    // 권한 및 상태 검사 (에러 발생 시 throw)
    if (!approver) { throw new Error('결재 권한이 없습니다.'); }
    if (approver.status !== 'pending') { throw new Error('이미 처리된 결재입니다.'); }

    // 결재 정보 업데이트
    approver.status = 'approved';
    approver.approvedAt = new Date();
    approver.comment = comment;

    // 다음 순서의 결재자 찾기
    const nextApprover = this.approvalLine.find(
        line => line.order === this.currentApproverOrder + 1
    );

    if (nextApprover) {
        // 다음 결재자가 존재하면 순서 증가 및 상태 유지
        this.currentApproverOrder += 1;
        this.overallStatus = 'pending';
    } else {
        // 모든 결재 완료 시
        this.overallStatus = 'approved';
        this.completedAt = new Date();
    }

    return this.save();  // 변경 사항 저장
};

// 결재 반려 처리 메서드
approvalDocumentSchema.methods.reject = async function(approverId, comment) {
    // 현재 순서의 결재 라인에서 해당 결재자 찾기
    const approver = this.approvalLine.find(
        line => line.approver.toString() === approverId.toString() && 
        line.order === this.currentApproverOrder
    );

    // 권한 및 상태 검사 (에러 발생 시 throw)
    if (!approver) { throw new Error('결재 권한이 없습니다.'); }
    if (approver.status !== 'pending') { throw new Error('이미 처리된 결재입니다.'); }

    // 결재 정보 업데이트
    approver.status = 'rejected';
    approver.approvedAt = new Date();
    approver.comment = comment;

    // 전체 문서 상태를 'rejected'로 변경
    this.overallStatus = 'rejected';
    this.rejectedAt = new Date();

    return this.save();  // 변경 사항 저장
};

// 결재 상신 (Draft -> Pending) 메서드
approvalDocumentSchema.methods.submit = function() {
    // 초안 상태일 때만 상신 가능
    if (this.overallStatus !== 'draft') {
        throw new Error('상신 가능한 상태가 아닙니다.');
    }

    this.overallStatus = 'pending';  // 상태를 'pending'으로 변경
    this.submittedAt = new Date();   // 상신 시각 기록
    this.currentApproverOrder = 1;   // 결재 순서를 1부터 시작

    return this.save();  // 변경 사항 저장
};

// --- 4. 인덱스 설정 ---
// 작성자별 문서 조회 및 시간 내림차순 정렬을 위한 인덱스
approvalDocumentSchema.index({ drafter: 1, createdAt: -1 });  // drafter (작성자) 및 createdAt (생성일) 필드 기반 인덱스

// 특정 사용자가 결재해야 할 문서를 찾기 위한 인덱스
approvalDocumentSchema.index({ 'approvalLine.approver': 1 });  // 결재자(approver) 필드 기반 인덱스

// 문서 상태별 조회를 위한 인덱스
approvalDocumentSchema.index({ overallStatus: 1 });  // 문서 상태 (overallStatus) 필드 기반 인덱스

// --- 5. 모델 내보내기 ---
// 'ApprovalDocument'라는 이름으로 모델 생성 및 외부로 내보내기
module.exports = mongoose.model('ApprovalDocument', approvalDocumentSchema);  // 'ApprovalDocument' 모델을 mongoose 모델로 생성하여 내보냄
