const express = require('express');
const router = express.Router();
const TeamProject = require('../models/TeamProject');
const { protect, managerOrAdmin } = require('../middleware/authMiddleware');

// ===============================================
// ✅ 부서별 프로젝트 조회 (매니저용)
// ===============================================
router.get('/department/:departmentId', protect, async (req, res) => {
  try {
    const { departmentId } = req.params;

    console.log('📡 부서 프로젝트 조회 요청:', departmentId);

    const projects = await TeamProject.find({ department: departmentId })
      .populate('manager', 'name email')
      .populate('department', 'departmentName')
      .sort({ createdAt: -1 });

    console.log(`✅ ${projects.length}개의 프로젝트 조회 완료`);

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error('❌ 부서 프로젝트 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '프로젝트 조회 중 오류가 발생했습니다.',
    });
  }
});

// ===============================================
// ✅ 전체 프로젝트 조회 (관리자용)
// ===============================================
router.get('/', protect, async (req, res) => {
  try {
    const projects = await TeamProject.find()
      .populate('manager', 'name email')
      .populate('department', 'departmentName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error('❌ 전체 프로젝트 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '프로젝트 조회 중 오류가 발생했습니다.',
    });
  }
});

// ===============================================
// ✅ 프로젝트 생성 (매니저 이상)
// ===============================================
router.post('/', protect, managerOrAdmin, async (req, res) => {
  try {
    const { projectName, description, department, startDate, endDate } = req.body;

    const project = new TeamProject({
      projectName,
      description,
      department,
      manager: req.user._id,
      startDate,
      endDate,
      status: 'planning',
    });

    await project.save();

    console.log('✅ 프로젝트 생성 완료:', project.projectName);

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('❌ 프로젝트 생성 실패:', error);
    res.status(500).json({
      success: false,
      message: '프로젝트 생성 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;