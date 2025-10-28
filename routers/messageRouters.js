const mongoose = require('mongoose')


const Message = mongoose.model('messagedbs') //collection 호출 (table)

//미들웨어 생성
//noda/src/services/messageService에서 조회
module.exports = (app) => {

    //데이터 조회
    app.get('/api/message',async(req,res) => {
        const message = await Message.find()

        return res.status(200).send(message)
    })

    //데이터 입력
    app.post('/api/message', async (req, res) => {
        
        try {
            const message = await Message.create(req.body)
            return res.status(200).send({
                error: false,
                message
            })
        } catch (err) {
            return res.status(500).send({ error: true, message: err.message }) // 최소한의 에러 응답
        }
    })

    // app.post('/api/message', async (req, res) => {
    //     try {
    //         const doc = await Message.create(req.body); // pre('save')로 no가 할당됨
    //         // 필요한 필드만 엄격 반환
    //         return res.status(201).json({ id: String(doc._id), no: doc.no });
    //     } catch (e) {
    //         console.error('[messages:create]', e);
    //         return res.status(500).json({ error: 'create failed' });
    //     }
    // });


    //데이터 수정
    app.put('/api/message',async(req,res) => {
        const id = req.body.id
        const message = await Message.findByIdAndUpdate(id,req.body)

        return res.status(200).send({
            error:false,
            message
        })
    })

    app.put('/api/message/readMessage/:no',async(req,res) => {
        const no = req.params.no;
        try {
            const r = await Message.updateOne({ no }, { $set: { is_read: true } });
            if (r.deletedCount === 0) return res.status(404).json({ ok: false, error: "not_found" });
            return res.status(200).send({ ok: true, error:false, r, deletedNo: no });
        } catch (e) {
            return res.status(500).json({ ok: false, error: "server_error" });
        }
    })

    app.put('/api/message/unreadMessage/:no',async(req,res) => {
        const no = req.params.no;
        try {
            const r = await Message.updateOne({ no }, { $set: { is_read: false } });
            if (r.deletedCount === 0) return res.status(404).json({ ok: false, error: "not_found" });
            return res.status(200).send({ ok: true, error:false, r, deletedNo: no });
        } catch (e) {
            return res.status(500).json({ ok: false, error: "server_error" });
        }
    })



    // //데이터 삭제
    // app.delete('/api/message',async(req,res) => {
    //     const id = req.body.id
    //     const message = await Message.findByIdAndDelete(id)

    //     return res.status(200).send({
    //         error:false,
    //         message
    //     })
    // })


    //데이터 삭제
    app.delete('/api/message/:no',async(req,res) => {
        const no = req.params.no;
        try {
            const r = await Message.deleteOne({ no });
            if (r.deletedCount === 0) return res.status(404).json({ ok: false, error: "not_found" });
            return res.status(200).send({ ok: true, error:false, r, deletedNo: no });
        } catch (e) {
            return res.status(500).json({ ok: false, error: "server_error" });
        }
    })



    app.get('/api/messages/max-no', async (req, res) => {
        try {
            // 왜: 'no'가 숫자인 문서만 대상으로 최댓값을 구해 타입 혼선을 방지
            const doc = await Message.findOne({ no: { $type: 'number' } })
                .sort({ no: -1 })        // 왜: 인덱스 타고 최댓값 1건만
                .select('no')
                .lean();

            const maxNo = doc?.no ?? 0;

            console.log('Router : '+maxNo)

            return res.json({ maxNo, exists: !!doc });
        } catch (e) {
            // 운영에서는 로깅 후 일반화된 에러 메시지 권장
            console.error('[max-no] error:', e);
            return res.status(500).json({ error: 'failed to get max no' });
        }
    });    






}