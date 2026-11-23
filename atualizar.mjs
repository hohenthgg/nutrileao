#!/usr/bin/env node
// Gera o data.json da vitrine do Nutri Leão a partir do catálogo público da Nação Verde.
// Node 20+, sem dependências.  Uso:  node atualizar.mjs

import { writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';

/* ───────────── CONFIGURAÇÃO ─────────────
   O dia a dia (link de afiliado, WhatsApp, link especial de um produto, oferta fixa, esconder produto)
   fica no arquivo config.json, que é o "painel". Aqui embaixo ficam só os valores de reserva e as regras. */

const PADRAO = {
  loja: 'https://www.nacaoverde.com.br',
  afiliado: '',
  whatsapp: '',
  instagram: '',
  tiktok: '',
  linksEspeciais: {}, // 'handle-do-produto': 'https://link-completo'
  ofertaFixa: '',     // handle do produto travado no destaque; vazio = rodízio diário
  esconder: [],       // handles que não devem aparecer
  descontoPix: 5,     // % que a loja tira no Pix em todos os produtos; 0 = mostrar só o preço do cartão
};

function lerConfig() {
  let doArquivo;
  try {
    doArquivo = JSON.parse(readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
  } catch (e) {
    throw new Error('config.json está faltando ou com erro de digitação (vírgula ou aspas): ' + e.message);
  }
  return { ...PADRAO, ...doArquivo };
}

export const CONFIG = lerConfig();

// Entra na vitrine se o título bater com INCLUIR (ou SEMPRE) e não bater com EXCLUIR.
const INCLUIR = /c[aá]psula|\bcaps\b|suplement|magn[eé]sio|\b[56]m\b|creatina|whey|[oô]mega|vitamina|coenzima|\bnac\b|glutamina|alanina|palatinose|melatonina|pr[oó]polis|resveratrol|psyllium|\bmaca\b|beterraba|\bbeet\b|bioveg|biocorp|prote[ií]na vegana|magic bari|testo|biofem|prost-?up|smartab|umove|sbelti|bem calm|aloe|spirulina|c?h?lorella|feno.?grego|col[aá]geno|\bkit\b|\bcombo\b/i;

// E-books, body splash, temperos, alimentos, utensílios e nomes que soam como remédio.
const EXCLUIR = /e-?book|splash|tempero|[oó]leo essencial|argila|biscoito|amendoim (crocante|com|sem)|mix amendoim|castanha|chips|camiseta|regata|pulseira|caneca|\bpote\b|bule|jarra|coador|bandeja|mentoria|embalagem para|infusor|frasco|borrifador|\bbala\b|farinha|\bsal\b|a[cç][uú]car|caf[eé]|coffee|(^|[^a-zà-ú])ch[aá](?![a-zà-ú])|granola|semente|vinagre|desparasita|enxaqueca|anti-?inflamat/i;

// Exceções: entram mesmo batendo com EXCLUIR (estão no Linktree do Leão).
const SEMPRE = /ch[aá] de dod[oó]i|saciech[aá]/i;

// Nome curto na mão, quando o automático não ficar bom:  'handle-do-produto': 'Nome curto'
const NOMES = {
  'creatina-amesse-pura-aumente-sua-forca-e-resistencia-embalagem-de-125g': 'Creatina Amesse Pura 125g',
  'creatina-amesse-pura-sabor-morango-embalagem-de-125g': 'Creatina Amesse Morango 125g',
  'bioveg-chocolate-proteina-vegana-de-amendoim-nutricao-completa-500g': 'BioVeg Chocolate 500g',
  'bioveg-proteina-vegana-de-amendoim-nutricao-completa-500g': 'BioVeg 500g',
  'bioveg-chocolate-proteina-vegana-de-amendoim-garrafinha-40g': 'BioVeg Chocolate 40g',
  'bioveg-proteina-vegana-de-amendoim-garrafinha-40g': 'BioVeg 40g',
  'omega-3-dha-nacao-verde': 'Ômega 3 DHA',
  'omega-3-epa-nacao-verde': 'Ômega 3 EPA',
  '6-magnesios-treonina-amesse-90-capsulas-6m': '6M Magnésios + Treonina',
  'curcuma-longa-500g-curcumaster-90-capsulas-suplemento-para-sua-saude-e-bem-estar': 'Curcumaster 90 cápsulas',
  'dtx-suplemento-detox-com-trans-resveratrol-e-spirulina-60-capsulas': 'Trans-Resveratrol',
  'suplemento-coenzima-q10-capsula-do-tempo-500mg-30-capsulas': 'Coenzima Q10 Cápsula do Tempo',
};

// Categorias: o script lê o nome de cada produto e põe na primeira que bater (a ordem importa).
// ORDEM_NA_TELA é a ordem dos botões na página.
// O que não bater em nenhuma vai para "Outros". São por tipo de produto, sem promessa de saúde.
const CATEGORIAS = [
  { id: 'kits', nome: 'Kits e combos', re: /^\s*(kit|combo)\b/i },
  { id: 'eles', nome: 'Homem e mulher', re: /testo|biofem|prost-?up/i },
  { id: 'magnesio', nome: 'Magnésio', re: /magn[eé]sio|\b[56]m\b/i },
  { id: 'treino', nome: 'Creatina e treino', re: /creatina|glutamina|alanina|palatinose/i },
  { id: 'proteinas', nome: 'Proteínas', re: /whey|bioveg|prote[ií]na|col[aá]geno hidrolisado/i },
  { id: 'maca', nome: 'Maca e beterraba', re: /\bmaca\b|beterraba|\bbeet\b|feno.?grego/i },
  { id: 'vitaminas', nome: 'Vitaminas e ômega 3', re: /[oô]mega|vitamina|coenzima|\bnac\b|resveratrol|melatonina|pr[oó]polis/i },
];
const ORDEM_NA_TELA = ['magnesio', 'treino', 'proteinas', 'vitaminas', 'maca', 'eles', 'kits', 'outros'];
const PROMO_MINIMA = 10; // desconto menor que isso (em %) não aparece como promoção

const TOPO_PARA_OFERTA = 12; // a oferta do dia sai dos N mais vendidos
const RODIZIO = 6; // ...e roda, um por dia, entre os N maiores descontos desse grupo
const MINIMO_DE_PRODUTOS = 10; // abaixo disso algo deu errado: não sobrescreve o data.json

/* ───────────── LÓGICA (pura: recebe os dados crus, devolve o data.json) ───────────── */

export function nomeCurto(titulo) {
  const t = titulo
    .normalize('NFC')
    .replace(/\s*[-–|]?\s*na[cç][aãă]o\s+verde/gi, '')
    .replace(/^suplemento\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const partes = t.split(/\s+[-–|]\s+|:\s+/).map((s) => s.trim()).filter(Boolean);
  let nome = partes[0] || t;
  const kit = /^(kit|combo)$/i.test(nome);
  for (let i = 1; i < partes.length && nome.length < 14; i++) {
    const s = partes[i];
    if (kit && i === 1) nome += ' ' + s;
    else if (s.length <= 26 && !/^(suplemento|f[oó]rmula|aumente|extrato|embalagem|sabor|o |a )/i.test(s)) nome += ' ' + s;
    else break;
  }
  nome = nome
    .split(' ')
    .map((p) => (/^[A-ZÀ-Ú]{3,}$/.test(p) && !/^(NAC|DHA|EPA|PRO)$/.test(p) ? p[0] + p.slice(1).toLowerCase() : p))
    .join(' ');
  if (nome.length > 42) nome = nome.slice(0, 42).replace(/\s+\S*$/, '');
  nome = nome.replace(/\s*\([^)]*$/, '');
  for (let i = 0; i < 3; i++) nome = nome.replace(/[\s+,–-]+$/, '').replace(/\s(e|de|com|em|\d+)$/i, '');
  return nome;
}

export function categoria(texto) {
  const c = CATEGORIAS.find((k) => k.re.test(texto));
  return c ? c.id : 'outros';
}

// "60 cápsulas", "200 g", "500 ml": tirado do nome, só o que está escrito lá.
export function quantidade(texto) {
  const t = texto.toLowerCase();
  let m = t.match(/(?<![a-z\d])(\d+)\s*(c[aá]psulas?|caps)\b/);
  if (m) return m[1] + ' cápsulas';
  m = t.match(/(?<![a-z\d])(\d+)\s*(kg|ml|g)\b/);
  return m ? m[1] + ' ' + m[2] : '';
}

export function listaDeCategorias(produtos) {
  const usadas = new Set(produtos.map((p) => p.cat));
  return [...CATEGORIAS, { id: 'outros', nome: 'Outros' }]
    .filter((c) => usadas.has(c.id))
    .sort((a, b) => ORDEM_NA_TELA.indexOf(a.id) - ORDEM_NA_TELA.indexOf(b.id))
    .map(({ id, nome }) => ({ id, nome }));
}

const centavos = (v) => Math.round(parseFloat(v) * 100);

// Oferta do dia: pega os mais vendidos em promoção, fica com os maiores descontos
// e escolhe um por dia, em rodízio. Assim a oferta muda todo dia mesmo se a loja não mudar os preços.
export function escolherOferta(produtos, agora = new Date()) {
  const dia = Math.floor((agora.getTime() - 3 * 3600e3) / 864e5); // dia no horário de Brasília
  const emPromo = (lista) => lista.filter((p) => p.off).sort((a, b) => b.off - a.off);
  let candidatos = emPromo(produtos.slice(0, TOPO_PARA_OFERTA)).slice(0, RODIZIO);
  if (!candidatos.length) candidatos = emPromo(produtos).slice(0, RODIZIO);
  return candidatos.length ? candidatos[dia % candidatos.length] : produtos[0];
}

export function montar(produtosCrus, ordemMaisVendidos, config = CONFIG, agora = new Date()) {
  const posicao = new Map(ordemMaisVendidos.map((h, i) => [h, i]));
  const produtos = [];

  for (const p of produtosCrus) {
    const titulo = p.title || '';
    if ((config.esconder || []).includes(p.handle)) continue;
    if (!SEMPRE.test(titulo) && (!INCLUIR.test(titulo) || EXCLUIR.test(titulo))) continue;

    const disponiveis = (p.variants || []).filter((v) => v.available);
    if (!disponiveis.length) continue;
    const emPromo = disponiveis.filter((v) => v.compare_at_price && centavos(v.compare_at_price) > centavos(v.price));
    const v = (emPromo.length ? emPromo : disponiveis).reduce((a, b) => (centavos(b.price) < centavos(a.price) ? b : a));
    const img = p.images && p.images[0] && p.images[0].src;
    if (!img) continue;

    // A loja mostra em destaque o preço no Pix (catálogo menos o desconto, arredondado para cima no centavo).
    const cartao = centavos(v.price) / 100;
    const pix = Number(config.descontoPix) || 0;
    const item = { h: p.handle, nome: NOMES[p.handle] || nomeCurto(titulo), preco: pix ? Math.ceil(centavos(v.price) * (100 - pix) / 100 - 1e-6) / 100 : cartao, img };
    if (pix) item.cartao = cartao;
    if (emPromo.length) {
      const off = Math.round((1 - item.preco / (centavos(v.compare_at_price) / 100)) * 100);
      if (off >= PROMO_MINIMA) { item.de = centavos(v.compare_at_price) / 100; item.off = off; }
    }
    const texto = titulo + ' ' + p.handle.replace(/-/g, ' ');
    item.cat = categoria(texto);
    const qtd = item.cat === 'kits' ? '' : quantidade(texto);
    if (qtd && !item.nome.toLowerCase().replace(/\s/g, '').includes(qtd.replace(/\s/g, ''))) item.qtd = qtd;
    if (new Set(disponiveis.map((x) => x.price)).size > 1) item.apartir = true;
    const especial = (config.linksEspeciais || {})[p.handle];
    if (especial) item.link = especial;
    item._pos = posicao.has(p.handle) ? posicao.get(p.handle) : 9999;
    produtos.push(item);
  }

  produtos.sort((a, b) => a._pos - b._pos);
  produtos.forEach((p) => delete p._pos);

  const oferta = produtos.find((p) => p.h === config.ofertaFixa) || escolherOferta(produtos, agora);

  return {
    atualizadoEm: agora.toISOString(),
    loja: config.loja,
    afiliado: config.afiliado,
    pix: Number(config.descontoPix) || 0,
    whatsapp: config.whatsapp,
    instagram: config.instagram,
    tiktok: config.tiktok,
    oferta: oferta ? oferta.h : null,
    categorias: listaDeCategorias(produtos),
    produtos, // já na ordem de mais vendidos
  };
}

/* ───────────── COLETA ───────────── */

const CABECALHOS = { 'user-agent': 'Mozilla/5.0 (compatible; vitrine-nutrileao/1.0)', 'accept-language': 'pt-BR' };

async function baixar(url, tipo, tentativas = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: CABECALHOS, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return tipo === 'json' ? await r.json() : await r.text();
    } catch (e) {
      if (i >= tentativas) throw new Error(`Falhou ao baixar ${url}: ${e.message}`);
      await new Promise((ok) => setTimeout(ok, 2000 * i));
    }
  }
}

async function todosOsProdutos(loja) {
  const todos = [];
  for (let pagina = 1; pagina <= 40; pagina++) {
    const { products } = await baixar(`${loja}/products.json?limit=250&page=${pagina}`, 'json');
    if (!products || !products.length) break;
    todos.push(...products);
  }
  return todos;
}

// O JSON ignora sort_by; a ordem de mais vendidos só existe no HTML da coleção.
export function handlesDoHtml(html) {
  const re = /href="(?:https?:\/\/[^"\/]+)?(?:\/collections\/[^"\/]+)?\/products\/([a-z0-9][a-z0-9\-_%]*)/g;
  return [...html.matchAll(re)].map((m) => m[1]);
}

async function ordemMaisVendidos(loja) {
  const ordem = [];
  const vistos = new Set();
  for (let pagina = 1; pagina <= 80; pagina++) {
    const html = await baixar(`${loja}/collections/all?sort_by=best-selling&page=${pagina}`, 'texto');
    const antes = ordem.length;
    for (const h of handlesDoHtml(html)) if (!vistos.has(h)) { vistos.add(h); ordem.push(h); }
    if (ordem.length === antes) break;
  }
  return ordem;
}

async function principal() {
  const [crus, ordem] = await Promise.all([todosOsProdutos(CONFIG.loja), ordemMaisVendidos(CONFIG.loja)]);
  const dados = montar(crus, ordem);
  if (dados.produtos.length < MINIMO_DE_PRODUTOS) {
    throw new Error(`Só ${dados.produtos.length} produtos passaram no filtro (catálogo: ${crus.length}). data.json mantido.`);
  }
  if (!ordem.length) console.warn('Aviso: não consegui ler a ordem de mais vendidos; usei a ordem do catálogo.');
  await writeFile(new URL('./data.json', import.meta.url), JSON.stringify(dados));
  const promos = dados.produtos.filter((p) => p.off).length;
  console.log(`data.json: ${dados.produtos.length} suplementos, ${promos} em promoção, oferta do dia: ${dados.oferta}`);
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  principal().catch((e) => { console.error(e.message); process.exit(1); });
}
