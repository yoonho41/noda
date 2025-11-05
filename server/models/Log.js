const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    // 로그 타입
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN',
        'LOGOUT',
        'ROLE_CHANGE',
        'DEPARTMENT_CHANGE',
        'USER_CREATE',
        'USER_UPDATE',
        'USER_ACTIVATE',
        'USER_DEACTIVATE',
        'DEPT_CREATE',
        'DEPT_UPDATE',
        'DEPT_DELETE',
        'SYSTEM',
      ],
    },
    
    // 액션을 수행한 사용자
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // 대상 사용자 (있는 경우)
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // 대상 부서 (있는 경우)
    targetDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    
    // 로그 메시지
    message: {
      type: String,
      required: true,
    },
    
    // 상세 정보
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    
    // IP 주소
    ipAddress: {
      type: String,
    },
    
    // User Agent
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// 인덱스
logSchema.index({ action: 1, createdAt: -1 });
logSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Log', logSchema);