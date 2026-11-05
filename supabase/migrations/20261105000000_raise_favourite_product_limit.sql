-- MAX_CHARACTERS in src/portal/applicationQuestions.js and this constraint must
-- agree. If the column stays at 200 while the textarea allows 300, answers over
-- 200 characters pass client validation and then fail with a check violation
-- (23514) on save.
alter table public.applications
  drop constraint applications_favourite_product_check;

alter table public.applications
  add constraint applications_favourite_product_check
  check (char_length(favourite_product) <= 300);
