import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import url from "url";

const server = http.createServer();
const wss = new WebSocketServer({ server });

const API_KEY = process.env.API_KEY;

// Almacenar clientes JS por ID
const jsClients = new Map();

// Almacenar el cliente Python principal
let pythonClient = null;

let nextId = 1;

wss.on("connection", (ws, req) => {
  const query = url.parse(req.url, true).query;

  if (query.key !== API_KEY) {
    ws.close();
    return;
  }

  // Tipo de cliente = JS o PY
  const type = query.type || "js";

  if (type === "py") {
    console.log("Servidor conectado");
    pythonClient = ws;

    ws.on("close", () => {
      console.log("Servidor desconectado");
      pythonClient = null;
    });

    // Python envia respuestas
    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg);

        // data.to = ID del cliente JS
        const client = jsClients.get(data.to);

        if (client && client.readyState === WebSocket.OPEN) {
          client.send(data.msg);
        }
      } catch (e) {
        console.log("Error mensaje Python:", e);
      }
    });

    return;
  }

  // -------------------------
  // CLIENTE JAVASCRIPT
  // -------------------------
  const clientId = nextId++;
  jsClients.set(clientId, ws);

  console.log("Cliente conectado:", clientId);

  // Enviar ID al cliente JS
  ws.send(JSON.stringify({ id: clientId }));

  ws.on("message", (msg) => {
    console.log("Cliente", clientId, "→ PYTHON:", msg.toString());

    // Reenviar a Python con el ID del cliente JS
    if (pythonClient && pythonClient.readyState === WebSocket.OPEN) {
      pythonClient.send(JSON.stringify({
        from: clientId,
        msg: msg.toString()
      }));
    }
  });

  ws.on("close", () => {
    console.log("JS desconectado:", clientId);
    jsClients.delete(clientId);
  });
});

server.listen(10000, () => {
  console.log("WebSocket Node corriendo en puerto 10000");
});
