import { createApp } from "./app";

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

createApp().listen(port, () => {
  console.log(`api listening on http://localhost:${port}/api`);
});
