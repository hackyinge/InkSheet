import React, { useState, useRef, useCallback } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import './ImageEditor.css';
import ImageFiltersPanel from './ImageFiltersPanel';
import PerspectiveCorrection from './PerspectiveCorrection';
import { ProcessedImage, ImageFilters } from '../types';

interface ImageEditorProps {
  imageUrl: string;
  onImageProcessed: (image: ProcessedImage) => void;
  onBack: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onImageProcessed, onBack }) => {
  const [editMode, setEditMode] = useState<'crop' | 'filters' | 'perspective' | 'extend'>('crop');
  const [filters, setFilters] = useState<ImageFilters>({
    brightness: 100,
    contrast: 100,
    sharpness: 0,
    threshold: 0,
    clarity: 0,
    saturation: 100,
    gamma: 1.0
  });
  const [processedImageUrl, setProcessedImageUrl] = useState<string>(imageUrl);
  // 存储裁剪或透视校正后的原始图像URL，用于重置滤镜
  const [originalImageUrl, setOriginalImageUrl] = useState<string>(imageUrl);
  const cropperRef = useRef<ReactCropperElement>(null);
  // 图像延展参数
  const [extendSize, setExtendSize] = useState<{ top: number; right: number; bottom: number; left: number }>({
    top: 50,
    right: 50,
    bottom: 50,
    left: 50
  });

  const handleCrop = useCallback(() => {
    const cropper = cropperRef.current;
    if (cropper) {
      // 获取裁剪后的画布，确保不包含任何UI元素或辅助线
      const croppedCanvas = cropper.cropper.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        fillColor: '#fff'
      });
      const croppedImageUrl = croppedCanvas.toDataURL();
      setProcessedImageUrl(croppedImageUrl);
      setOriginalImageUrl(croppedImageUrl); // 保存裁剪后的原始图像
      setEditMode('filters');
    }
  }, []);

  const applyFilters = useCallback((canvas: HTMLCanvasElement, filters: ImageFilters): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 应用亮度和对比度
    const brightness = filters.brightness / 100;
    const contrast = (filters.contrast - 100) / 100 * 255;
    const saturation = filters.saturation / 100;
    const gamma = filters.gamma; // 伽马值现在在0.5-1之间

    for (let i = 0; i < data.length; i += 4) {
      // 应用伽马校正（值越小，暗部细节越清晰）
      data[i] = 255 * Math.pow(data[i] / 255, 1 / gamma);
      data[i + 1] = 255 * Math.pow(data[i + 1] / 255, 1 / gamma);
      data[i + 2] = 255 * Math.pow(data[i + 2] / 255, 1 / gamma);
      
      // 应用亮度和对比度
      data[i] = ((data[i] - 128) * (1 + contrast / 255) + 128) * brightness;
      data[i + 1] = ((data[i + 1] - 128) * (1 + contrast / 255) + 128) * brightness;
      data[i + 2] = ((data[i + 2] - 128) * (1 + contrast / 255) + 128) * brightness;
      
      // 应用饱和度
      if (saturation !== 1) {
        const gray = 0.2989 * data[i] + 0.5870 * data[i + 1] + 0.1140 * data[i + 2];
        data[i] = gray * (1 - saturation) + data[i] * saturation;
        data[i + 1] = gray * (1 - saturation) + data[i + 1] * saturation;
        data[i + 2] = gray * (1 - saturation) + data[i + 2] * saturation;
      }

      // 限制值在0-255之间
      data[i] = Math.max(0, Math.min(255, data[i]));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
    }

    // 应用阈值（二值化）处理，增强字迹
    if (filters.threshold > 0) {
      // 将0-100的值映射到50-80的区间
      const threshold = 50 + (filters.threshold * 0.3); // 映射为50-80区间
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const value = gray < threshold ? 0 : 255;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // 应用锐化
    if (filters.sharpness > 0) {
      const sharpnessStrength = filters.sharpness / 100;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        tempCtx.filter = `contrast(${100 + sharpnessStrength * 50}%) brightness(${100 + sharpnessStrength * 10}%)`;
        tempCtx.drawImage(canvas, 0, 0);
        ctx.globalAlpha = sharpnessStrength;
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.globalAlpha = 1;
      }
    }
    
    // 应用清晰度增强
    if (filters.clarity > 0) {
      const clarityStrength = filters.clarity / 100;
      // 使用卷积矩阵实现USM锐化算法 (Unsharp Masking)
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        // 先创建一个模糊版本
        tempCtx.filter = `blur(${1 + clarityStrength * 2}px)`;
        tempCtx.drawImage(canvas, 0, 0);
        
        // 获取模糊后的图像数据
        const blurredData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
        const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = originalData.data;
        
        // 应用USM锐化算法：原图 + (原图 - 模糊图) * 强度
        const amount = 0.5 + clarityStrength * 2; // 调整为适当的强度
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.max(0, Math.min(255, data[i] + (data[i] - blurredData[i]) * amount));
          data[i+1] = Math.max(0, Math.min(255, data[i+1] + (data[i+1] - blurredData[i+1]) * amount));
          data[i+2] = Math.max(0, Math.min(255, data[i+2] + (data[i+2] - blurredData[i+2]) * amount));
        }
        
        ctx.putImageData(originalData, 0, 0);
      }
    }

    return canvas;
  }, []);

  const handleFiltersChange = useCallback((newFilters: ImageFilters) => {
    setFilters(newFilters);
    
    // 判断是否是重置操作
    const isReset = 
      newFilters.brightness === 100 && 
      newFilters.contrast === 100 && 
      newFilters.sharpness === 0 && 
      newFilters.clarity === 0 && 
      newFilters.saturation === 100 && 
      newFilters.gamma === 1.0 && 
      newFilters.threshold === 0;
    
    // 创建一个临时canvas来应用滤镜
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        applyFilters(canvas, newFilters);
        const filteredImageUrl = canvas.toDataURL();
        setProcessedImageUrl(filteredImageUrl);
      }
    };
    
    // 始终从原始图像开始应用滤镜
    img.src = originalImageUrl;
  }, [originalImageUrl, applyFilters]);

  const handleSave = useCallback(() => {
    const timestamp = Date.now();
    const filename = `processed_exam_${timestamp}.png`;
    
    onImageProcessed({
      url: processedImageUrl,
      filename,
      timestamp
    });
  }, [processedImageUrl, onImageProcessed]);
  
  const handleDownload = useCallback(() => {
    // 创建下载链接
    const timestamp = Date.now();
    const filename = `processed_exam_${timestamp}.png`;
    
    // 创建一个临时canvas来确保图像没有任何UI元素或辅助线
    const img = new Image();
    img.onload = () => {
      // 创建一个干净的canvas用于输出
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // 只绘制图像本身，不包含任何UI元素
        ctx.drawImage(img, 0, 0);
        
        // 从干净的canvas获取图像数据URL
        const cleanImageUrl = canvas.toDataURL('image/png');
        
        // 创建一个临时链接元素
        const downloadLink = document.createElement('a');
        downloadLink.href = cleanImageUrl;
        downloadLink.download = filename;
        
        // 模拟点击下载
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // 同时也通知父组件图片已处理
        onImageProcessed({
          url: cleanImageUrl,
          filename,
          timestamp
        });
      }
    };
    
    // 加载当前处理后的图像
    img.src = processedImageUrl;
  }, [processedImageUrl, onImageProcessed]);

  const handlePerspectiveCorrected = useCallback((correctedImageUrl: string) => {
    // 创建临时图像，确保移除所有辅助线
    const img = new Image();
    img.onload = () => {
      // 创建一个干净的canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // 设置高质量图像渲染
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 先填充白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 只绘制图像内容
        ctx.drawImage(img, 0, 0);
        
        // 获取干净的图像URL
        const cleanImageUrl = canvas.toDataURL('image/png');
        
        // 更新图像和状态
        setProcessedImageUrl(cleanImageUrl);
        setOriginalImageUrl(cleanImageUrl); // 保存透视校正后的原始图像
        setEditMode('filters');
      } else {
        // 如果无法创建canvas，使用原始校正图像
        setProcessedImageUrl(correctedImageUrl);
        setOriginalImageUrl(correctedImageUrl);
        setEditMode('filters');
      }
    };
    
    img.src = correctedImageUrl;
  }, []);

  // 处理图像延展功能
  const handleExtendImage = useCallback(() => {
    const img = new Image();
    img.onload = () => {
      // 创建一个新的canvas，尺寸包含原图像加上延展部分
      const canvas = document.createElement('canvas');
      canvas.width = img.width + extendSize.left + extendSize.right;
      canvas.height = img.height + extendSize.top + extendSize.bottom;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // 设置高质量图像渲染
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 先填充白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 在中间绘制原始图像
        ctx.drawImage(img, extendSize.left, extendSize.top);
        
        // 获取边缘颜色
        const edgeColors = {
          top: getEdgeColors(img, 'top', ctx),
          right: getEdgeColors(img, 'right', ctx),
          bottom: getEdgeColors(img, 'bottom', ctx),
          left: getEdgeColors(img, 'left', ctx)
        };
        
        // 延展边缘
        // 上边缘
        for (let y = 0; y < extendSize.top; y++) {
          for (let x = 0; x < img.width; x++) {
            const color = edgeColors.top[x];
            ctx.fillStyle = color;
            ctx.fillRect(extendSize.left + x, y, 1, 1);
          }
        }
        
        // 右边缘
        for (let x = img.width + extendSize.left; x < canvas.width; x++) {
          for (let y = 0; y < img.height; y++) {
            const color = edgeColors.right[y];
            ctx.fillStyle = color;
            ctx.fillRect(x, extendSize.top + y, 1, 1);
          }
        }
        
        // 下边缘
        for (let y = img.height + extendSize.top; y < canvas.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const color = edgeColors.bottom[x];
            ctx.fillStyle = color;
            ctx.fillRect(extendSize.left + x, y, 1, 1);
          }
        }
        
        // 左边缘
        for (let x = 0; x < extendSize.left; x++) {
          for (let y = 0; y < img.height; y++) {
            const color = edgeColors.left[y];
            ctx.fillStyle = color;
            ctx.fillRect(x, extendSize.top + y, 1, 1);
          }
        }
        
        // 填充四个角落
        // 左上角
        for (let y = 0; y < extendSize.top; y++) {
          for (let x = 0; x < extendSize.left; x++) {
            ctx.fillStyle = edgeColors.top[0]; // 使用左上角颜色
            ctx.fillRect(x, y, 1, 1);
          }
        }
        
        // 右上角
        for (let y = 0; y < extendSize.top; y++) {
          for (let x = img.width + extendSize.left; x < canvas.width; x++) {
            ctx.fillStyle = edgeColors.top[img.width - 1]; // 使用右上角颜色
            ctx.fillRect(x, y, 1, 1);
          }
        }
        
        // 右下角
        for (let y = img.height + extendSize.top; y < canvas.height; y++) {
          for (let x = img.width + extendSize.left; x < canvas.width; x++) {
            ctx.fillStyle = edgeColors.bottom[img.width - 1]; // 使用右下角颜色
            ctx.fillRect(x, y, 1, 1);
          }
        }
        
        // 左下角
        for (let y = img.height + extendSize.top; y < canvas.height; y++) {
          for (let x = 0; x < extendSize.left; x++) {
            ctx.fillStyle = edgeColors.bottom[0]; // 使用左下角颜色
            ctx.fillRect(x, y, 1, 1);
          }
        }
        
        // 获取延展后的图像URL
        const extendedImageUrl = canvas.toDataURL('image/png');
        
        // 更新图像和状态
        setProcessedImageUrl(extendedImageUrl);
        setOriginalImageUrl(extendedImageUrl);
        setEditMode('filters');
      }
    };
    
    img.src = processedImageUrl;
  }, [processedImageUrl, extendSize]);
  
  // 获取边缘颜色的辅助函数
  const getEdgeColors = (img: HTMLImageElement, edge: 'top' | 'right' | 'bottom' | 'left', ctx: CanvasRenderingContext2D) => {
    const colors: string[] = [];
    
    // 创建临时canvas来获取图像数据
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) return colors;
    
    // 绘制图像
    tempCtx.drawImage(img, 0, 0);
    
    // 获取图像数据
    const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    
    switch (edge) {
      case 'top':
        for (let x = 0; x < img.width; x++) {
          const i = (0 * img.width + x) * 4;
          colors.push(`rgb(${data[i]}, ${data[i+1]}, ${data[i+2]})`);
        }
        break;
      case 'right':
        for (let y = 0; y < img.height; y++) {
          const i = (y * img.width + img.width - 1) * 4;
          colors.push(`rgb(${data[i]}, ${data[i+1]}, ${data[i+2]})`);
        }
        break;
      case 'bottom':
        for (let x = 0; x < img.width; x++) {
          const i = ((img.height - 1) * img.width + x) * 4;
          colors.push(`rgb(${data[i]}, ${data[i+1]}, ${data[i+2]})`);
        }
        break;
      case 'left':
        for (let y = 0; y < img.height; y++) {
          const i = (y * img.width + 0) * 4;
          colors.push(`rgb(${data[i]}, ${data[i+1]}, ${data[i+2]})`);
        }
        break;
    }
    
    return colors;
  };

  // 图像延展设置控件
  const ExtendControls = () => (
    <div className="extend-controls">
      <h3>图像延展</h3>
      <p>设置各边延展的像素值</p>
      
      <div className="extend-control-group">
        <label>
          <span>上边延展</span>
          <span className="extend-value">{extendSize.top}px</span>
        </label>
        <input
          type="range"
          min="0"
          max="200"
          value={extendSize.top}
          onChange={(e) => setExtendSize({...extendSize, top: Number(e.target.value)})}
        />
      </div>
      
      <div className="extend-control-group">
        <label>
          <span>右边延展</span>
          <span className="extend-value">{extendSize.right}px</span>
        </label>
        <input
          type="range"
          min="0"
          max="200"
          value={extendSize.right}
          onChange={(e) => setExtendSize({...extendSize, right: Number(e.target.value)})}
        />
      </div>
      
      <div className="extend-control-group">
        <label>
          <span>下边延展</span>
          <span className="extend-value">{extendSize.bottom}px</span>
        </label>
        <input
          type="range"
          min="0"
          max="200"
          value={extendSize.bottom}
          onChange={(e) => setExtendSize({...extendSize, bottom: Number(e.target.value)})}
        />
      </div>
      
      <div className="extend-control-group">
        <label>
          <span>左边延展</span>
          <span className="extend-value">{extendSize.left}px</span>
        </label>
        <input
          type="range"
          min="0"
          max="200"
          value={extendSize.left}
          onChange={(e) => setExtendSize({...extendSize, left: Number(e.target.value)})}
        />
      </div>
      
      <button 
        onClick={handleExtendImage} 
        className="apply-extend-button"
      >
        应用延展
      </button>
    </div>
  );

  return (
    <div className="image-editor">
      <div className="editor-toolbar">
        <button onClick={onBack} className="back-button">
          ← 返回
        </button>
        
        <div className="edit-modes">
          <button 
            className={editMode === 'crop' ? 'active' : ''}
            onClick={() => setEditMode('crop')}
          >
            ✂️ 裁切
          </button>
          <button 
            className={editMode === 'perspective' ? 'active' : ''}
            onClick={() => setEditMode('perspective')}
          >
            📐 梯形校正
          </button>
          <button 
            className={editMode === 'filters' ? 'active' : ''}
            onClick={() => setEditMode('filters')}
          >
            🎨 增强处理
          </button>
          <button 
            className={editMode === 'extend' ? 'active' : ''}
            onClick={() => setEditMode('extend')}
          >
            📏 图像延展
          </button>
        </div>
        
        <button onClick={handleDownload} className="save-button">
          📥 下载
        </button>
      </div>

      <div className="editor-content">
        <div className="editor-main">
          {editMode === 'crop' && (
            <div className="crop-container">
              <Cropper
                ref={cropperRef}
                src={imageUrl}
                style={{ height: '100%', width: '100%' }}
                guides={false}
                viewMode={1}
                minCropBoxHeight={10}
                minCropBoxWidth={10}
                background={false}
                responsive={true}
                autoCropArea={1}
                checkOrientation={false}
                cropBoxMovable={true}
                cropBoxResizable={true}
                toggleDragModeOnDblclick={false}
              />
              <button onClick={handleCrop} className="apply-crop-button">
                应用裁切
              </button>
            </div>
          )}
          
          {editMode === 'perspective' && (
            <PerspectiveCorrection
              imageUrl={processedImageUrl}
              onCorrected={handlePerspectiveCorrected}
            />
          )}
          
          {(editMode === 'filters' || editMode === 'extend') && (
            <div className="preview-container">
              <img src={processedImageUrl} alt="处理中的图片" />
            </div>
          )}
        </div>
        
        {editMode === 'filters' && (
          <div className="editor-sidebar">
            <ImageFiltersPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </div>
        )}
        
        {editMode === 'extend' && (
          <div className="editor-sidebar">
            <ExtendControls />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageEditor; 