import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import logger from "morgan";
import path from "path";
import cors from "cors";
import { SpeechClient } from "@google-cloud/speech";
import WebSocket, { WebSocketServer } from "ws";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(logger("dev"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: false,
  })
);

const speechClient = new SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
  console.log(`${PORT}번 포트에서 대기중`);
});

const wss = new WebSocketServer({ server: server });

wss.on("connection", (ws: WebSocket) => {
  console.log("WebSocket connection established.");

  const recognizeStream = speechClient
    .streamingRecognize({
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: "ko-KR",
      },
      interimResults: true,
    })
    .on("error", (error) => {
      console.error("STT error : ", error);
      ws.send(
        JSON.stringify({
          error: error.message,
        })
      );
    })
    .on("data", (data) => {
      const transcript = data.results
        .map(
          (result: { alternatives: { transcript: string }[] }) =>
            result.alternatives[0].transcript
        )
        .join("\n");
      console.log("Transcript: ", transcript);
      ws.send(JSON.stringify({ transcript }));
    });
  ws.on("message", (message: WebSocket.RawData) => {
    if (typeof message === "string") {
      console.log("Received string message: ", message);
      return;
    }

    /* Binary Data -> Google STT with streaming */
    recognizeStream.write(message as Buffer);
  });
  ws.on("close", () => {
    console.log("WebSocket connection closed");
    recognizeStream.end();
  });
});

app.use((_req: Request, _res: Response, next: NextFunction) => {
  const error: any = new Error("404 Error");
  error.status = 404;
  next(error);
});

app.use((error: any, req: Request, res: Response) => {
  res.locals.message = error.message;
  res.locals.error = req.app.get("env") === "development" ? error : {};

  res.status(error.status || 500);
  res.send("error");
});

export default app;
