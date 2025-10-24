// =======================================================================
// 파일: noda/src/services/health.js
// 목적: 연결 확인용 간단 서비스
// =======================================================================
import api from '../utils/axios';

export async function getHealth() {
  const { data } = await api.get('/health'); // 최종 요청: GET /api/health
  return data;
}
