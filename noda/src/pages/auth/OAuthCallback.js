import React, { useEffect } from 'react';  // React와 useEffect 훅 임포트
import { useHistory, useLocation } from 'react-router-dom';  // useHistory와 useLocation 훅 임포트 (리다이렉션 및 URL 정보)
import axios from 'axios';  // HTTP 요청을 위한 axios 라이브러리

const BACKEND_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";  // 백엔드 API URL 설정

const OAuthCallback = () => {
  const history = useHistory();  // 리다이렉션을 위한 history 객체
  const location = useLocation();  // 현재 URL 정보 조회를 위한 location 객체

  useEffect(() => {
    console.log('🔍 OAuthCallback 실행됨');  // 컴포넌트 실행 시 로그 출력
    console.log('🔍 현재 URL:', window.location.href);  // 현재 URL 확인

    // URL에서 token 파라미터와 error 파라미터 추출
    const params = new URLSearchParams(location.search);
    const token = params.get('token');  // token 파라미터 추출
    const error = params.get('error');  // error 파라미터 추출

    console.log('🔍 URL 파라미터:', { token: token ? '있음' : '없음', error });  // URL 파라미터 출력

    if (error) {
      // OAuth 인증에 실패한 경우
      console.error('❌ OAuth 인증 실패:', error);  // 에러 메시지 출력
      alert('로그인 실패: ' + error);  // 에러 메시지 사용자에게 알림
      history.push('/login');  // 로그인 페이지로 리다이렉트
      return;  // 더 이상 실행하지 않음
    }

    if (token) {
      // OAuth 인증이 성공적으로 이루어졌다면
      console.log('✅ OAuth 토큰 수신 성공');  // 토큰 수신 성공 로그
      console.log('🔍 토큰 길이:', token.length);  // 토큰 길이 출력

      // 토큰을 로컬 스토리지에 저장
      localStorage.setItem('token', token);
      console.log('✅ localStorage에 토큰 저장 완료');  // 저장 완료 로그

      // axios 기본 헤더에 Authorization 토큰 설정
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token); // ✅ 다시 한 번 확실히 저장
      console.log('✅ axios 헤더 설정 완료');  // 헤더 설정 완료 로그
      window.history.replaceState({}, document.title, window.location.pathname); // ✅ 쿼리 파라미터 제거

      // ✅ 사용자 정보를 가져와서 역할에 따라 리다이렉트
      fetchUserAndRedirect(token);
    } else {
      // 토큰이 없으면 로그인 페이지로 리다이렉트
      console.error('❌ 토큰이 없습니다.');  // 토큰이 없는 경우 에러 로그
      history.push('/login');  // 로그인 페이지로 리다이렉트
    }
  }, [location, history]);  // location과 history가 변경될 때마다 실행

  // ✅ 사용자 정보 가져오기 및 역할별 리다이렉트
  const fetchUserAndRedirect = async (token) => {
    try {
      console.log('🔍 사용자 정보 조회 시작...');
      
      // 백엔드에서 사용자 정보 가져오기
      const res = await axios.get(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      console.log('✅ 사용자 정보 조회 성공:', res.data);

      if (res.data.success && res.data.user) {
        const user = res.data.user;
        
        // 사용자 정보를 localStorage에 저장
        localStorage.setItem('user', JSON.stringify(user));
        console.log('✅ localStorage에 사용자 정보 저장 완료');
        console.log('🔍 사용자 역할:', user.role);

        // ✅ 역할에 따라 자동 리다이렉트
        let redirectUrl = '/template/dashboard';  // 기본값: 일반 사용자
        
        if (user.role === 'admin') {
          redirectUrl = '/admin/dashboard';
          console.log('✅ 관리자 대시보드로 이동');
        } else if (user.role === 'manager') {
          redirectUrl = '/manager/dashboard';
          console.log('✅ 매니저 대시보드로 이동');
        } else {
          console.log('✅ 일반 사용자 대시보드로 이동');
        }

        // 대시보드로 리다이렉트
        console.log('✅ 리다이렉트 시작:', redirectUrl);
        history.push(redirectUrl);
      } else {
        console.error('❌ 사용자 정보를 가져올 수 없습니다.');
        history.push('/login');
      }
    } catch (error) {
      console.error('❌ 사용자 정보 조회 실패:', error);
      console.error('❌ 에러 상세:', error.response?.data);
      alert('사용자 정보를 가져오는 데 실패했습니다. 다시 로그인해주세요.');
      history.push('/login');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <h2>로그인 처리 중...</h2>  {/* 로그인 처리 중 메시지 */}
      <p>잠시만 기다려주세요.</p>  {/* 잠시 기다려 달라는 안내 메시지 */}
    </div>
  );
};

export default OAuthCallback;