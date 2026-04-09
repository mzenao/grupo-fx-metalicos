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
