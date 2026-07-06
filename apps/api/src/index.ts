import cors from "cors";
import express from "express";
import type { HealthCheckResponse } from "@blockwise/types";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());

app.get("/health", (_req, res) => {
  const body: HealthCheckResponse = {
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  };
  res.json(body);
});

app.listen(port, () => {
  console.log(`api listening on http://localhost:${port}`);
});
