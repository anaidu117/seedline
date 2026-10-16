-- Private bucket for founder materials. Files live under {user_id}/{material_key}/{file name}.
-- Founders reach only their own folder. Downloads use short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy "materials bucket: owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "materials bucket: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "materials bucket: owner updates" on storage.objects for update to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "materials bucket: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
