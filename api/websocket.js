const WebSocket = require('ws');

// Creamos el servidor WebSocket UNA SOLA VEZ, fuera del manejador.
// Esto permite que la instancia se reutilice entre las invocaciones de la función.
const wss = new WebSocket.Server({ noServer: true });

// Definimos la lógica de conexión para el servidor de eco.
wss.on('connection', (ws_client) => {
    console.log("LOG: ¡Cliente conectado al SERVIDOR DE ECO!");

    ws_client.on('message', (message) => {
        // Convertimos el mensaje a texto para poder registrarlo y devolverlo.
        const messageText = message.toString();
        console.log(`LOG: Recibido en eco: "${messageText}"`);

        // Enviamos el mensaje de vuelta al cliente.
        ws_client.send(`El servidor dice: "${messageText}"`);
    });

    ws_client.on('close', () => {
        console.log("LOG: Cliente desconectado del servidor de eco.");
    });

    ws_client.on('error', (error) => {
        console.error("LOG: Error en el servidor de eco:", error);
    });
});

// Esta es la función que Vercel ejecutará en cada petición.
module.exports = (req, res) => {
    // Comprobamos si la petición es un intento de "upgrade" a WebSocket.
    if (req.headers['upgrade']?.toLowerCase() === 'websocket') {
        // Si lo es, le decimos al servidor WebSocket que maneje la petición.
        // Esta función transfiere el control de la conexión al WebSocket y no cierra la respuesta.
        wss.handleUpgrade(req, res.socket, Buffer.alloc(0), (ws) => {
            wss.emit('connection', ws, req);
        });
    } else {
        // Si es una petición HTTP normal que llega aquí por error, la rechazamos.
        res.statusCode = 400;
        res.end('Esta ruta es solo para conexiones WebSocket.');
    }
};