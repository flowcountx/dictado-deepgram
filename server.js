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
    const connection = deepgram.listen.live({ model: 'nova-2', language: 'es', smart_format: true });

    connection.on('open', () => {
        console.log("LOG: Conexión con Deepgram abierta y lista para recibir audio.");
    });

    connection.on('transcript', (data) => {
        ws_client.send(JSON.stringify(data));
    });

    connection.on('error', (e) => {
        console.error("LOG: Error de Deepgram:", e);
    });

    ws_client.on('message', (message) => {
        // ESTE ES EL LOG MÁS IMPORTANTE. AHORA DEBERÍAMOS VERLO.
        console.log(`LOG: Recibido un paquete de audio del cliente. Tamaño: ${message.length} bytes.`);
        if (connection.getReadyState() === 1) {
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