import { createApp } from "./app.js";
const { http, close } = createApp();
const port = Number(process.env.PORT ?? 3000);
http.listen(port, "0.0.0.0", () =>
  console.log(`Hot Potato is growing on http://localhost:${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    void close().then(() => process.exit(0));
  });
}
