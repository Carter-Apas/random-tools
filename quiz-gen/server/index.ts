import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import express from "express";
import OpenAI from "openai";
import { Server } from "socket.io";
import { loadEnvFile, readConfig } from "./config.js";
import { createLobbyStore } from "./game/lobbyStore.js";
import { createQuizGenerator } from "./game/openaiQuiz.js";
import { registerHandlers } from "./socket/registerHandlers.js";

loadEnvFile();
const config = readConfig();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const lobbyStore = createLobbyStore();
const openai = new OpenAI({ apiKey: config.openAIApiKey });
const quizGenerator = createQuizGenerator(openai, {
  model: config.openAIModel,
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = __dirname.includes(`${path.sep}dist-server${path.sep}`)
  ? path.resolve(__dirname, "../../dist")
  : path.resolve(__dirname, "../dist");

app.use(express.static(clientDistPath));
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

io.on("connection", (socket) => {
  registerHandlers({
    io,
    socket,
    store: lobbyStore,
    quizGenerator,
    config,
  });
});

server.listen(config.port, () => {
  console.log(`Roundtable server listening on ${config.port}`);
});
