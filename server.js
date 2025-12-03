import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import url from "url";

const server = http.createServer();
const wss = new WebSocketServer({ server });

const API_KEY = process.env.API_KEY; // Render le enviará esta variable

wss.on("connection", (ws, req) => {
  const query = url.parse(req.url, true).query;

  if (query.key !== API_KEY) {
    ws.close();
    return;
  }

  console.log("Cliente conectado.");

  ws.on("message", (msg) => {
    console.log("Recibido:", msg.toString());

    // Enviar a todos los clientes conectados
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg.toString());
      }
    });
  });

  ws.on("close", () => console.log("Cliente desconectado."));
});

server.listen(10000, () => {
  console.log("WebSocket corriendo en puerto 10000");
});
