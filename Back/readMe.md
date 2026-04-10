## Deploy no Railway (Backend)

### 1) Pré-requisitos do projeto

- O serviço precisa ter acesso ao PostgreSQL via `DATABASE_URL`.
- Para backup/restore por script Linux, a imagem precisa ter cliente PostgreSQL (`pg_dump` e `psql`).
- O backup em S3 usa credenciais AWS e bucket de backup configurados por variável de ambiente.

### 2) Variáveis de ambiente mínimas

Defina no serviço do Railway:

- `DATABASE_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BACKUP_BUCKET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Variáveis úteis adicionais:

- `CLEANUP_LOCAL_BACKUP=true` para apagar dump local após upload.
- `CLEANUP_LOCAL_BACKUP=false` para manter dump local.

### 3) Comando de build (Railway)

Se você estiver usando o deploy padrão do Railway sem Dockerfile, o build command precisa instalar o cliente PostgreSQL antes das dependências Python:

```bash
apt-get update && apt-get install -y postgresql-client && pip install -r requirements.txt
```

Se o build retornar `exit code: 100`, isso normalmente indica falha no `apt-get` e quase sempre se resolve com o `apt-get update` acima. Se a base do Railway ainda não aceitar `apt-get`, use uma imagem Docker própria com `postgresql-client-17` instalado.

Este repositório também inclui um [Dockerfile](Dockerfile) para o backend. Ele instala `postgresql-client-17` via repositório oficial da PostgreSQL, o que evita o erro de `server version mismatch` que acontece com o client padrão do Debian.

Com o Dockerfile atual, o container usa o [scripts/entrypoint.sh](scripts/entrypoint.sh) para decidir o modo de execução:

- `web` inicia o servidor com migrations.
- `backup` executa o job de backup.

No Railway, deixe o serviço web em modo padrão e, no job de backup, use `backup` como comando/start argument se a interface permitir, ou `bash scripts/railway_backup_job.sh` se ela exigir comando completo.

### 4) Start command do serviço web

Use o comando de produção do backend:

```bash
gunicorn wsgi:app --bind 0.0.0.0:$PORT
```

Use `python run.py` apenas em desenvolvimento local.

### 5) Migrations do banco

Este projeto agora usa Flask-Migrate. Depois de subir o serviço no Railway, aplique o schema com:

```bash
bash scripts/railway_migrate.sh
```

Ou, de forma equivalente:

```bash
python -m flask --app wsgi db upgrade
```

### 6) Job de backup diário 00:00

Crie um Job separado no Railway (mesmo repositório/pasta `Back`) com:

- Command:

```bash
bash scripts/railway_backup_job.sh
```

- Schedule (cron):

```text
0 0 * * *
```

Reaproveite as mesmas variáveis de ambiente do serviço web (principalmente `DATABASE_URL` e AWS).

### 7) Teste manual no Railway

Execute manualmente no Job ou shell do serviço:

```bash
bash scripts/dump_postgres.sh
bash scripts/backup_and_upload.sh
```

Critérios de sucesso:

- `dump_postgres.sh` gera arquivo em `backups/`.
- `backup_and_upload.sh` envia para `s3://$AWS_S3_BACKUP_BUCKET/...`.

### 8) Restore (quando necessário)

Após baixar um backup `.sql` para o ambiente:

```bash
bash scripts/restore_postgres.sh caminho/do/arquivo.sql
```

O script já normaliza URLs `postgres://` e `postgresql+psycopg2://` automaticamente.

## Scripts prontos para produção

- `scripts/railway_migrate.sh`: aplica as migrations no Railway.
- `scripts/dump_postgres.sh`: dump com validação de `pg_dump` e normalização de URL.
- `scripts/restore_postgres.sh`: restore com validação de `psql` e normalização de URL.
- `scripts/backup_and_upload.sh`: dump + upload S3 com autodetecção de `python3/python`.
- `scripts/railway_backup_job.sh`: entrypoint simples para Job agendado no Railway.
