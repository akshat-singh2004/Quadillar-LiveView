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
 * Optional open-source Hugging Face Transformers.js (Whisper ONNX) browser runner.
 * Works offline via WebGPU/WASM if `@huggingface/transformers` is installed;
 * otherwise gracefully falls back to Web Speech API + Gemini multimodal audio.
 */
export async function transcribeWithOpenSourceWhisper(audioUrl: string): Promise<string | null> {
  try {
    const dynamicImport = new Function('return import("@huggingface/transformers")');
    const mod = await dynamicImport();
    if (!mod?.pipeline) return null;
    const transcriber = await mod.pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-tiny",
      { device: "wasm" }
    );
    const out = await transcriber(audioUrl);
    return typeof out?.text === "string" ? out.text.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Starts real microphone capture (MediaRecorder + Web Audio AnalyserNode waveform)
 * paired with real-time browser SpeechRecognition (en-IN / hi-IN Hinglish).
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
  let recognition: any = null;
  const chunks: BlobPart[] = [];
  let finalTranscript = "";
  let interimTranscript = "";

  // 1. Real Microphone Stream + Live Frequency Waveform
  if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      mediaRecorder = mimeType
        ? new MediaRecorder(mediaStream, { mimeType })
        : new MediaRecorder(mediaStream);

      mediaRecorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      mediaRecorder.start(200);

      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextCtor && params.onWaveformFrame) {
        audioCtx = new AudioContextCtor();
        const source = audioCtx.createMediaStreamSource(mediaStream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(dataArray);
          const bars = Array.from(dataArray.slice(0, 12)).map((v) =>
            Math.max(15, Math.min(100, Math.round((v / 255) * 100)))
          );
          params.onWaveformFrame?.(bars);
          animId = requestAnimationFrame(tick);
        };
        tick();
      }
    } catch {}
  }

  // 2. Real-Time Browser SpeechRecognition (Hinglish / Indian English)
  if (typeof window !== "undefined") {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        recognition = new SpeechRec();
        recognition.lang = "en-IN";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const piece = event.results[i][0]?.transcript || "";
            if (event.results[i].isFinal) {
              finalTranscript += (finalTranscript ? " " : "") + piece.trim();
            } else {
              interim += piece;
            }
          }
          interimTranscript = interim.trim();
          const combined = [finalTranscript, interimTranscript].filter(Boolean).join(" ");
          if (combined) params.onInterimTranscript?.(combined);
        };
        recognition.start();
      } catch {}
    }
  }

  const cleanupStreams = () => {
    if (animId !== null) cancelAnimationFrame(animId);
    if (recognition) {
      try {
        recognition.stop();
      } catch {}
    }
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
        const finish = async (blob: Blob | null) => {
          cleanupStreams();
          const audioUrl = blob ? URL.createObjectURL(blob) : null;
          let transcript = [finalTranscript, interimTranscript].filter(Boolean).join(" ").trim();
          if (!transcript && audioUrl) {
            const whisperText = await transcribeWithOpenSourceWhisper(audioUrl);
            if (whisperText) transcript = whisperText;
          }
          resolve({ audioBlob: blob, audioUrl, transcript, durationSec });
        };

        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.onstop = () => {
            const blob =
              chunks.length > 0
                ? new Blob(chunks, { type: mediaRecorder?.mimeType || "audio/webm" })
                : null;
            void finish(blob);
          };
          try {
            mediaRecorder.stop();
          } catch {
            void finish(null);
          }
        } else {
          void finish(null);
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
