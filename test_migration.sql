SELECT 
  name, 
  split_part(name, '/', 2) as email,
  regexp_replace(name, '^uploads/([^/]+)/', 'uploads/UUID_HERE/') as new_name
FROM storage.objects
WHERE bucket_id = 'media' AND name LIKE 'uploads/%';
