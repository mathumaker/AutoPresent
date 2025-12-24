/**
 * Sets up the MediaRecorder for the canvas.
 */
export function setupCanvasRecorder(
  canvas: HTMLCanvasElement, 
  audioStream: MediaStream | null, 
  fps = 30
): MediaRecorder {
  // 1. Capture visual stream
  const canvasStream = canvas.captureStream(fps);

  // 2. Mix in Audio if available
  if (audioStream) {
    const audioTracks = audioStream.getAudioTracks();
    if (audioTracks.length > 0) {
      canvasStream.addTrack(audioTracks[0]);
    }
  }

  // 3. Determine MIME Type
  const mimeTypes = [
    "video/mp4; codecs=\"avc1.424028, mp4a.40.2\"",
    "video/mp4",
    "video/webm; codecs=vp9",
    "video/webm"
  ];

  let selectedMimeType = "";
  for (const type of mimeTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      selectedMimeType = type;
      break;
    }
  }

  if (!selectedMimeType) {
    throw new Error("No supported video MIME type found.");
  }

  const options: MediaRecorderOptions = {
    mimeType: selectedMimeType,
    videoBitsPerSecond: 5000000 // 5 Mbps
  };

  const recorder = new MediaRecorder(canvasStream, options);

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: selectedMimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    const ext = selectedMimeType.includes('mp4') ? 'mp4' : 'webm';
    a.download = `studio_recording_${new Date().toISOString()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return recorder;
}