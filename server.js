import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import url from "url";

const server = http.createServer();
const wss = new WebSocketServer({ server });

const API_KEY = process.env.API_KEY;  
const SERVER_KEY = process.env.SERVER_KEY; 

// Almacenar clientes JS por ID
const jsClients = new Map();

// Cliente Python principal
let pythonClient = null;

let nextId = 1;

wss.on("connection", (ws, req) => {
  const query = url.parse(req.url, true).query;

  // Validar API_KEY (evita conexiones de desconocidos)
  if (query.key !== API_KEY) {
    ws.close();
    return;
  }

  // Tipo de conexión
  const type = query.type || "js";
  if (type === "py") {

    // Validar la clave secreta para Python
    if (query.server_key !== SERVER_KEY) {
      console.log("Intento de servidor no autorizado");
      ws.close();
      return;
    }

    console.log("Servidor Python conectado");
    pythonClient = ws;

    ws.on("close", () => {
      console.log("Servidor Python desconectado");
      pythonClient = null;
    });

    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg);

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

  // -------------------------------------
  // CLIENTE JAVASCRIPT
  // -------------------------------------
  const clientId = nextId++;
  jsClients.set(clientId, ws);

  console.log("Cliente JS conectado:", clientId);

  // Enviar ID al cliente JS
  ws.send(JSON.stringify({ id: clientId }));

  ws.on("message", (msg) => {
    console.log(`JS ${clientId} → PYTHON:`, msg.toString());

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
