const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // ✅ 추가!
const User = require('../models/User');
const Department = require('../models/Department');
const Todo = require('../models/Todo');
const Calendar = mongoose.model('calendardbs'); // 캘린더 연동 추가

const ApprovalDocument = require('../models/ApprovalDocument');
const TeamProject = require('../models/TeamProject');
const {
  protect, 
  adminOnly, 
  managerOrAdmin, 
} = require('../middleware/authMiddleware');

// ✅ 모든 요청에 인증 미들웨어 적용
router.use(protect);

// ===============================================
// 🆕 통합 대시보드 라우트 (역할에 따라 자동 분기)
// ===============================================
router.get('/', async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole === 'admin') {
      return getAdminDashboard(req, res);
    } else if (userRole === 'manager') {
      return getManagerDashboard(req, res);
    } else if (userRole === 'user') {
      return getEmployeeDashboard(req, res);
    } else {
      return res.status(403).json({
        success: false,
        message: "권한이 없는 사용자입니다.",
      });
    }
  } catch (error) {
    console.error('❌ 통합 대시보드 오류:', error);
    res.status(500).json({
      success: false,
      message: '대시보드 데이터를 불러오는 중 오류가 발생했습니다.',
    });
  }
});

// ===============================================
// ✅ 개별 역할별 라우트
// ===============================================
router.get('/employee', async (req, res) => {
  return getEmployeeDashboard(req, res);
});

router.get('/manager', async (req, res) => {
  return getManagerDashboard(req, res);
});

router.get('/admin', async (req, res) => {
  return getAdminDashboard(req, res);
});

// ===============================================
// 📅 캘린더 + 할일 통합 조회 API (날짜별)
// ===============================================
router.get('/calendar-todos/:date', async (req, res) => {
  try {
    const { date } = req.params; // 예: "2025-11-03"
    const userId = req.user._id;

    // 날짜 범위 계산 (해당 날짜의 00:00:00 ~ 23:59:59)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. 해당 날짜의 캘린더 일정 조회
    const calendarEvents = await Calendar.find({
      $or: [
        { userId: userId }, // 개인 일정
        { userId: { $exists: false } } // 팀 공유 일정
      ],
      start: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ start: 1 });

    // 2. 해당 날짜의 할일 조회
    const todos = await Todo.find({
      user: userId,
      $or: [
        { dueDate: { $gte: startOfDay, $lte: endOfDay } },
        { dueDate: null, createdAt: { $gte: startOfDay, $lte: endOfDay } }
      ]
    }).sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      data: {
        date,
        calendarEvents: calendarEvents.map(e => ({
          id: e._id,
          title: e.title,
          start: e.start,
          end: e.end,
          type: e.extendedProps?.calendar || '개인'
        })),
        todos: todos.map(t => ({
          id: t._id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          isCompleted: t.isCompleted,
          dueDate: t.dueDate
        })),
        summary: {
          totalEvents: calendarEvents.length,
          totalTodos: todos.length,
          completedTodos: todos.filter(t => t.isCompleted).length
        }
      }
    });
  } catch (error) {
    console.error('❌ 캘린더-할일 통합 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '데이터 조회 중 오류가 발생했습니다.'
    });
  }
});

// ===============================================
// 📅 캘린더 + 할일 통합 조회 API (월별)
// ===============================================
router.get('/calendar-todos-month/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const userId = req.user._id;

    // 월의 첫날과 마지막날 계산
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // 캘린더 일정 조회
    const calendarEvents = await Calendar.find({
      $or: [
        { userId: userId },
        { userId: { $exists: false } }
      ],
      start: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // 할일 조회
    const todos = await Todo.find({
      user: userId,
      dueDate: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // 날짜별로 그룹화
    const dateMap = {};
    
    calendarEvents.forEach(event => {
      const dateKey = event.start.toISOString().split('T')[0];
      if (!dateMap[dateKey]) dateMap[dateKey] = { events: [], todos: [] };
      dateMap[dateKey].events.push({
        id: event._id,
        title: event.title,
        type: 'calendar'
      });
    });

    todos.forEach(todo => {
      if (todo.dueDate) {
        const dateKey = todo.dueDate.toISOString().split('T')[0];
        if (!dateMap[dateKey]) dateMap[dateKey] = { events: [], todos: [] };
        dateMap[dateKey].todos.push({
          id: todo._id,
          title: todo.title,
          status: todo.status,
          type: 'todo'
        });
      }
    });

    res.json({
      success: true,
      data: {
        year,
        month,
        dateMap // { "2025-11-03": { events: [...], todos: [...] }, ... }
      }
    });
  } catch (error) {
    console.error('❌ 월별 통합 데이터 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '데이터 조회 중 오류가 발생했습니다.'
    });
  }
});


// ===============================================
// 내부 함수: 일반 직원 대시보드
// ===============================================
async function getEmployeeDashboard(req, res) {
    try {
        const userId = req.user._id;

        // 내 할 일 통계
        const myTodos = await Todo.countDocuments({ user: userId });
        const completedTodos = await Todo.countDocuments({
            user: userId,
            status: 'done',
        });
        const pendingTodos = await Todo.countDocuments({
            user: userId,
            status: { $in: ['todo', 'in_progress'] },
        });

        // 내가 작성한 결재 문서 통계
        const myDrafts = await ApprovalDocument.countDocuments({ drafter: userId });
        const approvedDocs = await ApprovalDocument.countDocuments({
            drafter: userId,
            overallStatus: 'approved',
        });
        const pendingDocs = await ApprovalDocument.countDocuments({
            drafter: userId,
            overallStatus: 'pending',
        });

        // 최근 할 일 목록
        const recentTodos = await Todo.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            success: true,
            data: {
                todos: {
                    total: myTodos,
                    completed: completedTodos,
                    pending: pendingTodos,
                    completionRate:
                        myTodos > 0 ? ((completedTodos / myTodos) * 100).toFixed(1) : 0,
                },
                approvals: {
                    total: myDrafts,
                    approved: approvedDocs,
                    pending: pendingDocs,
                },
                recentTodos,
            },
        });
    } catch (error) {
        console.error('Get employee dashboard error:', error);
        res.status(500).json({
            success: false,
            message: '대시보드 통계 조회 중 오류가 발생했습니다.',
        });
    }
}

// ===============================================
// 내부 함수: 팀 리더 대시보드
// ===============================================
async function getManagerDashboard(req, res) {
  try {
    const userId = req.user._id;
    const departmentId = req.user.department;

    console.log('=== 매니저 대시보드 디버깅 ===');
    console.log('사용자 ID:', userId);
    console.log('부서 ID:', departmentId);

    // ✅ 부서가 없는 경우 기본값으로 처리
    let myDepartment = null;
    let membersArray = [];
    let teamMemberCount = 0;
    let departmentProjects = 0;
    let activeProjects = 0;
    let departmentTodos = 0;
    let departmentCompletedTodos = 0;

    if (departmentId) {
      // 부서가 있는 경우에만 부서 정보 조회
      myDepartment = await Department.findById(departmentId).populate(
        'members',
        'name email'
      );

      if (myDepartment) {
        // 부서원 목록 추출
        membersArray = myDepartment.members && Array.isArray(myDepartment.members)
                        ? myDepartment.members 
                        : [];
        teamMemberCount = membersArray.length;

        // 부서 프로젝트 통계
        departmentProjects = await TeamProject.countDocuments({
          department: departmentId,
        });
        activeProjects = await TeamProject.countDocuments({
          department: departmentId,
          status: 'in_progress', 
        });

        // 부서 전체 할 일 통계
        const departmentMembers = membersArray.map((m) => m._id);
        
        departmentTodos = await Todo.countDocuments({
          user: { $in: departmentMembers }, 
        });
        departmentCompletedTodos = await Todo.countDocuments({
          user: { $in: departmentMembers },
          status: 'done', 
        });
      }
    }

    // 내가 결재해야 할 문서 수
    const myPendingApprovals = await ApprovalDocument.countDocuments({
      'approvalLine.approver': userId,
      'approvalLine.status': 'pending', 
      overallStatus: 'pending',
    });

    // 개인 할 일 통계
    const myTodos = await Todo.countDocuments({ user: userId });
    const completedTodos = await Todo.countDocuments({
      user: userId,
      status: 'done',
    });
    const pendingTodos = await Todo.countDocuments({
      user: userId,
      status: { $in: ['todo', 'in_progress'] }, 
    });

    const recentTodos = await Todo.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5); 

    console.log('✅ 매니저 대시보드 데이터 조회 성공');

    // 최종 응답 데이터 구성
    res.json({
      success: true,
      data: {
        todos: {
          total: myTodos,
          completed: completedTodos,
          pending: pendingTodos,
          completionRate:
            myTodos > 0 ? ((completedTodos / myTodos) * 100).toFixed(1) : 0,
        },
        approvals: {
          total: myPendingApprovals,
          pending: myPendingApprovals,
        },
        recentTodos,
        // 매니저 전용 데이터
        team: {
          name: myDepartment ? myDepartment.departmentName : '부서 미배정',
          memberCount: teamMemberCount,
          departmentId: departmentId,  // ✅ 이 줄 추가!
        },
        projects: {
          total: departmentProjects,
          active: activeProjects,
        },
        teamTodos: {
          total: departmentTodos,
          completed: departmentCompletedTodos,
          completionRate:
            departmentTodos > 0
              ? ((departmentCompletedTodos / departmentTodos) * 100).toFixed(1)
              : 0,
        },
      },
    });
  } catch (error) {
    console.error('❌ Get manager dashboard error:', error);
    res.status(500).json({
      success: false,
      message: '대시보드 통계 조회 중 서버 오류가 발생했습니다. 로그를 확인하세요.',
    });
  }
}

// ===============================================
// 내부 함수: 관리자 대시보드
// ===============================================
async function getAdminDashboard(req, res) {
    try {
        const userId = req.user._id;

        // 전체 사용자 통계
        const totalUsers = await User.countDocuments({ isActive: true });
        const adminCount = await User.countDocuments({
            isActive: true,
            role: 'admin',
        });
        const managerCount = await User.countDocuments({
            isActive: true,
            role: 'manager',
        });
        const userCount = await User.countDocuments({
            isActive: true,
            role: 'user',
        });

        // 전체 부서 통계
        const totalDepartments = await Department.countDocuments({ isActive: true });

        // 전체 결재 문서 통계
        const totalApprovals = await ApprovalDocument.countDocuments();
        const pendingApprovals = await ApprovalDocument.countDocuments({
            overallStatus: 'pending',
        });
        const approvedApprovals = await ApprovalDocument.countDocuments({
            overallStatus: 'approved',
        });
        const rejectedApprovals = await ApprovalDocument.countDocuments({
            overallStatus: 'rejected',
        });

        // 전체 프로젝트 통계
        const totalProjects = await TeamProject.countDocuments();
        const activeProjects = await TeamProject.countDocuments({
            status: 'in_progress',
        });
        const completedProjects = await TeamProject.countDocuments({
            status: 'completed',
        });

        // 전체 할 일 통계
        const totalTodos = await Todo.countDocuments();
        const completedTodos = await Todo.countDocuments({ status: 'done' });
        const pendingTodos = totalTodos - completedTodos;

        // 최근 가입 사용자
        const recentUsers = await User.find({ isActive: true })
            .select('name email role createdAt')
            .populate('department', 'departmentName')
            .sort({ createdAt: -1 })
            .limit(5);

        // 관리자도 기본 구조 포함 (프론트 호환성)
        const myTodos = await Todo.countDocuments({ user: userId });
        const myCompletedTodos = await Todo.countDocuments({
            user: userId,
            status: 'done',
        });
        const recentTodos = await Todo.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            success: true,
            data: {
                todos: {
                    total: myTodos,
                    completed: myCompletedTodos,
                    pending: myTodos - myCompletedTodos,
                    completionRate:
                        myTodos > 0 ? ((myCompletedTodos / myTodos) * 100).toFixed(1) : 0,
                },
                approvals: {
                    total: totalApprovals,
                    approved: approvedApprovals,
                    pending: pendingApprovals,
                },
                recentTodos,
                // 추가 관리자 전용 데이터
                users: {
                    total: totalUsers,
                    admin: adminCount,
                    manager: managerCount,
                    user: userCount,
                },
                departments: {
                    total: totalDepartments,
                },
                projects: {
                    total: totalProjects,
                    active: activeProjects,
                    completed: completedProjects,
                },
                systemTodos: {
                    total: totalTodos,
                    completed: completedTodos,
                    pending: pendingTodos,
                    completionRate:
                        totalTodos > 0 ? ((completedTodos / totalTodos) * 100).toFixed(1) : 0,
                },
                recentUsers,
            },
        });
    } catch (error) {
        console.error('Get admin dashboard error:', error);
        res.status(500).json({
            success: false,
            message: '대시보드 통계 조회 중 오류가 발생했습니다.',
        });
    }
}

// ===============================================
// ✅ 라우터 내보내기
// ===============================================
module.exports = router;