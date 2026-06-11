BEGIN;

-- Add DELETE policy for student_payments so teachers can clean up
-- when deleting a student. The table only had a SELECT policy dropped
-- in 023; INSERT comes from the monthly-payment generation logic.
CREATE POLICY "Teachers can delete student payments" ON public.student_payments
  FOR DELETE USING (
    student_id IN (
      SELECT id FROM public.students
      WHERE teacher_id IN (
        SELECT id FROM public.teachers WHERE profile_id = auth.uid()
      )
    )
  );

COMMIT;
