const socket = io();

let salaAtual = "";
let meuNumero = 0;

let tamanhoGrid = 4;

let nomeJogador1 = "";
let nomeJogador2 = "";

let jogadorAtual = 1;
let pontuacaoJ1 = 0;
let pontuacaoJ2 = 0;
let caixasFechadas = 0;

let linhasHorizontais;
let linhasVerticais;
let caixas;

const tabuleiro = document.getElementById("tabuleiro");
const placarJ1 = document.getElementById("jogador1");
const placarJ2 = document.getElementById("jogador2");
const turnoTexto = document.getElementById("turno");
const statusSala = document.getElementById("status");
const codigoSala = document.getElementById("codigoSala");

const btnNovaPartida = document.getElementById("btnNovaPartida");

document.getElementById("btnCriarSala").addEventListener("click", criarSala);
document.getElementById("btnEntrarSala").addEventListener("click", entrarSala);



function criarSala() {
    const nome = document.getElementById("nome").value.trim();

    if (nome === "") {
        alert("Digite seu nome.");
        return;
    }

    tamanhoGrid = parseInt(document.getElementById("tamanho").value);

    socket.emit("criarSala", nome, tamanhoGrid, (resposta) => {
        if (!resposta.sucesso) return;

        salaAtual = resposta.codigo;
        meuNumero = 1;
        nomeJogador1 = nome;

        codigoSala.innerText = "Código da Sala: " + salaAtual;
        statusSala.innerText = "Aguardando outro jogador...";

        bloquearMenu();
    });
}

function entrarSala() {
    const nome = document.getElementById("nome").value.trim();

    if (nome === "") {
        alert("Digite seu nome.");
        return;
    }

    const codigo = prompt("Digite o código da sala:");
    if (!codigo) return;

    socket.emit(
        "entrarSala",
        {
            nome,
            codigo: codigo.toUpperCase()
        },
        (resposta) => {
            if (!resposta.sucesso) {
                alert(resposta.mensagem);
                return;
            }

            salaAtual = codigo.toUpperCase();
            meuNumero = 2;
            nomeJogador2 = nome;

            bloquearMenu();
        }
    );
}

function bloquearMenu() {
    document.getElementById("nome").disabled = true;
    document.getElementById("tamanho").disabled = true;
    document.getElementById("btnCriarSala").disabled = true;
    document.getElementById("btnEntrarSala").disabled = true;

    document.getElementById("menu").style.display = "none";
}

/* ---------------- PARTIDA ---------------- */

socket.on("iniciarPartida", (dados) => {
    if (!dados?.jogadores || dados.jogadores.length < 2) return;

    nomeJogador1 = dados.jogadores[0].nome;
    nomeJogador2 = dados.jogadores[1].nome;

    tamanhoGrid = dados.tamanho;

    document.getElementById("nome1").innerText = nomeJogador1;
    document.getElementById("nome2").innerText = nomeJogador2;

    statusSala.innerText = "Partida iniciada!";
    btnNovaPartida.style.display = "none";

    reiniciarEstado();
});

socket.on("reiniciarPartida", (dados) => {
    tamanhoGrid = dados.tamanho;

    document.getElementById("tamanho").value = tamanhoGrid;
    document.getElementById("tamanho").disabled = true;

    btnNovaPartida.style.display = "none";
    btnNovaPartida.disabled = true;

    statusSala.innerText = "Nova partida iniciada!";

    reiniciarEstado();
});

function solicitarNovaPartida() {
    if (meuNumero !== 1) return;

    document.getElementById("menu").style.display = "flex";

    document.getElementById("nome").disabled = true;
    document.getElementById("tamanho").disabled = false;

    document.getElementById("btnCriarSala").style.display = "none";
    document.getElementById("btnEntrarSala").style.display = "none";

    btnNovaPartida.disabled = false;
    btnNovaPartida.style.display = "inline-block";
    btnNovaPartida.style.pointerEvents = "auto";
    btnNovaPartida.style.opacity = "1";
}

/* ---------------- GAME ---------------- */

function reiniciarEstado() {
    jogadorAtual = 1;
    pontuacaoJ1 = 0;
    pontuacaoJ2 = 0;
    caixasFechadas = 0;

    placarJ1.innerText = "0";
    placarJ2.innerText = "0";

    linhasHorizontais = Array.from(
        { length: tamanhoGrid + 1 },
        () => Array(tamanhoGrid).fill(false)
    );

    linhasVerticais = Array.from(
        { length: tamanhoGrid },
        () => Array(tamanhoGrid + 1).fill(false)
    );

    caixas = Array.from(
        { length: tamanhoGrid },
        () => Array(tamanhoGrid).fill(null)
    );

    atualizarTurno();
    criarTabuleiro();
}

function atualizarTurno() {
    if (jogadorAtual === 1) {
        turnoTexto.innerText = `Vez de ${nomeJogador1}`;
        turnoTexto.style.color = "#42a5ff";
    } else {
        turnoTexto.innerText = `Vez de ${nomeJogador2}`;
        turnoTexto.style.color = "#ff5a7a";
    }
}

function criarTabuleiro() {
    tabuleiro.innerHTML = "";

    const tamanho = tamanhoGrid * 2 + 1;
    const ehCelular = window.innerWidth <= 700;

    let tamanhoCaixa;
    let tamanhoPonto;

    if (ehCelular) {
        const larguraDisponivel = window.innerWidth - 30;
        const tamanhoPontoNumero = 4;

        tamanhoCaixa = Math.floor(
            (larguraDisponivel - ((tamanhoGrid + 1) * tamanhoPontoNumero)) / tamanhoGrid
        );

        tamanhoCaixa = Math.max(14, tamanhoCaixa);
        tamanhoCaixa = Math.min(45, tamanhoCaixa);

        tamanhoPonto = tamanhoPontoNumero + "px";
        tamanhoCaixa = tamanhoCaixa + "px";
    } else {
        tamanhoPonto = "16px";
        tamanhoCaixa = "60px";
    }

    let colunas = "";
    let linhas = "";

    for (let i = 0; i < tamanho; i++) {
        if (i % 2 === 0) {
            colunas += tamanhoPonto + " ";
            linhas += tamanhoPonto + " ";
        } else {
            colunas += tamanhoCaixa + " ";
            linhas += tamanhoCaixa + " ";
        }
    }

    tabuleiro.style.gridTemplateColumns = colunas;
    tabuleiro.style.gridTemplateRows = linhas;

    for (let r = 0; r < tamanho; r++) {
        for (let c = 0; c < tamanho; c++) {
            const el = document.createElement("div");

            if (r % 2 === 0 && c % 2 === 0) {
                el.classList.add("ponto");
            }

            else if (r % 2 === 0) {
                el.classList.add("linha-h");

                const f = r / 2;
                const col = (c - 1) / 2;

                el.addEventListener("click", () => jogar("h", f, col, el));
            }

            else if (c % 2 === 0) {
                el.classList.add("linha-v");

                const f = (r - 1) / 2;
                const col = c / 2;

                el.addEventListener("click", () => jogar("v", f, col, el));
            }

            else {
                el.classList.add("caixa");
                caixas[(r - 1) / 2][(c - 1) / 2] = el;
            }

            tabuleiro.appendChild(el);
        }
    }
}

/* ---------------- JOGADA ---------------- */

function jogar(tipo, f, c, el) {
    if (
        (meuNumero === 1 && jogadorAtual !== 1) ||
        (meuNumero === 2 && jogadorAtual !== 2)
    ) return;

    const jogadorDaJogada = jogadorAtual;

    if (tipo === "h") {
        if (linhasHorizontais[f][c]) return;
        selecionarLinhaHorizontal(f, c, el, jogadorDaJogada);
    } else {
        if (linhasVerticais[f][c]) return;
        selecionarLinhaVertical(f, c, el, jogadorDaJogada);
    }

    socket.emit("jogada", {
        sala: salaAtual,
        tipo,
        f,
        c,
        jogador: jogadorDaJogada
    });
}

socket.on("jogadaRecebida", (dados) => {
    if (dados.tipo === "h") {
        const idx = dados.f * tamanhoGrid + dados.c;
        const el = document.querySelectorAll(".linha-h")[idx];

        selecionarLinhaHorizontal(dados.f, dados.c, el, dados.jogador);
    } else {
        const idx = dados.f * (tamanhoGrid + 1) + dados.c;
        const el = document.querySelectorAll(".linha-v")[idx];

        selecionarLinhaVertical(dados.f, dados.c, el, dados.jogador);
    }
});

function selecionarLinhaHorizontal(f, c, el, jogador) {
    if (!el || linhasHorizontais[f][c]) return;

    linhasHorizontais[f][c] = true;
    el.classList.add(jogador === 1 ? "selecionada-j1" : "selecionada-j2");

    verificarCaixas(f, c, "h");
}

function selecionarLinhaVertical(f, c, el, jogador) {
    if (!el || linhasVerticais[f][c]) return;

    linhasVerticais[f][c] = true;
    el.classList.add(jogador === 1 ? "selecionada-j1" : "selecionada-j2");

    verificarCaixas(f, c, "v");
}

/* ---------------- LÓGICA ---------------- */

function verificarCaixas(f, c, tipo) {
    let ganhouPonto = false;

    if (tipo === "h") {
        if (f > 0 && checarCaixaCompleta(f - 1, c)) {
            marcarCaixa(f - 1, c);
            ganhouPonto = true;
        }

        if (f < tamanhoGrid && checarCaixaCompleta(f, c)) {
            marcarCaixa(f, c);
            ganhouPonto = true;
        }
    }

    if (tipo === "v") {
        if (c > 0 && checarCaixaCompleta(f, c - 1)) {
            marcarCaixa(f, c - 1);
            ganhouPonto = true;
        }

        if (c < tamanhoGrid && checarCaixaCompleta(f, c)) {
            marcarCaixa(f, c);
            ganhouPonto = true;
        }
    }

    if (!ganhouPonto) {
        jogadorAtual = jogadorAtual === 1 ? 2 : 1;
        atualizarTurno();
    }

    verificarFimDeJogo();
}

function checarCaixaCompleta(f, c) {
    return (
        linhasHorizontais[f][c] &&
        linhasHorizontais[f + 1][c] &&
        linhasVerticais[f][c] &&
        linhasVerticais[f][c + 1]
    );
}

function marcarCaixa(f, c) {
    if (
        caixas[f][c].classList.contains("j1") ||
        caixas[f][c].classList.contains("j2")
    ) {
        return;
    }

    caixas[f][c].classList.add(jogadorAtual === 1 ? "j1" : "j2");

    if (jogadorAtual === 1) {
        pontuacaoJ1++;
        placarJ1.innerText = pontuacaoJ1;
    } else {
        pontuacaoJ2++;
        placarJ2.innerText = pontuacaoJ2;
    }

    caixasFechadas++;
}

function verificarFimDeJogo() {
    if (caixasFechadas !== tamanhoGrid * tamanhoGrid) return;

    let vencedor = "Empate";

    if (pontuacaoJ1 > pontuacaoJ2) {
        vencedor = nomeJogador1;
        turnoTexto.style.color = "#42a5ff";
    } else if (pontuacaoJ2 > pontuacaoJ1) {
        vencedor = nomeJogador2;
        turnoTexto.style.color = "#ff5a7a";
    }

    turnoTexto.innerText = "🏆 " + vencedor + " venceu!";

    statusSala.innerText =
        meuNumero === 1
            ? "Escolha o novo tamanho e clique em Jogar novamente."
            : "Aguardando o jogador 1 iniciar nova partida.";

    solicitarNovaPartida();
}

/* ---------------- OUTROS EVENTOS ---------------- */

socket.on("jogadorSaiu", () => {
    alert("O outro jogador saiu da sala.");
    location.reload();
});
function chamarNovaPartida() {

    console.log("FUNÇÃO CHAMADA");

    const novoTamanho =
        parseInt(document.getElementById("tamanho").value);

    console.log("Sala:", salaAtual);
    console.log("Tamanho:", novoTamanho);

    socket.emit("novaPartida", {
        sala: salaAtual,
        tamanho: novoTamanho
    });
}