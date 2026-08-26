const socket = io();

let salaAtual = "";
let meuNumero = 0;
let modoJogo = "";
let nivelIA = "facil";
let instanciaIA = null;
let iaPensando = false;
let jogoFinalizado = false;

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
const menuInicial = document.getElementById("menuInicial");
const menuOnline = document.getElementById("menu");
const menuIA = document.getElementById("menuIA");
const areaJogo = document.getElementById("areaJogo");

/* ---------------- NAVEGAÇÃO ---------------- */

document.getElementById("btnModoOnline").addEventListener("click", () => {
    modoJogo = "online";
    menuInicial.style.display = "none";
    menuIA.style.display = "none";
    menuOnline.style.display = "flex";
});

document.getElementById("btnModoIA").addEventListener("click", () => {
    modoJogo = "ia";
    menuInicial.style.display = "none";
    menuOnline.style.display = "none";
    menuIA.style.display = "flex";
});

document.getElementById("btnVoltarOnline").addEventListener("click", voltarMenuInicial);
document.getElementById("btnVoltarIA").addEventListener("click", voltarMenuInicial);
document.getElementById("btnCriarSala").addEventListener("click", criarSala);
document.getElementById("btnEntrarSala").addEventListener("click", entrarSala);
document.getElementById("btnIniciarIA").addEventListener("click", iniciarPartidaIA);

function voltarMenuInicial() {
    modoJogo = "";
    menuOnline.style.display = "none";
    menuIA.style.display = "none";
    areaJogo.style.display = "none";
    menuInicial.style.display = "flex";
}

function mostrarAreaJogo() {
    menuInicial.style.display = "none";
    menuOnline.style.display = "none";
    menuIA.style.display = "none";
    areaJogo.style.display = "block";
}

/* ---------------- MODO ONLINE ---------------- */

function criarSala() {
    const nome = document.getElementById("nome").value.trim();

    if (nome === "") {
        alert("Digite seu nome.");
        return;
    }

    modoJogo = "online";
    tamanhoGrid = parseInt(document.getElementById("tamanho").value, 10);

    socket.emit("criarSala", nome, tamanhoGrid, (resposta) => {
        if (!resposta.sucesso) return;

        salaAtual = resposta.codigo;
        meuNumero = 1;
        nomeJogador1 = nome;

        codigoSala.innerText = "Código da Sala: " + salaAtual;
        statusSala.innerText = "Aguardando outro jogador...";

        bloquearMenuOnline();
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

    modoJogo = "online";

    socket.emit(
        "entrarSala",
        {
            nome,
            codigo: codigo.trim().toUpperCase()
        },
        (resposta) => {
            if (!resposta.sucesso) {
                alert(resposta.mensagem);
                return;
            }

            salaAtual = codigo.trim().toUpperCase();
            meuNumero = 2;
            nomeJogador2 = nome;

            bloquearMenuOnline();
        }
    );
}

function bloquearMenuOnline() {
    document.getElementById("nome").disabled = true;
    document.getElementById("tamanho").disabled = true;
    document.getElementById("btnCriarSala").disabled = true;
    document.getElementById("btnEntrarSala").disabled = true;
    mostrarAreaJogo();
}

socket.on("iniciarPartida", (dados) => {
    if (!dados?.jogadores || dados.jogadores.length < 2) return;

    modoJogo = "online";
    nomeJogador1 = dados.jogadores[0].nome;
    nomeJogador2 = dados.jogadores[1].nome;
    tamanhoGrid = Number(dados.tamanho);

    atualizarNomesPlacar();
    statusSala.innerText = "Partida iniciada!";
    codigoSala.innerText = "Código da Sala: " + salaAtual;
    btnNovaPartida.style.display = "none";

    mostrarAreaJogo();
    reiniciarEstado();
});

socket.on("reiniciarPartida", (dados) => {
    modoJogo = "online";
    tamanhoGrid = Number(dados.tamanho);

    document.getElementById("tamanho").value = tamanhoGrid;
    document.getElementById("tamanho").disabled = true;

    btnNovaPartida.style.display = "none";
    btnNovaPartida.disabled = true;
    menuOnline.style.display = "none";
    statusSala.innerText = "Nova partida iniciada!";

    reiniciarEstado();
});

socket.on("jogadaRecebida", (dados) => {
    executarJogada(dados.tipo, dados.f, dados.c, dados.jogador);
});

socket.on("jogadorSaiu", () => {
    alert("O outro jogador saiu da sala.");
    location.reload();
});

/* ---------------- MODO IA ---------------- */

function iniciarPartidaIA() {
    const nome = document.getElementById("nomeIA").value.trim();

    if (nome === "") {
        alert("Digite seu nome.");
        return;
    }

    modoJogo = "ia";
    meuNumero = 1;
    salaAtual = "";
    nivelIA = document.getElementById("nivelIA").value;
    tamanhoGrid = parseInt(document.getElementById("tamanhoIA").value, 10);
    instanciaIA = new IA(nivelIA);

    nomeJogador1 = nome;
    nomeJogador2 = `🤖 IA ${nomeNivelIA(nivelIA)}`;

    document.getElementById("nome").value = nome;
    document.getElementById("tamanho").value = tamanhoGrid;

    atualizarNomesPlacar();
    codigoSala.innerText = "";
    statusSala.innerText = `Partida contra IA ${nomeNivelIA(nivelIA)} iniciada!`;

    mostrarAreaJogo();
    reiniciarEstado();
}

function nomeNivelIA(nivel) {
    const nomes = {
        facil: "Fácil",
        medio: "Média",
        dificil: "Difícil"
    };
    return nomes[nivel] || "Fácil";
}

function agendarJogadaIA() {
    if (
        modoJogo !== "ia" ||
        jogoFinalizado ||
        jogadorAtual !== 2 ||
        iaPensando
    ) {
        return;
    }

    iaPensando = true;
    turnoTexto.innerText = `${nomeJogador2} está pensando...`;
    turnoTexto.style.color = "#ff5a7a";

    window.setTimeout(() => {
        const jogada = instanciaIA.escolherJogada({
            tamanhoGrid,
            linhasHorizontais,
            linhasVerticais
        });

        iaPensando = false;

        if (!jogada || jogoFinalizado) return;

        executarJogada(jogada.tipo, jogada.f, jogada.c, 2);

        if (!jogoFinalizado && jogadorAtual === 2) {
            agendarJogadaIA();
        }
    }, 650);
}

/* ---------------- ESTADO DO JOGO ---------------- */

function reiniciarEstado() {
    jogadorAtual = 1;
    pontuacaoJ1 = 0;
    pontuacaoJ2 = 0;
    caixasFechadas = 0;
    jogoFinalizado = false;
    iaPensando = false;

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

    btnNovaPartida.style.display = "none";
    atualizarTurno();
    criarTabuleiro();
}

function atualizarNomesPlacar() {
    document.getElementById("nome1").innerText = nomeJogador1 || "Jogador 1";
    document.getElementById("nome2").innerText = nomeJogador2 || "Jogador 2";
}

function atualizarTurno() {
    if (jogoFinalizado) return;

    if (jogadorAtual === 1) {
        turnoTexto.innerText = `Vez de ${nomeJogador1}`;
        turnoTexto.style.color = "#42a5ff";
    } else {
        turnoTexto.innerText = `Vez de ${nomeJogador2}`;
        turnoTexto.style.color = "#ff5a7a";
    }
}

/* ---------------- TABULEIRO ---------------- */

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
            } else if (r % 2 === 0) {
                el.classList.add("linha-h");

                const f = r / 2;
                const col = (c - 1) / 2;
                el.addEventListener("click", () => jogar("h", f, col));
            } else if (c % 2 === 0) {
                el.classList.add("linha-v");

                const f = (r - 1) / 2;
                const col = c / 2;
                el.addEventListener("click", () => jogar("v", f, col));
            } else {
                el.classList.add("caixa");
                caixas[(r - 1) / 2][(c - 1) / 2] = el;
            }

            tabuleiro.appendChild(el);
        }
    }
}

/* ---------------- JOGADAS ---------------- */

function jogar(tipo, f, c) {
    if (jogoFinalizado || iaPensando) return;

    if (modoJogo === "online") {
        if (
            (meuNumero === 1 && jogadorAtual !== 1) ||
            (meuNumero === 2 && jogadorAtual !== 2)
        ) {
            return;
        }
    }

    if (modoJogo === "ia" && jogadorAtual !== 1) return;

    const jogadorDaJogada = jogadorAtual;
    const executada = executarJogada(tipo, f, c, jogadorDaJogada);

    if (!executada) return;

    if (modoJogo === "online") {
        socket.emit("jogada", {
            sala: salaAtual,
            tipo,
            f,
            c,
            jogador: jogadorDaJogada
        });
    }

    if (modoJogo === "ia" && !jogoFinalizado && jogadorAtual === 2) {
        agendarJogadaIA();
    }
}

function executarJogada(tipo, f, c, jogador) {
    if (jogoFinalizado) return false;

    jogadorAtual = jogador;

    if (tipo === "h") {
        if (linhasHorizontais[f]?.[c]) return false;

        linhasHorizontais[f][c] = true;
        const idx = f * tamanhoGrid + c;
        const el = document.querySelectorAll(".linha-h")[idx];
        if (!el) return false;
        el.classList.add(jogador === 1 ? "selecionada-j1" : "selecionada-j2");
    } else if (tipo === "v") {
        if (linhasVerticais[f]?.[c]) return false;

        linhasVerticais[f][c] = true;
        const idx = f * (tamanhoGrid + 1) + c;
        const el = document.querySelectorAll(".linha-v")[idx];
        if (!el) return false;
        el.classList.add(jogador === 1 ? "selecionada-j1" : "selecionada-j2");
    } else {
        return false;
    }

    verificarCaixas(f, c, tipo, jogador);
    return true;
}

function verificarCaixas(f, c, tipo, jogador) {
    let ganhouPonto = false;

    if (tipo === "h") {
        if (f > 0 && checarCaixaCompleta(f - 1, c)) {
            ganhouPonto = marcarCaixa(f - 1, c, jogador) || ganhouPonto;
        }

        if (f < tamanhoGrid && checarCaixaCompleta(f, c)) {
            ganhouPonto = marcarCaixa(f, c, jogador) || ganhouPonto;
        }
    }

    if (tipo === "v") {
        if (c > 0 && checarCaixaCompleta(f, c - 1)) {
            ganhouPonto = marcarCaixa(f, c - 1, jogador) || ganhouPonto;
        }

        if (c < tamanhoGrid && checarCaixaCompleta(f, c)) {
            ganhouPonto = marcarCaixa(f, c, jogador) || ganhouPonto;
        }
    }

    if (!ganhouPonto) {
        jogadorAtual = jogador === 1 ? 2 : 1;
    }

    if (!verificarFimDeJogo()) {
        atualizarTurno();
    }
}

function checarCaixaCompleta(f, c) {
    return (
        linhasHorizontais[f][c] &&
        linhasHorizontais[f + 1][c] &&
        linhasVerticais[f][c] &&
        linhasVerticais[f][c + 1]
    );
}

function marcarCaixa(f, c, jogador) {
    const caixa = caixas[f]?.[c];
    if (!caixa) return false;

    if (
        caixa.classList.contains("j1") ||
        caixa.classList.contains("j2")
    ) {
        return false;
    }

    caixa.classList.add(jogador === 1 ? "j1" : "j2");

    if (jogador === 1) {
        pontuacaoJ1++;
        placarJ1.innerText = pontuacaoJ1;
    } else {
        pontuacaoJ2++;
        placarJ2.innerText = pontuacaoJ2;
    }

    caixasFechadas++;
    return true;
}

/* ---------------- FIM E NOVA PARTIDA ---------------- */

function verificarFimDeJogo() {
    if (caixasFechadas !== tamanhoGrid * tamanhoGrid) return false;

    jogoFinalizado = true;

    if (pontuacaoJ1 === pontuacaoJ2) {
        turnoTexto.innerText = "🤝 Empate!";
        turnoTexto.style.color = "#ffd700";
    } else if (pontuacaoJ1 > pontuacaoJ2) {
        turnoTexto.innerText = `🏆 ${nomeJogador1} venceu!`;
        turnoTexto.style.color = "#42a5ff";
    } else {
        turnoTexto.innerText = `🏆 ${nomeJogador2} venceu!`;
        turnoTexto.style.color = "#ff5a7a";
    }

    statusSala.innerText =
        modoJogo === "ia" || meuNumero === 1
            ? "Escolha o novo tamanho e clique em Jogar novamente."
            : "Aguardando o jogador 1 iniciar nova partida.";

    solicitarNovaPartida();
    return true;
}

function solicitarNovaPartida() {
    if (modoJogo === "online" && meuNumero !== 1) return;

    menuOnline.style.display = "flex";
    document.getElementById("nome").disabled = true;
    document.getElementById("tamanho").disabled = false;
    document.getElementById("btnCriarSala").style.display = "none";
    document.getElementById("btnEntrarSala").style.display = "none";
    document.getElementById("btnVoltarOnline").style.display = "none";

    btnNovaPartida.disabled = false;
    btnNovaPartida.style.display = "inline-block";
    btnNovaPartida.style.pointerEvents = "auto";
    btnNovaPartida.style.opacity = "1";
}

function chamarNovaPartida() {
    const novoTamanho = parseInt(document.getElementById("tamanho").value, 10);

    if (modoJogo === "ia") {
        tamanhoGrid = novoTamanho;
        document.getElementById("tamanhoIA").value = novoTamanho;
        menuOnline.style.display = "none";
        btnNovaPartida.style.display = "none";
        statusSala.innerText = `Nova partida contra IA ${nomeNivelIA(nivelIA)}!`;
        reiniciarEstado();
        return;
    }

    socket.emit("novaPartida", {
        sala: salaAtual,
        tamanho: novoTamanho
    });
}
