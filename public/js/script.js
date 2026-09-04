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
let comboAtual = 0;
let comboJogador = 0;
let maiorComboPartida = 0;
let estatisticaRegistradaPartida = false;
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
const btnSom = document.getElementById("btnSom");
const volumeSom = document.getElementById("volumeSom");
const volumeValor = document.getElementById("volumeValor");

function atualizarBotaoSom() {
    if (!btnSom || !window.SMSAudio) return;
    const mutado = SMSAudio.isMuted();
    btnSom.textContent = mutado ? "🔇" : "🔊";
    btnSom.title = mutado ? "Ativar sons" : "Desativar sons";
    btnSom.setAttribute("aria-label", btnSom.title);
    if (volumeSom) volumeSom.value = SMSAudio.getVolume();
    if (volumeValor) volumeValor.textContent = `${Math.round(SMSAudio.getVolume())}%`;
}

if (btnSom) {
    btnSom.addEventListener("click", () => {
        SMSAudio.unlock();
        SMSAudio.toggle();
        atualizarBotaoSom();
    });
    atualizarBotaoSom();
}

if (volumeSom) {
    volumeSom.addEventListener("input", () => {
        SMSAudio.unlock();
        SMSAudio.setVolume(volumeSom.value);
        atualizarBotaoSom();
    });
}



/* ---------------- ESTATISTICAS 4.5 ---------------- */
const CHAVE_STATS = "smsStudioPontinhosStatsV1";

function lerEstatisticas() {
    try {
        return { partidas:0, vitorias:0, derrotas:0, empates:0, maiorCombo:0, ...JSON.parse(localStorage.getItem(CHAVE_STATS) || "{}") };
    } catch (_) {
        return { partidas:0, vitorias:0, derrotas:0, empates:0, maiorCombo:0 };
    }
}

function salvarEstatisticas(stats) { localStorage.setItem(CHAVE_STATS, JSON.stringify(stats)); }

function atualizarPainelEstatisticas() {
    const s = lerEstatisticas();
    document.getElementById("statPartidas").textContent = s.partidas;
    document.getElementById("statVitorias").textContent = s.vitorias;
    document.getElementById("statDerrotas").textContent = s.derrotas;
    document.getElementById("statEmpates").textContent = s.empates;
    document.getElementById("statTaxa").textContent = s.partidas ? `${Math.round((s.vitorias / s.partidas) * 100)}%` : "0%";
    document.getElementById("statCombo").textContent = `×${s.maiorCombo || 0}`;
}

function abrirEstatisticas() {
    atualizarPainelEstatisticas();
    const modal = document.getElementById("modalEstatisticas");
    modal.style.display = "grid"; modal.setAttribute("aria-hidden", "false");
}
function fecharEstatisticas() {
    const modal = document.getElementById("modalEstatisticas");
    modal.style.display = "none"; modal.setAttribute("aria-hidden", "true");
}
function registrarEstatisticasPartida() {
    if (estatisticaRegistradaPartida) return;
    estatisticaRegistradaPartida = true;
    const s = lerEstatisticas();
    s.partidas++;
    if (pontuacaoJ1 === pontuacaoJ2) s.empates++;
    else {
        const vencedor = pontuacaoJ1 > pontuacaoJ2 ? 1 : 2;
        const jogadorLocal = modoJogo === "ia" ? 1 : meuNumero;
        if (vencedor === jogadorLocal) s.vitorias++; else s.derrotas++;
    }
    s.maiorCombo = Math.max(s.maiorCombo || 0, maiorComboPartida);
    salvarEstatisticas(s);
}

document.getElementById("btnEstatisticas").addEventListener("click", abrirEstatisticas);
document.getElementById("btnFecharEstatisticas").addEventListener("click", fecharEstatisticas);
document.getElementById("btnLimparEstatisticas").addEventListener("click", () => {
    if (!window.confirm("Zerar todas as estatísticas salvas neste navegador?")) return;
    localStorage.removeItem(CHAVE_STATS); atualizarPainelEstatisticas();
});

/* ---------------- NAVEGAÇÃO ---------------- */

document.getElementById("btnModoOnline").addEventListener("click", () => {
    modoJogo = "online";
    menuInicial.style.setProperty("display", "none", "important");
    menuIA.style.setProperty("display", "none", "important");
    menuOnline.style.setProperty("display", "flex", "important");
});

document.getElementById("btnModoIA").addEventListener("click", () => {
    modoJogo = "ia";
    menuInicial.style.setProperty("display", "none", "important");
    menuOnline.style.setProperty("display", "none", "important");
    menuIA.style.setProperty("display", "flex", "important");
});

document.getElementById("btnVoltarOnline").addEventListener("click", voltarMenuInicial);
document.getElementById("btnVoltarIA").addEventListener("click", voltarMenuInicial);
document.getElementById("btnCriarSala").addEventListener("click", criarSala);
document.getElementById("btnEntrarSala").addEventListener("click", entrarSala);
document.getElementById("btnIniciarIA").addEventListener("click", iniciarPartidaIA);


const seletorNivelIA = document.getElementById("nivelIA");
const descricaoNivelIA = document.getElementById("descricaoNivelIA");

const detalhesNiveisIA = {
    facil: {
        nome: "Explorer",
        icone: "🟢",
        descricao: "Joga de forma descontraída e é ideal para começar."
    },
    medio: {
        nome: "Strategist",
        icone: "🔵",
        descricao: "Procura boas oportunidades e oferece um desafio equilibrado."
    },
    dificil: {
        nome: "Nexus",
        icone: "🟣",
        descricao: "Analisa melhor o tabuleiro e oferece o maior desafio."
    }
};

function atualizarDescricaoNivelIA() {
    const detalhe = detalhesNiveisIA[seletorNivelIA.value];

    descricaoNivelIA.innerHTML = `
        <span class="nivel-selecionado-icone" aria-hidden="true">${detalhe.icone}</span>

        <div>
            <strong>${detalhe.nome}</strong>
            <p>${detalhe.descricao}</p>
        </div>
    `;
}

seletorNivelIA.addEventListener("change", atualizarDescricaoNivelIA);
atualizarDescricaoNivelIA();

function voltarMenuInicial() {
    modoJogo = "";

    // Ao sair de uma partida, o body pode manter classes usadas apenas
    // para tabuleiros grandes. Limpamos esse estado antes de reconstruir
    // visualmente o hub principal.
    document.body.classList.remove("grade-grande", "grade-gigante");

    menuOnline.style.setProperty("display", "none", "important");
    menuIA.style.setProperty("display", "none", "important");
    areaJogo.style.setProperty("display", "none", "important");

    // Força o HUB a voltar como bloco. Em versões anteriores ele podia
    // herdar/restaurar display:flex depois do fim da partida, espremendo
    // todos os elementos na horizontal.
    menuInicial.style.removeProperty("flex-direction");
    menuInicial.style.removeProperty("align-items");
    menuInicial.style.removeProperty("justify-content");
    menuInicial.style.setProperty("display", "block", "important");

    // Beta 1.4: o conteúdo real do HUB fica encapsulado em um único
    // wrapper. Isto impede que estados de layout antigos distribuam
    // os blocos do menu lado a lado após uma partida.
    const hubLayout = menuInicial.querySelector(".hub-layout");
    if (hubLayout) {
        hubLayout.style.setProperty("display", "block", "important");
        hubLayout.style.setProperty("width", "100%", "important");
    }
}

function mostrarAreaJogo() {
    menuInicial.style.setProperty("display", "none", "important");
    menuOnline.style.setProperty("display", "none", "important");
    menuIA.style.setProperty("display", "none", "important");
    areaJogo.style.setProperty("display", "block", "important");
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
    fecharResultadoFinal();
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
    comboAtual = 0;
    comboJogador = 0;
    maiorComboPartida = 0;
    estatisticaRegistradaPartida = false;
    removerComboVisual();
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

    const cardJ1 = document.querySelector(".jogador-um");
    const cardJ2 = document.querySelector(".jogador-dois");

    if (jogadorAtual === 1) {
        turnoTexto.innerText = `Vez de ${nomeJogador1}`;
        turnoTexto.style.color = "#42a5ff";
        cardJ1?.classList.add("jogador-ativo");
        cardJ2?.classList.remove("jogador-ativo");
    } else {
        turnoTexto.innerText = `Vez de ${nomeJogador2}`;
        turnoTexto.style.color = "#ff5a7a";
        cardJ2?.classList.add("jogador-ativo");
        cardJ1?.classList.remove("jogador-ativo");
    }
}

/* ---------------- TABULEIRO ---------------- */

function criarTabuleiro() {
    tabuleiro.innerHTML = "";

    const tamanho = tamanhoGrid * 2 + 1;
    const ehCelular = window.innerWidth <= 700;

    // Etapa 4.3.2: tamanho responsivo sem sacrificar a legibilidade.
    // O tabuleiro se adapta principalmente à largura; em grades grandes
    // mantemos um tamanho mínimo confortável em vez de miniaturizar tudo.
    let tamanhoPontoNumero;
    let tamanhoCaixaNumero;

    if (ehCelular) {
        const larguraUtil = Math.max(280, window.innerWidth - 28);
        tamanhoPontoNumero = 6;
        tamanhoCaixaNumero = Math.floor(
            (larguraUtil - ((tamanhoGrid + 1) * tamanhoPontoNumero)) / tamanhoGrid
        );
        tamanhoCaixaNumero = Math.max(24, Math.min(42, tamanhoCaixaNumero));
    } else {
        tamanhoPontoNumero = tamanhoGrid >= 8 ? 10 : 12;

        if (tamanhoGrid <= 4) tamanhoCaixaNumero = 60;
        else if (tamanhoGrid === 5) tamanhoCaixaNumero = 56;
        else if (tamanhoGrid === 6) tamanhoCaixaNumero = 52;
        else if (tamanhoGrid === 8) tamanhoCaixaNumero = 46;
        else tamanhoCaixaNumero = 38; // 10x10

        // Protege notebooks/telas estreitas sem deixar o tabuleiro minúsculo.
        const larguraUtil = Math.max(720, Math.min(window.innerWidth - 80, 1180));
        const pelaLargura = Math.floor(
            (larguraUtil - ((tamanhoGrid + 1) * tamanhoPontoNumero)) / tamanhoGrid
        );
        tamanhoCaixaNumero = Math.min(tamanhoCaixaNumero, pelaLargura);
        tamanhoCaixaNumero = Math.max(36, tamanhoCaixaNumero);
    }

    const tamanhoPonto = tamanhoPontoNumero + "px";
    const tamanhoCaixa = tamanhoCaixaNumero + "px";

    document.body.classList.toggle("grade-grande", tamanhoGrid >= 6);
    document.body.classList.toggle("grade-gigante", tamanhoGrid >= 8);

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
        animarLinhaJogada(el);
    } else if (tipo === "v") {
        if (linhasVerticais[f]?.[c]) return false;

        linhasVerticais[f][c] = true;
        const idx = f * (tamanhoGrid + 1) + c;
        const el = document.querySelectorAll(".linha-v")[idx];
        if (!el) return false;
        el.classList.add(jogador === 1 ? "selecionada-j1" : "selecionada-j2");
        animarLinhaJogada(el);
    } else {
        return false;
    }

    if (window.SMSAudio) SMSAudio.linha();
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
        resetarCombo();
        jogadorAtual = jogador === 1 ? 2 : 1;
    }

    if (!verificarFimDeJogo()) {
        // O som da linha já confirma a jogada. Evitamos tocar também o som de
        // troca de turno imediatamente depois, pois no multiplayer soava como
        // dois cliques para uma única linha marcada.
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
        animarPlacar(placarJ1);
    } else {
        pontuacaoJ2++;
        placarJ2.innerText = pontuacaoJ2;
        animarPlacar(placarJ2);
    }

    animarCaixaConquistada(caixa, jogador);
    registrarCombo(jogador);
    caixasFechadas++;
    if (window.SMSAudio) SMSAudio.caixa();
    return true;
}


/* ---------------- FEEDBACK VISUAL 4.3 ---------------- */
function reiniciarAnimacao(el, classe) {
    if (!el) return;
    el.classList.remove(classe);
    void el.offsetWidth;
    el.classList.add(classe);
    el.addEventListener("animationend", () => el.classList.remove(classe), { once: true });
}

function animarLinhaJogada(el) {
    reiniciarAnimacao(el, "linha-feedback");
}

function animarPlacar(el) {
    reiniciarAnimacao(el, "placar-pop");
}

function animarCaixaConquistada(caixa, jogador) {
    reiniciarAnimacao(caixa, "caixa-feedback");
    const maisUm = document.createElement("span");
    maisUm.className = `ponto-flutuante ${jogador === 1 ? "ponto-j1" : "ponto-j2"}`;
    maisUm.textContent = "+1";
    caixa.appendChild(maisUm);
    maisUm.addEventListener("animationend", () => maisUm.remove(), { once: true });
}

/* ---------------- COMBO 4.4 ---------------- */
function registrarCombo(jogador) {
    if (comboJogador !== jogador) {
        comboJogador = jogador;
        comboAtual = 0;
    }

    comboAtual++;
    maiorComboPartida = Math.max(maiorComboPartida, comboAtual);
    if (comboAtual >= 2) mostrarCombo(comboAtual, jogador);
}

function mostrarCombo(valor, jogador) {
    const container = document.getElementById("container-tabuleiro");
    if (!container) return;

    let combo = document.getElementById("comboPartida");
    if (!combo) {
        combo = document.createElement("div");
        combo.id = "comboPartida";
        container.appendChild(combo);
    }

    combo.className = `combo-partida ${jogador === 1 ? "combo-j1" : "combo-j2"}`;
    combo.innerHTML = `<span>COMBO</span><strong>×${valor}</strong>`;
    reiniciarAnimacao(combo, "combo-ativo");
}

function removerComboVisual() {
    document.getElementById("comboPartida")?.remove();
}

function resetarCombo() {
    comboAtual = 0;
    comboJogador = 0;
    const combo = document.getElementById("comboPartida");
    if (!combo) return;
    combo.classList.add("combo-saindo");
    window.setTimeout(() => combo.remove(), 220);
}

/* ---------------- FIM E NOVA PARTIDA ---------------- */

function verificarFimDeJogo() {
    if (caixasFechadas !== tamanhoGrid * tamanhoGrid) return false;

    jogoFinalizado = true;
    registrarEstatisticasPartida();

    if (window.SMSAudio) {
        if (pontuacaoJ1 === pontuacaoJ2) {
            SMSAudio.empate();
        } else {
            const vencedor = pontuacaoJ1 > pontuacaoJ2 ? 1 : 2;
            const euVenci = modoJogo === "ia" ? vencedor === 1 : vencedor === meuNumero;
            euVenci ? SMSAudio.vitoria() : SMSAudio.derrota();
        }
    }

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

    mostrarResultadoFinal();
    return true;
}

function mostrarResultadoFinal() {
    const modal = document.getElementById("modalResultado");
    const titulo = document.getElementById("resultadoTitulo");
    const subtitulo = document.getElementById("resultadoSubtitulo");
    const icone = document.getElementById("resultadoIcone");
    const btnRevanche = document.getElementById("btnResultadoRevanche");
    const espera = document.getElementById("resultadoEspera");
    const seletor = document.getElementById("resultadoTamanho");

    document.getElementById("resultadoNome1").innerText = nomeJogador1;
    document.getElementById("resultadoNome2").innerText = nomeJogador2;
    document.getElementById("resultadoPontos1").innerText = pontuacaoJ1;
    document.getElementById("resultadoPontos2").innerText = pontuacaoJ2;
    seletor.value = String(tamanhoGrid);

    if (pontuacaoJ1 === pontuacaoJ2) {
        icone.innerText = "🤝";
        titulo.innerText = "Empate!";
        subtitulo.innerText = "Uma disputa equilibrada até o último ponto.";
    } else {
        const vencedor = pontuacaoJ1 > pontuacaoJ2 ? nomeJogador1 : nomeJogador2;
        icone.innerText = "🏆";
        titulo.innerText = `${vencedor} venceu!`;
        subtitulo.innerText = "Parabéns pela conquista do tabuleiro.";
    }

    const podeRevanche = modoJogo === "ia" || meuNumero === 1;
    btnRevanche.style.display = podeRevanche ? "inline-flex" : "none";
    document.getElementById("resultadoRevanche").style.display = podeRevanche ? "block" : "none";
    espera.style.display = podeRevanche ? "none" : "block";

    modal.style.display = "grid";
    modal.setAttribute("aria-hidden", "false");
}

function fecharResultadoFinal() {
    const modal = document.getElementById("modalResultado");
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
}

document.getElementById("btnResultadoRevanche").addEventListener("click", () => {
    const novoTamanho = parseInt(document.getElementById("resultadoTamanho").value, 10);
    fecharResultadoFinal();

    if (modoJogo === "ia") {
        tamanhoGrid = novoTamanho;
        document.getElementById("tamanhoIA").value = novoTamanho;
        statusSala.innerText = `Revanche contra IA ${nomeNivelIA(nivelIA)}!`;
        reiniciarEstado();
        return;
    }

    if (meuNumero === 1) {
        socket.emit("novaPartida", { sala: salaAtual, tamanho: novoTamanho });
    }
});

document.getElementById("btnResultadoMenu").addEventListener("click", () => {
    fecharResultadoFinal();
    btnNovaPartida.style.display = "none";
    voltarMenuInicial();
});

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


// ============================================================
// ETAPA 4.6 - COMO JOGAR / PREPARACAO PARA O BETA
// ============================================================
(() => {
    const modalComo = document.getElementById('modalComoJogar');
    const modalBoas = document.getElementById('modalBoasVindas');
    const chaveBoasVindas = 'pontinhosBoasVindas46';

    function mostrar(el) {
        if (!el) return;
        el.style.display = 'grid';
        el.setAttribute('aria-hidden', 'false');
    }
    function esconder(el) {
        if (!el) return;
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
    }
    function marcarApresentado() {
        try { localStorage.setItem(chaveBoasVindas, '1'); } catch (_) {}
    }
    function abrirComoJogar() {
        esconder(modalBoas);
        marcarApresentado();
        mostrar(modalComo);
    }

    document.getElementById('btnComoJogar')?.addEventListener('click', abrirComoJogar);
    document.getElementById('btnVerComoJogar')?.addEventListener('click', abrirComoJogar);
    document.getElementById('btnJaSeiJogar')?.addEventListener('click', () => {
        marcarApresentado();
        esconder(modalBoas);
    });
    document.getElementById('btnFecharComoJogar')?.addEventListener('click', () => esconder(modalComo));

    // Mostra uma única vez por navegador, depois da abertura SMS Studio.
    let jaViu = false;
    try { jaViu = localStorage.getItem(chaveBoasVindas) === '1'; } catch (_) {}
    if (!jaViu) setTimeout(() => mostrar(modalBoas), 5000);
})();
