import axios from 'axios'



//파일 업로드
const addFile = async(file, messageId) => {

    const formData = new FormData();
    formData.append('upload', file);
    formData.append('messageId', messageId);

    // 동일한 패턴 유지: then/catch 체인
    return axios
        .post('/files', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            // why: 백엔드가 쿠키 세션 쓰는 경우 필요
            withCredentials: true,
        })
        .then((res) => {
            console.log(res);
            return res.data; // { id, downloadUrl }
        })
        .catch((error) => {
            console.log(error);
            throw error;
        });
}


// messageId 로 파일 찾아오기
const getFile = async(no) => {
    
    // const res = await axios.get(`/api/files/messageId/${no}`)

    // return res.data

    try {
        const res = await axios.get(`/files/messageId/${no}`);
        // 백엔드가 { items, count } 형태로 줄 것으로 가정
        const items = res.data?.items ?? res.data ?? [];
        return Array.isArray(items) ? items : [];
    } catch (err) {
        // ► 핵심: 404(=첨부 없음)를 "빈 배열"로 변환
        if (err?.response?.status === 404) return [];
        throw err;
    }
    
}


//파일 삭제
const deleteFile = async(messageId) => {
    axios.delete(`/files/${messageId}`,{
        messageId:messageId
    }).then(res => {
        console.log(res)
    }).catch(error => {
        console.log(error)
    })
}



export default {
    getFile: getFile,
    addFile: addFile,
    deleteFile: deleteFile
}