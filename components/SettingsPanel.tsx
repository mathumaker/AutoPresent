import React from 'react';
import { AppConfig, MediaDeviceState, CanvasElement } from '../types';
import { Sliders, Type, Video, Mic, RefreshCw, Film, Layers } from 'lucide-react';

interface SettingsPanelProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  mediaState: MediaDeviceState;
  setMediaState: React.Dispatch<React.SetStateAction<MediaDeviceState>>;
  slideElement: CanvasElement;
  cameraElement: CanvasElement;
  onAutoAlign: () => void;
  disabled: boolean;
}

const FONT_OPTIONS = [
    { label: 'Arial (Sans)', value: 'Arial' },
    { label: 'Verdana', value: 'Verdana' },
    { label: 'Helvetica', value: 'Helvetica' },
    { label: 'Times New Roman (Serif)', value: 'Times New Roman' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Playfair Display (Serif)', value: 'Playfair Display' },
    { label: 'Lora (Serif)', value: 'Lora' },
    { label: 'Noto Sans Tamil', value: 'Noto Sans Tamil' },
    { label: 'Roboto', value: 'Roboto' },
    { label: 'Montserrat', value: 'Montserrat' },
    { label: 'Open Sans', value: 'Open Sans' },
    { label: 'Lato', value: 'Lato' },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  setConfig,
  mediaState,
  setMediaState,
  slideElement,
  cameraElement,
  onAutoAlign,
  disabled
}) => {
  const handleChange = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const audioDevices = mediaState.devices.filter(d => d.kind === 'audioinput');
  const videoDevices = mediaState.devices.filter(d => d.kind === 'videoinput');

  return (
    <div className={`w-80 bg-studio-panel border-r border-gray-700 flex flex-col h-full overflow-y-auto ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-sm font-bold uppercase tracking-wider text-studio-accent flex items-center gap-2">
          <Sliders size={16} /> Studio Settings
        </h2>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Media Sources */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
            <Video size={14} /> Sources
          </h3>
          
          <div className="space-y-2">
            <label className="text-xs text-gray-300 block flex items-center gap-1"><Video size={10}/> Camera</label>
            <select 
              value={mediaState.videoInputId}
              onChange={(e) => setMediaState(prev => ({ ...prev, videoInputId: e.target.value }))}
              className="w-full bg-black/20 border border-gray-600 rounded px-2 py-1 text-xs text-white"
            >
              {videoDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,4)}...`}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-300 block flex items-center gap-1"><Mic size={10}/> Microphone</label>
            <select 
              value={mediaState.audioInputId}
              onChange={(e) => setMediaState(prev => ({ ...prev, audioInputId: e.target.value }))}
              className="w-full bg-black/20 border border-gray-600 rounded px-2 py-1 text-xs text-white"
            >
              {audioDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0,4)}...`}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-px bg-gray-700 w-full" />

        {/* Layout & Dimensions */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                 <h3 className="text-xs font-semibold text-gray-400 uppercase">Layout</h3>
                 <button 
                    onClick={onAutoAlign}
                    className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
                    title="Equalize gaps between elements"
                 >
                    <RefreshCw size={10} /> Auto Align
                 </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 font-mono bg-black/20 p-2 rounded">
                <div>Slide X: {Math.floor(slideElement.rect.x)}</div>
                <div>Slide W: {Math.floor(slideElement.rect.w)}</div>
                <div>Cam X: {Math.floor(cameraElement.rect.x)}</div>
                <div>Cam W: {Math.floor(cameraElement.rect.w)}</div>
            </div>
        </div>

        {/* Style */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase">Appearance</h3>
          
          <div className="space-y-2">
            <label className="text-xs text-gray-300 block">Background Color</label>
            <div className="flex gap-2">
                <input 
                    type="color" 
                    value={config.bgColor}
                    onChange={(e) => handleChange('bgColor', e.target.value)}
                    className="h-8 w-10 bg-transparent cursor-pointer rounded border border-gray-600"
                />
                <input 
                    type="text" 
                    value={config.bgColor}
                    onChange={(e) => handleChange('bgColor', e.target.value)}
                    className="flex-1 bg-black/20 border border-gray-600 rounded px-2 text-xs font-mono"
                />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-300 flex justify-between">
                <span>Shadow Intensity</span>
                <span>{config.shadowIntensity}%</span>
            </label>
             <input 
              type="range" min="0" max="100" 
              value={config.shadowIntensity}
              onChange={(e) => handleChange('shadowIntensity', parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-300 flex justify-between">
                <span>Slide Roundness</span>
                <span>{config.slideRoundness}px</span>
            </label>
            <input 
              type="range" min="0" max="100" 
              value={config.slideRoundness}
              onChange={(e) => handleChange('slideRoundness', parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-300 flex justify-between">
                <span>Camera Roundness</span>
                <span>{config.cameraRoundness}px</span>
            </label>
            <input 
              type="range" min="0" max="200" 
              value={config.cameraRoundness}
              onChange={(e) => handleChange('cameraRoundness', parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>

        {/* Transition */}
        <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
                <Film size={14} /> Transitions
            </h3>
            <div className="space-y-2">
                <label className="text-xs text-gray-300 flex justify-between">
                    <span>Fade Speed</span>
                    <span>{config.transitionSpeed}ms</span>
                </label>
                <input 
                    type="range" min="0" max="2000" step="100"
                    value={config.transitionSpeed}
                    onChange={(e) => handleChange('transitionSpeed', parseInt(e.target.value))}
                    className="w-full accent-indigo-500"
                />
            </div>
        </div>

        {/* Lower Thirds */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
             <Layers size={14} /> Lower Third
          </h3>

          {/* Bar Colors */}
          <div className="space-y-2">
            <label className="text-xs text-gray-300 block">Gradient Colors</label>
            <div className="flex gap-2">
                 <input 
                    type="color" 
                    value={config.lowerThirdBgColor1}
                    onChange={(e) => handleChange('lowerThirdBgColor1', e.target.value)}
                    className="h-6 flex-1 cursor-pointer rounded border border-gray-600"
                    title="Start Color"
                />
                <input 
                    type="color" 
                    value={config.lowerThirdBgColor2}
                    onChange={(e) => handleChange('lowerThirdBgColor2', e.target.value)}
                    className="h-6 flex-1 cursor-pointer rounded border border-gray-600"
                    title="End Color"
                />
            </div>
          </div>
          
          {/* Title */}
          <div className="space-y-2 p-2 bg-black/10 rounded">
            <label className="text-xs font-bold text-gray-300 block">Title (Top)</label>
            <input 
                type="text" 
                value={config.lowerThirdTitle}
                onChange={(e) => handleChange('lowerThirdTitle', e.target.value)}
                placeholder="Main Title"
                className="w-full bg-black/20 border border-gray-600 rounded px-2 py-1 text-sm text-white mb-2"
            />
            <div className="grid grid-cols-2 gap-2">
                <select 
                    value={config.lowerThirdTitleFont}
                    onChange={(e) => handleChange('lowerThirdTitleFont', e.target.value)}
                    className="bg-black/20 border border-gray-600 rounded px-2 py-1 text-[10px] text-white"
                >
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <input 
                    type="color" 
                    value={config.lowerThirdTitleColor}
                    onChange={(e) => handleChange('lowerThirdTitleColor', e.target.value)}
                    className="h-6 w-full cursor-pointer rounded border border-gray-600"
                />
            </div>
            <input 
              type="range" min="20" max="100" 
              value={config.lowerThirdTitleSize}
              onChange={(e) => handleChange('lowerThirdTitleSize', parseInt(e.target.value))}
              className="w-full accent-indigo-500 mt-2"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-2 p-2 bg-black/10 rounded">
            <label className="text-xs font-bold text-gray-300 block">Subtitle (Bottom)</label>
            <input 
                type="text" 
                value={config.lowerThirdSubtitle}
                onChange={(e) => handleChange('lowerThirdSubtitle', e.target.value)}
                placeholder="Subtitle"
                className="w-full bg-black/20 border border-gray-600 rounded px-2 py-1 text-sm text-white mb-2"
            />
             <div className="grid grid-cols-2 gap-2">
                <select 
                    value={config.lowerThirdSubtitleFont}
                    onChange={(e) => handleChange('lowerThirdSubtitleFont', e.target.value)}
                    className="bg-black/20 border border-gray-600 rounded px-2 py-1 text-[10px] text-white"
                >
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <input 
                    type="color" 
                    value={config.lowerThirdSubtitleColor}
                    onChange={(e) => handleChange('lowerThirdSubtitleColor', e.target.value)}
                    className="h-6 w-full cursor-pointer rounded border border-gray-600"
                />
            </div>
             <input 
              type="range" min="10" max="60" 
              value={config.lowerThirdSubtitleSize}
              onChange={(e) => handleChange('lowerThirdSubtitleSize', parseInt(e.target.value))}
              className="w-full accent-indigo-500 mt-2"
            />
          </div>
        </div>

        {/* Teleprompter */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
             <Type size={14} /> Teleprompter
          </h3>
          <div className="space-y-2">
            <label className="text-xs text-gray-300 flex justify-between">
                <span>Height</span>
                <span>{config.scriptHeight}%</span>
            </label>
            <input 
              type="range" min="10" max="50" 
              value={config.scriptHeight}
              onChange={(e) => handleChange('scriptHeight', parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-300 flex justify-between">
                <span>Font Size</span>
                <span>{config.teleprompterFontSize}px</span>
            </label>
            <input 
              type="range" min="16" max="72" 
              value={config.teleprompterFontSize}
              onChange={(e) => handleChange('teleprompterFontSize', parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-300 flex justify-between">
                <span>Scroll Sensitivity</span>
                <span>{config.teleprompterSpeed}x</span>
            </label>
            <input 
              type="range" min="0.5" max="3" step="0.1"
              value={config.teleprompterSpeed}
              onChange={(e) => handleChange('teleprompterSpeed', parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};