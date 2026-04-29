import { startHttpServer } from "./src/server/app";
import { loadRuntimeEnv } from "./src/server/load-env";

loadRuntimeEnv();

const server = startHttpServer();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  process.exit(0);
});

void server;
