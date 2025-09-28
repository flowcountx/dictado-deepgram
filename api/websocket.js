const { createClient } = require("@deepgram/sdk");
const WebSocket = require('ws');

// Esta función se encarga de manejar la "actualización" de la conexión de HTTP a WebSocket.
// Es la forma más robusta y compatible de hacerlo en Vercel.
module.exports = (req, res) => {
  // Creamos una instancia del servidor de WebSocket, pero sin servidor propio.
  const wss = new WebSocket.Server({ noServer: true });

  // Le decimos al servidor HTTP principal qué hacer cuando reciba una petición de "upgrade".
  res.socket.server.on('upgrade', (request, socket, head) => {
    // Si la ruta no es la correcta, destruimos el socket.
    if (request.url !== '/api/websocket') {
      socket.destroy();
      return;
    }
    
    // Si la ruta es correcta, manejamos el upgrade y emitimos la conexión.
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  // Esta lógica se ejecuta CADA VEZ que un nuevo cliente se conecta con éxito.
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
  
  // Finalmente, manejamos la petición inicial.
  // Le decimos al servidor que intente hacer el "upgrade" a WebSocket.
  res.socket.server.emit('upgrade', req, req.socket, Buffer.alloc(0));
};