## Conexão com o backend

O front consome a API via `VITE_API_BASE_URL`.

Valor padrão de produção:

```bash
VITE_API_BASE_URL=https://backend-production-b2bd.up.railway.app/api
```

Para desenvolvimento local, sobrescreva com:

```bash
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```

## Deploy no Railway

Se o build falhar com `EBUSY: resource busy or locked, rmdir '/app/node_modules/.vite'`, use este build command no serviço do front:

```bash
npm install --no-audit --no-fund && npm run build
```

Não use `--omit=optional` no front, porque o Vite 8 precisa dos bindings opcionais do rolldown para buildar.
