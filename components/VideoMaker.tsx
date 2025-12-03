import React, { useState, useEffect } from 'react';
import { generateVideo, speak } from '../services/geminiService';

const VideoMaker: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [prompt, setPrompt] = useState("");
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [needsApiKey, setNeedsApiKey] = useState(false);

  useEffect(() => {
    // Check if API key is selected for Veo
    if (window.aistudio) {
        window.aistudio.hasSelectedApiKey().then(hasKey => {
            if (!hasKey) {
                setNeedsApiKey(true);
            }
        });
    }
  }, []);

  const handleSelectKey = async () => {
      if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setNeedsApiKey(false);
      }
  };

  const handleCreate = async () => {
    if (!prompt) return;
    setLoading(true);
    setVideoUri(null);
    setStatus("Film çekiliyor...");
    speak("Motor! Film çekiliyor, biraz uzun sürebilir.");

    try {
      const uri = await generateVideo(`Cartoon style, for kids, ${prompt}`);
      if (uri) {
        setVideoUri(uri);
        setStatus("");
        speak("Film bitti! İyi seyirler.");
      } else {
        setStatus("Olmadı.");
        speak("Bir sorun oldu.");
      }
    } catch (e) {
      setStatus("Hata.");
      speak("Hata oldu.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (text: string) => {
      setPrompt(text);
      speak(`Konu: ${text}`);
  };

  if (needsApiKey) {
      return (
        <div className="flex flex-col h-full bg-slate-900 rounded-[3rem] p-6 text-white items-center justify-center relative shadow-2xl border-4 border-slate-700">
             <div className="bg-slate-800 p-8 rounded-3xl border-2 border-slate-600 text-center max-w-md w-full">
                 <h2 className="text-3xl font-black text-pink-500 mb-4">Anahtar Gerekli 🔑</h2>
                 <p className="text-lg text-slate-300 mb-6">Video oluşturmak için özel bir anahtar seçmelisin.</p>
                 
                 <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleSelectKey}
                        className="bg-pink-600 hover:bg-pink-500 text-white py-4 px-6 rounded-xl font-bold text-xl shadow-lg transition-transform active:scale-95"
                    >
                        Anahtar Seç
                    </button>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-400 underline text-sm">
                        Bilgi Al
                    </a>
                    <button onClick={onBack} className="text-slate-500 hover:text-white mt-2 font-bold">
                        Geri Dön
                    </button>
                 </div>
             </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-[3rem] p-6 text-white overflow-hidden relative shadow-2xl border-4 border-slate-700">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 z-10">
        <button onClick={onBack} className="bg-white/10 p-4 rounded-full text-2xl hover:bg-white/20 transition-colors">⬅️</button>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 tracking-wider">SİNEMA</h2>
        <div className="w-12"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start gap-6 z-10 overflow-y-auto px-2">
        
        {/* Screen */}
        <div className="w-full max-w-3xl aspect-video bg-black rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(236,72,153,0.3)] flex items-center justify-center relative border-8 border-slate-800 ring-4 ring-slate-900">
          {loading ? (
            <div className="text-center">
              <div className="text-7xl mb-4 animate-spin">📽️</div>
              <p className="text-2xl font-bold text-pink-500 animate-pulse">{status}</p>
            </div>
          ) : videoUri ? (
            <video src={videoUri} controls autoPlay loop className="w-full h-full object-contain" />
          ) : (
            <div className="text-white/20 text-center">
              <span className="text-8xl">🎬</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="w-full max-w-2xl bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
             <div className="flex gap-4">
               <input
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 placeholder="Ne izlemek istersin?"
                 className="flex-1 p-4 bg-black/40 border-2 border-white/10 rounded-2xl focus:border-pink-500 text-lg text-white placeholder-white/30"
               />
               <button
                 onClick={handleCreate}
                 disabled={loading || !prompt}
                 className="bg-pink-600 hover:bg-pink-500 text-white px-8 rounded-2xl font-black text-xl shadow-lg disabled:opacity-50 transition-transform active:scale-95"
               >
                 ÇEK!
               </button>
             </div>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap justify-center gap-3">
             <PresetButton label="🐶 Uzaylı Köpek" onClick={() => handlePreset("Uzayda uçan sevimli bir köpek")} />
             <PresetButton label="🦖 Dinozor" onClick={() => handlePreset("Ormanda koşan dinozor")} />
             <PresetButton label="🐠 Balıklar" onClick={() => handlePreset("Deniz altında balıklar")} />
             <PresetButton label="🚀 Roket" onClick={() => handlePreset("Uzaya giden renkli roket")} />
        </div>
      </div>
    </div>
  );
};

const PresetButton: React.FC<{ label: string, onClick: () => void }> = ({ label, onClick }) => (
  <button 
    onClick={onClick} 
    className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-3 rounded-2xl font-bold transition-all border-b-4 border-slate-900 active:border-b-0 active:translate-y-1"
  >
    {label}
  </button>
);

export default VideoMaker;