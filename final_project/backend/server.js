import express from "express";
import "dotenv/config";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import uploadRoute from "./routes/upload.route.js";
import chatRoute from "./routes/chat.route.js";

dotenv.config();

// Create uploads folder if it doesn't exist
fs.mkdirSync("uploads", { recursive: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// API Routes
app.use("/uploads", uploadRoute);
app.use("/chat", chatRoute);

// Fallback route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// PORT for Render/local
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server Running on port ${PORT}`);
});
