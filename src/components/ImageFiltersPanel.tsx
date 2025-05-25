import React from 'react';
import './ImageFiltersPanel.css';
import { ImageFilters } from '../types';

interface ImageFiltersPanelProps {
  filters: ImageFilters;
  onFiltersChange: (filters: ImageFilters) => void;
}

const ImageFiltersPanel: React.FC<ImageFiltersPanelProps> = ({ filters, onFiltersChange }) => {
  const handleFilterChange = (filterName: keyof ImageFilters, value: number) => {
    onFiltersChange({
      ...filters,
      [filterName]: value
    });
  };

  return (
    <div className="filters-panel">
      <h3>图像增强</h3>
      
      <div className="filter-group">
        <label>
          <span>亮度</span>
          <span className="filter-value">{filters.brightness}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="200"
          value={filters.brightness}
          onChange={(e) => handleFilterChange('brightness', Number(e.target.value))}
        />
        <p className="filter-tip">
          💡 调整整体图像亮度，过暗或过亮的照片可适当调节
        </p>
      </div>
      
      <div className="filter-group">
        <label>
          <span>对比度</span>
          <span className="filter-value">{filters.contrast}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="200"
          value={filters.contrast}
          onChange={(e) => handleFilterChange('contrast', Number(e.target.value))}
        />
        <p className="filter-tip">
          💡 增强明暗对比，使字迹与背景区分更明显
        </p>
      </div>
      
      <div className="filter-group">
        <label>
          <span>清晰度</span>
          <span className="filter-value">{filters.clarity}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={filters.clarity}
          onChange={(e) => handleFilterChange('clarity', Number(e.target.value))}
        />
        <p className="filter-tip">
          💡 提高图像细节的清晰程度，对于模糊的照片特别有效
        </p>
      </div>
      
      <div className="filter-group">
        <label>
          <span>锐化</span>
          <span className="filter-value">{filters.sharpness}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={filters.sharpness}
          onChange={(e) => handleFilterChange('sharpness', Number(e.target.value))}
        />
        <p className="filter-tip">
          💡 增强边缘细节，使文字轮廓更加锐利
        </p>
      </div>
      
      <div className="filter-group">
        <label>
          <span>饱和度</span>
          <span className="filter-value">{filters.saturation}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="200"
          value={filters.saturation}
          onChange={(e) => handleFilterChange('saturation', Number(e.target.value))}
        />
        <p className="filter-tip">
          💡 调整颜色鲜艳程度，降低可减少干扰，增强黑白对比
        </p>
      </div>
      
      <div className="filter-group">
        <label>
          <span>伽马校正</span>
          <span className="filter-value">{filters.gamma.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="50"
          max="100"
          value={filters.gamma * 100}
          onChange={(e) => handleFilterChange('gamma', Number(e.target.value) / 100)}
        />
        <p className="filter-tip">
          💡 调整中间调，降低值可使暗部细节更加清晰可见（0.5-1）
        </p>
      </div>
      
      <div className="filter-group">
        <label>
          <span>字迹增强（阈值）</span>
          <span className="filter-value">{filters.threshold}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={filters.threshold}
          onChange={(e) => handleFilterChange('threshold', Number(e.target.value))}
        />
        <p className="filter-tip">
          💡 将图像转为黑白，使模糊字迹更加清晰可见（有效值已优化为最佳区间）
        </p>
      </div>
      
      <button 
        className="reset-button"
        onClick={() => onFiltersChange({
          brightness: 100,
          contrast: 100,
          sharpness: 0,
          clarity: 0,
          saturation: 100,
          gamma: 1.0,
          threshold: 0
        })}
      >
        重置所有
      </button>
      
      <div className="presets">
        <h4>快速预设</h4>
        <button onClick={() => onFiltersChange({
          brightness: 173,
          contrast: 200,
          sharpness: 70,
          clarity: 72,
          saturation: 0,
          gamma: 0.69,
          threshold: 0
        })}>
          轻度增强
        </button>
        <button onClick={() => onFiltersChange({
          brightness: 65,
          contrast: 133,
          sharpness: 96,
          clarity: 100,
          saturation: 61,
          gamma: 0.55,
          threshold: 23
        })}>
          字迹加深
        </button>
        <button onClick={() => onFiltersChange({
          brightness: 132,
          contrast: 200,
          sharpness: 85,
          clarity: 86,
          saturation: 99,
          gamma: 0.5,
          threshold: 85
        })}>
          强力清晰
        </button>
      </div>
    </div>
  );
};

export default ImageFiltersPanel; 