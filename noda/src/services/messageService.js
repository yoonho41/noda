import axios from 'axios'

// ✅ [중요] 서버 절대 경로 기본 설정 (한 줄만 추가!)
axios.defaults.baseURL = "http://localhost:5000";

//조회
const getMessage = async() => {
    const res = await axios.get('/message', {
        params: { t: Date.now() }
    })
    
    return res.data
}

const getNameByEmail = async(email) => {
    const res = await axios.get(`/message/findNameByEmail/${email}`, {
        params: { t: Date.now() }
    })
    
    return res.data
}

const getMessageBySenderId = async(sender_id) => {
    const res = await axios.get(`/message/findBySenderId/${sender_id}`, {
        params: { t: Date.now() }
    })
    
    return res.data
}


const getMessageByReceiverId = async(receiver_id) => {
    const res = await axios.get(`/message/findByReceiverId/${receiver_id}`, {
        params: { t: Date.now() }
    })
    
    return res.data
}

//입력
const addMessage = async (message) => {
  try {
    const res = await axios.post('/message', {
      sender_id: message.sender_id,
      sender_name: message.sender_name,
      receiver_id: message.receiver_id,
      subject: message.subject,
      content: message.content,
      send_date: message.send_date,
      read_date: null,
      reply: message.reply,
      is_read: false,
      is_deleted_by_sender: false,
      is_deleted_by_receiver: false,
      is_important: message.is_important,
    });

    console.log('[svc:addMessage] → POST /message', res.data);
    return res.data;
  } catch (error) {
    console.error('[svc:addMessage] 실패:', error);
    throw error;
  }
};


//수정 (만들기만 하고 사용은 안 했음)
const updateMessage = async(user) => {
    axios.put('/message',{
        id:user._id,
        name:user.name,
        job:user.job
    }).then(res => {
        console.log(res)
    }).catch(error => {
        console.log(error)
    })
}


// 메세지 읽음 처리
const readMessage = async(no) => {
    axios.put(`/message/readMessage/${no}`,{
        is_read:true
    }).then(res => {
        console.log(res)
    }).catch(error => {
        console.log(error)
    })
}

// 메세지 안읽음 처리
const unreadMessage = async(no) => {
    axios.put(`/message/unreadMessage/${no}`,{
        is_read:false
    }).then(res => {
        console.log(res)
    }).catch(error => {
        console.log(error)
    })
}




//삭제
const deleteMessage = async(no) => {
    axios.delete(`/message/${no}`,{
        no:no
    }).then(res => {
        console.log(res)
    }).catch(error => {
        console.log(error)
    })
}


// 현재 있는 message 데이터들 중 no의 최댓값 구하기 (spring의 getMaxNo와 동일한 방법)
const getMaxMessageNo = async () => {
  try {
    const res = await axios.get('/messages/max-no', { withCredentials: true });
    const {maxNo} = res.data || {};

    console.log('Service : ', maxNo)

    const n = Number(maxNo);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch (e) {
    // 왜: 조회 실패로 UI가 망가지지 않게 기본값 제공
    console.error('[Service] getMaxMessageNo failed:', e);
    return 0;
  }   
}


export default {
    getMessage:getMessage,
    addMessage:addMessage,
    updateMessage:updateMessage,
    deleteMessage:deleteMessage,
    readMessage:readMessage,
    unreadMessage:unreadMessage,
    getMaxMessageNo:getMaxMessageNo,
    getMessageBySenderId:getMessageBySenderId,
    getMessageByReceiverId:getMessageByReceiverId,
    getNameByEmail:getNameByEmail
}