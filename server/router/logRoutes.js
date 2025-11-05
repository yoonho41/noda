const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const {
  protect,
  adminOnly,
} = require('../middleware/authMiddleware');

// ===============================================
// 1. 로그 목록 조회 (GET /api/logs)
// ===============================================
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      userId,
      startDate,
      endDate,
      search,
    } = req.query;

    // 필터 조건
    const filter = {};
    
    if (action) filter.action = action;
    if (userId) filter.user = userId;
    
    // 날짜 필터
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // 검색
    if (search) {
      filter.message = { $regex: search, $options: 'i' };
    }

    // 로그 조회
    const logs = await Log.find(filter)
      .populate('user', 'name email')
      .populate('targetUser', 'name email')
      .populate('targetDepartment', 'departmentName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // 총 개수
    const count = await Log.countDocuments(filter);

    res.json({
      success: true,
      data: {
        logs,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        totalLogs: count,
      },
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: '로그 조회 중 오류가 발생했습니다.',
    });
  }
});

// ===============================================
// 2. 로그 상세 조회 (GET /api/logs/:logId)
// ===============================================
router.get('/:logId', protect, adminOnly, async (req, res) => {
  try {
    const log = await Log.findById(req.params.logId)
      .populate('user', 'name email role')
      .populate('targetUser', 'name email role')
      .populate('targetDepartment', 'departmentName');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: '로그를 찾을 수 없습니다.',
      });
    }

    res.json({
      success: true,
      data: { log },
    });
  } catch (error) {
    console.error('Get log error:', error);
    res.status(500).json({
      success: false,
      message: '로그 조회 중 오류가 발생했습니다.',
    });
  }
});

// ===============================================
// 3. 로그 삭제 (DELETE /api/logs/:logId)
// ===============================================
router.delete('/:logId', protect, adminOnly, async (req, res) => {
  try {
    const log = await Log.findByIdAndDelete(req.params.logId);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: '로그를 찾을 수 없습니다.',
      });
    }

    res.json({
      success: true,
      message: '로그가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Delete log error:', error);
    res.status(500).json({
      success: false,
      message: '로그 삭제 중 오류가 발생했습니다.',
    });
  }
});

// ===============================================
// 4. 오래된 로그 삭제 (POST /api/logs/cleanup)
// ===============================================
router.post('/cleanup', protect, adminOnly, async (req, res) => {
  try {
    const { olderThan } = req.body; // 날짜

    if (!olderThan) {
      return res.status(400).json({
        success: false,
        message: '삭제할 기준 날짜를 입력해주세요.',
      });
    }

    const result = await Log.deleteMany({
      createdAt: { $lt: new Date(olderThan) },
    });

    res.json({
      success: true,
      message: `${result.deletedCount}개의 로그가 삭제되었습니다.`,
    });
  } catch (error) {
    console.error('Cleanup logs error:', error);
    res.status(500).json({
      success: false,
      message: '로그 정리 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;