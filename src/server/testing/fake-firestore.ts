/**
 * Firestore em memória para testes de rotas de API.
 *
 * Implementa o subconjunto da API do firebase-admin usado pelas rotas:
 * collection/doc, get/set/update/create/delete, where('=='), orderBy, limit
 * e runTransaction (escritas aplicadas só se o callback terminar sem erro).
 * Como o Admin SDK real, recusa valores `undefined`.
 */

type Dados = Record<string, unknown>;

function verificarSemUndefined(valor: unknown, caminho: string): void {
  if (valor === undefined) {
    throw new Error(`Cannot use "undefined" as a Firestore value (found in field "${caminho}").`);
  }
  if (Array.isArray(valor)) {
    valor.forEach((v, i) => verificarSemUndefined(v, `${caminho}.${i}`));
  } else if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) {
      verificarSemUndefined(v, caminho ? `${caminho}.${k}` : k);
    }
  }
}

function clonar<T>(valor: T): T {
  return structuredClone(valor);
}

class FakeDocSnapshot {
  constructor(
    readonly ref: FakeDocRef,
    private readonly dados: Dados | undefined
  ) {}

  get id(): string {
    return this.ref.id;
  }

  get exists(): boolean {
    return this.dados !== undefined;
  }

  data(): Dados | undefined {
    return this.dados === undefined ? undefined : clonar(this.dados);
  }

  get(campo: string): unknown {
    return this.dados?.[campo];
  }
}

class FakeQuerySnapshot {
  constructor(readonly docs: FakeDocSnapshot[]) {}

  get size(): number {
    return this.docs.length;
  }

  get empty(): boolean {
    return this.docs.length === 0;
  }

  forEach(fn: (doc: FakeDocSnapshot) => void): void {
    this.docs.forEach(fn);
  }
}

export class FakeDocRef {
  constructor(
    private readonly store: FakeFirestore,
    readonly collectionName: string,
    readonly id: string
  ) {}

  get path(): string {
    return `${this.collectionName}/${this.id}`;
  }

  async get(): Promise<FakeDocSnapshot> {
    return new FakeDocSnapshot(this, this.store.ler(this.collectionName, this.id));
  }

  async set(dados: Dados, opcoes?: { merge?: boolean }): Promise<void> {
    this.store.escrever(this.collectionName, this.id, dados, opcoes?.merge === true);
  }

  async create(dados: Dados): Promise<void> {
    this.store.criar(this.collectionName, this.id, dados);
  }

  async update(dados: Dados): Promise<void> {
    this.store.atualizar(this.collectionName, this.id, dados);
  }

  async delete(): Promise<void> {
    this.store.remover(this.collectionName, this.id);
  }
}

type Filtro = { campo: string; op: '==' | 'in' | '>='; valor: unknown };

function atende(d: Dados, f: Filtro): boolean {
  const v = d[f.campo];
  if (f.op === 'in') return Array.isArray(f.valor) && f.valor.includes(v);
  if (f.op === '>=') return v !== undefined && v !== null && (v as string | number) >= (f.valor as string | number);
  return v === f.valor;
}

class FakeQuery {
  constructor(
    protected readonly store: FakeFirestore,
    readonly collectionName: string,
    protected readonly filtros: Filtro[] = [],
    protected readonly ordem?: { campo: string; direcao: 'asc' | 'desc' },
    protected readonly limite?: number
  ) {}

  where(campo: string, op: string, valor: unknown): FakeQuery {
    if (op !== '==' && op !== 'in' && op !== '>=') {
      throw new Error(`FakeFirestore: operador "${op}" não suportado.`);
    }
    return new FakeQuery(
      this.store,
      this.collectionName,
      [...this.filtros, { campo, op, valor }],
      this.ordem,
      this.limite
    );
  }

  orderBy(campo: string, direcao: 'asc' | 'desc' = 'asc'): FakeQuery {
    return new FakeQuery(this.store, this.collectionName, this.filtros, { campo, direcao }, this.limite);
  }

  limit(n: number): FakeQuery {
    return new FakeQuery(this.store, this.collectionName, this.filtros, this.ordem, n);
  }

  async get(): Promise<FakeQuerySnapshot> {
    let entradas = this.store
      .listar(this.collectionName)
      .filter(([, d]) => this.filtros.every((f) => atende(d, f)));

    if (this.ordem) {
      const { campo, direcao } = this.ordem;
      entradas = entradas.sort(([, a], [, b]) => {
        const va = a[campo] as string | number;
        const vb = b[campo] as string | number;
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return direcao === 'asc' ? cmp : -cmp;
      });
    }
    if (typeof this.limite === 'number') {
      entradas = entradas.slice(0, this.limite);
    }

    return new FakeQuerySnapshot(
      entradas.map(([id, d]) => new FakeDocSnapshot(new FakeDocRef(this.store, this.collectionName, id), d))
    );
  }
}

class FakeCollectionRef extends FakeQuery {
  doc(id?: string): FakeDocRef {
    return new FakeDocRef(this.store, this.collectionName, id ?? this.store.novoId());
  }
}

class FakeTransaction {
  private readonly escritas: Array<() => void> = [];
  /** Versões dos documentos lidos, para detectar conflito no commit (como o Firestore). */
  readonly leituras = new Map<string, number>();

  constructor(private readonly store: FakeFirestore) {}

  async get(alvo: FakeDocRef): Promise<FakeDocSnapshot>;
  async get(alvo: FakeQuery): Promise<FakeQuerySnapshot>;
  async get(alvo: FakeDocRef | FakeQuery): Promise<FakeDocSnapshot | FakeQuerySnapshot> {
    if (alvo instanceof FakeDocRef) {
      this.leituras.set(alvo.path, this.store.versao(alvo.path));
      return alvo.get();
    }
    const snap = await alvo.get();
    // Leitura de consulta: qualquer escrita na coleção invalida a transação.
    this.leituras.set(`colecao:${alvo.collectionName}`, this.store.versao(`colecao:${alvo.collectionName}`));
    return snap;
  }

  set(ref: FakeDocRef, dados: Dados, opcoes?: { merge?: boolean }): this {
    verificarSemUndefined(dados, '');
    this.escritas.push(() => this.store.escrever(ref.collectionName, ref.id, dados, opcoes?.merge === true));
    return this;
  }

  create(ref: FakeDocRef, dados: Dados): this {
    verificarSemUndefined(dados, '');
    this.escritas.push(() => this.store.criar(ref.collectionName, ref.id, dados));
    return this;
  }

  update(ref: FakeDocRef, dados: Dados): this {
    verificarSemUndefined(dados, '');
    this.escritas.push(() => this.store.atualizar(ref.collectionName, ref.id, dados));
    return this;
  }

  delete(ref: FakeDocRef): this {
    this.escritas.push(() => this.store.remover(ref.collectionName, ref.id));
    return this;
  }

  aplicar(): void {
    // Valida antes de aplicar qualquer escrita para manter a atomicidade.
    const snapshot = this.store.exportar();
    try {
      this.escritas.forEach((fn) => fn());
    } catch (err) {
      this.store.importar(snapshot);
      throw err;
    }
  }
}

class FakeWriteBatch extends FakeTransaction {
  async commit(): Promise<void> {
    this.aplicar();
  }
}

export class FakeFirestore {
  private colecoes = new Map<string, Map<string, Dados>>();
  private versoes = new Map<string, number>();
  private contador = 0;

  collection(nome: string): FakeCollectionRef {
    return new FakeCollectionRef(this, nome);
  }

  batch(): FakeWriteBatch {
    return new FakeWriteBatch(this);
  }

  /** Lê vários documentos de uma vez, como Firestore.getAll do Admin SDK. */
  async getAll(...refs: FakeDocRef[]): Promise<FakeDocSnapshot[]> {
    return Promise.all(refs.map((r) => r.get()));
  }

  async runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T> {
    // Concorrência otimista: se algo lido mudou antes do commit, repete o callback.
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const tx = new FakeTransaction(this);
      const resultado = await fn(tx);
      const conflito = [...tx.leituras].some(([chave, v]) => this.versao(chave) !== v);
      if (conflito) continue;
      tx.aplicar();
      return resultado;
    }
    throw new Error('10 ABORTED: Too much contention on these documents.');
  }

  versao(chave: string): number {
    return this.versoes.get(chave) ?? 0;
  }

  private tocar(nome: string, id: string): void {
    for (const chave of [`${nome}/${id}`, `colecao:${nome}`]) {
      this.versoes.set(chave, this.versao(chave) + 1);
    }
  }

  /** Popula uma coleção diretamente (uso em testes). */
  seed<T extends { id: string }>(nome: string, docs: ReadonlyArray<T>): void {
    for (const d of docs) {
      this.escrever(nome, d.id, d as unknown as Dados, false);
    }
  }

  /** Lê um documento diretamente (uso em asserções de testes). */
  peek(nome: string, id: string): Dados | undefined {
    const d = this.ler(nome, id);
    return d === undefined ? undefined : clonar(d);
  }

  // ---- internos ----

  novoId(): string {
    this.contador += 1;
    return `auto-${this.contador}`;
  }

  ler(nome: string, id: string): Dados | undefined {
    return this.colecoes.get(nome)?.get(id);
  }

  listar(nome: string): Array<[string, Dados]> {
    return [...(this.colecoes.get(nome)?.entries() ?? [])].map(([id, d]) => [id, clonar(d)]);
  }

  escrever(nome: string, id: string, dados: Dados, merge: boolean): void {
    verificarSemUndefined(dados, '');
    if (!this.colecoes.has(nome)) this.colecoes.set(nome, new Map());
    const atual = merge ? this.colecoes.get(nome)!.get(id) ?? {} : {};
    this.colecoes.get(nome)!.set(id, { ...atual, ...clonar(dados) });
    this.tocar(nome, id);
  }

  criar(nome: string, id: string, dados: Dados): void {
    if (this.ler(nome, id) !== undefined) {
      const err = new Error(`6 ALREADY_EXISTS: Document already exists: ${nome}/${id}`) as Error & { code: number };
      err.code = 6;
      throw err;
    }
    this.escrever(nome, id, dados, false);
  }

  atualizar(nome: string, id: string, dados: Dados): void {
    verificarSemUndefined(dados, '');
    const atual = this.ler(nome, id);
    if (atual === undefined) {
      const err = new Error(`5 NOT_FOUND: No document to update: ${nome}/${id}`) as Error & { code: number };
      err.code = 5;
      throw err;
    }
    this.colecoes.get(nome)!.set(id, { ...atual, ...clonar(dados) });
    this.tocar(nome, id);
  }

  remover(nome: string, id: string): void {
    this.colecoes.get(nome)?.delete(id);
    this.tocar(nome, id);
  }

  exportar(): Map<string, Map<string, Dados>> {
    return new Map([...this.colecoes].map(([k, v]) => [k, new Map([...v].map(([id, d]) => [id, clonar(d)]))]));
  }

  importar(estado: Map<string, Map<string, Dados>>): void {
    this.colecoes = estado;
  }
}
