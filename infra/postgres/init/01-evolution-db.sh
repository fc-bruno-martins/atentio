#!/bin/sh
# Cria o banco da Evolution API na primeira inicialização do volume do Postgres.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE DATABASE evolution;
SQL
