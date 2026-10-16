-- The share-open Edge Function (service role) shows "Founders like you" in shared plans.
grant execute on function public.founders_like_you_many(uuid[], public.stage, public.sector) to service_role;
