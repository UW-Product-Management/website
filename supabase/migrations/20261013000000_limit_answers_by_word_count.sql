create or replace function public.word_count(value text)
returns integer
language sql
immutable
as $$
  select case
    when btrim(coalesce(value, '')) = '' then 0
    else array_length(regexp_split_to_array(btrim(value), '\s+'), 1)
  end;
$$;

alter table public.applications
  drop constraint applications_product_idea_check,
  drop constraint applications_great_team_check,
  drop constraint applications_product_experience_check;

alter table public.applications
  add constraint applications_product_idea_check check (public.word_count(product_idea) <= 150),
  add constraint applications_great_team_check check (public.word_count(great_team) <= 150),
  add constraint applications_product_experience_check check (public.word_count(product_experience) <= 150);
