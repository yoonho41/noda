import axios from 'axios';

// 조회: 전체
const getReservation = async () => {
  const res = await axios.get('/reservation');
  return res.data;
};


const getAllUsers = async () => {
  const res = await axios.get('/findAllUsers');
  return res.data;
};


// 조회: 일자별(옵션 room)
const getDailyReservations = async (dateKey, room) => {
  const params = room ? { dateKey, room } : { dateKey };
  const res = await axios.get('/reservations/daily', { params });
  return res.data;
};

// 입력
const addReservation = async (reservation) => {
  axios
    .post('/reservation', {
      room: reservation.room,
      dateKey: reservation.dateKey,
      start: reservation.start,
      end: reservation.end,
      title: reservation.title,
      owner: reservation.owner,
      participants: reservation.participants,
      note: reservation.note,
    })
    .then((res) => {
      console.log(res);
      return res.data;
    })
    .catch((error) => {
      console.log(error);
    });
  console.log('[svc:addReservation] → POST /reservation', reservation);
};

// 수정
const updateReservation = async (reservation) => {
  axios
    .put('/reservation', {
      id: reservation.id || reservation._id,
      room: reservation.room,
      dateKey: reservation.dateKey,
      start: reservation.start,
      end: reservation.end,
      title: reservation.title,
      owner: reservation.owner,
      participants: reservation.participants,
      note: reservation.note,
    })
    .then((res) => {
      console.log(res);
    })
    .catch((error) => {
      console.log(error);
    });
};

// 삭제
const deleteReservation = async (id) => {
  axios
    .delete(`/reservation/${id}`, {
      id,
    })
    .then((res) => {
      console.log(res);
    })
    .catch((error) => {
      console.log(error);
    });
};

export default {
  getReservation,
  getDailyReservations,
  addReservation,
  updateReservation,
  deleteReservation,
  getAllUsers
};