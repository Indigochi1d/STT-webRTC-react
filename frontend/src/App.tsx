import "./App.css";
import { useState, useRef } from "react";

function App() {
  const [voiceText, setVoiceText] = useState("");
  const [isTalking, setIsTalking] = useState(false);
  const webSocket = useRef<WebSocket>(null);
  const mediaRecorder = useRef<MediaRecorder>(null);
  const audioContext = useRef<AudioContext>(null);

  const closeWebSocket = () => {
    if (webSocket.current) {
      webSocket.current.close();
    }
  };

  const setUpWebSocket = () => {
    closeWebSocket();

    const ws = new WebSocket("http://localhost:8080");
    ws.onopen = async () => {
      try {
        const SAMPLE_RATE = 16000;
        const CHUNK_RATE = 100;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: SAMPLE_RATE,
            channelCount: 1,
            echoCancellation: false,
          },
        });
        mediaRecorder.current = new MediaRecorder(stream);
        audioContext.current = new window.AudioContext({
          sampleRate: SAMPLE_RATE,
        });

        await audioContext.current.audioWorklet.addModule(
          "./linear16-processor.js"
        );
      } catch (error) {
        console.error(error);
      }
    };
  };

  return (
    <>
      <button onClick={setUpWebSocket}>듣기</button>
      <button onClick={closeWebSocket}>멈추기</button>
      <br />
      <div>{voiceText}</div>
      {isTalking && <div>말하는 중...</div>}
    </>
  );
}

export default App;
