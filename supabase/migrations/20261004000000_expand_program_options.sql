alter table public.applications
  drop constraint applications_program_check;

alter table public.applications
  add constraint applications_program_check check (
    program in (
      'Computer Science', 'Engineering', 'Business', 'Mathematics',
      'Science', 'Arts', 'Environment', 'Health', 'Other'
    )
  );
