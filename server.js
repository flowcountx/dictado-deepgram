// --- INICIO DEL CÓDIGO PARA server.js ---

// 1. Importar las herramientas necesarias
const http = require('http'); // Para crear un servidor web básico
const path = require('path'); // Para manejar rutas de archivos
const fs = require('fs');     // Para leer archivos del sistema
const WebSocket = require('ws'); // La librería para WebSockets
const { createClient } = require('@deepgram/sdk'); // El SDK de Deepgram

// 2. Crear el servidor HTTP principal
// Este servidor se encargará de una sola cosa: servir tu archivo `index.html`.
const server = http.createServer((req, res) => {
    // Construimos la ruta al archivo `index.html` dentro de la carpeta `public`.
    const filePath = path.join(__dirname, 'public', 'index.html');
    
    // Leemos el archivo.
    fs.readFile(filePath, (err, content) => {
        // Si hay un error (por ejemplo, no se encuentra el archivo), respondemos con un error 500.
        if (err) {
            res.writeHead(500);
            res.end('Error: No se pudo cargar el archivo index.html');
            return;
        }
        // Si todo va bien, respondemos con el contenido del archivo y le decimos al navegador que es HTML.
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
    });
});

// 3. Crear el servidor WebSocket y "adjuntarlo" a nuestro servidor HTTP.
// Esto permite que ambos servicios (web y WebSocket) funcionen en el mismo puerto.
const wss = new WebSocket.Server({ server });

// 4. Definir la lógica de la conexión WebSocket (esto es muy similar a lo que ya teníamos).
// Esto se ejecuta cada vez que un navegador se conecta a nuestro servidor.
wss.on('connection', (ws_client) => {
    console.log("LOG: ¡Cliente conectado al servidor WebSocket!");

    // Creamos una instancia del cliente de Deepgram usando la clave de API segura.
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    
    // Abrimos una conexión en tiempo real con Deepgram.
    const connection = deepgram.listen.live({
        model: 'nova-2',
        language: 'es', // Puedes cambiar esto o hacerlo dinámico
        smart_format: true,
    });

    // Cuando la conexión con Deepgram se abre con éxito...
    connection.on('open', () => {
        console.log("LOG: Conexión con Deepgram abierta.");

        // ...empezamos a escuchar los mensajes (audio) del cliente (navegador).
        ws_client.on('message', (message) => {
            // Reenviamos el audio directamente a Deepgram.
            connection.send(message);
        });

        // Si el cliente se desconecta, le decimos a Deepgram que hemos terminado.
        ws_client.on('close', () => {
            console.log("LOG: Cliente desconectado.");
            if (connection.getReadyState() === 1) {
                connection.finish();
            }
        });
    });

    // Cuando Deepgram nos envía una transcripción...
    connection.on('transcript', (data) => {
        // ...la enviamos de vuelta al cliente (navegador).
        ws_client.send(JSON.stringify(data));
    });

    // Manejo de errores de Deepgram.
    connection.on('error', (e) => {
        console.error("LOG: Error de Deepgram:", e);
    });
});

// 5. Iniciar el servidor para que empiece a escuchar peticiones.
// Render nos proporcionará el puerto a través de una variable de entorno `PORT`.
// Si estamos en local, usará el puerto 10000.
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});

// --- FIN DEL CÓDIGO PARA server.js ---