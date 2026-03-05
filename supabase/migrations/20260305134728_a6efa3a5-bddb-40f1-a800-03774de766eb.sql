-- Allow admin to delete profiles via service role (already handled by edge function with service role key)
-- Add DELETE policy for profiles to allow service role operations
CREATE POLICY "Service role can delete profiles" ON public.profiles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));