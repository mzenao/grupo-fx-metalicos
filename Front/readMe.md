## Conexão com o backend

O front consome a API via `VITE_API_BASE_URL`.

Valor padrão de produção:

```bash
VITE_API_BASE_URL=https://backend-production-91dc.up.railway.app/api
```

Para desenvolvimento local, sobrescreva com:

```bash
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```

## Deploy no Railway

Se o build falhar com `EBUSY: resource busy or locked, rmdir '/app/node_modules/.vite'`, use este build command no serviço do front:

```bash
npm install --omit=optional --no-audit --no-fund && npm run build
```

Se o ambiente estiver limpo, `npm ci --omit=optional && npm run build` também funciona, mas `npm install` é mais tolerante com cache travado.
