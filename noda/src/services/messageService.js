import axios from 'axios'

//조회
const getMessage = async() => {
    const res = await axios.get('/api/message')

    return res.data
}

//입력
const addMessage = async(message) => {
    axios.post('/api/message',{
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        subject: message.subject,
        content: message.content,
        send_date: message.send_date,
        read_date: '', // '' → null로 변환
        reply: message.reply,
        is_read: 0,
        is_deleted_by_sender: 0,
        is_deleted_by_receiver: 0,
        is_important: message.is_read,
    }).then(res => {
        console.log(res)
    }).catch(error => {
        console.log(error)
    })
    console.log('[svc:addMessage] → POST /api/message', message)
}

//수정
const updateMessage = async(user) => {
    axios.put('/api/message',{
        id:user._id,
        name:user.name,
        job:user.job
    }).then(res => {
        console.log(res)
    }).catch(error => {
        console.log(error)
    })
}

//삭제
const deleteMessage = async(id) => {
    axios.delete('/api/message',{
        data: {id:id}
    }).then(res => {
        console.log(res)
    }).catch(error => {
        console.log(error)
    })
}

export default {
    getMessage:getMessage,
    addMessage:addMessage,
    updateMessage:updateMessage,
    deleteMessage:deleteMessage
}