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

// Serve os arquivos da pasta pública (onde vai ficar o index.html)
app.use(express.static(path.join(__dirname, 'public')));

let liveStreamer = null;
let activeListeners = 0;

io.on('connection', (socket) => {
    // Incrementa contador quando alguém conecta
    activeListeners++;
    io.emit('listenerCount', activeListeners);

    // Identifica se é o locutor iniciando a transmissão
    socket.on('startStream', (password) => {
        if (password === '1234') { // Altere aqui a sua senha se desejar
            liveStreamer = socket.id;
            socket.emit('streamStatus', { success: true, message: "Transmissão iniciada com sucesso!" });
            io.emit('radioStatus', { online: true });
        } else {
            socket.emit('streamStatus', { success: false, message: "Senha incorreta!" });
        }
    });

    // Recebe os dados de áudio do locutor e repassa para todos os ouvintes
    socket.on('audioChunks', (data) => {
        if (socket.id === liveStreamer) {
            socket.broadcast.emit('audioStream', data);
        }
    });

    // Quando o locutor finaliza a transmissão por vontade própria
    socket.on('stopStream', () => {
        if (socket.id === liveStreamer) {
            liveStreamer = null;
            io.emit('radioStatus', { online: false });
        }
    });

    // Decrementa contador ao desconectar
    socket.on('disconnect', () => {
        activeListeners = Math.max(0, activeListeners - 1);
        io.emit('listenerCount', activeListeners);
        
        // Se o locutor fechar a aba ou cair a internet, encerra a transmissão
        if (socket.id === liveStreamer) {
            liveStreamer = null;
            io.emit('radioStatus', { online: false });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor de rádio rodando na porta ${PORT}`);
});