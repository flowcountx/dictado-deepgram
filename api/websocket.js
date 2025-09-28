const { createClient } = require("@deepgram/sdk");
const WebSocket = require('ws');

// Creamos el servidor WebSocket UNA SOLA VEZ, fuera del manejador.
// Esto permite que se reutilice entre invocaciones de la función.
const wss = new WebSocket.Server({ noServer: true });

// Definimos la lógica de conexión una sola vez.
wss.on('connection', (ws_client) => {
    console.log("LOG: ¡CLIENTE CONECTADO CON ÉXITO!");

    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    const connection = deepgram.listen.live({ model: 'nova-2', language: 'es', smart_format: true });

    connection.on('open', () => {
        console.log("LOG: Conexión con Deepgram abierta.");
        ws_client.on('message', (message) => connection.send(message));
        ws_client.on('close', () => {
            console.log("LOG: Cliente desconectado.");
            if (connection.getReadyState() === 1) connection.finish();
        });
    });

    connection.on('transcript', (data) => ws_client.send(JSON.stringify(data)));
    connection.on('error', (e) => console.error("LOG: Error de Deepgram:", e));
    ws_client.on('error', (e) => console.error("LOG: Error del Cliente WebSocket:", e));
});

// Esta es la función que Vercel ejecutará en cada petición.
module.exports = (req, res) => {
    // Comprobamos si la petición es un intento de "upgrade" a WebSocket.
    if (req.headers['upgrade']?.toLowerCase() === 'websocket') {
        // Si lo es, le decimos al servidor WebSocket que maneje la petición.
        // Crucialmente, esta función NO llama a res.end(). El control se transfiere al WebSocket.
        wss.handleUpgrade(req, res.socket, Buffer.alloc(0), (ws) => {
            wss.emit('connection', ws, req);
        });
    } else {
        // Si es una petición HTTP normal, respondemos con un error y terminamos.
        res.statusCode = 405; // Method Not Allowed
        res.end();
    }
};