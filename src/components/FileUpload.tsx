import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';

interface FileUploadProps {
  bucket: string;
  onUpload: (url: string) => void;
  accept?: string;
  label?: string;
  preview?: string;
  className?: string;
}

export default function FileUpload({ bucket, onUpload, accept = 'image/*', label = 'Upload', preview, className = '' }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(preview || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const isVideo = accept.includes('video');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Arquivo muito grande (máx. ${isVideo ? '100MB' : '10MB'})`);
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${bucket}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const storageRef = ref(storage, path);

    try {
      await uploadBytes(storageRef, file);
      const publicUrl = await getDownloadURL(storageRef);
      setPreviewUrl(publicUrl);
      onUpload(publicUrl);
    } catch (error) {
      toast.error('Erro no upload');
    }
    setUploading(false);
  };

  const handleClear = () => {
    setPreviewUrl('');
    onUpload('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={className}>
      <input ref={inputRef} type="file" accept={accept} onChange={handleUpload} className="hidden" />
      {previewUrl ? (
        <div className="relative group rounded-lg border border-border bg-muted/20 p-2">
          <div className="w-full h-40 rounded-md overflow-hidden bg-background flex items-center justify-center">
            {isVideo ? (
              <video src={previewUrl} className="max-w-full max-h-full object-contain" controls />
            ) : (
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
            )}
          </div>
          <button
            onClick={handleClear}
            className="absolute top-3 right-3 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          {uploading ? (
            <span className="text-xs">Enviando...</span>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
