-- Fix clients RLS: only admins can insert/update/delete, all authenticated can view
DROP POLICY "Authenticated users can delete clients" ON public.clients;
DROP POLICY "Authenticated users can insert clients" ON public.clients;
DROP POLICY "Authenticated users can update clients" ON public.clients;

CREATE POLICY "Admins can insert clients" ON public.clients FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update clients" ON public.clients FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix posts RLS: only admins can insert/delete, all authenticated can update (for stage changes etc)
DROP POLICY "Authenticated users can delete posts" ON public.posts;
DROP POLICY "Authenticated users can insert posts" ON public.posts;
DROP POLICY "Authenticated users can update posts" ON public.posts;

CREATE POLICY "Admins can insert posts" ON public.posts FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update posts" ON public.posts FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can delete posts" ON public.posts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));