const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Le serveur distribuera les fichiers du dossier "public"
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Un joueur s\'est connecté : ' + socket.id);

    socket.on('disconnect', () => {
        console.log('Un joueur s\'est déconnecté');
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Serveur du jeu lancé sur http://localhost:${PORT}`);
});