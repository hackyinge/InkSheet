import React, { useState, useRef, useEffect } from 'react';
import './PerspectiveCorrection.css';

interface PerspectiveCorrectionProps {
  imageUrl: string;
  onCorrected: (correctedImageUrl: string) => void;
}

interface Point {
  x: number;
  y: number;
}

const PerspectiveCorrection: React.FC<PerspectiveCorrectionProps> = ({ imageUrl, onCorrected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 计算适应容器的canvas尺寸
  useEffect(() => {
    if (!image || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // 计算缩放比例，确保图片完全显示在容器内
    const scaleX = containerWidth / image.width;
    const scaleY = containerHeight / image.height;
    const newScale = Math.min(scaleX, scaleY, 1); // 不放大，只缩小

    const newWidth = image.width * newScale;
    const newHeight = image.height * newScale;

    setScale(newScale);
    setCanvasSize({ width: newWidth, height: newHeight });

    // 初始化四个角点（基于缩放后的尺寸）
    const defaultPoints = [
      { x: newWidth * 0.1, y: newHeight * 0.1 },
      { x: newWidth * 0.9, y: newHeight * 0.1 },
      { x: newWidth * 0.9, y: newHeight * 0.9 },
      { x: newWidth * 0.1, y: newHeight * 0.9 }
    ];
    setPoints(defaultPoints);
  }, [image, containerRef]);

  useEffect(() => {
    if (!imageLoaded || !image || !canvasRef.current || canvasSize.width === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置canvas尺寸
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制缩放后的图片
    ctx.drawImage(image, 0, 0, canvasSize.width, canvasSize.height);

    // 绘制四边形框和控制点
    if (points.length === 4) {
      // 绘制半透明遮罩
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 清除选中区域的遮罩
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < 4; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 绘制边框
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < 4; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      // 绘制控制点
      points.forEach((point, index) => {
        // 判断是否是活跃的控制点
        const isActive = index === activePointIndex;
        
        // 绘制拖拽提示效果
        // 外层阴影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // 外圈 - 活跃点使用更明亮的颜色
        ctx.fillStyle = isActive ? '#f5f5f5' : 'white';
        ctx.beginPath();
        // 活跃点稍大一些
        ctx.arc(point.x, point.y, isActive ? 18 : 15, 0, 2 * Math.PI);
        ctx.fill();
        
        // 内圈 - 活跃点使用更亮的蓝色
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = isActive ? '#4c6ef5' : '#667eea';
        ctx.beginPath();
        ctx.arc(point.x, point.y, isActive ? 15 : 12, 0, 2 * Math.PI);
        ctx.fill();
        
        // 添加序号 - 优化文字显示
        // ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        // ctx.shadowBlur = 2; 
        // ctx.shadowOffsetX = 0;
        // ctx.shadowOffsetY = 0;
        // ctx.fillStyle = 'white';
        // 活跃点使用稍大字体
        // ctx.font = isActive ? '20px Arial' : '18px Arial';
        // ctx.textAlign = 'center';
        // ctx.textBaseline = 'middle';
        
        // // 首先绘制一个小的暗色背景提高文字对比度
        // ctx.beginPath();
        // ctx.arc(point.x, point.y, isActive ? 10 : 8, 0, 2 * Math.PI);
        // ctx.fillStyle = 'rgba(0, 0, 50, 0.3)';
        // ctx.fill();
        
        
        
        // 绘制拖动图标 - 活跃点更大更亮
        ctx.shadowColor = 'transparent';
        // 删除中间的小白点
        ctx.fillStyle = isActive ? 'white' : 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(point.x, point.y, isActive ? 5 : 4, 0, 2 * Math.PI);
        ctx.fill()

        // 然后绘制数字
        ctx.fillStyle = 'black';
        ctx.font = isActive ? 'bold 24px Arial' : 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((index + 1).toString(), point.x, point.y + 2);
      });
    }
  }, [imageLoaded, image, points, canvasSize, activePointIndex]);

  // 修改为鼠标按下事件
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || isProcessing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 找到最近的控制点
    let closestIndex = -1;
    let minDistance = Infinity;
    
    points.forEach((point, index) => {
      const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
      if (distance < minDistance && distance < 25) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // 如果按下了控制点附近，开始拖动
    if (closestIndex !== -1) {
      e.preventDefault(); // 防止拖动时选择其他元素
      
      // 设置活跃点
      setActivePointIndex(closestIndex);
      
      // 改变鼠标样式
      if (canvas) {
        canvas.style.cursor = 'grabbing';
      }
      
      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const newX = Math.max(0, Math.min(canvas.width, e.clientX - rect.left));
        const newY = Math.max(0, Math.min(canvas.height, e.clientY - rect.top));
        
        const newPoints = [...points];
        newPoints[closestIndex] = { x: newX, y: newY };
        setPoints(newPoints);
      };

      const handleMouseUp = () => {
        // 重置活跃点
        setActivePointIndex(null);
        
        // 恢复鼠标样式
        if (canvas) {
          canvas.style.cursor = 'crosshair';
        }
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      // 点击空白区域时重置活跃点
      setActivePointIndex(null);
    }
  };

  // 添加触摸事件支持
  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || isProcessing) return;
    
    // 防止页面滚动
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // 找到最近的控制点
    let closestIndex = -1;
    let minDistance = Infinity;
    
    points.forEach((point, index) => {
      const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
      // 触摸设备上使用更大的触摸区域
      if (distance < minDistance && distance < 40) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // 如果触摸了控制点附近，开始拖动
    if (closestIndex !== -1) {
      // 设置活跃点
      setActivePointIndex(closestIndex);
      
      // 显示视觉反馈 - 可以通过临时状态来触发重绘
      const feedbackPoints = [...points];
      setPoints(feedbackPoints);
      
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const newX = Math.max(0, Math.min(canvas.width, touch.clientX - rect.left));
        const newY = Math.max(0, Math.min(canvas.height, touch.clientY - rect.top));
        
        const newPoints = [...points];
        newPoints[closestIndex] = { x: newX, y: newY };
        setPoints(newPoints);
      };

      const handleTouchEnd = () => {
        // 重置活跃点
        setActivePointIndex(null);
        
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
    } else {
      // 触摸空白区域时重置活跃点
      setActivePointIndex(null);
    }
  };

  const applyPerspectiveCorrection = async () => {
    if (!image || points.length !== 4 || isProcessing) return;

    setIsProcessing(true);

    // 使用 setTimeout 让UI有机会更新显示处理提示
    await new Promise(resolve => setTimeout(resolve, 10));

    try {
      // 将canvas坐标转换回原始图片坐标
      const srcPoints = points.map(p => ({
        x: p.x / scale,
        y: p.y / scale
      }));

      // 创建输出canvas
      const outputCanvas = document.createElement('canvas');
      const outputCtx = outputCanvas.getContext('2d');
      if (!outputCtx) {
        setIsProcessing(false);
        return;
      }

      // 计算输出尺寸
      // 假设点的顺序为：左上(0)、右上(1)、右下(2)、左下(3)
      const width = Math.max(
        Math.sqrt((srcPoints[1].x - srcPoints[0].x) ** 2 + (srcPoints[1].y - srcPoints[0].y) ** 2),
        Math.sqrt((srcPoints[2].x - srcPoints[3].x) ** 2 + (srcPoints[2].y - srcPoints[3].y) ** 2)
      );
      const height = Math.max(
        Math.sqrt((srcPoints[3].x - srcPoints[0].x) ** 2 + (srcPoints[3].y - srcPoints[0].y) ** 2),
        Math.sqrt((srcPoints[2].x - srcPoints[1].x) ** 2 + (srcPoints[2].y - srcPoints[1].y) ** 2)
      );

      outputCanvas.width = Math.round(width);
      outputCanvas.height = Math.round(height);

      // 目标矩形的四个角
      const dstPoints = [
        { x: 0, y: 0 },           // 左上
        { x: width, y: 0 },       // 右上
        { x: width, y: height },  // 右下
        { x: 0, y: height }       // 左下
      ];

      // 使用更简单的方法：将图片分成多个小三角形进行变换
      const subdivisions = 20; // 细分程度，越大越精确但越慢
      
      // 创建网格点
      const createGrid = (points: Point[], rows: number, cols: number) => {
        const grid: Point[][] = [];
        
        for (let row = 0; row <= rows; row++) {
          const rowPoints: Point[] = [];
          const v = row / rows;
          
          for (let col = 0; col <= cols; col++) {
            const u = col / cols;
            
            // 双线性插值计算网格点位置
            const x = (1 - u) * (1 - v) * points[0].x +
                      u * (1 - v) * points[1].x +
                      u * v * points[2].x +
                      (1 - u) * v * points[3].x;
            
            const y = (1 - u) * (1 - v) * points[0].y +
                      u * (1 - v) * points[1].y +
                      u * v * points[2].y +
                      (1 - u) * v * points[3].y;
            
            rowPoints.push({ x, y });
          }
          grid.push(rowPoints);
        }
        
        return grid;
      };

      // 创建源网格和目标网格
      const srcGrid = createGrid(srcPoints, subdivisions, subdivisions);
      const dstGrid = createGrid(dstPoints, subdivisions, subdivisions);

      // 清空输出画布
      outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);

      // 对每个网格单元进行变换
      const totalCells = subdivisions * subdivisions;
      let processedCells = 0;

      const processNextBatch = () => {
        return new Promise<void>((resolve) => {
          const cellsPerBatch = 50;
          const endCell = Math.min(processedCells + cellsPerBatch, totalCells);
          
          for (let i = processedCells; i < endCell; i++) {
            const row = Math.floor(i / subdivisions);
            const col = i % subdivisions;
            
            // 获取网格单元的四个顶点
            const src = [
              srcGrid[row][col],
              srcGrid[row][col + 1],
              srcGrid[row + 1][col + 1],
              srcGrid[row + 1][col]
            ];
            
            const dst = [
              dstGrid[row][col],
              dstGrid[row][col + 1],
              dstGrid[row + 1][col + 1],
              dstGrid[row + 1][col]
            ];
            
            // 将四边形分成两个三角形
            drawTriangle(outputCtx, image,
              [src[0], src[1], src[2]],
              [dst[0], dst[1], dst[2]]
            );
            
            drawTriangle(outputCtx, image,
              [src[0], src[2], src[3]],
              [dst[0], dst[2], dst[3]]
            );
          }
          
          processedCells = endCell;
          
          if (processedCells < totalCells) {
            requestAnimationFrame(() => resolve());
          } else {
            resolve();
          }
        });
      };

      // 绘制三角形的辅助函数
      const drawTriangle = (
        ctx: CanvasRenderingContext2D,
        img: HTMLImageElement,
        srcTri: Point[],
        dstTri: Point[]
      ) => {
        ctx.save();
        
        // 创建裁剪路径
        ctx.beginPath();
        ctx.moveTo(dstTri[0].x, dstTri[0].y);
        ctx.lineTo(dstTri[1].x, dstTri[1].y);
        ctx.lineTo(dstTri[2].x, dstTri[2].y);
        ctx.closePath();
        ctx.clip();
        
        // 计算仿射变换矩阵
        const x1 = srcTri[0].x, y1 = srcTri[0].y;
        const x2 = srcTri[1].x, y2 = srcTri[1].y;
        const x3 = srcTri[2].x, y3 = srcTri[2].y;
        
        const X1 = dstTri[0].x, Y1 = dstTri[0].y;
        const X2 = dstTri[1].x, Y2 = dstTri[1].y;
        const X3 = dstTri[2].x, Y3 = dstTri[2].y;
        
        const det = x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2);
        
        const a = ((X1 * (y2 - y3) + X2 * (y3 - y1) + X3 * (y1 - y2)) / det);
        const b = ((Y1 * (y2 - y3) + Y2 * (y3 - y1) + Y3 * (y1 - y2)) / det);
        const c = ((x1 * (X2 - X3) + x2 * (X3 - X1) + x3 * (X1 - X2)) / det);
        const d = ((x1 * (Y2 - Y3) + x2 * (Y3 - Y1) + x3 * (Y1 - Y2)) / det);
        const e = ((x1 * (y2 * X3 - y3 * X2) + x2 * (y3 * X1 - y1 * X3) + x3 * (y1 * X2 - y2 * X1)) / det);
        const f = ((x1 * (y2 * Y3 - y3 * Y2) + x2 * (y3 * Y1 - y1 * Y3) + x3 * (y1 * Y2 - y2 * Y1)) / det);
        
        // 应用变换并绘制
        ctx.setTransform(a, b, c, d, e, f);
        ctx.drawImage(img, 0, 0);
        
        ctx.restore();
      };

      // 分批处理所有网格单元
      while (processedCells < totalCells) {
        await processNextBatch();
      }

      // 创建最终输出图像 - 使用额外的canvas确保没有辅助线
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = outputCanvas.width;
      finalCanvas.height = outputCanvas.height;
      const finalCtx = finalCanvas.getContext('2d');
      
      if (finalCtx) {
        // 设置平滑处理以确保高质量输出
        finalCtx.imageSmoothingEnabled = true;
        finalCtx.imageSmoothingQuality = 'high';
        
        // 先填充白色背景
        finalCtx.fillStyle = '#ffffff';
        finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        // 只绘制图像内容，不包含任何辅助线
        finalCtx.drawImage(outputCanvas, 0, 0);
        
        // 使用这个干净的canvas作为最终输出
        const correctedImageUrl = finalCanvas.toDataURL('image/png');
        onCorrected(correctedImageUrl);
      } else {
        // 如果无法创建最终canvas，则使用原始输出
        const correctedImageUrl = outputCanvas.toDataURL();
        onCorrected(correctedImageUrl);
      }
    } catch (error) {
      console.error('透视校正失败:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="perspective-correction">
      <div className="correction-instructions">
        <h3>梯形校正</h3>
        <p>拖动四个角点来调整试卷的透视变形，使其变为正矩形</p>
        <ol>
          <li>按住并拖动角点进行调整</li>
          <li>确保四个角点覆盖试卷的四个角</li>
          <li>点击"应用校正"完成透视矫正</li>
        </ol>
      </div>
      
      <div className="correction-canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onTouchStart={handleCanvasTouchStart}
          className="correction-canvas"
          style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px`, touchAction: 'none' }}
        />
        
        {/* 控制点序号说明 */}
        <div className="control-points-hint">
          <p>控制点对应试卷四角：</p>
          <ul>
            <li><strong>1</strong> - 左上角</li>
            <li><strong>2</strong> - 右上角</li>
            <li><strong>3</strong> - 右下角</li>
            <li><strong>4</strong> - 左下角</li>
          </ul>
        </div>
        
        {isProcessing && (
          <div className="processing-overlay">
            <div className="processing-message">
              <div className="spinner"></div>
              <p>正在校正图片，请稍等...</p>
            </div>
          </div>
        )}
      </div>
      
      <button 
        onClick={applyPerspectiveCorrection} 
        className="apply-correction-button"
        disabled={isProcessing}
      >
        {isProcessing ? '处理中...' : '应用校正'}
      </button>
    </div>
  );
};

export default PerspectiveCorrection; 