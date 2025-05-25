import React, { useCallback } from 'react';
import './ImageUploader.css';

interface ImageUploaderProps {
  onImageUpload: (imageUrl: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload }) => {
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        onImageUpload(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        onImageUpload(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const imageUrl = event.target?.result as string;
              onImageUpload(imageUrl);
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    }
  }, [onImageUpload]);

  return (
    <div className="image-uploader" onPaste={handlePaste}>
      <div 
        className="upload-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="upload-icon">📷</div>
        <h2>上传试卷图片</h2>
        <p>支持拍照上传、拖拽上传或粘贴图片</p>
        
        <input
          type="file"
          id="file-input"
          accept="image/*"
          onChange={handleFileChange}
          className="file-input"
        />
        
        <label htmlFor="file-input" className="upload-button">
          选择图片
        </label>
        
        <div className="upload-tips">
          <p>💡 提示：</p>
          <ul>
            <li>支持 JPG、PNG、WEBP 等格式</li>
            <li>可以直接拖拽图片到此区域</li>
            <li>可以使用 Ctrl+V 粘贴截图</li>
            <li>建议上传清晰的试卷照片</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader; 