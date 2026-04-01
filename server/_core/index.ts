import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  
  // health check endpoints (public for cron jobs and internal for Render)
  app.get("/health", (_req, res) => res.status(200).send("OK"));
  app.get("/api/health", (_req, res) => res.status(200).send("OK"));

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT) || 3000;

  server.on("error", (err) => {
    console.error("[Server Error]", err);
  });

  // Explicitly bind to 0.0.0.0 - required by Render
  server.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Started and listening on 0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error("[Fatal Error] Failed to start server:", err);
  process.exit(1);
});
