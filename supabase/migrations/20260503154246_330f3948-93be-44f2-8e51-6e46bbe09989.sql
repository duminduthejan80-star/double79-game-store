insert into storage.buckets (id, name, public) values ('game-media', 'game-media', true) on conflict (id) do nothing;

create policy "Public read game-media"
on storage.objects for select
using (bucket_id = 'game-media');

create policy "Anyone upload game-media"
on storage.objects for insert
with check (bucket_id = 'game-media');

create policy "Anyone update game-media"
on storage.objects for update
using (bucket_id = 'game-media');