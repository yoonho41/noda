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
        console.log('[api] POST /api/message:in', req.body) // ADD
        try {
        // DB 저장 전 로그
        console.log('[api] Message.create:doc', req.body) // ADD
        const message = await Message.create(req.body)
        console.log('[api] Message.create:ok', { id: message._id?.toString?.(), no: message.no }) // ADD
        return res.status(200).send({
            error: false,
            message,
        })
        } catch (err) {
        console.log('[api] POST /api/message ✖', { msg: err.message }) // ADD
        return res.status(500).send({ error: true, message: err.message }) // 최소한의 에러 응답
        }
    })

    //데이터 수정
    app.put('/api/message',async(req,res) => {
        const id = req.body.id
        const message = await Message.findByIdAndUpdate(id,req.body)

        return res.status(200).send({
            error:false,
            message
        })
    })

    //데이터 삭제
    app.delete('/api/message',async(req,res) => {
        const id = req.body.id
        const message = await Message.findByIdAndDelete(id)

        return res.status(200).send({
            error:false,
            message
        })
    })
}