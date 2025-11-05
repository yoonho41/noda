// ✅ 개발 환경과 배포 환경 분기 처리
const hostApi =
  process.env.NODE_ENV === "development"
    ? "http://localhost"
    : "https://sing-generator-node.herokuapp.com";

const portApi = process.env.NODE_ENV === "development" ? 5000 : "";

const baseURLApi = `${hostApi}${portApi ? `:${portApi}` : ``}/api`;

// ✅ OAuth 콜백 후 프론트엔드로 돌아올 URL
const redirectUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000/template/dashboard"
    : "https://demo.flatlogic.com/sofia-react";

// ✅ 백엔드 연동 활성화
// 원래는 문자열 환경변수였지만, 로컬 개발에서는 하드코딩이 가장 안정적입니다.
const isBackend = true; // 🚀 중요 포인트: 이게 false면 axios 요청이 안 갑니다.

export default {
  redirectUrl,
  hostApi,
  portApi,
  baseURLApi,
  remote: "http://localhost:5000",
  isBackend,
  auth: {
    email: "admin@flatlogic.com",
    password: "password",
  },
};
