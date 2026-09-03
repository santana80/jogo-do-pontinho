class IA {
    constructor(nivel = "facil") {
        this.nivel = nivel;
    }

    escolherJogada(estado) {
        const jogadas = this.listarJogadasDisponiveis(estado);
        if (jogadas.length === 0) return null;

        if (this.nivel === "facil") {
            return this.escolherAleatoria(jogadas);
        }

        const jogadasQueFecham = jogadas.filter(jogada =>
            this.caixasFechadasPelaJogada(estado, jogada) > 0
        );

        if (this.nivel === "medio") {
            if (jogadasQueFecham.length > 0) return this.escolherAleatoria(jogadasQueFecham);

            const jogadasSeguras = jogadas.filter(jogada =>
                !this.entregaCaixaAoAdversario(estado, jogada)
            );

            return this.escolherAleatoria(
                jogadasSeguras.length > 0 ? jogadasSeguras : jogadas
            );
        }

        // Nexus / Difícil: análise de captura, segurança, correntes e fim de jogo.
        return this.escolherJogadaNexus(estado, jogadas, jogadasQueFecham);
    }

    escolherJogadaNexus(estado, jogadas, jogadasQueFecham) {
        // 1) Se houver caixas disponíveis, procura a captura que gera a maior sequência.
        if (jogadasQueFecham.length > 0) {
            return jogadasQueFecham.reduce((melhor, atual) => {
                const valorMelhor = this.avaliarSequenciaDeCaptura(estado, melhor);
                const valorAtual = this.avaliarSequenciaDeCaptura(estado, atual);
                return valorAtual > valorMelhor ? atual : melhor;
            });
        }

        const jogadasSeguras = jogadas.filter(jogada =>
            !this.entregaCaixaAoAdversario(estado, jogada)
        );

        // 2) No fim da partida, usa busca com turnos extras para enxergar várias jogadas à frente.
        const restantes = jogadas.length;
        const limiteBusca = estado.tamanhoGrid <= 4 ? 16 : estado.tamanhoGrid <= 6 ? 12 : 10;
        if (restantes <= limiteBusca) {
            const melhorBusca = this.escolherPorBusca(estado, jogadas);
            if (melhorBusca) return melhorBusca;
        }

        // 3) Enquanto existirem jogadas seguras, escolhe a que preserva mais opções futuras.
        if (jogadasSeguras.length > 0) {
            let melhor = jogadasSeguras[0];
            let melhorPontuacao = -Infinity;

            for (const jogada of jogadasSeguras) {
                const pontuacao = this.avaliarJogadaSegura(estado, jogada);
                if (pontuacao > melhorPontuacao) {
                    melhorPontuacao = pontuacao;
                    melhor = jogada;
                }
            }
            return melhor;
        }

        // 4) Se for inevitável entregar caixas, sacrifica a menor corrente possível.
        let melhor = jogadas[0];
        let menorPrejuizo = Infinity;
        let melhorDesempate = -Infinity;

        for (const jogada of jogadas) {
            const prejuizo = this.estimarCaixasEntregues(estado, jogada);
            const desempate = -this.calcularRisco(estado, jogada);

            if (prejuizo < menorPrejuizo ||
                (prejuizo === menorPrejuizo && desempate > melhorDesempate)) {
                menorPrejuizo = prejuizo;
                melhorDesempate = desempate;
                melhor = jogada;
            }
        }

        return melhor;
    }

    avaliarSequenciaDeCaptura(estado, jogada) {
        const copia = this.copiarEstado(estado);
        const fechadasAgora = this.caixasFechadasPelaJogada(copia, jogada);
        this.marcarJogada(copia, jogada);
        return fechadasAgora + this.maiorSequenciaCapturavel(copia, new Map());
    }

    maiorSequenciaCapturavel(estado, memo) {
        const chave = this.chaveEstado(estado);
        if (memo.has(chave)) return memo.get(chave);

        const capturas = this.listarJogadasDisponiveis(estado).filter(jogada =>
            this.caixasFechadasPelaJogada(estado, jogada) > 0
        );

        if (capturas.length === 0) {
            memo.set(chave, 0);
            return 0;
        }

        let melhor = 0;
        for (const jogada of capturas) {
            const copia = this.copiarEstado(estado);
            const ganho = this.caixasFechadasPelaJogada(copia, jogada);
            this.marcarJogada(copia, jogada);
            melhor = Math.max(melhor, ganho + this.maiorSequenciaCapturavel(copia, memo));
        }

        memo.set(chave, melhor);
        return melhor;
    }

    avaliarJogadaSegura(estado, jogada) {
        const copia = this.copiarEstado(estado);
        this.marcarJogada(copia, jogada);

        const futuras = this.listarJogadasDisponiveis(copia);
        const segurasDepois = futuras.filter(j => !this.entregaCaixaAoAdversario(copia, j)).length;

        // Prefere manter muitas saídas seguras e evita criar caixas com dois lados quando há alternativa.
        let caixasComDoisLados = 0;
        let caixasComUmOuMenos = 0;
        for (let f = 0; f < copia.tamanhoGrid; f++) {
            for (let c = 0; c < copia.tamanhoGrid; c++) {
                const lados = this.contarLados(copia, f, c);
                if (lados === 2) caixasComDoisLados++;
                if (lados <= 1) caixasComUmOuMenos++;
            }
        }

        const riscoLocal = this.calcularRisco(estado, jogada);
        const centro = this.bonusPosicional(estado, jogada);

        return (segurasDepois * 12) + (caixasComUmOuMenos * 1.5) -
            (caixasComDoisLados * 2.2) - (riscoLocal * 0.7) + centro + Math.random() * 0.01;
    }

    bonusPosicional(estado, jogada) {
        // Pequeno desempate para não deixar o Nexus com padrão totalmente previsível.
        // Linhas de borda tendem a participar de uma única caixa e costumam ser boas no início.
        const t = estado.tamanhoGrid;
        if (jogada.tipo === "h" && (jogada.f === 0 || jogada.f === t)) return 0.7;
        if (jogada.tipo === "v" && (jogada.c === 0 || jogada.c === t)) return 0.7;
        return 0;
    }

    estimarCaixasEntregues(estado, jogada) {
        const copia = this.copiarEstado(estado);
        this.marcarJogada(copia, jogada);
        // Depois do sacrifício, estima quantas caixas o adversário consegue encadear imediatamente.
        return this.maiorSequenciaCapturavel(copia, new Map());
    }

    escolherPorBusca(estado, jogadas) {
        const memo = new Map();
        let melhorJogada = null;
        let melhorValor = -Infinity;
        let alpha = -Infinity;
        const beta = Infinity;

        const ordenadas = this.ordenarJogadas(estado, jogadas);

        for (const jogada of ordenadas) {
            const copia = this.copiarEstado(estado);
            const ganho = this.caixasFechadasPelaJogada(copia, jogada);
            this.marcarJogada(copia, jogada);

            // Quem fecha caixa joga novamente; caso contrário passa a vez.
            const proximoJogador = ganho > 0 ? 1 : -1;
            const valor = ganho + this.minimax(copia, proximoJogador, alpha, beta, memo, 0);

            if (valor > melhorValor) {
                melhorValor = valor;
                melhorJogada = jogada;
            }
            alpha = Math.max(alpha, melhorValor);
        }

        return melhorJogada;
    }

    minimax(estado, jogador, alpha, beta, memo, profundidade) {
        const jogadas = this.listarJogadasDisponiveis(estado);
        if (jogadas.length === 0) return 0;

        // Segurança para tabuleiros grandes: a busca completa fica reservada ao fim do jogo.
        const profundidadeMax = estado.tamanhoGrid <= 4 ? 18 : 12;
        if (profundidade >= profundidadeMax) {
            return this.avaliacaoHeuristicaFim(estado, jogador);
        }

        const chave = `${jogador}|${this.chaveEstado(estado)}|${profundidade}`;
        if (memo.has(chave)) return memo.get(chave);

        const ordenadas = this.ordenarJogadas(estado, jogadas);
        let melhor = jogador === 1 ? -Infinity : Infinity;

        for (const jogada of ordenadas) {
            const copia = this.copiarEstado(estado);
            const caixas = this.caixasFechadasPelaJogada(copia, jogada);
            this.marcarJogada(copia, jogada);

            const mesmoJogador = caixas > 0;
            const proximo = mesmoJogador ? jogador : -jogador;
            const ganhoAssinado = jogador * caixas;
            const valor = ganhoAssinado + this.minimax(
                copia, proximo, alpha, beta, memo, profundidade + 1
            );

            if (jogador === 1) {
                melhor = Math.max(melhor, valor);
                alpha = Math.max(alpha, melhor);
            } else {
                melhor = Math.min(melhor, valor);
                beta = Math.min(beta, melhor);
            }

            if (beta <= alpha) break;
        }

        memo.set(chave, melhor);
        return melhor;
    }

    avaliacaoHeuristicaFim(estado, jogador) {
        const jogadas = this.listarJogadasDisponiveis(estado);
        const capturas = jogadas.reduce((soma, jogada) =>
            soma + this.caixasFechadasPelaJogada(estado, jogada), 0
        );
        const seguras = jogadas.filter(jogada => !this.entregaCaixaAoAdversario(estado, jogada)).length;
        return jogador * (capturas * 2 + seguras * 0.05);
    }

    ordenarJogadas(estado, jogadas) {
        return [...jogadas].sort((a, b) => {
            const fechaB = this.caixasFechadasPelaJogada(estado, b);
            const fechaA = this.caixasFechadasPelaJogada(estado, a);
            if (fechaB !== fechaA) return fechaB - fechaA;

            const riscoA = this.entregaCaixaAoAdversario(estado, a) ? 1 : 0;
            const riscoB = this.entregaCaixaAoAdversario(estado, b) ? 1 : 0;
            return riscoA - riscoB;
        });
    }

    chaveEstado(estado) {
        const h = estado.linhasHorizontais.map(l => l.map(v => v ? "1" : "0").join("")).join("");
        const v = estado.linhasVerticais.map(l => l.map(v => v ? "1" : "0").join("")).join("");
        return `${h}|${v}`;
    }

    listarJogadasDisponiveis(estado) {
        const jogadas = [];

        for (let f = 0; f < estado.linhasHorizontais.length; f++) {
            for (let c = 0; c < estado.linhasHorizontais[f].length; c++) {
                if (!estado.linhasHorizontais[f][c]) {
                    jogadas.push({ tipo: "h", f, c });
                }
            }
        }

        for (let f = 0; f < estado.linhasVerticais.length; f++) {
            for (let c = 0; c < estado.linhasVerticais[f].length; c++) {
                if (!estado.linhasVerticais[f][c]) {
                    jogadas.push({ tipo: "v", f, c });
                }
            }
        }

        return jogadas;
    }

    escolherAleatoria(jogadas) {
        return jogadas[Math.floor(Math.random() * jogadas.length)];
    }

    caixasFechadasPelaJogada(estado, jogada) {
        const copia = this.copiarEstado(estado);
        this.marcarJogada(copia, jogada);

        let total = 0;
        for (const caixa of this.caixasAdjacentes(copia, jogada)) {
            if (this.caixaCompleta(copia, caixa.f, caixa.c)) total++;
        }
        return total;
    }

    entregaCaixaAoAdversario(estado, jogada) {
        const copia = this.copiarEstado(estado);
        this.marcarJogada(copia, jogada);

        return this.caixasAdjacentes(copia, jogada).some(caixa =>
            this.contarLados(copia, caixa.f, caixa.c) === 3
        );
    }

    calcularRisco(estado, jogada) {
        const copia = this.copiarEstado(estado);
        this.marcarJogada(copia, jogada);

        return this.caixasAdjacentes(copia, jogada).reduce(
            (total, caixa) => total + this.contarLados(copia, caixa.f, caixa.c),
            0
        );
    }

    caixasAdjacentes(estado, jogada) {
        const caixas = [];
        const tamanho = estado.tamanhoGrid;

        if (jogada.tipo === "h") {
            if (jogada.f > 0) caixas.push({ f: jogada.f - 1, c: jogada.c });
            if (jogada.f < tamanho) caixas.push({ f: jogada.f, c: jogada.c });
        } else {
            if (jogada.c > 0) caixas.push({ f: jogada.f, c: jogada.c - 1 });
            if (jogada.c < tamanho) caixas.push({ f: jogada.f, c: jogada.c });
        }

        return caixas;
    }

    contarLados(estado, f, c) {
        let total = 0;
        if (estado.linhasHorizontais[f][c]) total++;
        if (estado.linhasHorizontais[f + 1][c]) total++;
        if (estado.linhasVerticais[f][c]) total++;
        if (estado.linhasVerticais[f][c + 1]) total++;
        return total;
    }

    caixaCompleta(estado, f, c) {
        return this.contarLados(estado, f, c) === 4;
    }

    marcarJogada(estado, jogada) {
        if (jogada.tipo === "h") {
            estado.linhasHorizontais[jogada.f][jogada.c] = true;
        } else {
            estado.linhasVerticais[jogada.f][jogada.c] = true;
        }
    }

    copiarEstado(estado) {
        return {
            tamanhoGrid: estado.tamanhoGrid,
            linhasHorizontais: estado.linhasHorizontais.map(linha => [...linha]),
            linhasVerticais: estado.linhasVerticais.map(linha => [...linha])
        };
    }
}
