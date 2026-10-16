// sistema.js - lógica do sistema (dados, telas, cliques e formulários).
// Fica na mesma pasta do almoxarifado.html, que o chama pelo nome.

// Dados de exemplo dos itens: troque pelo retorno do seu back end.
/* ---- DADOS DE EXEMPLO ----
   Troque por chamadas ao seu back end, por exemplo:
   produtos = await (await fetch('/api/produtos')).json();
   movs     = await (await fetch('/api/movimentacoes')).json();
   Campos esperados: id, aba (mp | imp | motos), nome, sku, cat, qtd, min, max, un
   e info (opcional): objeto com as informações específicas do item */
// Lista de itens do estoque (id, aba, nome, código, categoria, quantidade, mínimo, capacidade, unidade).
let produtos = [
 {id:1,aba:'mp',nome:'Chapa de aço 3 mm',sku:'CHP-0300',cat:'Chapas',qtd:48,min:20,max:90,un:'un'},
 {id:2,aba:'mp',nome:'Barra redonda SAE 1045 Ø25',sku:'BAR-1045',cat:'Barras',qtd:14,min:15,max:60,un:'un'},
 {id:3,aba:'mp',nome:'Tubo industrial 40 x 40',sku:'TUB-4040',cat:'Tubos',qtd:62,min:30,max:120,un:'un'},
 {id:4,aba:'mp',nome:'Eletrodo E6013 2,5 mm',sku:'SOL-6013',cat:'Soldagem',qtd:12,min:20,max:80,un:'kg'},
 {id:5,aba:'mp',nome:'Cantoneira 1"',sku:'CAN-0100',cat:'Perfis',qtd:6,min:20,max:70,un:'un'},
 {id:6,aba:'mp',nome:'Arame MIG 0,8 mm',sku:'SOL-0800',cat:'Soldagem',qtd:90,min:40,max:160,un:'kg'},
 {id:7,aba:'imp',nome:'Luva de raspa',sku:'EPI-0112',cat:'EPI',qtd:38,min:40,max:120,un:'par'},
 {id:8,aba:'imp',nome:'Óculos de proteção',sku:'EPI-0120',cat:'EPI',qtd:9,min:30,max:90,un:'un'},
 {id:9,aba:'imp',nome:'Disco de corte 7"',sku:'ABR-0710',cat:'Abrasivos',qtd:64,min:50,max:200,un:'un'},
 {id:10,aba:'imp',nome:'Graxa multiuso',sku:'LUB-0300',cat:'Lubrificantes',qtd:5,min:12,max:30,un:'kg'},
 {id:11,aba:'imp',nome:'Fita isolante',sku:'ELE-0010',cat:'Elétrica',qtd:140,min:40,max:200,un:'un'},
 {id:12,aba:'imp',nome:'Broca HSS 10 mm',sku:'FER-1010',cat:'Ferramentas',qtd:7,min:10,max:30,un:'un'},
 {id:13,aba:'motos',nome:'Pastilha de freio',sku:'PEC-1601',cat:'CG 160 · Freios',qtd:18,min:12,max:60,un:'jogo'},
 {id:14,aba:'motos',nome:'Kit relação',sku:'PEC-1602',cat:'CG 160 · Transmissão',qtd:4,min:8,max:30,un:'kit'},
 {id:15,aba:'motos',nome:'Vela de ignição',sku:'PEC-0310',cat:'Universal · Elétrica',qtd:46,min:30,max:120,un:'un'},
 {id:16,aba:'motos',nome:'Filtro de óleo',sku:'PEC-3001',cat:'XRE 300 · Filtros',qtd:9,min:10,max:40,un:'un'},
 {id:17,aba:'motos',nome:'Câmara de ar aro 18',sku:'PEC-1800',cat:'Universal · Pneus',qtd:22,min:10,max:40,un:'un'},
 {id:18,aba:'motos',nome:'Cabo de embreagem',sku:'PEC-0220',cat:'Universal · Cabos',qtd:0,min:6,max:24,un:'un'}
];
// Histórico de movimentações (entradas e saídas) dos itens.
let movs = [
 {hora:'Hoje, 09:42',tipo:'Saída',p:8,q:6,quem:'Manutenção'},
 {hora:'Hoje, 09:15',tipo:'Saída',p:10,q:3,quem:'Produção'},
 {hora:'Hoje, 08:30',tipo:'Entrada',p:1,q:20,quem:'Recebimento'},
 {hora:'Ontem, 17:10',tipo:'Saída',p:18,q:4,quem:'Oficina'},
 {hora:'Ontem, 16:58',tipo:'Saída',p:5,q:12,quem:'Serralheria'},
 {hora:'Ontem, 15:20',tipo:'Saída',p:4,q:8,quem:'Soldagem'},
 {hora:'Ontem, 11:05',tipo:'Entrada',p:13,q:24,quem:'Recebimento'},
 {hora:'Ontem, 08:47',tipo:'Saída',p:14,q:3,quem:'Balcão'}
];

/* Informações específicas de cada item: objeto livre {rótulo: valor}.
   O site mostra todos os campos que o back end enviar em "info" no painel do item. */
// Ficha técnica de cada item (lote, certificado, NF-e, fornecedor...), indexada pelo id do item.
const INFO={
 1:{'Lote':'L2409-118','Certificado':'Cert. 4821/26','NF-e':'123456','Fornecedor':'Aços Santa Rita'},
 2:{'Lote':'L2409-120','Certificado':'Cert. 4822/26','NF-e':'123456','Fornecedor':'Aços Santa Rita'},
 3:{'Lote':'T2408-044','Certificado':'Cert. 0932/26','NF-e':'123871','Fornecedor':'Metalfer'},
 4:{'Lote':'E2407-310','Certificado':'Cert. 7710/26','NF-e':'122904','Fornecedor':'Esab'},
 5:{'Lote':'C2409-077','Certificado':'Cert. 0933/26','NF-e':'123871','Fornecedor':'Metalfer'},
 6:{'Lote':'M2408-201','Certificado':'Cert. 7711/26','NF-e':'122904','Fornecedor':'Esab'},
 7:{'Lote':'EP2406-015','Certificado de aprovação (CA)':'CA 00000','NF-e':'118420','Fornecedor':'Fornecedor de EPI'},
 8:{'Lote':'EP2407-022','Certificado de aprovação (CA)':'CA 00000','NF-e':'118420','Fornecedor':'Fornecedor de EPI'},
 9:{'Lote':'AB2408-090','NF-e':'120077','Fornecedor':'Fornecedor de abrasivos'},
 10:{'Lote':'LU2407-031','NF-e':'119350','Fornecedor':'Fornecedor de lubrificantes'},
 11:{'Lote':'EL2406-210','NF-e':'117802','Fornecedor':'Fornecedor elétrico'},
 12:{'Lote':'FE2408-018','NF-e':'120311','Fornecedor':'Fornecedor de ferramentas'},
 13:{'Modelo compatível':'Honda CG 160','Posição':'Dianteira','Marca':'Informar marca','Código original':'Informar código'},
 14:{'Modelo compatível':'Honda CG 160','Composição':'Corrente 428H, coroa e pinhão','Marca':'Informar marca','Código original':'Informar código'},
 15:{'Modelo compatível':'Universal','Especificação':'Velas de ignição iridium ou níquel','Marca':'NGK','Código original':'Informar código'},
 16:{'Modelo compatível':'Honda XRE 300','Tipo':'Filtro de óleo','Marca':'Informar marca','Código original':'Informar código'},
 17:{'Modelo compatível':'Aro 18','Medida':'2.75 / 3.00-18','Marca':'Informar marca','Código original':'Informar código'},
 18:{'Modelo compatível':'Universal','Tipo':'Cabo de embreagem','Marca':'Informar marca','Código original':'Informar código'}
};
/* Exemplos de clientes/fornecedores e pedidos: troque pelas rotas do seu back end. */
// Cadastro de clientes, fornecedores e transportadoras.
let clientes=[
 {id:1,tipo:'Cliente',nome:'Metalúrgica Horizonte',doc:'00.000.000/0001-01',contato:'Marcos Lima',tel:'(11) 90000-0001',cidade:'São Paulo'},
 {id:2,tipo:'Cliente',nome:'Oficina Duas Rodas',doc:'00.000.000/0001-02',contato:'Paulo Souza',tel:'(11) 90000-0002',cidade:'Guarulhos'},
 {id:3,tipo:'Cliente',nome:'Construtora Alfa',doc:'00.000.000/0001-03',contato:'Ana Prado',tel:'(11) 90000-0003',cidade:'Osasco'},
 {id:4,tipo:'Fornecedor',nome:'Aços Santa Rita',doc:'00.000.000/0001-04',contato:'Vendas',tel:'(11) 90000-0004',cidade:'Mauá'},
 {id:5,tipo:'Fornecedor',nome:'Metalfer',doc:'00.000.000/0001-05',contato:'Vendas',tel:'(11) 90000-0005',cidade:'Diadema'},
 {id:6,tipo:'Transportadora',nome:'Rápido Sul Transportes',doc:'00.000.000/0001-06',contato:'Despacho',tel:'(11) 90000-0006',cidade:'São Paulo'}
];
// Pedidos de venda a entregar, com seus itens e prazo.
let pedidos=[
 {id:101,cliente:1,prazo:'2026-10-08',status:'Pendente',itens:[{p:1,q:10,preco:450},{p:3,q:20,preco:95}]},
 {id:102,cliente:2,prazo:'2026-10-05',status:'Separado',itens:[{p:13,q:6,preco:89.9},{p:15,q:10,preco:24.5}]},
 {id:103,cliente:3,prazo:'2026-10-12',status:'Pendente',itens:[{p:2,q:20,preco:310}]},
 {id:104,cliente:1,prazo:'2026-10-02',status:'Entregue',itens:[{p:6,q:10,preco:28}],fat:{nf:'1520',serie:'1',data:'2026-10-03',venc:'2026-11-02'}}
];
// Notas fiscais emitidas: vendas faturadas e retornos de industrialização (material de terceiros).
let notas=[
 {nf:'1520',serie:'1',data:'2026-10-03',tipo:'Venda',cliente:1,valor:280,ref:'Pedido #104'}
];
// Material de terceiros: pertence ao cliente, fica na empresa e NÃO entra no estoque próprio nem no faturamento de venda.
let terceiros=[
 {id:1,cliente:1,nome:'Chapa de aço 2 mm (do cliente)',sku:'T-0001',un:'un',hist:[{data:'2026-10-05',tipo:'Entrada',q:50,doc:'NF 88123',quem:'Recebimento'},{data:'2026-10-06',tipo:'Consumo',q:10,doc:'OF 321',quem:'Produção'}]},
 {id:2,cliente:3,nome:'Tubo 50 x 50 (do cliente)',sku:'T-0002',un:'un',hist:[{data:'2026-10-02',tipo:'Entrada',q:25,doc:'NF 90412',quem:'Recebimento'}]}
];
// Atalho: $('#id') busca um elemento da página.
const $=s=>document.querySelector(s);
// Formata número no padrão brasileiro (1.850).
const nf=n=>n.toLocaleString('pt-BR');
// Calcula a situação do item: crítico, abaixo do mínimo ou normal.
const st=p=>p.qtd<=p.min*.5?'crit':p.qtd<=p.min?'low':'ok';
// Textos mostrados para cada situação.
const lab={ok:'Normal',low:'Abaixo do mínimo',crit:'Crítico'};
// Encontra um item pelo id.
const by=id=>produtos.find(p=>p.id===id);
// Junta a ficha técnica (INFO) a cada item.
produtos.forEach(p=>{if(!p.info&&INFO[p.id])p.info=INFO[p.id]});
// Estado da tela: view = tela aberta, q = texto da busca, f = filtro de situação.
let view='inicio',q='',f='todos';

// Desenha a barra de nível do estoque com a marca do mínimo.
const gauge=p=>{const s=st(p),w=Math.min(100,p.qtd/p.max*100),m=p.min/p.max*100;
 return `<div class="gauge s-${s}" role="img" aria-label="${nf(p.qtd)} de ${nf(p.max)} ${p.un}; mínimo ${nf(p.min)}"><i style="width:${w}%"></i><u style="left:${m}%"></u></div>`};
// Desenha a etiqueta colorida da situação.
const tag=p=>`<span class="tag ${st(p)}">${lab[st(p)]}</span>`;

// Nome do botão de cadastro de cada categoria.
const SING={mp:'Nova matéria-prima',imp:'Novo material improdutivo',motos:'Nova peça de moto'};
// As três categorias de material: nome e descrição.
const ABAS={
 mp:['Matéria-prima','Chapas, barras, tubos e insumos que viram produto.'],
 imp:['Materiais improdutivos','Itens de consumo da fábrica: EPI, abrasivos, lubrificantes e ferramentas.'],
 motos:['Produtos','Peças para venda e reposição, por modelo.']};
// Desenha uma linha de movimentação (entrada ou saída).
const movLi=m=>{const p=by(m.p);return `<div class="li"><div><b>${p.nome}</b><br><small>${rotulo(m)} · ${m.quem}${m.obs?' · '+m.obs:''}</small>${m.info?`<br><small>${Object.entries(m.info).map(([k,v])=>k+' '+v).join(' · ')}</small>`:''}</div><b class="${m.tipo==='Entrada'?'in':'out'}">${m.tipo==='Entrada'?'+':'−'}${nf(m.q)} ${p.un}</b></div>`};

// Monta a tela de uma categoria: resumo, busca, filtros e tabela de itens.
function lista(){
 const base=produtos.filter(p=>p.aba===view),c=base.filter(p=>st(p)==='crit').length,l=base.filter(p=>st(p)==='low').length;
 const t=q.trim().toLowerCase();
 const r=base.filter(p=>(f==='todos'||st(p)===f)&&(!t||[p.nome,p.sku,p.cat,...Object.values(p.info||{})].some(x=>x.toLowerCase().includes(t))));
 const chips=[['todos','Todos'],['ok','Normal'],['low','Abaixo do mínimo'],['crit','Crítico']].map(([k,v])=>`<button class="chip" data-f="${k}" aria-pressed="${f===k}">${v}<small>${k==='todos'?base.length:base.filter(p=>st(p)===k).length}</small></button>`).join('');
 return `<div class="head"><h1>${ABAS[view][0]}</h1><button class="btn" data-new>${SING[view]}</button></div><p class="sub">${ABAS[view][1]} A marca vertical na barra indica o estoque mínimo.</p>
 <div class="stats">
  <div class="stat"><b>${base.length}</b><span>Itens nesta aba</span></div>
  <div class="stat low"><b>${l}</b><span>Abaixo do mínimo</span></div>
  <div class="stat crit"><b>${c}</b><span>Nível crítico</span></div>
 </div>
 <div class="tools"><input type="search" id="busca" placeholder="Buscar por nome, código ou lote" value="${q}" aria-label="Buscar nesta aba">${chips}</div>
 <div class="wrap"><table><thead><tr><th>Item</th><th>Quantidade</th><th style="width:22%">Nível</th><th>Situação</th><th></th></tr></thead><tbody>
 ${r.map(p=>`<tr class="row" tabindex="0" data-open="${p.id}"><td><b>${p.nome}</b><small>${p.sku} · ${p.cat}</small></td><td>${nf(p.qtd)} ${p.un}</td><td>${gauge(p)}</td><td>${tag(p)}</td><td class="acts"><button class="mini" data-ent="${p.id}" title="Adicionar entrada">+ Entrada</button> <button class="mini" data-ret="${p.id}" title="Retirar para produção">Retirar</button></td></tr>`).join('')||`<tr><td colspan="5" class="empty">Nenhum item encontrado. Limpe a busca ou escolha outro filtro.</td></tr>`}
 </tbody></table></div>`}

// Converte uma data para o formato AAAA-MM-DD no horário local.
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
// Devolve a data de N dias atrás.
const diaAntes=n=>{const d=new Date();d.setDate(d.getDate()-n);return iso(d)};
// hoje() e ontem(): datas no formato AAAA-MM-DD.
const hoje=()=>diaAntes(0),ontem=()=>diaAntes(1);
// Converte as datas escritas como 'Hoje' e 'Ontem' nos exemplos para datas reais.
movs.forEach(m=>{if(!m.data){const [d,h]=m.hora.split(', ');m.data=d==='Hoje'?hoje():ontem();m.hora=h}});
// Escreve a data da movimentação como Hoje, Ontem ou dd/mm/aaaa.
const rotulo=m=>(m.data===hoje()?'Hoje':m.data===ontem()?'Ontem':dBR(m.data))+', '+m.hora;
// Ordena movimentações da mais nova para a mais antiga.
const ordenar=a=>[...a].sort((x,y)=>(y.data+y.hora).localeCompare(x.data+x.hora));
// Diz se uma movimentação cabe no período escolhido (Hoje, Ontem, 7 dias ou Tudo).
const noPeriodo=m=>per==='Tudo'||(per==='Hoje'&&m.data===hoje())||(per==='Ontem'&&m.data===ontem())||(per==='7 dias'&&m.data>=diaAntes(6));
// Filtra movimentações pelo texto da busca (NF-e, lote, item, responsável).
const matchM=m=>{const p=by(m.p),t=qm.trim().toLowerCase();return !t||[p.nome,p.sku,m.quem,m.obs||'',...Object.values(m.info||{})].some(x=>String(x).toLowerCase().includes(t))};
// Converte AAAA-MM-DD em dd/mm/aaaa.
const dBR=d=>d.split('-').reverse().join('/');
// Devolve o nome de um cliente pelo id.
const nomeC=id=>(clientes.find(c=>c.id===id)||{nome:'—'}).nome;
// Tipos de cadastro disponíveis.
const TIPOS=['Cliente','Fornecedor','Transportadora','Outro'];
// Estados: fc = filtro de clientes, per = período, msg = mensagem de erro, qm = busca nas movimentações.
let fc='todos',per='Hoje',msg='',qm='';
// Diz se um pedido está atrasado.
const pedAtras=o=>o.status!=='Entregue'&&o.prazo<hoje();
// Diz se falta estoque para um pedido pendente.
const pedFalta=o=>o.status==='Pendente'&&o.itens.some(i=>by(i.p).qtd<i.q);
// Desenha um botão de filtro (pílula).
const chip=(a,k,l,on)=>`<button class="chip" data-${a}="${k}" aria-pressed="${on}">${l}</button>`;
// Monta a lista de produtos (agrupada por categoria) para os campos de seleção.
const optProd=()=>Object.entries(ABAS).map(([k,[n]])=>`<optgroup label="${n}">${produtos.filter(p=>p.aba===k).map(p=>`<option value="${p.id}">${p.nome} (${nf(p.qtd)} ${p.un})</option>`).join('')}</optgroup>`).join('');


// Tela Início.
/* ---------- Início ---------- */
// Monta a tela Início: ações rápidas, itens que precisam de atenção e cartões de acesso.
function telaInicio(){
 const atr=pedidos.filter(pedAtras).length,ab=pedidos.filter(o=>o.status!=='Entregue').length,at=produtos.filter(p=>st(p)!=='ok').sort((x,y)=>x.qtd/x.min-y.qtd/y.min).slice(0,6);
 const card=k=>{const b=produtos.filter(p=>p.aba===k),c=b.filter(p=>st(p)==='crit').length,l=b.filter(p=>st(p)==='low').length;
  return `<button class="card" data-v="${k}">${ico(k)}<span class="card-t">${ABAS[k][0]}</span><b>${b.length}</b><span>itens cadastrados</span><span class="card-s">${c?`<span class="tag crit">${c} crítico${c>1?'s':''}</span>`:''}${l?`<span class="tag low">${l} abaixo do mínimo</span>`:''}${!c&&!l?'<span class="tag ok">Estoque em dia</span>':''}</span></button>`};
 return `<h1>Almoxarifado</h1><p class="sub">Ações rápidas e o que precisa de atenção hoje.</p>
 <div class="quick"><button class="btn" data-newt>Receber material de terceiro</button><button class="chip" data-newp>Novo pedido</button><button class="chip" data-newc>Novo cadastro</button></div>
 <section class="panel" style="margin-bottom:22px"><h2>Precisa de atenção</h2>
 ${atr?`<div class="li"><span><b>${atr} pedido${atr>1?'s':''} atrasado${atr>1?'s':''}</b></span><button class="mini" data-v="vendas">Ver pedidos</button></div>`:''}
 ${at.map(p=>`<div class="li"><button data-item="${p.id}"><b>${p.nome}</b><br><small>${ABAS[p.aba][0]} · ${nf(p.qtd)} de ${nf(p.min)} ${p.un} mínimos</small></button><span>${tag(p)} <button class="mini" data-ent="${p.id}">+ Entrada</button></span></div>`).join('')||(atr?'':'<div class="empty">Tudo em dia por aqui.</div>')}</section>
 <h2 class="sec2">Estoque</h2><div class="cards">${Object.keys(ABAS).map(card).join('')}</div>
 <h2 class="sec2">Gestão</h2><div class="cards">
  <button class="card" data-v="vendas">${ico('vendas')}<span class="card-t">Vendas</span><b>${ab}</b><span>pedidos a entregar</span><span class="card-s">${atr?`<span class="tag crit">${atr} atrasado${atr>1?'s':''}</span>`:'<span class="tag ok">Sem atrasos</span>'}</span></button>
  <button class="card" data-v="clientes">${ico('clientes')}<span class="card-t">Clientes</span><b>${clientes.length}</b><span>cadastros</span></button>
  <button class="card" data-v="saida">${ico('saida')}<span class="card-t">Saída manual</span><b>${movs.filter(m=>m.data===hoje()).length}</b><span>movimentações hoje</span></button></div>`}

// Desenhos dos ícones (SVG), um por nome.
const ICO={
 inicio:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 mp:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
 imp:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-3 3-2.4-.6-.6-2.4z"/>',
 motos:'<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17l4-8h5l3 8M9 9H6"/>',
 vendas:'<path d="M3 4h2l2.5 11h10l2-8H6"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>',
 clientes:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
 saida:'<path d="M4 8h14l-4-4M20 16H6l4 4"/>'};
// Monta o ícone de um nome.
const ico=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
// Botão do menu antigo (não é mais usado no layout atual).
const navBtn=(k,n,b)=>`<button class="nav" data-v="${k}"${k===view?' aria-current="page"':''}>${ico(k)}<span class="nl">${n}</span>${b?`<span class="badge" title="Precisa de atenção">${b}</span>`:''}</button>`;
// Mostra o aviso de confirmação por 3 segundos.
function aviso(t){const el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(aviso.t);aviso.t=setTimeout(()=>el.classList.remove('on'),3200)}
// Abre a categoria do item e o painel dele.
function irItem(id){const p=by(id);view=p.aba;q='';f='todos';render();abrir(id);window.scrollTo(0,0)}
// Trata o clique em um resultado da busca geral.
function irGs(v){
 $('#gs').value='';$('#gsr').hidden=true;
 if(v.startsWith('item:'))irItem(+v.slice(5));
 else ir({cli:'clientes',fat:'fat',terc:'terc'}[v]||'vendas')
}
// Monta a lista de resultados da busca geral (itens, NF-e, clientes, pedidos).
function gsRender(v){
 const t=v.trim().toLowerCase(),box=$('#gsr');
 if(!t){box.hidden=true;return}
 const has=(...a)=>a.some(x=>String(x==null?'':x).toLowerCase().includes(t));
 const row=(go,tit,sub,dir)=>`<button data-gs="${go}"><span><b>${tit}</b><small>${sub}</small></span><span>${dir||''}</span></button>`;
 const it=produtos.filter(p=>has(p.nome,p.sku,p.cat,...Object.values(p.info||{}))).slice(0,6).map(p=>row('item:'+p.id,p.nome,ABAS[p.aba][0]+' · '+p.sku,nf(p.qtd)+' '+p.un));
 const nfe=movs.filter(m=>m.info&&m.info['NF-e']&&has(m.info['NF-e'])).slice(0,3).map(m=>row('item:'+m.p,'NF-e '+m.info['NF-e'],by(m.p).nome+' · '+rotulo(m),'+'+nf(m.q)));
 const cl=clientes.filter(c=>has(c.nome,c.doc,c.contato)).slice(0,3).map(c=>row('cli',c.nome,c.tipo));
 const pe=pedidos.filter(o=>has('#'+o.id,nomeC(o.cliente))).slice(0,3).map(o=>row('ped','Pedido #'+o.id,nomeC(o.cliente)+' · entrega '+dBR(o.prazo)));
 const nt=notas.filter(n=>has('NF '+n.nf,n.nf,nomeC(n.cliente))).slice(0,3).map(n=>row('fat','NF '+n.nf+' · '+n.tipo,nomeC(n.cliente)+' · '+dBR(n.data),brl(n.valor)));
 const tc=terceiros.filter(t=>has(t.nome,t.sku,nfsT(t),nomeC(t.cliente))).slice(0,3).map(t=>row('terc',t.nome,'Terceiros · '+nomeC(t.cliente)+' · NF '+nfsT(t),nf(saldoT(t))+' '+t.un));
 box.innerHTML=[...it,...nfe,...cl,...pe,...nt,...tc].join('')||'<div class="empty">Nada encontrado.</div>';box.hidden=false;
}
// Monta a lista de itens para escolher (entrada ou saída rápida).
const pkHTML=(t,tipo)=>{const l=produtos.filter(p=>!t||[p.nome,p.sku,p.cat,...Object.values(p.info||{})].some(x=>String(x).toLowerCase().includes(t))).slice(0,30);
 return l.map(p=>`<button class="pk" data-pk="${p.id}" data-tipo="${tipo}"><span><b>${p.nome}</b><small>${p.sku} · ${ABAS[p.aba][0]}</small></span><span>${nf(p.qtd)} ${p.un}</span></button>`).join('')||'<div class="empty">Nenhum item encontrado.</div>'};
// Abre o painel para escolher o item de uma entrada ou saída.
function escolher(tipo){
 $('#drawer').innerHTML=`<button class="close" id="x" type="button">Fechar</button><h2>${tipo==='Entrada'?'Registrar entrada':'Registrar saída'}</h2><p class="sub" style="margin:4px 0 14px">Escolha o item.</p>
 <input type="search" id="pk" data-tipo="${tipo}" placeholder="Buscar por nome, código ou lote" aria-label="Buscar item" style="width:100%;margin-bottom:10px"><div id="pkl">${pkHTML('',tipo)}</div>`;
 mostrar();$('#pk').focus();
}

// Acrescenta mais ícones ao conjunto.
Object.assign(ICO,{
 entrada:'<path d="M12 3v11M8 10l4 4 4-4"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
 retirada:'<path d="M12 14V3M8 7l4-4 4 4"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
 novo:'<path d="M12 5v14M5 12h14"/>',
 rel:'<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'});
// Módulos, abas e botões da faixa superior.
/* Módulos, abas e botões da faixa superior: [ação, rótulo, ícone] */
// Vai para uma tela e limpa filtros e painel.
function ir(v){view=v;q='';f='todos';msg='';fechar();render();window.scrollTo(0,0)}

// Redesenha a tela inteira: abas, faixa de botões, módulos e conteúdo.
// Menu em um nível só: grupo > tela. Cada item é [tela, nome, ícone].
const MENU=[
 ['',[['inicio','Início','inicio']]],
 ['Estoque',[['mp','Matéria-prima','mp'],['imp','Materiais improdutivos','imp'],['motos','Produtos','motos'],['terc','Material de terceiros','terc']]],
 ['Movimentações',[['saida','Entradas e saídas','saida']]],
 ['Comercial',[['vendas','Pedidos de venda','vendas'],['fat','Faturamento','fat'],['clientes','Clientes e fornecedores','clientes']]]];
function render(){
 // Guarda qual busca está em uso para devolver o cursor depois de redesenhar.
 const ka=document.activeElement&&['busca','buscam'].includes(document.activeElement.id)?document.activeElement.id:null,atr=pedidos.filter(pedAtras).length;
 // Desenha o menu lateral; o selo vermelho mostra itens críticos (estoque) ou pedidos atrasados (vendas).
 $('#nav').innerHTML=MENU.map(([g,its])=>(g?`<div class="grp">${g}</div>`:'')+its.map(([k,n])=>navBtn(k,n,ABAS[k]?produtos.filter(p=>p.aba===k&&st(p)==='crit').length:k==='vendas'?atr:k==='fat'?aFaturar().length:0)).join('')).join('');
 // Desenha o conteúdo da tela escolhida.
 $('#main').innerHTML=(ABAS[view]?lista:{inicio:telaInicio,vendas:telaVendas,clientes:telaClientes,saida:telaSaida,fat:telaFat,terc:telaTerc}[view])();
 // Devolve o cursor ao campo de busca que estava sendo usado.
 if(ka){const i=$('#'+ka),v=ka==='busca'?q:qm;i.focus();i.setSelectionRange(v.length,v.length)}
}

// Vendas.
/* ---------- Vendas ---------- */
// Monta a tela de pedidos a entregar.
function telaVendas(){
 const ab=pedidos.filter(o=>o.status!=='Entregue');
 const rows=[...pedidos].sort((a,b)=>(a.status==='Entregue')-(b.status==='Entregue')||a.prazo.localeCompare(b.prazo));
 return `<div class="head"><h1>Vendas</h1><button class="btn" data-newp>Novo pedido</button></div>
 <p class="sub">Pedidos a entregar, por cliente e prazo. Ao entregar, o estoque recebe a baixa automaticamente.</p>
 <div class="stats"><div class="stat"><b>${ab.length}</b><span>Pedidos a entregar</span></div><div class="stat crit"><b>${ab.filter(pedAtras).length}</b><span>Atrasados</span></div><div class="stat low"><b>${ab.filter(pedFalta).length}</b><span>Sem estoque suficiente</span></div></div>
 ${msg?`<p class="err" role="alert">${msg}</p>`:''}
 <div class="wrap"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Entrega</th><th>Valor</th><th>Situação</th><th></th></tr></thead><tbody>
 ${rows.map(o=>`<tr><td><b>#${o.id}</b></td><td>${nomeC(o.cliente)}</td><td>${o.itens.map(i=>`${nf(i.q)} ${by(i.p).un} · ${by(i.p).nome}`).join('<br>')}</td><td>${dBR(o.prazo)}</td><td>${brl(totalPed(o))}</td>
 <td><span class="tag ${o.status==='Entregue'?'ok':'info'}">${o.status}</span>${pedAtras(o)?' <span class="tag crit">Atrasado</span>':''}${pedFalta(o)?' <span class="tag low">Falta estoque</span>':''}${o.fat?` <span class="tag ok">Faturado · NF ${o.fat.nf}</span>`:o.status!=='Pendente'?' <span class="tag info">A faturar</span>':''}</td>
 <td>${o.status!=='Entregue'?`<button class="chip" data-adv="${o.id}">${o.status==='Pendente'?'Marcar separado':'Entregar'}</button>`:''}</td></tr>`).join('')}
 </tbody></table></div>`}
// Registra uma entrada ou saída: ajusta a quantidade e grava no histórico.
function movimentar(p,tipo,q,quem,obs,data,info){
 const it=by(p);it.qtd+=tipo==='Entrada'?q:-q;
 movs.unshift({data:data||hoje(),hora:new Date().toTimeString().slice(0,5),tipo,p,q,quem,obs,info});
 /* envie ao back end: POST /api/movimentacoes */
}
// Avança o pedido: Pendente, Separado, Entregue (a entrega dá baixa no estoque).
function avancar(id){
 const o=pedidos.find(x=>x.id===id);msg='';
 if(o.status==='Pendente')o.status='Separado';
 else{const f=o.itens.find(i=>by(i.p).qtd<i.q);
  if(f){msg=`Estoque insuficiente de ${by(f.p).nome} para o pedido #${o.id}.`;render();return}
  o.itens.forEach(i=>movimentar(i.p,'Saída',i.q,nomeC(o.cliente),'Pedido #'+o.id));o.status='Entregue';aviso('Pedido #'+o.id+' entregue e estoque atualizado.')}
 render();
}
// Uma linha de item (produto e quantidade) do formulário de pedido.
const linhaItem=()=>`<div class="row3 item"><label>Produto<select name="p">${optProd()}</select></label><label>Quantidade<input name="q" type="number" min="1" value="1"></label><label>Preço unitário (R$)<input name="preco" type="number" min="0" step="0.01" value="0"></label></div>`;
// Abre o formulário de novo pedido.
function novoPedido(){
 $('#drawer').innerHTML=`<button class="close" id="x" type="button">Fechar</button><h2>Novo pedido</h2>
 <form id="fped" novalidate style="margin-top:14px">
  <label>Cliente<select name="cliente">${clientes.filter(c=>c.tipo==='Cliente').map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}</select></label>
  <label>Data de entrega<input name="prazo" type="date" required></label>
  <h2 class="sec">Itens do pedido</h2><div id="itens">${linhaItem()}</div>
  <button class="chip" type="button" id="mais">+ Adicionar item</button>
  <p class="err" id="err" role="alert"></p><button class="btn" type="submit">Salvar pedido</button></form>`;
 mostrar();
}
// Valida e salva o novo pedido.
function salvarPedido(f){
 const d=Object.fromEntries(new FormData(f)),err=$('#err');
 const itens=[...f.querySelectorAll('.item')].map(r=>({p:+r.querySelector('[name=p]').value,q:+r.querySelector('[name=q]').value,preco:+r.querySelector('[name=preco]').value||0}));
 if(!d.cliente){err.textContent='Cadastre um cliente antes de criar o pedido.';return}
 if(!d.prazo){err.textContent='Informe a data de entrega.';return}
 if(itens.some(i=>!(i.q>0))){err.textContent='As quantidades precisam ser maiores que zero.';return}
 pedidos.push({id:Math.max(100,...pedidos.map(o=>o.id))+1,cliente:+d.cliente,prazo:d.prazo,status:'Pendente',itens});
 /* envie ao back end: POST /api/pedidos */
 fechar();render();aviso('Pedido criado.');
}

// Clientes.
/* ---------- Clientes ---------- */
// Monta a tela de cadastros.
function telaClientes(){
 const r=clientes.filter(c=>fc==='todos'||c.tipo===fc);
 return `<div class="head"><h1>Clientes</h1><button class="btn" data-newc>Novo cadastro</button></div>
 <p class="sub">Cadastro de clientes, fornecedores, transportadoras e outros contatos.</p>
 <div class="chips">${[['todos','Todos'],...TIPOS.map(t=>[t,t])].map(([k,l])=>chip('fc',k,l,fc===k)).join('')}</div>
 <div class="wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>CNPJ / CPF</th><th>Contato</th><th>Telefone</th><th>Cidade</th></tr></thead><tbody>
 ${r.map(c=>`<tr><td><b>${c.nome}</b></td><td><span class="tag info">${c.tipo}</span></td><td>${c.doc||'—'}</td><td>${c.contato||'—'}</td><td>${c.tel||'—'}</td><td>${c.cidade||'—'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nenhum cadastro nesta categoria.</td></tr>'}
 </tbody></table></div>`}
// Abre o formulário de novo cadastro.
function novoCadastro(tp){
 $('#drawer').innerHTML=`<button class="close" id="x" type="button">Fechar</button><h2>Novo cadastro</h2>
 <form id="fcli" novalidate style="margin-top:14px">
  <label>Tipo<select name="tipo">${TIPOS.map(t=>`<option${t===tp?' selected':''}>${t}</option>`).join('')}</select></label>
  <label>Nome ou razão social<input name="nome" required></label>
  <label>CNPJ / CPF<input name="doc"></label>
  <div class="two"><label>Contato<input name="contato"></label><label>Telefone<input name="tel"></label></div>
  <label>Cidade<input name="cidade"></label>
  <p class="err" id="err" role="alert"></p><button class="btn" type="submit">Salvar cadastro</button></form>`;
 mostrar();
}
// Valida e salva o cadastro.
function salvarCliente(f){
 const d=Object.fromEntries(new FormData(f));
 if(!d.nome.trim()){$('#err').textContent='Informe o nome do cadastro.';return}
 const c={id:Math.max(0,...clientes.map(x=>x.id))+1};
 ['tipo','nome','doc','contato','tel','cidade'].forEach(k=>c[k]=esc((d[k]||'').trim()));
 clientes.push(c);
 /* envie ao back end: POST /api/clientes */
 fc='todos';fechar();render();aviso('Cadastro salvo.');
}

// Saída manual e relatório.
/* ---------- Saída manual e relatório ---------- */
// Movimentações do período e da busca atuais.
const periodo=()=>ordenar(movs.filter(m=>noPeriodo(m)&&matchM(m)));
// Monta a tela de saída manual e o relatório de entradas e saídas.
function telaSaida(){
 const L=periodo(),mapa={};
 L.forEach(m=>{const r=mapa[m.p]||(mapa[m.p]={e:0,s:0});if(m.tipo==='Entrada')r.e+=m.q;else r.s+=m.q});
 const ids=Object.keys(mapa).map(Number).sort((a,b)=>by(a).nome.localeCompare(by(b).nome));
 return `<div class="head"><h1>Entradas e saídas</h1><button class="btn" data-csv>Baixar relatório (CSV)</button></div>
 <p class="sub">Registre o que sai (ou entra) no estoque e acompanhe quanto entrou e quanto saiu.</p>
 <section class="panel" style="margin-bottom:22px"><h2>Registrar movimentação</h2>
 <form id="fsai" novalidate><div class="row3">
  <label>Data<input name="data" type="date" value="${hoje()}" max="${hoje()}"></label>
  <label>Movimento<select name="tipo"><option>Saída</option><option>Entrada</option></select></label>
  <label>Produto<select name="p">${optProd()}</select></label>
  <label>Quantidade<input name="q" type="number" min="1" value="1"></label>
  <label>Retirado por / setor<input name="quem" required></label>
  <label>Observação<input name="obs"></label></div>
  <p class="err" id="err" role="alert"></p><button class="btn" type="submit">Registrar</button></form></section>
 <h2 style="font-size:18px;margin:0 0 10px">Relatório de entradas e saídas</h2>
 <div class="tools"><input type="search" id="buscam" placeholder="Buscar por NF-e, lote, item ou responsável" value="${qm}" aria-label="Buscar movimentações">${['Hoje','Ontem','7 dias','Tudo'].map(k=>chip('per',k,k,per===k)).join('')}</div>
 <div class="wrap"><table><thead><tr><th>Item</th><th>Entrou</th><th>Saiu</th><th>Estoque atual</th></tr></thead><tbody>
 ${ids.map(i=>{const p=by(i),r=mapa[i];return `<tr><td><b>${p.nome}</b><small>${p.sku} · ${ABAS[p.aba][0]}</small></td><td class="in">${r.e?'+'+nf(r.e)+' '+p.un:'—'}</td><td class="out">${r.s?'−'+nf(r.s)+' '+p.un:'—'}</td><td>${nf(p.qtd)} ${p.un}</td></tr>`}).join('')||'<tr><td colspan="4" class="empty">Sem movimentações neste período.</td></tr>'}
 </tbody></table></div>
 <h2 style="font-size:18px;margin:22px 0 10px">Movimentações do período</h2>
 <section class="panel">${L.map(movLi).join('')||'<div class="empty">Sem movimentações neste período.</div>'}</section>`}
// Valida e registra a movimentação do formulário da tela.
function salvarSaida(f){
 const d=Object.fromEntries(new FormData(f)),it=by(+d.p),q=+d.q,err=$('#err');
 if(!(q>0)){err.textContent='Informe uma quantidade maior que zero.';return}
 if(!d.quem.trim()){err.textContent='Informe quem retirou ou recebeu o material.';return}
 if(d.tipo==='Saída'&&q>it.qtd){err.textContent=`Estoque insuficiente: há ${nf(it.qtd)} ${it.un} de ${it.nome}.`;return}
 movimentar(it.id,d.tipo,q,esc(d.quem.trim()),esc(d.obs.trim()),d.data||hoje());render();aviso('Movimentação registrada.');
}

// Entrada e retirada sobre o item existente.
/* ---------- Entrada e retirada sobre o item existente ---------- */
// Campos pedidos em cada entrada de material.
const campoEnt=aba=>aba==='motos'?['NF-e','Fornecedor']:CAMPOS[aba];
// Abre o formulário de entrada ou retirada de um item.
function formMov(id,tipo){
 const p=by(id),ent=tipo==='Entrada';
 $('#drawer').innerHTML=`<button class="close" id="x" type="button">Fechar</button><h2>${ent?'Entrada de material':'Retirada para produção'}</h2>
 <small style="color:var(--muted)">${p.nome} · estoque atual ${nf(p.qtd)} ${p.un}</small>
 <form id="fmov" data-id="${id}" data-tipo="${tipo}" novalidate style="margin-top:14px">
  <div class="two"><label>${ent?'Data de chegada':'Data da retirada'}<input name="data" type="date" value="${hoje()}" max="${hoje()}"></label>
  <label>Quantidade (${p.un})<input name="q" type="number" min="1" value="1"></label></div>
  ${ent?campoEnt(p.aba).map(c=>`<label>${c}<input name="info:${c}"${c==='Fornecedor'&&p.info&&p.info[c]?` value="${p.info[c]}"`:''}></label>`).join(''):'<label>Retirado por / setor<input name="quem" value="Produção"></label>'}
  <label>Observação<input name="obs"></label>
  <p class="err" id="err" role="alert"></p><button class="btn" type="submit">${ent?'Registrar entrada':'Registrar retirada'}</button></form>`;
 mostrar();
}
// Valida e registra a entrada ou retirada (bloqueia NF-e repetida e saída maior que o saldo).
function salvarMov(f){
 const d=Object.fromEntries(new FormData(f)),id=+f.dataset.id,tipo=f.dataset.tipo,p=by(id),q=+d.q,err=$('#err');
 const info={};Object.entries(d).forEach(([k,v])=>{if(k.startsWith('info:')&&v.trim())info[k.slice(5)]=esc(v.trim())});
 if(!d.data){err.textContent='Informe a data.';return}
 if(!(q>0)){err.textContent='Informe uma quantidade maior que zero.';return}
 if(tipo==='Saída'&&q>p.qtd){err.textContent=`Estoque insuficiente: há ${nf(p.qtd)} ${p.un}.`;return}
 if(info['NF-e']&&movs.some(m=>m.p===id&&m.tipo==='Entrada'&&m.info&&m.info['NF-e']===info['NF-e'])){err.textContent='Esta NF-e já foi lançada para este item.';return}
 const quem=tipo==='Entrada'?(info['Fornecedor']||'Recebimento'):esc((d.quem||'').trim()||'Produção');
 movimentar(id,tipo,q,quem,esc((d.obs||'').trim()),d.data,tipo==='Entrada'?info:undefined);
 if(tipo==='Entrada')p.info={...(p.info||{}),...info};
 aviso(`${tipo==='Entrada'?'Entrada registrada':'Retirada registrada'}: ${nf(q)} ${p.un} de ${p.nome}.`);render();abrir(id);
}
// Gera e baixa o relatório de movimentações em CSV.
function baixarCSV(){
 const linhas=[['Data','Hora','Movimento','Código','Item','Quantidade','Unidade','Responsável','NF-e','Lote','Observação'],...periodo().map(m=>{const p=by(m.p),i=m.info||{};return [dBR(m.data),m.hora,m.tipo,p.sku,p.nome,m.q,p.un,m.quem,i['NF-e']||'',i['Lote']||'',m.obs||'']})];
 const csv='\ufeff'+linhas.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='relatorio-movimentacoes.csv';a.click();
}
// Protege textos digitados contra caracteres perigosos de HTML.
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Desenha uma ficha de pares (rótulo e valor).
const ficha=rows=>`<div class="ficha">${rows.map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
// Abre o painel lateral com os detalhes do item e o histórico.
function abrir(id){
 const p=by(id),h=ordenar(movs.filter(m=>m.p===id)),inf=Object.entries(p.info||{});
 const est=[['Estoque mínimo',nf(p.min)+' '+p.un],['Capacidade',nf(p.max)+' '+p.un]];
 if(p.qtd<p.min)est.push(['Falta para o mínimo',nf(p.min-p.qtd)+' '+p.un]);
 $('#drawer').innerHTML=`<button class="close" id="x">Fechar</button>${tag(p)}<h2>${p.nome}</h2><small style="color:var(--muted)">${p.sku} · ${p.cat}</small>
 <p class="big" style="margin-top:18px">${nf(p.qtd)} <span style="font-size:16px;font-weight:400">${p.un}</span></p><div style="margin:12px 0">${gauge(p)}</div>
 <div class="acoes"><button class="btn" data-ent="${id}">Adicionar entrada</button><button class="chip" data-ret="${id}">Retirar para produção</button></div>
 ${ficha(est)}
 ${inf.length?`<h2 class="sec">Ficha técnica</h2>${ficha(inf)}`:''}
 <h2 class="sec">Histórico</h2>${h.map(movLi).join('')||'<div class="empty">Sem movimentações recentes.</div>'}`;
 mostrar();
}
// Mostra o painel lateral.
function mostrar(){document.body.classList.add('open');$('#drawer').setAttribute('aria-hidden','false');$('#x').focus()}

// Campos de cadastro de cada categoria.
/* Campos de cada classificação: edite aqui para criar ou mudar os campos do formulário. */
// Lista dos campos de cada categoria (edite aqui).
const CAMPOS={
 mp:['Lote','Certificado','NF-e','Fornecedor'],
 imp:['Lote','Certificado de aprovação (CA)','NF-e','Fornecedor'],
 motos:['Modelo compatível','Marca','Código original','Medida']};
// Monta os campos específicos da categoria no formulário.
const espHTML=aba=>`<h2 class="sec">Informações de ${ABAS[aba][0].toLowerCase()}</h2>`+CAMPOS[aba].map(c=>`<label>${c}<input name="info:${c}"></label>`).join('');
// Abre o formulário de novo item de uma categoria.
function novo(aba){
 $('#drawer').innerHTML=`<button class="close" id="x" type="button">Fechar</button><h2>${SING[aba]}</h2>
 <form id="form" novalidate style="margin-top:14px">
  <input type="hidden" name="aba" value="${aba}">
  <label>Nome do item<input name="nome" required></label>
  <div class="two"><label>Código<input name="sku" required></label><label>Categoria<input name="cat"></label></div>
  <label>Unidade<input name="un" placeholder="un, kg, m" value="un"></label>
  <div class="two"><label>Quantidade<input name="qtd" type="number" min="0" value="0"></label><label>Estoque mínimo<input name="min" type="number" min="0" value="0"></label></div>
  <label>Capacidade máxima<input name="max" type="number" min="1" required></label>
  <div id="esp">${espHTML(aba)}</div>
  <p class="err" id="err" role="alert"></p>
  <button class="btn" type="submit">Salvar item</button>
 </form>`;
 mostrar();
}
// Ponto de ligação com o back end.
/* Envie o novo item ao seu back end aqui. */
// Envie aqui o novo item ao back end (fetch POST).
async function salvar(p){
 /* await fetch('/api/produtos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)}); */
}
// Valida e cadastra o novo item.
async function enviar(form){
 const d=Object.fromEntries(new FormData(form)),err=$('#err');
 const nome=d.nome.trim(),sku=d.sku.trim(),qtd=+d.qtd,min=+d.min,max=+d.max;
 if(!nome||!sku){err.textContent='Preencha o nome e o código do item.';return}
 if(produtos.some(p=>p.sku.toLowerCase()===sku.toLowerCase())){err.textContent='Já existe um item com este código.';return}
 if(!(max>0)||qtd<0||min<0){err.textContent='Informe a capacidade máxima e quantidades iguais ou maiores que zero.';return}
 const info={};
 Object.entries(d).forEach(([k,v])=>{if(k.startsWith('info:')&&v.trim())info[k.slice(5)]=esc(v.trim())});
 const p={id:Math.max(0,...produtos.map(x=>x.id))+1,aba:d.aba,nome:esc(nome),sku:esc(sku),cat:esc(d.cat.trim()||ABAS[d.aba][0]),qtd,min,max,un:esc(d.un.trim()||'un'),info};
 await salvar(p);
 produtos.push(p);view=d.aba;q='';f='todos';aviso('Item cadastrado: '+p.nome+'.');render();abrir(p.id);
}
// Fecha o painel lateral.
function fechar(){document.body.classList.remove('open');$('#drawer').setAttribute('aria-hidden','true')}

// =====================================================================
// FATURAMENTO: pedido separado ou entregue vira nota de venda (NF-e).
// MATERIAL DE TERCEIROS: material do cliente que fica na empresa para ser industrializado.
// =====================================================================
// Ícones das duas telas novas.
Object.assign(ICO,{terc:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',fat:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>'});
// Formata valor em reais.
const brl=n=>(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
// Valor total de um pedido: soma de quantidade x preço de cada item.
const totalPed=o=>o.itens.reduce((a,i)=>a+i.q*(i.preco||0),0);
// Pedidos prontos para faturar: já separados ou entregues e ainda sem nota.
const aFaturar=()=>pedidos.filter(o=>!o.fat&&o.status!=='Pendente');
// Saldo de um material de terceiros: entrou menos consumo e devoluções.
const saldoT=t=>t.hist.reduce((a,h)=>a+(h.tipo==='Entrada'?h.q:-h.q),0);
// Soma de um tipo de movimento (Entrada, Consumo ou Devolução).
const somaT=(t,tp)=>t.hist.filter(h=>h.tipo===tp).reduce((a,h)=>a+h.q,0);
// Números das notas de remessa do cliente que trouxeram o material.
const nfsT=t=>t.hist.filter(h=>h.tipo==='Entrada').map(h=>h.doc.replace('NF ','')).join(', ');

// Tela Faturamento: pedidos a faturar e notas emitidas.
function telaFat(){
 const af=aFaturar();
 return `<div class="head"><h1>Faturamento</h1></div>
 <p class="sub">Emita a nota de venda dos pedidos separados ou entregues e acompanhe tudo o que já foi faturado.</p>
 <div class="stats"><div class="stat low"><b>${af.length}</b><span>Pedidos a faturar (${brl(af.reduce((a,o)=>a+totalPed(o),0))})</span></div><div class="stat"><b>${notas.length}</b><span>Notas emitidas</span></div><div class="stat"><b>${brl(notas.reduce((a,n)=>a+n.valor,0))}</b><span>Total faturado</span></div></div>
 <h2 class="sec2">Pedidos a faturar</h2>
 <div class="wrap"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Entrega</th><th>Valor</th><th></th></tr></thead><tbody>
 ${af.map(o=>`<tr><td><b>#${o.id}</b></td><td>${nomeC(o.cliente)}</td><td>${dBR(o.prazo)}</td><td>${brl(totalPed(o))}</td><td class="acts"><button class="mini" data-fat="${o.id}">Faturar</button></td></tr>`).join('')||'<tr><td colspan="5" class="empty">Nenhum pedido separado ou entregue aguardando nota.</td></tr>'}
 </tbody></table></div>
 <h2 class="sec2" style="margin-top:24px">Notas emitidas</h2>
 <div class="wrap"><table><thead><tr><th>NF-e / série</th><th>Data</th><th>Tipo</th><th>Cliente</th><th>Referência</th><th>Valor</th></tr></thead><tbody>
 ${notas.map(n=>`<tr><td><b>${n.nf}</b> / ${n.serie}</td><td>${dBR(n.data)}</td><td><span class="tag ${n.tipo==='Venda'?'ok':'info'}">${n.tipo}</span></td><td>${nomeC(n.cliente)}</td><td>${n.ref}</td><td>${brl(n.valor)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nenhuma nota emitida ainda.</td></tr>'}
 </tbody></table></div>`}
// Formulário de faturamento de um pedido.
function formFat(id){
 const o=pedidos.find(x=>x.id===id);
 $('#drawer').innerHTML=`<button class="close" id="x" type="button">Fechar</button><h2>Faturar pedido #${o.id}</h2><small style="color:var(--muted)">${nomeC(o.cliente)} · entrega ${dBR(o.prazo)}</small>
 ${ficha(o.itens.map(i=>[`${by(i.p).nome} (${nf(i.q)} ${by(i.p).un})`,brl(i.q*(i.preco||0))]).concat([['Total da nota',brl(totalPed(o))]]))}
 <form id="ffat" data-id="${id}" novalidate>
  <div class="two"><label>Número da NF-e<input name="nf" required></label><label>Série<input name="serie" value="1"></label></div>
  <div class="two"><label>Data de emissão<input name="data" type="date" value="${hoje()}" max="${hoje()}"></label><label>Vencimento<input name="venc" type="date"></label></div>
  <p class="err" id="err" role="alert"></p><button class="btn" type="submit">Registrar faturamento</button></form>`;
 mostrar();
}
// Valida e registra o faturamento: marca o pedido e cria a nota na lista.
function salvarFat(f){
 const d=Object.fromEntries(new FormData(f)),o=pedidos.find(x=>x.id===+f.dataset.id),err=$('#err');
 const nfn=esc(d.nf.trim()),serie=esc(d.serie.trim()||'1');
 if(!nfn){err.textContent='Informe o número da NF-e.';return}
 if(!d.data){err.textContent='Informe a data de emissão.';return}
 if(totalPed(o)<=0){err.textContent='O pedido está sem preços. Informe o preço dos itens ao criar o pedido.';return}
 if(notas.some(n=>n.nf===nfn&&n.serie===serie)){err.textContent='Esta NF-e já foi registrada.';return}
 o.fat={nf:nfn,serie,data:d.data,venc:d.venc};
 notas.unshift({nf:nfn,serie,data:d.data,tipo:'Venda',cliente:o.cliente,valor:totalPed(o),ref:'Pedido #'+o.id});
 /* envie ao back end: POST /api/faturamento */
 fechar();render();aviso('Pedido #'+o.id+' faturado. NF-e '+nfn+'.');
}

// Tela Material de terceiros: saldo por cliente e por material.
function telaTerc(){
 return `<div class="head"><h1>Material de terceiros</h1><button class="btn" data-newt>Receber material de terceiro</button></div>
 <p class="sub">Material que pertence ao cliente e está na empresa para ser industrializado. Não entra no estoque próprio nem no faturamento de venda.</p>
 <div class="stats"><div class="stat"><b>${terceiros.length}</b><span>Materiais cadastrados</span></div><div class="stat"><b>${new Set(terceiros.filter(t=>saldoT(t)>0).map(t=>t.cliente)).size}</b><span>Clientes com material em mãos</span></div></div>
 <div class="wrap"><table><thead><tr><th>Proprietário</th><th>Material</th><th>NF de remessa</th><th>Recebido</th><th>Consumido</th><th>Devolvido</th><th>Saldo</th><th></th></tr></thead><tbody>
 ${terceiros.map(t=>`<tr class="row" tabindex="0" data-tdet="${t.id}"><td>${nomeC(t.cliente)}</td><td><b>${t.nome}</b><small>${t.sku||'sem código'}</small></td><td>${nfsT(t)}</td><td>${nf(somaT(t,'Entrada'))}</td><td>${nf(somaT(t,'Consumo'))}</td><td>${nf(somaT(t,'Devolução'))}</td><td><b>${nf(saldoT(t))} ${t.un}</b></td><td class="acts"><button class="mini" data-tmov="${t.id}:Consumo">Consumir</button> <button class="mini" data-tmov="${t.id}:Devolução">Devolver</button></td></tr>`).join('')||'<tr><td colspan="8" class="empty">Nenhum material de terceiros cadastrado.</td></tr>'}
 </tbody></table></div>`}
// Painel de detalhes de um material de terceiros, com histórico.
function abrirT(id){
 const t=terceiros.find(x=>x.id===id);
 $('#drawer').innerHTML=`<button class="close" id="x" type="button">Fechar</button><span class="tag info">Material de terceiros</span><h2>${t.nome}</h2><small style="color:var(--muted)">${nomeC(t.cliente)} · ${t.sku||'sem código'}</small>
 <p class="big" style="margin-top:18px">${nf(saldoT(t))} <span style="font-size:16px;font-weight:400">${t.un}</span></p>
 <div class="acoes"><button class="btn" data-tmov="${t.id}:Consumo">Registrar consumo</button><button class="chip" data-tmov="${t.id}:Devolução">Devolver ao cliente</button></div>
 ${ficha([['Proprietário',nomeC(t.cliente)],['NF de remessa',nfsT(t)],['Recebido',nf(somaT(t,'Entrada'))+' '+t.un],['Consumido',nf(somaT(t,'Consumo'))+' '+t.un],['Devolvido',nf(somaT(t,'Devolução'))+' '+t.un]])}
 <h2 class="sec">Histórico</h2>${[...t.hist].sort((a,b)=>b.data.localeCompare(a.data)).map(h=>`<div class="li"><div><b>${h.tipo}</b><br><small>${dBR(h.data)} · ${h.doc||'—'} · ${h.quem}</small></div><b class="${h.tipo==='Entrada'?'in':'out'}">${h.tipo==='Entrada'?'+':'−'}${nf(h.q)} ${t.un}</b></div>`).join('')}`;
 mostrar();
}
// Formulário de recebimento. Se o material já existe para o cliente, soma em cima dele.
function novoTerc(){
 $('#drawer').innerHTML=`<button class="close" id="x" type="button">Fechar</button><h2>Receber material de terceiro</h2><small style="color:var(--muted)">O material continua sendo do cliente: não entra no seu estoque próprio.</small>
 <form id="fterc" novalidate style="margin-top:14px">
  <label>Proprietário (cliente)<select name="cliente">${clientes.filter(c=>c.tipo==='Cliente').map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}</select></label>
  <label>Material<input name="nome" required></label>
  <div class="two"><label>Código<input name="sku"></label><label>Unidade<input name="un" value="un"></label></div>
  <div class="two"><label>Quantidade recebida<input name="q" type="number" min="1" value="1"></label><label>Data de recebimento<input name="data" type="date" value="${hoje()}" max="${hoje()}"></label></div>
  <label>NF-e de remessa do cliente<input name="nf" required></label>
  <p class="err" id="err" role="alert"></p><button class="btn" type="submit">Registrar recebimento</button></form>`;
 mostrar();
}
// Valida e registra o recebimento do material do cliente.
function salvarTerc(f){
 const d=Object.fromEntries(new FormData(f)),err=$('#err'),q=+d.q,nome=esc(d.nome.trim()),sku=esc(d.sku.trim()),nfn=esc(d.nf.trim()),cli=+d.cliente;
 if(!cli){err.textContent='Cadastre o cliente antes de receber o material.';return}
 if(!nome||!nfn){err.textContent='Informe o material e a NF-e de remessa.';return}
 if(!(q>0)||!d.data){err.textContent='Informe a quantidade e a data de recebimento.';return}
 if(terceiros.some(t=>t.cliente===cli&&t.hist.some(h=>h.tipo==='Entrada'&&h.doc==='NF '+nfn))){err.textContent='Esta NF-e de remessa já foi lançada para este cliente.';return}
 let t=terceiros.find(x=>x.cliente===cli&&(sku?x.sku===sku:x.nome.toLowerCase()===nome.toLowerCase()));
 if(!t){t={id:Math.max(0,...terceiros.map(x=>x.id))+1,cliente:cli,nome,sku,un:esc(d.un.trim()||'un'),hist:[]};terceiros.push(t)}
 t.hist.push({data:d.data,tipo:'Entrada',q,doc:'NF '+nfn,quem:'Recebimento'});
 /* envie ao back end: POST /api/terceiros */
 fechar();render();aviso('Recebido: '+nf(q)+' '+t.un+' de '+t.nome+'.');
}
// Formulário de consumo na produção ou de devolução ao cliente.
function formTMov(id,tipo){
 const t=terceiros.find(x=>x.id===id),dev=tipo==='Devolução';
 $('#drawer').innerHTML=`<button class="close" id="x" type="button">Fechar</button><h2>${dev?'Devolver ao cliente':'Registrar consumo na produção'}</h2><small style="color:var(--muted)">${t.nome} · saldo ${nf(saldoT(t))} ${t.un}</small>
 <form id="ftmov" data-id="${id}" data-tipo="${tipo}" novalidate style="margin-top:14px">
  <div class="two"><label>Data<input name="data" type="date" value="${hoje()}" max="${hoje()}"></label><label>Quantidade (${t.un})<input name="q" type="number" min="1" value="1"></label></div>
  <label>${dev?'Número da NF-e de retorno':'Ordem de produção ou documento'}<input name="doc"></label>
  ${dev?'<label>Valor do serviço de industrialização (R$)<input name="valor" type="number" min="0" step="0.01" value="0"></label>':''}
  <label>Responsável<input name="quem" value="${dev?'Expedição':'Produção'}"></label>
  <p class="err" id="err" role="alert"></p><button class="btn" type="submit">${dev?'Registrar devolução':'Registrar consumo'}</button></form>`;
 mostrar();
}
// Valida e registra o consumo ou a devolução. A devolução gera a nota de retorno.
function salvarTMov(f){
 const d=Object.fromEntries(new FormData(f)),t=terceiros.find(x=>x.id===+f.dataset.id),tipo=f.dataset.tipo,dev=tipo==='Devolução',q=+d.q,err=$('#err'),doc=esc(d.doc.trim());
 if(!d.data||!(q>0)){err.textContent='Informe a data e uma quantidade maior que zero.';return}
 if(q>saldoT(t)){err.textContent='Saldo insuficiente: há '+nf(saldoT(t))+' '+t.un+'.';return}
 if(dev&&!doc){err.textContent='Informe o número da NF-e de retorno.';return}
 t.hist.push({data:d.data,tipo,q,doc:dev?'NF '+doc:doc,quem:esc((d.quem||'').trim())});
 if(dev)notas.unshift({nf:doc,serie:'1',data:d.data,tipo:'Retorno de industrialização',cliente:t.cliente,valor:+d.valor||0,ref:t.nome});
 /* envie ao back end: POST /api/terceiros/movimentos */
 render();abrirT(t.id);aviso(dev?'Devolução registrada e nota de retorno criada.':'Consumo registrado.');
}

// Trata todos os cliques: abas, botões da faixa, módulos, itens, filtros, formulários e fechar.
document.addEventListener('click',e=>{
 const n=e.target.closest('[data-v]'),o=e.target.closest('[data-open]'),c=e.target.closest('[data-f]');
// --- Novos: faturamento e material de terceiros ---
 if(e.target.closest('[data-tmov]')){const [i,t]=e.target.closest('[data-tmov]').dataset.tmov.split(':');formTMov(+i,t)}
 else if(e.target.closest('[data-tdet]'))abrirT(+e.target.closest('[data-tdet]').dataset.tdet);
 else if(e.target.closest('[data-newt]'))novoTerc();
 else if(e.target.closest('[data-fat]'))formFat(+e.target.closest('[data-fat]').dataset.fat);
 else if(e.target.closest('[data-ent]'))formMov(+e.target.closest('[data-ent]').dataset.ent,'Entrada');
 else if(e.target.closest('[data-ret]'))formMov(+e.target.closest('[data-ret]').dataset.ret,'Saída');
 else if(e.target.closest('[data-pk]')){const b=e.target.closest('[data-pk]');formMov(+b.dataset.pk,b.dataset.tipo)}
 else if(e.target.closest('[data-pick]'))escolher(e.target.closest('[data-pick]').dataset.pick);
 else if(e.target.closest('[data-item]')){const i=+e.target.closest('[data-item]').dataset.item;fechar();irItem(i)}
 else if(e.target.closest('[data-gs]'))irGs(e.target.closest('[data-gs]').dataset.gs);
 else if(n)ir(n.dataset.v)
 else if(o)abrir(+o.dataset.open);
 else if(c){f=c.dataset.f;render()}
 else if(e.target.closest('[data-new]'))novo(view);
 else if(e.target.closest('[data-newp]'))novoPedido();
 else if(e.target.closest('[data-newc]'))novoCadastro();
 else if(e.target.closest('[data-adv]'))avancar(+e.target.closest('[data-adv]').dataset.adv);
 else if(e.target.closest('[data-fc]')){fc=e.target.closest('[data-fc]').dataset.fc;render()}
 else if(e.target.closest('[data-per]')){per=e.target.closest('[data-per]').dataset.per;render()}
 else if(e.target.closest('[data-csv]'))baixarCSV();
 else if(e.target.id==='mais')$('#itens').insertAdjacentHTML('beforeend',linhaItem());
 else if(e.target.id==='x'||e.target.id==='scrim')fechar();
});
// Trata o envio dos formulários.
document.addEventListener('submit',e=>{const h={form:enviar,fped:salvarPedido,fcli:salvarCliente,fsai:salvarSaida,fmov:salvarMov,ffat:salvarFat,fterc:salvarTerc,ftmov:salvarTMov}[e.target.id];if(h){e.preventDefault();h(e.target)}});
// Trata a digitação nas buscas.
document.addEventListener('input',e=>{if(e.target.id==='busca'){q=e.target.value;render()}else if(e.target.id==='buscam'){qm=e.target.value;render()}else if(e.target.id==='gs')gsRender(e.target.value);else if(e.target.id==='pk')$('#pkl').innerHTML=pkHTML(e.target.value.trim().toLowerCase(),e.target.dataset.tipo)});
// Atalhos: Esc fecha, / ou Ctrl+K abre a busca, Enter abre a linha.
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){fechar();$('#gsr').hidden=true}
 if((e.key==='/'&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))||(e.key==='k'&&(e.ctrlKey||e.metaKey))){e.preventDefault();$('#gs').focus()}
 if(e.key==='Enter'&&e.target.classList.contains('row'))e.target.click();
});
// Clique fora da busca geral esconde os resultados.
document.addEventListener('click',e=>{if(!e.target.closest('.gs'))$('#gsr').hidden=true});
// Mostra os resultados ao focar a busca geral.
$('#gs').addEventListener('focus',e=>gsRender(e.target.value));
// Botão Tema: alterna entre escuro e claro.
$('#theme').onclick=()=>{const r=document.documentElement,d=r.dataset.theme==='dark'||(!r.dataset.theme&&matchMedia('(prefers-color-scheme:dark)').matches);r.dataset.theme=d?'light':'dark'};
// Primeiro desenho da tela ao abrir a página.
render();
