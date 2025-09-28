// --- INICIO DEL CÓDIGO PARA websocket.js ---

// 1. Importar las herramientas que necesitamos
// '@deepgram/sdk' es el kit oficial de Deepgram para hablar con su API.
// 'ws' es una librería muy popular en Node.js para crear servidores de WebSocket.
const { createClient } = require("@deepgram/sdk");
const WebSocket = require('ws');

// 2. Definir la función principal que se ejecutará en Vercel
// Vercel está diseñado para ejecutar funciones como esta. Cuando una petición llegue
// a tu aplicación, Vercel ejecutará este código.
export default function handler(req, res) {
  
  // 3. Crear un "servidor de espera" para WebSockets.
  // Imagina que abrimos una sala de chat y esperamos a que los navegadores (clientes) se conecten.
  // Le decimos que use la conexión del servidor existente de Vercel.
  const wss = new WebSocket.Server({ server: req.socket.server });

  // 4. ¿Qué hacer cuando un navegador se conecta a nuestra "sala de espera"?
  // El evento 'connection' se dispara cada vez que tu frontend abre una conexión.
  wss.on('connection', (ws_client) => {
    
    console.log('¡Un cliente (navegador) se ha conectado!');

    // 5. Preparar la conexión con Deepgram
    // Usamos la clave de API que guardaremos de forma segura en Vercel.
    // process.env.DEEPGRAM_API_KEY es la forma segura de acceder a ella.
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

    // 6. Abrir una "línea telefónica" en tiempo real con Deepgram.
    // Le decimos qué modelo de IA usar ('nova-2' es rápido y preciso),
    // el idioma, y que aplique formato inteligente (puntuación, etc.).
    const connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'es', // Puedes cambiar esto a 'en' o hacerlo dinámico más tarde
      smart_format: true,
    });

    // 7. ¿Qué hacer cuando la "línea telefónica" con Deepgram se establece?
    connection.on('open', () => {
      console.log('Conexión con Deepgram abierta.');

      // 7a. Cuando Deepgram nos envía una transcripción...
      connection.on('transcript', (data) => {
        // ...la enviamos inmediatamente de vuelta al navegador que se conectó.
        // JSON.stringify convierte el objeto de datos en un texto que se puede enviar.
        ws_client.send(JSON.stringify(data));
      });

      // 7b. Cuando nuestro navegador nos envía un mensaje (que será audio)...
      ws_client.on('message', (message) => {
        // ...lo reenviamos directamente a Deepgram para que lo transcriba.
        // Primero, nos aseguramos de que la "línea" con Deepgram sigue abierta.
        if (connection.getReadyState() === 1) {
          connection.send(message);
        }
      });

      // 7c. Si el navegador se desconecta...
      ws_client.on('close', () => {
        console.log('El cliente se ha desconectado.');
        // ...le decimos a Deepgram que hemos terminado para no gastar recursos.
        connection.finish();
      });
    });

    // 8. Manejo de errores y cierre
    // Si la conexión con Deepgram se cierra por algún motivo, lo registramos.
    connection.on('close', () => {
      console.log('Conexión con Deepgram cerrada.');
    });

    connection.on('error', (error) => {
      console.error('Error de Deepgram:', error);
    });
  });

  // Esto es un poco técnico, pero asegura que todo se limpie correctamente
  // cuando la función de Vercel termina.
  res.socket.server.once('close', () => {
    wss.close();
  });
  
  // Finalizamos la respuesta HTTP inicial, ya que la comunicación principal
  // ahora ocurrirá a través del WebSocket.
  res.end();
}

// --- FIN DEL CÓDIGO PARA websocket.js ---