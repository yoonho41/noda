const express = require('express');  // Express 모듈을 임포트
const router = express.Router();  // Express의 라우터 객체 생성
const Department = require('../models/Department');  // Department 모델을 임포트
const User = require('../models/User');  // User 모델을 임포트
const Log = require('../models/Log'); //Log 모델 추가, 25-11-03 
const {
  protect,  // 인증을 위한 미들웨어
  adminOnly,  // 관리자만 접근 가능한 미들웨어
  managerOrAdmin,  // 관리자나 매니저만 접근 가능한 미들웨어
} = require('../middleware/authMiddleware');  // 인증 관련 미들웨어 임포트

// ✅ 모든 요청에 인증 미들웨어 적용
router.use(protect);  // 모든 라우트에서 인증 미들웨어를 사용하여 인증된 사용자만 접근 가능하게 설정

// ===============================================
// 1. 전체 부서 목록 조회 (GET /api/departments)
// ===============================================
router.get('/', async (req, res) => {  // 모든 부서 목록을 조회하는 라우트
  try {
    const departments = await Department.find({ isActive: true })  // 활성화된 부서들만 조회
      .populate('manager', 'name email role')  // 부서 관리자 정보 조회 (이름, 이메일, 역할)
      .populate('parentDepartment', 'departmentName')  // 부모 부서 정보 조회
      .populate('members', 'name email')  // 부서원 정보 조회
      .sort({ createdAt: -1 });  // 생성일 기준 내림차순 정렬

    res.json({
      success: true,
      data: { departments, count: departments.length },  // 조회된 부서 목록과 개수 반환
    });
  } catch (error) {
    console.error('Get departments error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '부서 목록 조회 중 오류가 발생했습니다.',  // 오류 메시지 반환
    });
  }
});

// ===============================================
// 2. 조직도 계층 구조 조회 (GET /api/departments/tree)
// ===============================================
router.get('/tree', async (req, res) => {  // 조직도의 계층 구조를 조회하는 라우트
  try {
    // 최상위 부서들을 조회 (parentDepartment가 null인 부서들)
    const rootDepartments = await Department.find({
      parentDepartment: null,
      isActive: true,
    })
      .populate('manager', 'name email role')  // 부서 관리자 정보 조회
      .populate('members', 'name email role');  // 부서원 정보 조회

    // 재귀적으로 하위 부서를 조회하는 함수
    async function getChildDepartments(parentId) {
      const children = await Department.find({
        parentDepartment: parentId,
        isActive: true,
      })
        .populate('manager', 'name email role')  // 부서 관리자 정보 조회
        .populate('members', 'name email role');  // 부서원 정보 조회

      for (let child of children) {
        child._doc.children = await getChildDepartments(child._id);  // 하위 부서 조회
      }

      return children;
    }

    // 각 최상위 부서의 하위 부서 조회
    for (let dept of rootDepartments) {
      dept._doc.children = await getChildDepartments(dept._id);
    }

    res.json({
      success: true,
      data: { tree: rootDepartments },  // 조직도 구조 반환
    });
  } catch (error) {
    console.error('Get department tree error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '조직도 조회 중 오류가 발생했습니다.',  // 오류 메시지 반환
    });
  }
});

// ===============================================
// 3. 특정 부서 상세 조회 (GET /api/departments/:departmentId)
// ===============================================
router.get('/:departmentId', async (req, res) => {  // 특정 부서를 조회하는 라우트
  try {
    const department = await Department.findById(req.params.departmentId)  // 부서 ID로 부서 조회
      .populate('manager', 'name email role profileImage')  // 부서 관리자 정보 조회
      .populate('parentDepartment', 'departmentName')  // 부모 부서 정보 조회
      .populate('members', 'name email role profileImage');  // 부서원 정보 조회

    if (!department) {  // 부서를 찾을 수 없으면 404 응답
      return res.status(404).json({
        success: false,
        message: '부서를 찾을 수 없습니다.',  // 부서 미존재시 메시지
      });
    }

    res.json({
      success: true,
      data: { department },  // 조회된 부서 정보 반환
    });
  } catch (error) {
    console.error('Get department error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '부서 조회 중 오류가 발생했습니다.',  // 오류 메시지 반환
    });
  }
});

// ===============================================
// 4. 부서 생성 (POST /api/departments) - 관리자 전용
// ===============================================
router.post('/', adminOnly, async (req, res) => {  // 관리자만 부서 생성 가능
  try {
    const { departmentName, description, parentDepartment, manager } = req.body;  // 요청 본문에서 부서 정보 받기

    // 부서명 중복 체크
    const existingDept = await Department.findOne({ departmentName });
    if (existingDept) {  // 이미 존재하는 부서명이면 400 응답
      return res.status(400).json({
        success: false,
        message: '이미 존재하는 부서명입니다.',  // 부서명 중복 메시지
      });
    }

    // 부서 생성
    const department = await Department.create({
      departmentName,
      description,
      parentDepartment: parentDepartment || null,  // 부모 부서가 없으면 null
      manager: manager || null,  // 관리자 설정 (없으면 null)
    });

    // 부서장이 지정된 경우, 해당 사용자의 department 필드 업데이트
    if (manager) {
      await User.findByIdAndUpdate(manager, {
        department: department._id,  // 해당 부서에 배정
        role: 'manager',  // 부서장은 자동으로 매니저 권한
      });
    }

// ✅ 부서 생성 로그 기록
    try {
      const managerUser = manager ? await User.findById(manager) : null;
      
      await Log.create({
        action: 'DEPT_CREATE',
        user: req.user._id,
        targetDepartment: department._id,
        message: `${req.user.name}님이 "${departmentName}" 부서를 생성했습니다.${managerUser ? ` (부서장: ${managerUser.name})` : ''}`,
        details: {
          departmentName,
          manager: managerUser?.name || null,
          description,
        },
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });
    } catch (logError) {
      console.error('❌ 부서 생성 로그 기록 실패:', logError);
    }
    res.status(201).json({
      success: true,
      message: '부서가 생성되었습니다.',
      data: { department },
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      success: false,
      message: '부서 생성 중 오류가 발생했습니다.',
    });
  }
});

// ===============================================
// 5. 부서 정보 수정 (PUT /api/departments/:departmentId) - 관리자 전용
// ===============================================
router.put('/:departmentId', adminOnly, async (req, res) => {
  try {
    const { departmentName, description, parentDepartment, manager } = req.body;
    
    // 기존 부서 정보 조회
    const oldDepartment = await Department.findById(req.params.departmentId)
      .populate('manager', 'name');
    
    if (!oldDepartment) {
      return res.status(404).json({
        success: false,
        message: '부서를 찾을 수 없습니다.',
      });
    }
    const updateData = {};
    if (departmentName) updateData.departmentName = departmentName;
    if (description !== undefined) updateData.description = description;
    if (parentDepartment !== undefined)
      updateData.parentDepartment = parentDepartment || null;
    if (manager !== undefined) updateData.manager = manager || null;
    // 부서 정보 수정
    const department = await Department.findByIdAndUpdate(
      req.params.departmentId,
      updateData,
      { new: true, runValidators: true }
    ).populate('manager', 'name');

    // ✅ 부서 수정 로그 기록
    try {
      const changes = [];
      if (departmentName && departmentName !== oldDepartment.departmentName) {
        changes.push(`부서명: "${oldDepartment.departmentName}" → "${departmentName}"`);
      }
      if (manager !== undefined && manager !== oldDepartment.manager?._id?.toString()) {
        const newManager = manager ? await User.findById(manager) : null;
        changes.push(`부서장: ${oldDepartment.manager?.name || '미지정'} → ${newManager?.name || '미지정'}`);
      }
      
      if (changes.length > 0) {
        await Log.create({
          action: 'DEPT_UPDATE',
          user: req.user._id,
          targetDepartment: department._id,
          message: `${req.user.name}님이 "${oldDepartment.departmentName}" 부서 정보를 수정했습니다. (${changes.join(', ')})`,
          details: {
            oldData: {
              departmentName: oldDepartment.departmentName,
              manager: oldDepartment.manager?.name,
            },
            newData: {
              departmentName: department.departmentName,
              manager: department.manager?.name,
            },
          },
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        });
      }
    } catch (logError) {
      console.error('❌ 부서 수정 로그 기록 실패:', logError);
    }
    res.json({
      success: true,
      message: '부서 정보가 수정되었습니다.',
      data: { department },
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: '부서 정보 수정 중 오류가 발생했습니다.',
    });
  }
});

// ===============================================
// 6. 부서 삭제 (DELETE /api/departments/:departmentId) - 관리자 전용
// ===============================================
router.delete('/:departmentId', adminOnly, async (req, res) => {
  try {
    // 기존 부서 정보 조회
    const targetDepartment = await Department.findById(req.params.departmentId);
    
    if (!targetDepartment) {
      return res.status(404).json({
        success: false,
        message: '부서를 찾을 수 없습니다.',
      });
    }
    // 하위 부서가 있는지 확인
    const childDepartments = await Department.find({
      parentDepartment: req.params.departmentId,
      isActive: true,
    });
    if (childDepartments.length > 0) {
      return res.status(400).json({
        success: false,
        message: '하위 부서가 존재하여 삭제할 수 없습니다.',
      });
    }
    // 소속 직원이 있는지 확인
    const members = await User.find({
      department: req.params.departmentId,
      isActive: true,
    });
    if (members.length > 0) {
      return res.status(400).json({
        success: false,
        message: '소속 직원이 존재하여 삭제할 수 없습니다.',
      });
    }
    // 부서 삭제 (isActive를 false로 설정)
    const department = await Department.findByIdAndUpdate(
      req.params.departmentId,
      { isActive: false },
      { new: true }
    );
    // ✅ 부서 삭제 로그 기록
    try {
      await Log.create({
        action: 'DEPT_DELETE',
        user: req.user._id,
        targetDepartment: department._id,
        message: `${req.user.name}님이 "${targetDepartment.departmentName}" 부서를 삭제했습니다.`,
        details: {
          departmentName: targetDepartment.departmentName,
          description: targetDepartment.description,
        },
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });
    } catch (logError) {
      console.error('❌ 부서 삭제 로그 기록 실패:', logError);
    }
    res.json({
      success: true,
      message: '부서가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: '부서 삭제 중 오류가 발생했습니다.',
    });
  }
});

// ===============================================
// 7. 부서원 배정 (POST /api/departments/:departmentId/members) - 관리자 전용
// ===============================================
router.post('/:departmentId/members', adminOnly, async (req, res) => {  // 관리자만 부서원 추가 가능
  try {
    const { userId } = req.body;

    const department = await Department.findById(req.params.departmentId);
    if (!department) {  // 부서를 찾을 수 없으면 404 응답
      return res.status(404).json({
        success: false,
        message: '부서를 찾을 수 없습니다.',  // 부서 미존재시 메시지
      });
    }

    const user = await User.findById(userId);
    if (!user) {  // 사용자를 찾을 수 없으면 404 응답
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',  // 사용자 미존재시 메시지
      });
    }

    // 이미 부서원인지 확인
    if (department.members.includes(userId)) {  // 이미 해당 부서에 소속되어 있으면 400 응답
      return res.status(400).json({
        success: false,
        message: '이미 해당 부서의 소속입니다.',  // 이미 부서 소속인 경우 메시지
      });
    }

    // 부서원 추가
    department.members.push(userId);  // 부서에 사용자 추가
    await department.save();

    // 사용자의 department 필드 업데이트
    user.department = department._id;
    await user.save();

    res.json({
      success: true,
      message: '부서원이 배정되었습니다.',  // 부서원 배정 완료 메시지
      data: { department },  // 업데이트된 부서 정보 반환
    });
  } catch (error) {
    console.error('Add member error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '부서원 배정 중 오류가 발생했습니다.',  // 오류 메시지 반환
    });
  }
});

// ===============================================
// 8. 부서원 제거 (DELETE /api/departments/:departmentId/members/:userId) - 관리자 전용
// ===============================================
router.delete('/:departmentId/members/:userId', adminOnly, async (req, res) => {
  try {
    const department = await Department.findById(req.params.departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: '부서를 찾을 수 없습니다.',
      });
    }
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }
    // 부서원 제거
    department.members = department.members.filter(
      (memberId) => memberId.toString() !== req.params.userId
    );
    await department.save();
    // 사용자의 department 필드 초기화
    user.department = null;
    await user.save();
    res.json({
      success: true,
      message: '부서원이 제거되었습니다.',
      data: { department },
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: '부서원 제거 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;  // 라우터 내보내기
