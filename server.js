const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { createClient } = require('@deepgram/sdk');

const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('Error reading file');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
    });
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws_client) => {
    console.log("LOG: ¡Cliente conectado al servidor WebSocket!");
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    
    // --- LA SOLUCIÓN FINAL ESTÁ AQUÍ ---
    const connection = deepgram.listen.live({
        model: 'nova-2',
        language: 'es',
        smart_format: true,
        interim_results: true, // Envía resultados rápidos mientras hablas
        endpointing: true,       // Activa la detección de pausas
        utterance_end_ms: '1000', // Finaliza la frase tras 1s de silencio
        keepalive: 'true'        // Mantiene la conexión más robusta
    });

    connection.on('open', () => {
        console.log("LOG: Conexión con Deepgram abierta y lista para recibir audio.");
    });

    connection.on('transcript', (data) => {
        console.log("LOG: Transcripción recibida de Deepgram!");
        ws_client.send(JSON.stringify(data));
    });

    connection.on('error', (e) => {
        console.error("LOG: Error de Deepgram:", e);
    });

    ws_client.on('message', (message) => {
        // Este log ya no es necesario, sabemos que funciona.
        // console.log(`LOG: Recibido paquete de audio. Tamaño: ${message.length} bytes.`);
        if (connection.getReadyState() === 1) { // 1 = OPEN
            connection.send(message);
        }
    });

    ws_client.on('close', () => {
        console.log("LOG: Cliente desconectado.");
        if (connection.getReadyState() === 1) {
            connection.finish();
        }
    });
    
    ws_client.on('error', (e) => {
         console.error("LOG: Error del cliente WebSocket:", e);
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});