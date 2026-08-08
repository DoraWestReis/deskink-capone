import React, { useState } from 'react';
import { Image as ImageIcon, Upload, Loader2, X, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function ImageGallery({ images = [], onImagesChange, disabled = false }) {
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const response = await base44.integrations.Core.UploadFile({ file });
        return response.file_url;
      });

      const newImageUrls = await Promise.all(uploadPromises);
      const updatedImages = [...(images || []), ...newImageUrls];
      onImagesChange(updatedImages);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    const updatedImages = images.filter((_, index) => index !== indexToRemove);
    onImagesChange(updatedImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-slate-500" />
          <h4 className="text-sm font-medium text-slate-700">Imagens do Projeto</h4>
        </div>
        {!disabled && (
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              className="pointer-events-none"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </>
              )}
            </Button>
          </label>
        )}
      </div>

      {images && images.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {images.map((imageUrl, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group cursor-pointer"
              onClick={() => setSelectedImage(imageUrl)}
            >
              <img
                src={imageUrl}
                alt={`Imagem ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(index);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
          <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhuma imagem adicionada</p>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={selectedImage}
            alt="Visualização"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}