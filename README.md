# Julius Economias — site publico

Site estatico para **Google Play** (campo Site) e verificacao **AdMob** (`app-ads.txt`).

Repositorio publico; o app Flutter permanece em `gastos_simples` (privado).

**Firebase:** projeto `apps-84516` · Hosting na pasta [`docs/`](docs/).

## URLs (Firebase Hosting)

| Recurso | URL |
|---------|-----|
| Site | https://apps-84516.web.app/ |
| app-ads.txt | https://apps-84516.web.app/app-ads.txt |
| Privacidade | https://apps-84516.web.app/privacidade.html |

Alternativa: `https://apps-84516.firebaseapp.com/` (mesmo conteudo).

Use **https://apps-84516.web.app** na Play Console (**Configuracoes da loja → Site**) e na politica de privacidade do app. O dominio do site na Play deve ser o mesmo onde o `app-ads.txt` esta publicado.

## Publicar alteracoes

Na pasta deste repositorio (com Firebase CLI instalado e `firebase login` feito):

```bash
firebase deploy --only hosting
```

## Play Console e AdMob

1. Play → **Configuracoes da loja** → **Site**: `https://apps-84516.web.app`
2. Abrir no navegador: https://apps-84516.web.app/app-ads.txt (deve mostrar a linha do publisher)
3. AdMob → app Julius Economias → **app-ads.txt** → **Verificar se ha atualizacoes** (pode levar ate 24–48 h)

## app-ads.txt

Conteudo em [`docs/app-ads.txt`](docs/app-ads.txt):

```
google.com, pub-5968219792051825, DIRECT, f08c47fec0942fa0
```

## GitHub Pages (opcional)

Se preferir GitHub Pages em vez do Firebase, ative **Settings → Pages** com branch `main` e pasta `/docs`. As URLs seriam `https://galvictor.github.io/julius-economias-web/`. Nao use dois dominios diferentes na Play e no AdMob ao mesmo tempo — escolha um e mantenha consistente.
