const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Configuração inteligente: tenta servir da raiz e também da pasta 'public'
app.use(express.static(path.join(__dirname, '.')));
app.use(express.static(path.join(__dirname, 'public')));

// Rota padrão para garantir a entrega do arquivo correto
app.get('/', (req, res) => {
    // Tenta enviar da pasta public se existir, senão envia da raiz
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, 'index.html'));
        }
    });
});

let locutorSocketId = null;
let ouvintesContador = 0;

io.on('connection', (socket) => {
    ouvintesContador++;
    io.emit('contador-atualizado', ouvintesContador);

    socket.on('registrar-locutor', () => {
        locutorSocketId = socket.id;
        io.emit('status-radio', { noAr: true });
    });

    socket.on('stream-audio', (chunk) => {
        if (socket.id === locutorSocketId) {
            socket.broadcast.emit('audio-recebido', chunk);
        }
    });

    socket.on('parar-stream', () => {
        if (socket.id === locutorSocketId) {
            locutorSocketId = null;
            io.emit('status-radio', { noAr: false });
        }
    });

    socket.on('disconnect', () => {
        ouvintesContador = Math.max(0, ouvintesContador - 1);
        io.emit('contador-atualizado', ouvintesContador);
        
        if (socket.id === locutorSocketId) {
            locutorSocketId = null;
            io.emit('status-radio', { noAr: false });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor da rádio rodando na porta ${PORT}`);
});
