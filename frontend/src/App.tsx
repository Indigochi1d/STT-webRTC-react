import "./App.css";
import { useState, useRef } from "react";

function App() {
  const [voiceText, setVoiceText] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const webSocket = useRef<WebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const processor = useRef<AudioWorkletNode | null>(null);
  const audioChunks = useRef<Uint8Array[]>([]);

  const closeWebSocket = () => {
    if (webSocket.current) {
      webSocket.current.close();
    }
  };

  const setUpWebSocket = () => {
    closeWebSocket();

    const ws = new WebSocket("ws://localhost:8080");
    ws.onopen = async () => {
      try {
        const SAMPLE_RATE = 16000;
        const CHUNK_RATE = 100;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: SAMPLE_RATE,
            channelCount: 1,
            echoCancellation: true,
          },
        });
        mediaRecorder.current = new MediaRecorder(stream);
        audioContext.current = new window.AudioContext({
          sampleRate: SAMPLE_RATE,
        });

        await audioContext.current.audioWorklet.addModule(
          "/linear16-processor.js"
        );

        const source = audioContext.current.createMediaStreamSource(stream);
        processor.current = new AudioWorkletNode(
          audioContext.current,
          "linear16-processor"
        );

        processor.current.port.onmessage = (event) => {
          if (webSocket.current) {
            if (webSocket.current.readyState === WebSocket.OPEN) {
              webSocket.current.send(event.data);
              audioChunks.current.push(
                new Int16Array(event.data) as unknown as Uint8Array
              );
            }
          }
        };

        const analyser = audioContext.current.createAnalyser();
        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        source.connect(processor.current);
        processor.current.connect(audioContext.current.destination);

        source.connect(analyser);

        function detectSpeaking() {
          if (!webSocket.current) return;
          analyser.getByteFrequencyData(dataArray);
          const avgVolume =
            dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          if (avgVolume > 50) {
            setIsSpeaking(true);
          } else {
            setIsSpeaking(false);
          }

          requestAnimationFrame(detectSpeaking);
        }
        detectSpeaking();

        mediaRecorder.current.onstop = () => {
          if (processor.current && audioContext.current) {
            stream.getAudioTracks().forEach((track) => {
              track.stop();
            });
            source.disconnect(processor.current);
            processor.current.disconnect(audioContext.current.destination);
          }
        };
        mediaRecorder.current.start(CHUNK_RATE);
      } catch (error) {
        console.error(error);
      }
    };
    ws.onmessage = (event) => {
      const receivedTextData = JSON.parse(event.data).transcript;
      setVoiceText(receivedTextData);
    };
    ws.onerror = (error) => {
      console.error("WebSocket Error: ", error);
      setVoiceText("");
    };
    ws.onclose = () => {
      console.log("WebSocket connetcion closed.");
      if (mediaRecorder.current) {
        mediaRecorder.current.stop();
        mediaRecorder.current = null;
      }
      if (audioContext.current) {
        audioContext.current.close();
        audioContext.current = null;
      }
      if (processor.current) {
        processor.current.disconnect();
        processor.current = null;
      }
    };
    webSocket.current = ws;
  };

  return (
    <>
      <button onClick={setUpWebSocket}>듣기</button>
      <button onClick={closeWebSocket}>멈추기</button>
      <br />
      <div>{voiceText}</div>
      {isSpeaking && <div>말하는 중...</div>}
    </>
  );
}

export default App;
