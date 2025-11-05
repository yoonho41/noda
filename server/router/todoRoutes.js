const express = require('express');  // Express 모듈을 임포트
const router = express.Router();  // Express의 라우터 객체 생성
const Todo = require('../models/Todo');  // Todo 모델을 임포트
const { protect } = require('../middleware/authMiddleware');  // 인증 미들웨어 임포트

// ✅ 모든 요청에 인증 미들웨어 적용
router.use(protect);  // 모든 라우트에서 protect 미들웨어를 적용하여 인증된 사용자만 접근 가능하게 설정

// ===============================================
// 1. 내 할 일 목록 조회 (GET /api/todos)
// ===============================================
router.get('/', async (req, res) => {  // 모든 할 일 목록을 조회하는 라우트
  try {
    const { status, priority } = req.query;  // 쿼리 파라미터로 status와 priority를 받음
    const filter = { user: req.user._id };  // 로그인한 사용자의 할 일만 조회하도록 필터 설정

    // status나 priority 값이 있으면 필터 조건에 추가
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // 할 일 목록을 조회하고, 생성일(createdAt)을 기준으로 내림차순 정렬
    const todos = await Todo.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { todos, count: todos.length },  // 조회된 할 일 목록과 개수 반환
    });
  } catch (error) {
    console.error('Get todos error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '할 일 목록 조회 중 오류가 발생했습니다.',  // 오류 메시지 반환
    });
  }
});

// ===============================================
// 2. 할 일 생성 (POST /api/todos)
// ===============================================
router.post('/', async (req, res) => {  // 새로운 할 일을 생성하는 라우트
  try {
    const { title, description, dueDate, priority, tags } = req.body;  // 요청 본문에서 할 일 정보 받기

    // 할 일을 생성
    const todo = await Todo.create({
      title,
      description,
      dueDate,
      priority,
      tags,
      user: req.user._id,  // 로그인한 사용자의 _id를 할 일에 연결
    });

    res.status(201).json({
      success: true,
      message: '할 일이 생성되었습니다.',  // 생성된 할 일 메시지 반환
      data: { todo },  // 생성된 할 일 정보 반환
    });
  } catch (error) {
    console.error('Create todo error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '할 일 생성 중 오류가 발생했습니다.',  // 오류 메시지 반환
    });
  }
});

// ===============================================
// 3. 특정 할 일 조회 (GET /api/todos/:todoId)
// ===============================================
router.get('/:todoId', async (req, res) => {  // 특정 할 일을 조회하는 라우트
  try {
    // 할 일 ID와 사용자 ID로 할 일을 찾기
    const todo = await Todo.findOne({
      _id: req.params.todoId,  // URL 파라미터에서 전달된 todoId
      user: req.user._id,  // 로그인한 사용자의 할 일만 조회
    });

    if (!todo) {  // 해당 할 일이 없으면 404 응답
      return res.status(404).json({
        success: false,
        message: '할 일을 찾을 수 없습니다.',  // 할 일을 찾을 수 없을 때 메시지
      });
    }

    res.json({
      success: true,
      data: { todo },  // 찾은 할 일 정보 반환
    });
  } catch (error) {
    console.error('Get todo error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '할 일 조회 중 오류가 발생했습니다.',  // 오류 메시지 반환
    });
  }
});

// ===============================================
// 4. 할 일 수정 (PUT /api/todos/:todoId)
// ===============================================
router.put('/:todoId', async (req, res) => {  // 특정 할 일을 수정하는 라우트
  try {
    const { title, description, status, priority, dueDate, tags } = req.body;  // 요청 본문에서 수정할 데이터 받기
    const updateData = {};  // 수정할 데이터 객체

    // 수정할 데이터가 존재하면 updateData 객체에 추가
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (tags) updateData.tags = tags;

    // 할 일 ID와 사용자 ID로 해당 할 일 수정
    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.todoId, user: req.user._id },  // URL 파라미터와 사용자 ID로 필터링
      updateData,  // 수정할 데이터
      { new: true, runValidators: true }  // 새로 수정된 값 반환 및 데이터 검증
    );

    if (!todo) {  // 해당 할 일이 없으면 404 응답
      return res.status(404).json({
        success: false,
        message: '할 일을 찾을 수 없습니다.',  // 할 일을 찾을 수 없을 때 메시지
      });
    }

    res.json({
      success: true,
      message: '할 일이 수정되었습니다.',  // 수정 완료 메시지
      data: { todo },  // 수정된 할 일 정보 반환
    });
  } catch (error) {
    console.error('Update todo error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '할 일 수정 중 오류가 발생했습니다.',  // 오류 메시지 반환
    });
  }
});

// ===============================================
// 5. 할 일 완료 처리 (PATCH /api/todos/:todoId/complete)
// ===============================================
router.patch('/:todoId/complete', async (req, res) => {  // 특정 할 일을 완료 처리하는 라우트
  try {
    // 할 일 ID와 사용자 ID로 해당 할 일을 찾음
    const todo = await Todo.findOne({
      _id: req.params.todoId,
      user: req.user._id,
    });

    if (!todo) {  // 해당 할 일이 없으면 404 응답
      return res.status(404).json({
        success: false,
        message: '할 일을 찾을 수 없습니다.',  // 할 일을 찾을 수 없을 때 메시지
      });
    }

    // 할 일 완료 처리 (complete 메서드 호출)
    await todo.complete();

    res.json({
      success: true,
      message: '할 일이 완료되었습니다.',  // 완료 처리 메시지
      data: { todo },  // 완료된 할 일 정보 반환
    });
  } catch (error) {
    console.error('Complete todo error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '할 일 완료 처리 중 오류가 발생했습니다.',  // 오류 메시지 반환
    });
  }
});

// ===============================================
// 6. 할 일 삭제 (DELETE /api/todos/:todoId)
// ===============================================
router.delete('/:todoId', async (req, res) => {  // 특정 할 일을 삭제하는 라우트
  try {
    // 할 일 ID와 사용자 ID로 해당 할 일을 삭제
    const todo = await Todo.findOneAndDelete({
      _id: req.params.todoId,
      user: req.user._id,
    });

    if (!todo) {  // 해당 할 일이 없으면 404 응답
      return res.status(404).json({
        success: false,
        message: '할 일을 찾을 수 없습니다.',  // 할 일을 찾을 수 없을 때 메시지
      });
    }

    res.json({
      success: true,
      message: '할 일이 삭제되었습니다.',  // 삭제 완료 메시지
    });
  } catch (error) {
    console.error('Delete todo error:', error);  // 오류 로그 출력
    res.status(500).json({
      success: false,
      message: '할 일 삭제 중 오류가 발생했습니다.',  // 오류 메시지 반환
    });
  }
});

// ===============================================
// 7. 부서별 할일 조회 (GET /api/todos/department/:departmentId) - 매니저용
// ===============================================
router.get('/department/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;

    console.log('📡 부서 할일 조회 요청:', departmentId);

    // 해당 부서의 모든 사용자 찾기
    const User = require('../models/User');
    const departmentUsers = await User.find({ 
      department: departmentId,
      isActive: true 
    }).select('_id');
    
    const userIds = departmentUsers.map(u => u._id);

    console.log(`📋 부서 사용자 ${userIds.length}명 찾음`);

    // 해당 사용자들의 할일 찾기
    const todos = await Todo.find({ user: { $in: userIds } })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    console.log(`✅ ${todos.length}개의 할일 조회 완료`);

    res.json({
      success: true,
      data: todos,
    });
  } catch (error) {
    console.error('❌ 부서 할일 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '할일 조회 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;  // 라우터 내보내기
