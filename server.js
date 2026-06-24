const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const salas = {};

io.on("connection", (socket) => {

    console.log("Conectou:", socket.id);

    /* ---------------- CRIAR SALA ---------------- */
    socket.on("criarSala", (nome, tamanho, callback) => {

        const codigo = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();

        console.log("Sala criada:", codigo);

        salas[codigo] = {
            tamanho: tamanho, // 🔥 FIX
            jogadores: [
                {
                    id: socket.id,
                    nome
                }
            ]
        };

        socket.join(codigo);

        callback({
            sucesso: true,
            codigo
        });
    });

    /* ---------------- ENTRAR SALA ---------------- */
    socket.on("entrarSala", (dados, callback) => {

        const sala = salas[dados.codigo];

        if (!sala) {
            callback({
                sucesso: false,
                mensagem: "Sala não encontrada"
            });
            return;
        }

        if (sala.jogadores.length >= 2) {
            callback({
                sucesso: false,
                mensagem: "Sala cheia"
            });
            return;
        }

        sala.jogadores.push({
            id: socket.id,
            nome: dados.nome
        });

        socket.join(dados.codigo);

        /* 🔥 IMPORTANTE: envia array direto (igual client espera agora) */
        io.to(dados.codigo).emit("iniciarPartida", {
    jogadores: sala.jogadores,
    tamanho: sala.tamanho
});

        callback({
            sucesso: true
        });
    });

    /* ---------------- JOGADA ---------------- */
    socket.on("jogada", (dados) => {

        if (!dados || !dados.sala) return;

        socket.to(dados.sala).emit(
            "jogadaRecebida",
            dados
        );
    });

    /* ---------------- NOVA PARTIDA ---------------- */
socket.on("novaPartida", (dados) => {

    console.log("NOVA PARTIDA RECEBIDA");
    console.log(dados);

    if (!dados || !dados.sala) return;

    const sala = salas[dados.sala];

    if (!sala) {
        console.log("SALA NÃO ENCONTRADA");
        return;
    }

    sala.tamanho = dados.tamanho;

    io.to(dados.sala).emit("reiniciarPartida", {
        jogadores: sala.jogadores,
        tamanho: sala.tamanho
    });

    console.log("REINICIANDO PARTIDA");
});

    /* ---------------- SAIR ---------------- */
    socket.on("disconnect", () => {

        for (const codigo in salas) {

            const sala = salas[codigo];

            sala.jogadores = sala.jogadores.filter(
                j => j.id !== socket.id
            );

            if (sala.jogadores.length === 0) {
                delete salas[codigo];
            }
        }
    });
});

/* ---------------- START SERVER ---------------- */
http.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});
