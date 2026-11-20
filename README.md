# Vitrine do Nutri Leão

Página única que substitui o Linktree. Mostra a oferta do dia, as promoções, os mais vendidos e todos os suplementos da Nação Verde, com o preço atualizado todo dia às 6h (horário de Brasília).

## O que tem aqui

| Arquivo | Para que serve |
|---|---|
| `index.html` | A página. Lê o `data.json`. |
| `config.json` | O painel: link de afiliado, contatos, links especiais, oferta fixa. |
| `atualizar.mjs` | Busca catálogo e mais vendidos na loja e gera o `data.json`. |
| `data.json` | Os dados do dia. O que está aqui é um exemplo de 18/11/2026. |
| `.github/workflows/atualizar.yml` | Roda o script todo dia e publica no GitHub Pages. |
| `previa.html` | A mesma página com os dados de exemplo embutidos. É só abrir com dois cliques. |

## Publicar (uma vez só)

1. Crie um repositório público no GitHub. Descompacte o zip e arraste **tudo o que está dentro da pasta** para a tela de upload ("uploading an existing file"), inclusive a pasta `.github`. Se a pasta `.github` não subir, crie o arquivo pelo site: **Add file → Create new file**, com o nome `.github/workflows/atualizar.yml`, e cole o conteúdo.
2. No repositório, abra **Settings → Pages** e, em **Source**, escolha **GitHub Actions**.
3. Abra a aba **Actions**, clique em **Atualizar vitrine** e em **Run workflow**.
4. Em um ou dois minutos o endereço aparece em **Settings → Pages**. Coloque esse link na bio do Instagram e do TikTok.

Depois disso não precisa fazer mais nada: todo dia às 6h a página se atualiza sozinha.

## O painel: `config.json`

Você não precisa pedir a ninguém para mudar link. Tudo o que muda no dia a dia fica no arquivo `config.json`:

| Campo | O que faz |
|---|---|
| `afiliado` | O trecho colado no fim de todos os links. Mudou o seu código de afiliado, troque aqui. **Confirme com a Nação Verde qual formato vale** (hoje está o `?bg_ref=...`; o antigo era `?parceiro=6926`). |
| `linksEspeciais` | Link próprio para um produto: `"handle-do-produto": "https://link-completo"`. |
| `ofertaFixa` | Handle do produto travado no destaque. Vazio = a oferta roda sozinha todo dia. |
| `esconder` | Handles de produtos que não devem aparecer. |
| `whatsapp`, `instagram`, `tiktok` | Seus contatos. |

O "handle" é o fim do endereço do produto na loja, depois de `/products/`.

**Como editar, pelo celular ou computador:**

1. Abra o repositório no GitHub e toque em `config.json`.
2. Toque no lápis (Edit).
3. Mude o valor, mantendo as aspas e as vírgulas.
4. Toque em **Commit changes**.

Em um ou dois minutos a página está atualizada. Se você errar uma vírgula, a atualização falha e a página antiga continua no ar; é só corrigir e salvar de novo.

As regras mais técnicas ficam no começo do `atualizar.mjs`: `INCLUIR`, `EXCLUIR` e `SEMPRE` (o que entra na vitrine), `NOMES` (nome curto à mão), `CATEGORIAS` e `ORDEM_NA_TELA`, e `PROMO_MINIMA` (desconto mínimo para contar como promoção, hoje 10%).

## Um link para cada vídeo

Coloque `#` e o nome do produto no fim do endereço e esse produto vira o destaque no topo:

- `seu-endereco/#magnesio`
- `seu-endereco/#creatina`
- `seu-endereco/#testomega`

Use esse link nos Stories e na legenda do vídeo. Quem viu o vídeo do magnésio cai direto no magnésio.

## Como a página decide as coisas

- **Promoção:** preço "de" maior que o preço atual, em uma variante disponível, com pelo menos 10% de desconto.
- **Categorias:** o script lê o nome de cada produto e classifica sozinho, todo dia. O que não se encaixa vai para "Outros".
- **Oferta do dia:** entre os 12 mais vendidos, pega os 6 maiores descontos e mostra um por dia, em rodízio. Assim a oferta muda todo dia.
- **Mais vendidos:** a ordem da página "mais vendidos" da loja.
- **Tira-dúvidas:** regras fixas, sem inteligência artificial e sem custo. Responde preço, promoção, entrega e afiliado com os dados do dia. Não passa dose (manda para o rótulo e para os vídeos), não responde pergunta de saúde (indica um profissional) e, quando não sabe, manda para o WhatsApp.

## Se algo der errado

- **A página mostra preços de ontem:** a loja estava fora do ar às 6h. O site antigo fica no ar e tenta de novo no dia seguinte. Para forçar, use **Run workflow**.
- **Um produto ficou de fora ou entrou sem querer:** ajuste `INCLUIR`/`EXCLUIR` no `atualizar.mjs`.
- **Testar no computador:** `node atualizar.mjs` e depois `npx serve` nesta pasta.
