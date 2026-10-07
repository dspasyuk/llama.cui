// Copyright Denis Spasyuk
// License MIT

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import prmt from "./src/prompt.js";
import hash from "./src/hash.js";

const Hash = new hash();

// Resolve relative paths against this file, not the process working dir.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rel = (p) => path.resolve(__dirname, p);

const config = {};

// ─────────────────────────────────────────────────────────────
// LLM BACKEND
// ─────────────────────────────────────────────────────────────
// Which provider answers chat messages — one of the keys in `providers`.
config.provider = "ollama";

// Shared behaviour for every provider. A provider can override any of these.
config.defaults = {
  temperature: 0.7,
  topP: 0.9,
  historyLimit: 30,       // chat messages kept per session
  historyMaxChars: 32000, // trim history once it grows past this many chars
  showThinking: false,    // stream reasoning in the UI (Qwen3 thinking models)
};

// Each provider is self-contained: how to reach it, which model, overrides.
config.providers = {
  // Local Ollama server over HTTP.
  ollama: {
    host: process.env.OLLAMA_HOST || "http://localhost:11434",
    model: "qwen3.6:35b-a3b-q8_0",
    topP: 0.1,
    showThinking: true,
    // How long Ollama keeps the model loaded after a request. Ollama's default
    // is 5m, which unloads a big model and forces a slow reload on the next
    // question. Keep it warm for fast follow-ups (seconds, or "30m"/"1h"/"24h").
    keepAlive: process.env.OLLAMA_KEEP_ALIVE || "1h",
  },

  // Local llama.cpp — spawns llama-cli and streams its stdout.
  llamacpp: {
    binary: rel("../llama.cpp/llama-cli"),
    model: {
      directory: rel("../models"),
      file: "Qwen3-4B-Thinking-2507-UD-Q6_K_XL.gguf",
      repo: "Qwen/Qwen2.5-Coder-14B-Instruct-GGUF", // auto-download if file missing
    },
    temperature: 0.1,
    topK: 10,
    ctxSize: 8000,
    gpuLayers: 50, // 0 for CPU-only
    threads: 6,
    batchSize: 2048,
    flashAttention: true,
    jinja: true,
  },
};

// Active provider = shared defaults merged under the selected one.
// Throws immediately if `config.provider` names an unknown backend.
config.active = () => {
  const p = config.providers[config.provider];
  if (!p) {
    throw new Error(
      `Unknown provider "${config.provider}". Options: ${Object.keys(config.providers).join(", ")}`
    );
  }
  return { name: config.provider, ...config.defaults, ...p };
};

// ─────────────────────────────────────────────────────────────
// PERSONA
// ─────────────────────────────────────────────────────────────
config.systemPrompt = fs.readFileSync(rel("./Alice.txt"), "utf8");

// ─────────────────────────────────────────────────────────────
// SERVER
// ─────────────────────────────────────────────────────────────
config.PORT = { client: "7000", server: "7000" };
config.IP = { client: process.env.HOST || "localhost", server: process.env.HOST || "localhost" };
config.login = false; // set true to require login
config.timeout = 50000; // ms before an unanswered request is aborted

config.session = {
  secret: "2C44-4D44-WppQ38S", // change before deployment
  resave: true,
  saveUninitialized: true,
  store: "", // replaced at runtime with the in-memory store
  cookie: {
    secure: false, // true in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 10000000, // ~2400 h
    sameSite: true,
  },
};

// Auth lookup — swap for a real DB query in production.
config.loginTrue = async (user) =>
  [{ username: "admin", password: await Hash.cryptPassword("beamtime") }].find(
    ({ username }) => username === user
  );

// ─────────────────────────────────────────────────────────────
// RAG — embeddings + web search
// ─────────────────────────────────────────────────────────────
config.embedding = { MongoDB: false, Documents: true, WebSearch: true };
config.maxTokens = 8000; // max embedding context tokens

// Web search — Exa (same search OpenCode uses). Works keyless; set EXA_API_KEY
// for higher limits. Set PARALLEL_API_KEY to enable the Parallel fallback.
config.websearch = {
  numResults: 5,
  type: "auto", // auto | fast | deep
  contextMaxCharacters: 2000,
  timeout: 25000,
};

// ─────────────────────────────────────────────────────────────
// TEXT-TO-SPEECH (Piper)
// ─────────────────────────────────────────────────────────────
config.piper = {
  enabled: false,
  rate: 21500,
  output_file: "S16_LE",
  exec: rel("../piper/install/piper"),
  model: rel("../piper/models/librits/en_US-libritts-r-medium.onnx"),
};

// ─────────────────────────────────────────────────────────────
// OUTPUT HELPERS
// ─────────────────────────────────────────────────────────────
// Strip model artifacts (special tokens, thinking blocks).
config.outputFilter = (output) =>
  output
    .replace(/<\|.*?\|>/gs, "")
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .trim();

// Same as outputFilter but keeps surrounding whitespace — used for streamed
// word chunks that must retain their trailing space.
config.outputFilterNoTrim = (output) =>
  output
    .replace(/<\|.*?\|>/gs, "")
    .replace(/<think>[\s\S]*?<\/think>/g, "");

// Build the final prompt for the active model.
config.prompt = (userID, prompt, context, firstchat) =>
  prmt.promptFormatNONE(config.systemPrompt, prompt, context, firstchat);

// ─────────────────────────────────────────────────────────────
// TEST QUESTIONS
// ─────────────────────────────────────────────────────────────
config.testQuestions = `
Answer the following questions:
1. The day before two days after the day before tomorrow is Saturday. What day is it today?
2. Which number is larger 9.11 or 9.9?
3. Solve the equation 3y = 6y + 11 and find y.
4. There are two ducks in front of a duck, two ducks behind a duck, and a duck in the middle. How many ducks are there?
5. Billy's mom had 4 children. The 1st one was April, the 2nd was May, and the 3rd was June. What was the 4th child named?
6. What are the products of the chemical reaction between salicylic acid and acetic anhydride?
7. If five cats can catch five mice in five minutes, how long will it take one cat to catch one mouse?
8. Create a bouncing ball animation as all in one HTML/JS/CSS page.
`;

export default config;
