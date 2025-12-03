import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

interface LiveClientConfig {
  onAudioData: (buffer: AudioBuffer) => void;
  onClose: () => void;
  onError: (error: Error) => void;
}

export class LiveClient {
  private ai: GoogleGenAI;
  private audioContext: AudioContext;
  private inputAudioContext: AudioContext;
  private nextStartTime: number = 0;
  private sessionPromise: Promise<any> | null = null;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private isConnected: boolean = false;
  private config: LiveClientConfig;

  constructor(config: LiveClientConfig) {
    this.config = config;
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    this.inputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  }

  async connect() {
    if (this.isConnected) return;
    
    // Resume contexts if suspended (browser policy)
    if (this.audioContext.state === 'suspended') await this.audioContext.resume();
    if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          this.isConnected = true;
          this.setupAudioInput(stream);
        },
        onmessage: async (message: LiveServerMessage) => {
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            this.handleAudioOutput(base64Audio);
          }
          
          const interrupted = message.serverContent?.interrupted;
          if (interrupted) {
            this.stopAudio();
          }
        },
        onclose: () => {
          this.isConnected = false;
          this.config.onClose();
        },
        onerror: (err) => {
          console.error("Live API Error:", err);
          this.config.onError(new Error("Bağlantı hatası"));
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        },
        // Specialized instruction for 5-6 year old children
        systemInstruction: `Sen 5-6 yaşındaki çocuklarla arkadaşça sohbet eden neşeli, sabırlı ve eğlenceli bir oyun arkadaşısın. 
        Adın 'Sihirli Arkadaş'. Türkçe konuş. Cümlelerin kısa, basit ve anlaşılır olsun. 
        Onlara hikayeler anlat, bilmeceler sor veya onlarla oyun oyna. Asla korkutucu veya karmaşık şeyler söyleme.`,
      }
    });
  }

  private setupAudioInput(stream: MediaStream) {
    const source = this.inputAudioContext.createMediaStreamSource(stream);
    const scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    scriptProcessor.onaudioprocess = (e) => {
      if (!this.isConnected) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = this.createPcmBlob(inputData);
      
      this.sessionPromise?.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleAudioOutput(base64: string) {
    try {
      this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
      
      const audioBuffer = await this.decodeAudioData(
        this.base64ToBytes(base64),
        this.audioContext,
        24000,
        1
      );

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.addEventListener('ended', () => {
        this.sources.delete(source);
      });

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.sources.add(source);
      
      // Notify UI for visualization
      this.config.onAudioData(audioBuffer);

    } catch (e) {
      console.error("Audio decode error", e);
    }
  }

  private stopAudio() {
    for (const source of this.sources) {
      source.stop();
    }
    this.sources.clear();
    this.nextStartTime = this.audioContext.currentTime;
  }

  async disconnect() {
    this.isConnected = false;
    this.stopAudio();
    // Assuming session has a close method, currently implicit via scope or cleanup
    // Typically we just stop sending and maybe close context if needed
  }

  // --- Helpers ---

  private createPcmBlob(data: Float32Array): { data: string; mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = Math.max(-1, Math.min(1, data[i])) * 32767; // Clamp and scale
    }
    
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return {
      data: btoa(binary),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}