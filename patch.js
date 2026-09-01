import fs from 'fs';
let content = fs.readFileSync('src/components/forms/CreateShopHero.tsx', 'utf8');

const target = `  const handleSave = async () => {
    if (files.length === 0) {
      setErrorMsg('Please select media files to upload.');
      return;
    }
    setIsUploading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      onHeroCreated(files.map(f => ({ url: f.url, type: f.type })));
    } catch (err) {
      setErrorMsg('Failed to upload hero media.');
    } finally {
      setIsUploading(false);
    }
  };`;

const replacement = `  const handleSave = async () => {
    if (files.length === 0) {
      setErrorMsg('Please select media files to upload.');
      return;
    }
    setIsUploading(true);
    try {
      const uploadedMedia = await Promise.all(
        files.map(async (f) => {
          if (f.file) {
            const publicUrl = await storageService.uploadMedia(f.file, { contentType: 'hero' });
            return { url: publicUrl, type: f.type };
          }
          return { url: f.url, type: f.type };
        })
      );
      onHeroCreated(uploadedMedia);
    } catch (err) {
      setErrorMsg('Failed to upload hero media.');
    } finally {
      setIsUploading(false);
    }
  };`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/forms/CreateShopHero.tsx', content);
