const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');

const Calendar = mongoose.model('calendardbs');

module.exports = (app) => {
    
    // ===============================================
    // 전체 캘린더 일정 조회
    // ===============================================
    app.get('/api/calendar/task', protect, async(req, res) => {
        try {
            // 모든 일정 조회 (팀 공유 캘린더)
            const events = await Calendar.find();
            
            // 또는 개인 캘린더만 조회하려면:
            // const events = await Calendar.find({ userId: req.user._id });
            
            return res.status(200).send(events);
        } catch(error) {
            return res.status(500).send({ error: error.message });
        }
    });

    // ===============================================
    // 특정 날짜의 일정 조회
    // ===============================================
    app.get('/api/calendar/task/:date', protect, async(req, res) => {
        try {
            const date = req.params.date;
            const event = await Calendar.findOne({ date: date });
            
            return res.status(200).send(event);
        } catch(error) {
            return res.status(500).send({ error: error.message });
        }
    });

    // ===============================================
    // 새 일정 추가
    // ===============================================
    app.post('/api/calendar/task', protect, async(req, res) => {
        try {
            // 필수 필드 검증
            if (!req.body.title || !req.body.start) {
                return res.status(400).send({
                    error: true,
                    message: "제목과 시작 시간을 입력해주세요."
                });
            }

            // 사용자 정보를 포함한 일정 데이터 생성
            const eventData = {
                ...req.body,
                userId: req.user._id,        // 로그인한 사용자 ID
                createdBy: req.user.name     // 생성자 이름
            };

            // DB에 저장
            const newEvent = await Calendar.create(eventData);

            return res.status(200).send({
                error: false,
                event: newEvent
            });
        } catch(error) {
            return res.status(500).send({
                error: true,
                message: error.message
            });
        }
    });

    // ===============================================
    // 일정 수정
    // ===============================================
    app.put('/api/calendar/task/:id', protect, async(req, res) => {
        try {
            const id = req.params.id;

            // 일정 찾아서 수정
            const updatedEvent = await Calendar.findOneAndUpdate(
                { _id: id },
                { $set: req.body },
                { new: true }  // 수정된 데이터 반환
            );

            // 일정을 찾지 못한 경우
            if (!updatedEvent) {
                return res.status(404).send({
                    error: true,
                    message: "일정을 찾을 수 없습니다."
                });
            }

            return res.status(200).send({
                error: false,
                event: updatedEvent
            });
        } catch(error) {
            return res.status(500).send({ error: error.message });
        }
    });

    // ===============================================
    // 일정 삭제
    // ===============================================
    app.delete('/api/calendar/task/:id', protect, async(req, res) => {
        try {
            const id = req.params.id;
            
            // 일정 찾아서 삭제
            const deletedEvent = await Calendar.findOneAndDelete({ _id: id });

            // 일정을 찾지 못한 경우
            if (!deletedEvent) {
                return res.status(404).send({
                    error: true,
                    message: "삭제할 일정을 찾을 수 없습니다."
                });
            }

            return res.status(200).send({
                error: false,
                event: deletedEvent
            });
        } catch(error) {
            return res.status(500).send({ error: error.message });
        }
    });
};