export interface ProcessedImage {
  url: string;
  filename: string;
  timestamp: number;
}

export interface ImageFilters {
  brightness: number;
  contrast: number;
  sharpness: number;
  threshold: number;
  clarity: number;
  saturation: number;
  gamma: number;
}

export interface PerspectivePoints {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
} 