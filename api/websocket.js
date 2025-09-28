console.log("--- EJECUTANDO LA VERSIÓN CORRECTA DEL BACKEND ---");

const { createClient } = require("@deepgram/sdk");
const WebSocket = require('ws');

module.exports = (req, res) => {
  const wss = new WebSocket.Server({ noServer: true });

  // Le decimos al servidor HTTP principal qué hacer cuando reciba una petición de "upgrade".
  res.socket.server.on('upgrade', (request, socket, head) => {
    // Aceptamos TODAS las peticiones de upgrade que lleguen a esta función,
    // ya que vercel.json ya ha hecho el filtrado por nosotros.
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws_client) => {
    console.log("Cliente conectado al WebSocket!");

    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    const connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'es',
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
      if (connection.getReadyState() === 1) {
         connection.finish();
      }
    });
    
    connection.on('error', (error) => {
      console.error('Error de Deepgram:', error);
    });
  });
  
  // Finalmente, le decimos al servidor que intente hacer el "upgrade" a WebSocket.
  res.socket.server.emit('upgrade', req, req.socket, Buffer.alloc(0));
};