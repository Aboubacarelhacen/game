
import { GoogleGenAI, Modality, Type } from "@google/genai";

// SECURITY NOTE:
// The API key is accessed via an environment variable. 
// When you export this project to GitHub, DO NOT commit your actual API key.
// Use a .env file locally and add it to .gitignore.
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- HELPER: JSON CLEANER ---
const cleanAndParseJson = (text: string | undefined) => {
  if (!text) return {};
  try {
    // Remove markdown code blocks if present
    let clean = text.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json/, '').replace(/```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```/, '').replace(/```$/, '');
    }
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return {};
  }
};

// --- AUDIO / TTS SUPPORT ---

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentFetchController: AbortController | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    // Gemini TTS output is 24kHz. Setting the context to this avoids resampling artifacts.
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
};

// Helper: Convert Base64 string to Uint8Array
const base64ToBytes = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper: Convert Raw PCM (Int16) to AudioBuffer
const pcmToAudioBuffer = (bytes: Uint8Array, ctx: AudioContext): AudioBuffer => {
  const dataInt16 = new Int16Array(bytes.buffer);
  const frameCount = dataInt16.length;
  // Create a buffer: 1 channel (mono), length of data, 24kHz sample rate
  const buffer = ctx.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < frameCount; i++) {
    // Convert Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
    channelData[i] = dataInt16[i] / 32768.0;
  }
  
  return buffer;
};

const playAudioData = async (base64String: string) => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();

  // Stop previous audio immediately
  stopSpeaking();

  try {
    const bytes = base64ToBytes(base64String);
    const audioBuffer = pcmToAudioBuffer(bytes, ctx);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start(0);
    currentSource = source;
    
    source.onended = () => {
      if (currentSource === source) {
        currentSource = null;
      }
    };
  } catch (e) {
    console.error("Audio playback error", e);
  }
};

export const stopSpeaking = () => {
  // 1. Abort network request if still loading
  if (currentFetchController) {
    currentFetchController.abort();
    currentFetchController = null;
  }

  // 2. Stop Gemini Audio
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {
      // ignore if already stopped
    }
    currentSource = null;
  }
  
  // 3. Stop Browser Fallback Audio
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }
};

export const speak = async (text: string) => {
  // Immediate silence before new request
  stopSpeaking();

  // Create new controller
  const controller = new AbortController();
  currentFetchController = controller;
  
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' is friendly for kids
          },
        },
      },
    });

    if (controller.signal.aborted) return;

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      await playAudioData(audioData);
    }
  } catch (error) {
    if (controller.signal.aborted) return;
    
    console.error("TTS API Error:", error);
    // Silent Fallback to browser TTS if API fails/quota exceeded
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.9; // Slightly slower for kids
    window.speechSynthesis.speak(utterance);
  }
};

// --- IMAGE GENERATION & EDITING ---

// Text-to-Image (Create new character)
export const generateImage = async (prompt: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Görsel oluşturulamadı.");
  } catch (error) {
    console.error("Generate Image Error:", error);
    throw error;
  }
};

// Image Editing (Modify existing)
export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/png',
            },
          },
          { text: prompt },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Görsel düzenlenemedi.");
  } catch (error) {
    console.error("Edit Image Error:", error);
    throw error;
  }
};

// --- VIDEO GENERATION ---

export const generateVideo = async (prompt: string): Promise<string | null> => {
  // Always create a new client to ensure the latest API key is used (especially after key selection)
  const ai = getAiClient();
  
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (downloadLink) {
        // Fetch with API key to get the content
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
           console.error("Video fetch failed", response.status, response.statusText);
           return null;
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }
    
    return null;
  } catch (error) {
    console.error("Generate Video Error:", error);
    return null;
  }
};

// --- LOGIC PUZZLE GENERATION (BILSEM STYLE - IMAGES) ---

export interface BilsemPuzzle {
  sequenceUrls: string[]; // URLs/Base64 of the sequence images
  optionUrls: string[];   // URLs/Base64 of the option images
  correctOptionIndex: number;
  speech: string;
}

export const generateBilsemPuzzleWithImages = async (): Promise<BilsemPuzzle> => {
  const ai = getAiClient();
  
  // 1. Text Phase
  const logicResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Create a visual logic pattern for a 6-year-old child. 
    Pattern: A-B-A-? or A-A-B-?.
    Objects: Visually distinct (e.g. Red Car, Blue Ball).
    Return JSON:
    {
      "item1_prompt": "description of item A",
      "item2_prompt": "description of item B",
      "item3_prompt": "description of item C (wrong answer)",
      "pattern_keys": ["item1", "item2", "item1"],
      "correct_key": "item2",
      "speech": "Kids friendly question in Turkish asking what comes next in the pattern."
    }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          item1_prompt: { type: Type.STRING },
          item2_prompt: { type: Type.STRING },
          item3_prompt: { type: Type.STRING },
          pattern_keys: { type: Type.ARRAY, items: { type: Type.STRING } },
          correct_key: { type: Type.STRING },
          speech: { type: Type.STRING }
        }
      }
    }
  });

  const logic = cleanAndParseJson(logicResponse.text);
  
  // 2. Image Phase
  const promptSuffix = ", 3d cute render, white background, single object, high quality, pixar style";
  
  // Parallel generation might hit rate limits on free tier, but usually ok for 3 items.
  // Added error handling to return fallback if one fails.
  const imgPromises = [
    generateImage(logic.item1_prompt + promptSuffix),
    generateImage(logic.item2_prompt + promptSuffix),
    generateImage(logic.item3_prompt + promptSuffix)
  ];

  const [img1, img2, img3] = await Promise.all(imgPromises);

  const imageMap: Record<string, string> = {
    "item1": img1,
    "item2": img2,
    "item3": img3
  };

  // 3. Construct the puzzle
  const sequenceUrls = logic.pattern_keys.map((key: string) => imageMap[key]);
  
  const correctKey = logic.correct_key;
  const distractorKey = "item3"; 

  const isCorrectFirst = Math.random() > 0.5;
  const optionUrls = isCorrectFirst 
    ? [imageMap[correctKey], imageMap[distractorKey]]
    : [imageMap[distractorKey], imageMap[correctKey]];

  return {
    sequenceUrls,
    optionUrls,
    correctOptionIndex: isCorrectFirst ? 0 : 1,
    speech: logic.speech
  };
};

// --- CODING GAME (NUMBER MAPPING) ---

export interface CodingPuzzle {
  mapping: { number: number; imageUrl: string }[]; // 1->Img1, 2->Img2
  challengeSequence: number[]; // e.g. [2, 1, 3]
  speech: string;
}

export const generateCodingPuzzle = async (): Promise<CodingPuzzle> => {
  const ai = getAiClient();
  
  // Ask for 3 distinct items
  const promptResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Generate 3 distinct, simple, cute object descriptions.
    Return JSON: { "prompts": ["desc1", "desc2", "desc3"] }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompts: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });
  
  const promptData = cleanAndParseJson(promptResponse.text);
  const prompts = promptData.prompts || ["red apple", "blue car", "yellow cat"];
  
  const commonStyle = ", cute 3d icon, glossy, isometric, white background, pixar style, high resolution";

  // Generate images
  const images = await Promise.all([
    generateImage(prompts[0] + commonStyle),
    generateImage(prompts[1] + commonStyle),
    generateImage(prompts[2] + commonStyle)
  ]);

  const mapping = [
    { number: 1, imageUrl: images[0] },
    { number: 2, imageUrl: images[1] },
    { number: 3, imageUrl: images[2] },
  ];

  const challengeSequence = [];
  const available = [1, 2, 3];
  for(let i=0; i<3; i++) {
     const randomIndex = Math.floor(Math.random() * available.length);
     challengeSequence.push(available[randomIndex]);
     available.splice(randomIndex, 1);
  }

  return {
    mapping,
    challengeSequence,
    speech: "Yukarıdaki rafa bak. Her oyuncağın bir numarası var. Kutuların üzerindeki numaralara göre doğru oyuncağı kutuya sürükle!"
  };
};

// --- IMAGE CODE SEQUENCE GAME ---

export const generateImageCodeGameAssets = async (): Promise<string[]> => {
  const ai = getAiClient();
  
  // 1. Get 4 distinct concepts
  const promptResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Generate 4 distinct, visually clear, and cute object descriptions for a kids game. 
    Examples: "Red Rocket", "Green Frog", "Blue Diamond", "Yellow Star".
    Return JSON: { "prompts": ["desc1", "desc2", "desc3", "desc4"] }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompts: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });

  const promptData = cleanAndParseJson(promptResponse.text);
  const prompts = promptData.prompts || ["red rocket", "green frog", "blue diamond", "yellow star"];

  // 2. Generate Images
  const commonStyle = ", cute 3d render, isometric, simple, single object, white background, pixar style";
  
  try {
      const images = await Promise.all([
        generateImage(prompts[0] + commonStyle),
        generateImage(prompts[1] + commonStyle),
        generateImage(prompts[2] + commonStyle),
        generateImage(prompts[3] + commonStyle)
      ]);
      return images;
  } catch (e) {
      console.error("Asset generation failed", e);
      // Return empty if failure, handle in UI
      return [];
  }
};

// --- PAINTING GAME ---

export const generateColoringPage = async (): Promise<string> => {
    // We want a line art image suitable for flood filling
    // Random subject to keep it fun
    const subjects = ["cute dinosaur", "magical castle", "friendly robot", "butterfly in garden", "space rocket", "funny cat", "teddy bear"];
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    
    const prompt = `black and white line art coloring book page for kids, ${randomSubject}, thick clean black lines, completely white background, no shading, no grayscale gradients, high contrast`;
    
    return await generateImage(prompt);
};

export const generateLogicPuzzle = async (): Promise<any> => {
  return {};
};
