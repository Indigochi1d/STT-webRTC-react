# STT-webRTC-react

🐚 React+Expreess로 웹뷰 환경에서의 실시간 STT(Speech To Text) 구현

## 🎢Steps

1. 마이크 권한을 가져오고 음성데이터를 받아온다.
2. 브라우저에서 데이터 가공 : Sampling bit의 형태 동일화(Float32bit to Int16bit)
3. 가공된 데이터 웹소켓 통신으로 서버에 던짐
4. 서버에서 google STT api를 이용해 실제 변환된 문자열 데이터 받음
5. 프론트로 던져줌

![stt](https://github.com/user-attachments/assets/3769ee65-e5f7-4e49-8c73-06a4dd3a1e50)



https://github.com/user-attachments/assets/39429441-c4e2-431d-9e82-f170d66007f8

