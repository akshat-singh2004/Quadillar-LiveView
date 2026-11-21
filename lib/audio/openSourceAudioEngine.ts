"use client";

export interface LiveAudioCaptureHandle {
  stop: () => Promise<{
    audioBlob: Blob | null;
    audioUrl: string | null;
    transcript: string;
    durationSec: number;
  }>;
  cancel: () => void;
}

/**
 * Clean microphone capture (MediaRecorder + Web Audio AnalyserNode waveform).
 * Avoids running Chrome SpeechRecognition in parallel so the mic stream is never
 * starved on Windows or mobile Android/iOS; audio is transcribed directly by Gemini.
 */
export async function startFieldVoiceCapture(params: {
  onWaveformFrame?: (bars: number[]) => void;
  onInterimTranscript?: (text: string) => void;
}): Promise<LiveAudioCaptureHandle> {
  const startedAt = Date.now();
  let mediaRecorder: MediaRecorder | null = null;
  let mediaStream: MediaStream | null = null;
  let audioCtx: AudioContext | null = null;
  let animId: number | null = null;
  const chunks: BlobPart[] = [];

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone API unavailable in this browser.");
  }

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });

  const preferredTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  const chosenMime =
    typeof MediaRecorder !== "undefined"
      ? preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || ""
      : "";

  mediaRecorder = chosenMime
    ? new MediaRecorder(mediaStream, { mimeType: chosenMime })
    : new MediaRecorder(mediaStream);

  mediaRecorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };
  mediaRecorder.start(250);

  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (AudioContextCtor && params.onWaveformFrame) {
    try {
      audioCtx = new AudioContextCtor();
      const source = audioCtx.createMediaStreamSource(mediaStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const bars = Array.from(dataArray.slice(0, 12)).map((v) =>
          Math.max(18, Math.min(100, Math.round((v / 255) * 100)))
        );
        params.onWaveformFrame?.(bars);
        animId = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  }

  const cleanupStreams = () => {
    if (animId !== null) cancelAnimationFrame(animId);
    if (audioCtx) {
      try {
        void audioCtx.close();
      } catch {}
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }
  };

  return {
    stop: () =>
      new Promise((resolve) => {
        const durationSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const finish = (blob: Blob | null) => {
          cleanupStreams();
          const audioUrl = blob ? URL.createObjectURL(blob) : null;
          resolve({ audioBlob: blob, audioUrl, transcript: "", durationSec });
        };

        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.onstop = () => {
            const finalType = mediaRecorder?.mimeType || chosenMime || "audio/webm";
            const blob = chunks.length > 0 ? new Blob(chunks, { type: finalType }) : null;
            finish(blob);
          };
          try {
            mediaRecorder.stop();
          } catch {
            finish(null);
          }
        } else {
          finish(null);
        }
      }),
    cancel: () => {
      try {
        if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
      } catch {}
      cleanupStreams();
    },
  };
}
