const express = require('express');
const path = require('path');
const { createClient } = require('@deepgram/sdk');

const app = express();
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Middleware para recibir datos binarios (audio)
app.use(express.raw({ type: 'audio/*', limit: '10mb' }));

// Sirve tu archivo index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para la transcripción
app.post('/api/transcribe', async (req, res) => {
    console.log("LOG: Recibida petición de transcripción.");
    try {
        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            req.body, // El buffer de audio
            { model: 'nova-2', language: 'es', smart_format: true }
        );

        if (error) {
            console.error("LOG: Error de Deepgram:", error);
            return res.status(500).json({ error: error.message });
        }

        const transcript = result.results.channels[0].alternatives[0].transcript;
        console.log("LOG: Transcripción exitosa:", transcript);
        res.json({ transcript });

    } catch (e) {
        console.error("LOG: Error catastrófico en /api/transcribe:", e);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});