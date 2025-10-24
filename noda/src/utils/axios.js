// =======================================================================
// 파일: noda/src/utils/axios.js
// 목적: 하나의 axios 인스턴스로 요청 경로 일원화
// =======================================================================
import axios from 'axios';
import config from '../config';

const api = axios.create({
  baseURL: config.baseURLApi, // ex) '/api'
  timeout: 15000,
});

// why: 네트워크/CORS 이슈를 빠르게 진단
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 최소 진단 로그
    // eslint-disable-next-line no-console
    console.error('AXIOS ERR', {
      msg: err.message,
      code: err.code,
      url: err.config?.url,
      baseURL: err.config?.baseURL,
    });
    return Promise.reject(err);
  }
);

export default api;
