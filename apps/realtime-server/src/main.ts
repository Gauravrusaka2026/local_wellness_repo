import { createServer } from 'node:http';

import { Server } from 'socket.io';

const httpServer = createServer();
const socketServer = new Server(httpServer);
const port = process.env['PORT'] ?? 3002;

httpServer.listen(port);

export { httpServer, socketServer };
