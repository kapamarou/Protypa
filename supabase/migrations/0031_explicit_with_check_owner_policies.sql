-- 0031 — Make WITH CHECK explicit on owner-managed "for all" policies
--
-- These owner policies were written with only a USING clause. This was NOT a
-- live vulnerability: when WITH CHECK is omitted, PostgreSQL reuses the USING
-- expression as the WITH CHECK for INSERT/UPDATE, so a school could never write
-- a row scoped to another school. A pre-launch pentest flagged the *implicit*
-- behaviour as easy to misread, so we make the write-side check explicit and
-- self-evident. Every WITH CHECK below is IDENTICAL to its USING — behaviour is
-- unchanged; intent is now obvious to any future auditor.
--
-- (Unlike 0027/profiles, where WITH CHECK had to be STRICTER than USING to pin
-- is_admin, here the desired write rule equals the read rule.)

-- schools
drop policy if exists "school owner all" on schools;
create policy "school owner all" on schools
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- school_simulations
drop policy if exists "school_simulation owner all" on school_simulations;
create policy "school_simulation owner all" on school_simulations
  for all
  using (auth.uid() = school_id)
  with check (auth.uid() = school_id);

-- simulation_grades (legacy anonymous grades)
drop policy if exists "grade owner all" on simulation_grades;
create policy "grade owner all" on simulation_grades
  for all
  using (
    exists (select 1 from school_simulations ss
            where ss.id = simulation_grades.school_simulation_id
              and ss.school_id = auth.uid())
  )
  with check (
    exists (select 1 from school_simulations ss
            where ss.id = simulation_grades.school_simulation_id
              and ss.school_id = auth.uid())
  );

-- students
drop policy if exists "school manages own students" on students;
create policy "school manages own students" on students
  for all
  using (auth.uid() = school_id)
  with check (auth.uid() = school_id);

-- student_simulation_grades
drop policy if exists "school manages own student grades" on student_simulation_grades;
create policy "school manages own student grades" on student_simulation_grades
  for all
  using (
    exists (select 1 from students s
            where s.id = student_simulation_grades.student_id
              and s.school_id = auth.uid())
  )
  with check (
    exists (select 1 from students s
            where s.id = student_simulation_grades.student_id
              and s.school_id = auth.uid())
  );
