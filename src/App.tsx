import React, { useState } from 'react';
import './App.css';
import ImageUploader from './components/ImageUploader';
import ImageEditor from './components/ImageEditor';
import { ProcessedImage } from './types';

function App() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImage(imageUrl);
  };

  const handleImageProcessed = (image: ProcessedImage) => {
    setProcessedImages([...processedImages, image]);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>试卷图像处理工具</h1>
        <p>支持图片裁切、字迹增强、梯形校正等功能</p>
      </header>
      
      <main className="App-main">
        {!uploadedImage ? (
          <ImageUploader onImageUpload={handleImageUpload} />
        ) : (
          <ImageEditor 
            imageUrl={uploadedImage} 
            onImageProcessed={handleImageProcessed}
            onBack={() => setUploadedImage(null)}
          />
        )}
        
        {processedImages.length > 0 && (
          <div className="processed-images">
            <h2>处理后的图片</h2>
            <div className="image-gallery">
              {processedImages.map((img, index) => (
                <div key={index} className="processed-image-item">
                  <img src={img.url} alt={`处理后图片 ${index + 1}`} />
                  <button onClick={() => {
                    const link = document.createElement('a');
                    link.href = img.url;
                    link.download = img.filename;
                    link.click();
                  }}>
                    下载
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App; 