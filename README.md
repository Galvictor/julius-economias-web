# Sites Firebase — apps da Play Store

Repositório público com sites estáticos para **Google Play** (campo Site, política de privacidade) e verificação **AdMob** (`app-ads.txt`).

Cada subpasta é um app/site independente, publicado via **Firebase Hosting multi-site** no projeto `apps-84516`.

| Pasta | App Android | Target Firebase | URL (produção) |
|-------|-------------|-----------------|----------------|
| [`julius-economias/`](julius-economias/) | Julius Economias (`gastos_simples`) | `julius-economias` | https://apps-84516.web.app/ |
| [`mei-orcamentos/`](mei-orcamentos/) | Orçamento MEI (`mei_orcamento`) | `mei-orcamentos` | *criar site no Console antes do deploy* |

## URLs — Julius Economias

| Recurso | URL |
|---------|-----|
| Site | https://apps-84516.web.app/ |
| app-ads.txt | https://apps-84516.web.app/app-ads.txt |
| Privacidade | https://apps-84516.web.app/privacidade.html |

Alternativa: `https://apps-84516.firebaseapp.com/` (mesmo conteúdo).

Use **https://apps-84516.web.app** na Play Console (**Configurações da loja → Site**) e na política de privacidade do app. O domínio do site na Play deve ser o mesmo onde o `app-ads.txt` está publicado.

## Publicar alterações

Na pasta deste repositório (com Firebase CLI instalado e `firebase login` feito):

```bash
# Um site por vez (recomendado)
firebase deploy --only hosting:julius-economias
firebase deploy --only hosting:mei-orcamentos
```

### Configuração inicial de targets (uma vez por máquina)

```bash
firebase target:apply hosting julius-economias apps-84516
firebase target:apply hosting mei-orcamentos <site-id-mei>
```

O site `mei-orcamentos` precisa ser criado antes no [Firebase Console](https://console.firebase.google.com) → projeto `apps-84516` → Hosting → **Adicionar outro site**.

## Play Console e AdMob — Julius Economias

1. Play → **Configurações da loja** → **Site**: `https://apps-84516.web.app`
2. Política de privacidade: `https://apps-84516.web.app/privacidade.html`
3. Abrir no navegador: https://apps-84516.web.app/app-ads.txt (deve mostrar a linha do publisher)
4. AdMob → app Julius Economias → **app-ads.txt** → **Verificar se há atualizações** (pode levar até 24–48 h)

## Play Console e AdMob — MEI Orçamentos (quando publicar)

1. Criar site Hosting `mei-orcamentos` no Firebase Console
2. `firebase target:apply hosting mei-orcamentos <site-id>`
3. Atualizar `mei-orcamentos/docs/` (privacidade completa, app-ads.txt)
4. `firebase deploy --only hosting:mei-orcamentos`
5. Play Console (app MEI): Site e política com a URL do novo site
6. AdMob (app MEI): verificar `app-ads.txt` no domínio do site MEI

## app-ads.txt

Publisher compartilhado (conta AdMob do desenvolvedor):

```
google.com, pub-5968219792051825, DIRECT, f08c47fec0942fa0
```

Cada site tem seu próprio `app-ads.txt` na raiz do respectivo domínio `.web.app`.

## Estrutura

```
sites-firebase/
├── firebase.json
├── .firebaserc
├── julius-economias/docs/   → site default apps-84516
└── mei-orcamentos/docs/     → site mei-orcamentos (após criar no Console)
```
