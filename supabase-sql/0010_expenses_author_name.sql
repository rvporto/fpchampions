-- Adiciona coluna author_name à tabela expenses caso não exista
alter table public.expenses
  add column if not exists author_name text;
