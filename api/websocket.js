const { createClient } = require("@deepgram/sdk");
const WebSocket = require('ws');

// El manejador que Vercel ejecutará.
module.exports = (req, res) => {
    // Creamos un servidor WebSocket, pero le decimos que no maneje el servidor HTTP.
    const wss = new WebSocket.Server({ noServer: true });

    // Esta es la lógica principal: qué hacer cuando un cliente se conecta.
    wss.on('connection', (ws_client) => {
        console.log("LOG: Cliente conectado al backend de WebSocket.");

        const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
        const connection = deepgram.listen.live({ model: 'nova-2', language: 'es', smart_format: true });

        connection.on('open', () => {
            console.log("LOG: Conexión con Deepgram abierta.");
            ws_client.on('message', (message) => connection.send(message));
            ws_client.on('close', () => {
                console.log("LOG: Cliente desconectado.");
                if(connection.getReadyState() === 1) connection.finish();
            });
        });

        connection.on('transcript', (data) => ws_client.send(JSON.stringify(data)));
        connection.on('error', (e) => console.error("LOG: Error de Deepgram:", e));
        ws_client.on('error', (e) => console.error("LOG: Error del Cliente WebSocket:", e));
    });

    // Esta es la parte crucial y diferente.
    // Tomamos la petición HTTP entrante (`req`) y le decimos al servidor WebSocket
    // que la "actualice" a una conexión WebSocket. Es el método más directo.
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
        wss.emit('connection', ws, req);
    });
};