import { useState, useRef } from 'react';
import { Plus, X, Image as ImageIcon, Video as VideoIcon, Loader2 } from 'lucide-react';
import { storageService } from '../../../services/supabase/storage.service';
import { fileToBase64 } from '../../../utils/fileToBase64';

export type ShopHeroMediaItem = { url: string; type: 'image' | 'video' };

interface CreateShopHeroProps {
  mode?: 'create' | 'add' | 'edit';
  initialMedia?: ShopHeroMediaItem[];
  onClose: () => void;
  onHeroCreated: (mediaList: ShopHeroMediaItem[]) => void;
}

export function CreateShopHero({ mode = 'create', initialMedia = [], onClose, onHeroCreated }: CreateShopHeroProps) {
  const [files, setFiles] = useState<{ file?: File; url: string; type: 'image' | 'video' }[]>(
    mode === 'edit' ? initialMedia.map(m => ({ url: m.url, type: m.type })) : []
  );
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (newFiles: FileList | null) => {
    setErrorMsg('');
    if (!newFiles) return;

    setIsUploading(true);
    try {
      const addedFiles: { file: File; url: string; type: 'image' | 'video' }[] = [];
      
      const promises = Array.from(newFiles).map(async (newFile) => {
        const isVideo = newFile.type.startsWith('video/');
        const isImage = newFile.type.startsWith('image/');
  
        if (isVideo || isImage) {
          const base64Url = await fileToBase64(newFile);
          addedFiles.push({
            file: newFile,
            url: base64Url,
            type: isVideo ? 'video' : 'image'
          });
        }
      });

      await Promise.all(promises);

      if (addedFiles.length === 0) {
        setErrorMsg('Please upload valid image or video files.');
        return;
      }

      setFiles(prev => [...prev, ...addedFiles]);
    } catch (err) {
      setErrorMsg('Failed to process media files.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (files.length === 0) {
      setErrorMsg("Please select media files to upload.");
      return;
    }
    setIsUploading(true);
    try {
      const uploadedMedia = await Promise.all(
        files.map(async (f) => {
          if (f.file) {
            const publicUrl = await storageService.uploadMedia(f.file, { contentType: "hero" });
            return { url: publicUrl, type: f.type };
          }
          return { url: f.url, type: f.type };
        })
      );
      onHeroCreated(uploadedMedia);
    } catch (err) {
      setErrorMsg("Failed to upload hero media.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const title = mode === 'add' ? 'Add Hero Media' : mode === 'edit' ? 'Edit Shop Hero' : 'Create Shop Hero';
  const saveBtnText = mode === 'add' ? 'Add Media' : mode === 'edit' ? 'Save Changes' : 'Create Hero';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-800/50 hover:bg-neutral-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-900/50 rounded-xl text-red-200 text-sm">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            {files.map((item, idx) => (
              <div key={idx} className="relative aspect-video bg-black rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center">
                {item.type === 'video' ? (
                  <video
                    src={item.url}
                    className="w-full h-full object-cover pointer-events-none"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={`Preview ${idx}`}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                )}
                
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black p-1.5 rounded-full text-white backdrop-blur-md transition-colors shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>

                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[10px] font-medium text-white flex items-center gap-1 shadow-sm">
                  {item.type === 'video' ? <VideoIcon className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                  {item.type === 'video' ? 'Video' : 'Image'}
                </div>
              </div>
            ))}
            
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-video rounded-xl border border-neutral-700 bg-neutral-950/40 hover:bg-neutral-800/80 flex flex-col items-center justify-center cursor-pointer transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <Plus className="w-6 h-6 text-neutral-400" />
              <span className="text-xs font-medium text-neutral-400 mt-2">Add Media</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex justify-end gap-3 bg-neutral-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={files.length === 0 || isUploading}
            className={`px-4 py-2 text-sm font-medium text-black bg-white rounded-full transition-all flex items-center gap-2 ${
              (files.length === 0 || isUploading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-200 hover:scale-105 active:scale-95'
            }`}
          >
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isUploading ? 'Uploading...' : saveBtnText}
          </button>
        </div>
      </div>
    </div>
  );
}
