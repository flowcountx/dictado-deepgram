const { createClient } = require("@deepgram/sdk");
const WebSocket = require('ws');

module.exports = (req, res) => {
    // Comprobamos si ya hemos configurado el servidor WebSocket en una ejecución anterior.
    // Esto evita crear un nuevo servidor en cada pequeña petición.
    if (!res.socket.server.websocketServer) {
        console.log("LOG: Configurando el servidor WebSocket por primera vez.");
        
        const wss = new WebSocket.Server({ noServer: true });
        res.socket.server.websocketServer = wss;

        // Le decimos al servidor HTTP principal de Vercel qué hacer cuando reciba una petición de "upgrade".
        res.socket.server.on('upgrade', (request, socket, head) => {
            console.log("LOG: Petición de upgrade recibida. Intentando manejarla.");
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        });

        // Esta es la lógica principal: qué hacer cuando un cliente se conecta con éxito.
        wss.on('connection', (ws_client) => {
            console.log("LOG: ¡CLIENTE CONECTADO CON ÉXITO!");

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
    }
    
    // Finalizamos la respuesta a la petición HTTP inicial. El trabajo se hará en el 'upgrade'.
    res.end();
};