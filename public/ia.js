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

        const jogadaQueFecha = jogadas.find(jogada =>
            this.caixasFechadasPelaJogada(estado, jogada) > 0
        );

        if (jogadaQueFecha) return jogadaQueFecha;

        const jogadasSeguras = jogadas.filter(jogada =>
            !this.entregaCaixaAoAdversario(estado, jogada)
        );

        if (this.nivel === "medio") {
            return this.escolherAleatoria(
                jogadasSeguras.length > 0 ? jogadasSeguras : jogadas
            );
        }

        if (jogadasSeguras.length > 0) {
            return jogadasSeguras.reduce((melhor, atual) => {
                const riscoMelhor = this.calcularRisco(estado, melhor);
                const riscoAtual = this.calcularRisco(estado, atual);
                return riscoAtual < riscoMelhor ? atual : melhor;
            });
        }

        return jogadas.reduce((melhor, atual) => {
            const riscoMelhor = this.calcularRisco(estado, melhor);
            const riscoAtual = this.calcularRisco(estado, atual);
            return riscoAtual < riscoMelhor ? atual : melhor;
        });
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
