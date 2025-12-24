export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AppConfig {
  bgColor: string;
  slideRoundness: number;
  cameraRoundness: number;
  shadowIntensity: number; // New: 0 to 100
  showGizmos: boolean;
  scriptHeight: number; 
  
  // Lower Thirds - Bar Style
  lowerThirdBgColor1: string; // Gradient Start
  lowerThirdBgColor2: string; // Gradient End

  // Lower Thirds - Title
  lowerThirdTitle: string;
  lowerThirdTitleSize: number;
  lowerThirdTitleColor: string;
  lowerThirdTitleFont: string;

  // Lower Thirds - Subtitle
  lowerThirdSubtitle: string;
  lowerThirdSubtitleSize: number;
  lowerThirdSubtitleColor: string;
  lowerThirdSubtitleFont: string;

  // Teleprompter
  teleprompterFontSize: number;
  teleprompterSpeed: number;

  // Transitions
  transitionSpeed: number;
}

export interface MediaDeviceState {
  audioInputId: string;
  videoInputId: string;
  devices: MediaDeviceInfo[];
}

export interface CanvasElement {
  id: 'slide' | 'camera';
  rect: Rect;
  zIndex: number;
}

export interface PDFState {
  file: File | null;
  numPages: number;
  currentPage: number;
  pdfDoc: any | null; 
}