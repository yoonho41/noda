const mongoose = require('mongoose');
const express = require('express');

const Reservation = mongoose.model('reservation'); // 스키마 파일에서 등록됨
const User = mongoose.model('User')
const { ROOMS } = require('../models/reservationSchema'); // 왜: byRoom 응답 구성

module.exports = (app) => {
  // 데이터 조회(전체)
  app.get('/api/reservation', async (req, res) => {
    try {
      const reservation = await Reservation.find();
      return res.status(200).send(reservation);
    } catch (err) {
      return res.status(500).send({ error: true, message: err.message });
    }
  });


  app.get('/api/findAllUsers', async (req, res) => {
    try {
      const users = await User.find({}, 'name email -_id').lean();
      return res.status(200).send(users);
    } catch (err) {
      return res.status(500).send({ error: true, message: err.message });
    }
  });


  // 데이터 입력
  app.post('/api/reservation', async (req, res) => {
    try {
      const reservation = await Reservation.create(req.body); // 왜: 스키마 훅(겹침/시간 정책) 적용
      return res.status(200).send({
        error: false,
        reservation,
      });
    } catch (err) {
      return res.status(500).send({ error: true, message: err.message });
    }
  });

  // 데이터 수정
  app.put('/api/reservation', async (req, res) => {
    const id = req.body.id;
    try {
      const reservation = await Reservation.findByIdAndUpdate(id, req.body);
      return res.status(200).send({
        error: false,
        reservation,
      });
    } catch (err) {
      return res.status(500).send({ error: true, message: err.message });
    }
  });

  // 데이터 삭제
  app.delete('/api/reservation/:id', async (req, res) => {
    const id = req.params.id;
    try {
      const r = await Reservation.deleteOne({ _id: id });
      if (r.deletedCount === 0)
        return res.status(404).json({ ok: false, error: 'not_found' });
      return res.status(200).send({ ok: true, error: false, r, deletedId: id });
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'server_error' });
    }
  });

  // 일자별 조회(옵션 room)
  app.get('/api/reservations/daily', async (req, res) => {
    const { dateKey, room } = req.query;
    if (!dateKey) return res.status(400).json({ error: 'dateKey is required' });

    try {
      if (room) {
        const items = await Reservation.find({ dateKey, room }).sort({
          start: 1,
        });
        return res
          .status(200)
          .json({ dateKey, room, items, count: items.length });
      }

      const docs = await Reservation.find({ dateKey }).sort({
        room: 1,
        start: 1,
      });
      const byRoom = ROOMS.reduce((acc, r) => {
        acc[r] = [];
        return acc;
      }, {});
      for (const d of docs) byRoom[d.room].push(d);

      return res.status(200).json({
        dateKey,
        rooms: ROOMS,
        byRoom,
        total: docs.length,
      });
    } catch (err) {
      return res.status(500).send({ error: true, message: err.message });
    }
  });
};