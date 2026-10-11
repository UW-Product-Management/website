alter table public.applications
  add column product_experience text check (char_length(product_experience) <= 200);

grant insert (product_experience) on public.applications to authenticated;
grant update (product_experience) on public.applications to authenticated;
