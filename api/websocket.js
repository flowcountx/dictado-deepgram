// --- CÓDIGO FINAL Y ROBUSTO PARA api/websocket.js ---

const { createClient } = require("@deepgram/sdk");
const WebSocket = require('ws');

// Esta función se ejecutará en Vercel y se encargará de manejar
// la "actualización" de la conexión de HTTP a WebSocket.
module.exports = (req, res) => {
  // Verificamos si ya hemos creado y adjuntado el servidor de WebSocket al servidor principal.
  // Esto es una optimización para el entorno serverless, para no crear un servidor nuevo en cada petición.
  if (!res.socket.server.wss) {
    console.log("Inicializando el servidor de WebSocket por primera vez.");
    
    // 1. Creamos una instancia del servidor de WebSocket, pero le decimos que no maneje el servidor por sí mismo.
    const wss = new WebSocket.Server({ noServer: true });
    
    // 2. Adjuntamos nuestro servidor de WebSocket al servidor HTTP principal para poder reutilizarlo.
    res.socket.server.wss = wss;

    // 3. Le decimos al servidor HTTP principal qué hacer cuando reciba una petición de "upgrade" a WebSocket.
    res.socket.server.on('upgrade', (request, socket, head) => {
      console.log("Recibida petición de upgrade a WebSocket.");
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });

    // 4. Definimos la lógica para cuando un cliente se conecta con éxito (esto es igual que antes).
    wss.on('connection', (ws_client) => {
      console.log("¡Cliente conectado al WebSocket!");

      const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
      const connection = deepgram.listen.live({
        model: 'nova-2',
        language: 'es', // O 'en', etc.
        smart_format: true,
      });

      connection.on('open', () => {
        console.log("Conexión con Deepgram abierta.");
        ws_client.on('message', (message) => {
          if (connection.getReadyState() === 1) {
            connection.send(message);
          }
        });
      });

      connection.on('transcript', (data) => {
        ws_client.send(JSON.stringify(data));
      });

      ws_client.on('close', () => {
        console.log("El cliente se ha desconectado.");
        connection.finish();
      });
      
      connection.on('error', (error) => {
        console.error('Error de Deepgram:', error);
      });
    });
  }
  
  // 5. Finalizamos la respuesta HTTP inicial. La comunicación real ocurrirá por el WebSocket.
  res.end();
};