import { createServer } from "./server.js";

const port = Number(process.env.PORT ?? 3001);

const server = createServer();
server.listen(port, () => {
  console.log(`watcher health service listening on :${port}`);
});
