const express = require('express');  // Express 모듈을 임포트
const router = express.Router();  // Express의 라우터 객체 생성
const User = require('../models/User');  // User 모델을 임포트
const Department = require('../models/Department');//추가 25-11-03
const Log = require('../models/Log');//추가 25-11-03
const {
  protect,  // 인증을 위한 미들웨어
  adminOnly,  // 관리자만 접근 가능한 미들웨어
  managerOrAdmin,  // 관리자 또는 매니저만 접근 가능한 미들웨어
  isOwnerOrAdmin,  // 소유자 또는 관리자만 접근 가능한 미들웨어
} = require('../middleware/authMiddleware');  // 미들웨어들을 임포트

// ===============================================
// 1. 부서별 사용자 조회 (GET /api/users/department/:departmentId)
// ===============================================
router.get(
  '/department/:departmentId',  // 특정 부서에 속한 사용자 조회 라우트
  protect,  // 인증 미들웨어 (로그인된 사용자만 접근 가능)
  managerOrAdmin,  // 관리자나 매니저만 접근 가능
  async (req, res) => {  // 비동기 함수로 사용자 조회
    try {
      // 부서 ID와 활성화된 사용자(isActive: true)를 기준으로 사용자 검색
      const users = await User.find({
        department: req.params.departmentId,  // URL 파라미터로 전달된 부서 ID
        isActive: true,  // 활성 사용자만 조회
      })
        .populate('department', 'departmentName')  // 부서 정보도 함께 조회 (부서 이름만 포함)
        .select('-password');  // 비밀번호 제외

      res.json({
        success: true,
        data: { users, count: users.length },  // 성공적인 응답 반환, 사용자 목록과 개수 포함
      });
    } catch (error) {
      console.error('Get department users error:', error);  // 오류 로그 출력
      res.status(500).json({
        success: false,
        message: '부서 사용자 조회 중 오류가 발생했습니다.',  // 서버 오류 발생 시 응답 메시지
      });
    }
  }
);

// ===============================================
// 2. 모든 사용자 목록 조회 (GET /api/users)
// ===============================================
router.get('/', protect, async (req, res) => {  // ✅ adminOnly 제거! 인증된 사용자 모두 접근 가능
  try {
    // 활성화된 모든 사용자 조회 (정렬: 생성일 기준 내림차순)
    const users = await User.find()
      .populate('department', 'departmentName')  // 부서 정보 포함
      .select('-password')  // 비밀번호 제외
      .sort({ createdAt: -1 });  // 최신 순으로 정렬

    res.json({
      success: true,
      data: { users, count: users.length },  // 사용자 목록과 개수 반환
    });
  } catch (error) {
    console.error('Get users error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '사용자 목록 조회 중 오류가 발생했습니다.',  // 서버 오류 발생 시 응답 메시지
    });
  }
});

// ===============================================
// 3. 특정 사용자 조회 (GET /api/users/:userId)
// ===============================================
router.get('/:userId', protect, isOwnerOrAdmin, async (req, res) => {  // 사용자 본인 또는 관리자만 접근 가능
  try {
    // 사용자 ID로 해당 사용자 조회
    const user = await User.findById(req.params.userId)
      .populate('department', 'departmentName')  // 부서 정보 포함
      .select('-password');  // 비밀번호 제외

    if (!user) {  // 사용자가 없으면 404 반환
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',  // 사용자 미존재시 응답 메시지
      });
    }

    res.json({
      success: true,
      data: { user },  // 사용자 정보 반환
    });
  } catch (error) {
    console.error('Get user error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '사용자 조회 중 오류가 발생했습니다.',  // 서버 오류 발생 시 응답 메시지
    });
  }
});

// ===============================================
// 4. 사용자 정보 수정 (PUT /api/users/:userId)
// ===============================================
router.put('/:userId', protect, isOwnerOrAdmin, async (req, res) => {
  try {
    const { name, department } = req.body;
    const targetUser = await User.findById(req.params.userId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }
    const oldDepartment = targetUser.department;
    const updateData = {};
    if (name) updateData.name = name;
    if (department !== undefined) updateData.department = department;

    // 사용자 정보 수정
    const user = await User.findByIdAndUpdate(req.params.userId, updateData, {
      new: true,
      runValidators: true,
    }).populate('department', 'departmentName').select('-password');
    // ✅ 부서 변경 로그 기록
    if (department !== undefined && department !== oldDepartment?.toString()) {
      try {
        const newDept = department ? await Department.findById(department) : null;
        const oldDept = oldDepartment ? await Department.findById(oldDepartment) : null;
        
        await Log.create({
          action: 'DEPARTMENT_CHANGE',
          user: req.user._id,
          targetUser: user._id,
          targetDepartment: department || null,
          message: `${req.user.name}님이 ${user.name}님의 부서를 "${oldDept?.departmentName || '미배정'}"에서 "${newDept?.departmentName || '미배정'}"로 변경했습니다.`,
          details: {
            oldDepartment: oldDept?.departmentName || '미배정',
            newDepartment: newDept?.departmentName || '미배정',
          },
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        });
      } catch (logError) {
        console.error('❌ 부서 변경 로그 기록 실패:', logError);
      }
    }
    res.json({
      success: true,
      message: '사용자 정보가 수정되었습니다.',
      data: { user },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: '사용자 정보 수정 중 오류가 발생했습니다.',
    });
  }
});


// ===============================================
// 5. 사용자 권한 변경 (PATCH /api/users/:userId/role)
// ===============================================
router.patch('/:userId/role', protect, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 권한입니다.',
      });
    }
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }
    const oldRole = targetUser.role;
    // 권한 변경
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true }
    ).select('-password');
    // ✅ 권한 변경 로그 기록
    try {
      const roleLabels = { user: '사용자', manager: '매니저', admin: '관리자' };
      
      await Log.create({
        action: 'ROLE_CHANGE',
        user: req.user._id,
        targetUser: user._id,
        message: `${req.user.name}님이 ${user.name}님의 권한을 "${roleLabels[oldRole]}"에서 "${roleLabels[role]}"로 변경했습니다.`,
        details: {
          oldRole,
          newRole: role,
        },
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });
    } catch (logError) {
      console.error('❌ 권한 변경 로그 기록 실패:', logError);
    }
    res.json({
      success: true,
      message: '사용자 권한이 변경되었습니다.',
      data: { user },
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      message: '권한 변경 중 오류가 발생했습니다.',
    });
  }
});

// ===============================================
// 6. 사용자 비활성화 (DELETE /api/users/:userId)
// ===============================================
router.delete('/:userId', protect, adminOnly, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }
    // 비활성화 처리
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive: false },
      { new: true }
    ).select('-password');

    // ✅ 비활성화 로그 기록
    try {
      await Log.create({
        action: 'USER_DEACTIVATE',
        user: req.user._id,
        targetUser: user._id,
        message: `${req.user.name}님이 ${user.name}님을 비활성화했습니다.`,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });
    } catch (logError) {
      console.error('❌ 비활성화 로그 기록 실패:', logError);
    }
    res.json({
      success: true,
      message: '사용자가 비활성화되었습니다.',
      data: { user },
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: '사용자 비활성화 중 오류가 발생했습니다.',
    });
  }
});

// ===============================================
// 7. 사용자 활성화 (PATCH /api/users/:userId/activate)
// ===============================================
router.patch('/:userId/activate', protect, adminOnly, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }
    // 활성화 처리
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive: true },
      { new: true }
    ).select('-password');
    // ✅ 활성화 로그 기록
    try {
      await Log.create({
        action: 'USER_ACTIVATE',
        user: req.user._id,
        targetUser: user._id,
        message: `${req.user.name}님이 ${user.name}님을 활성화했습니다.`,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });
    } catch (logError) {
      console.error('❌ 활성화 로그 기록 실패:', logError);
    }
    res.json({
      success: true,
      message: '사용자가 활성화되었습니다.',
      data: { user },
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: '사용자 활성화 중 오류가 발생했습니다.',
    });
  }
});


module.exports = router;  // 라우터 내보내기
