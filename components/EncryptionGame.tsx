import React, { useState, useEffect } from 'react';
import { generateBilsemPuzzleWithImages, BilsemPuzzle, speak, stopSpeaking } from '../services/geminiService';

const EncryptionGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [puzzle, setPuzzle] = useState<BilsemPuzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  const loadNewPuzzle = async (firstLoad = false) => {
    setLoading(true);
    setResult(null);
    setPuzzle(null);
    
    speak(firstLoad ? "Şifre oyunu! Bekle çiziyorum." : "Yeni soru geliyor.");
    
    try {
      const newPuzzle = await generateBilsemPuzzleWithImages();
      setPuzzle(newPuzzle);
      setLoading(false);
      speak(newPuzzle.speech);
    } catch (e) {
      console.error(e);
      setLoading(false);
      speak("Hata oldu. Tekrar.");
    }
  };

  useEffect(() => {
    loadNewPuzzle(true);
    return () => {
        stopSpeaking();
    };
  }, []);

  const handleBack = () => {
      stopSpeaking();
      onBack();
  };

  const handleOptionClick = (index: number) => {
    if (!puzzle) return;
    
    if (index === puzzle.correctOptionIndex) {
      setResult("correct");
      speak("Doğru! Harikasın.");
      setTimeout(() => {
        loadNewPuzzle();
      }, 3000);
    } else {
      setResult("wrong");
      speak("Yanlış. Tekrar dene.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/40 backdrop-blur-xl rounded-[3rem] p-6 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-4 border-white">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 z-10">
        <button onClick={handleBack} className="bg-white p-4 rounded-full text-3xl shadow-lg hover:scale-110 transition-transform text-teal-500 border-4 border-teal-100">🔙</button>
        <div className="bg-white/80 px-8 py-3 rounded-full border-2 border-teal-200 shadow-sm">
           <h2 className="text-3xl font-black text-teal-600">Şifre Çöz</h2>
        </div>
        <button onClick={() => loadNewPuzzle()} className="bg-white p-4 rounded-full text-3xl shadow-lg hover:scale-110 transition-transform text-teal-500 border-4 border-teal-100">🔄</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10 overflow-y-auto w-full">
        
        {/* Loading State */}
        {loading && (
          <div className="text-center animate-bounce flex flex-col items-center bg-white/50 p-12 rounded-[3rem]">
            <span className="text-8xl mb-6">🎨</span>
            <p className="text-4xl font-bold text-teal-600">Çiziyorum...</p>
          </div>
        )}

        {/* Puzzle Area */}
        {!loading && puzzle && (
          <div className="w-full flex flex-col items-center">
            {/* The Pattern Board */}
            <div className="bg-white/60 p-6 rounded-[3rem] shadow-xl border-4 border-white w-full max-w-4xl mb-8">
               <div className="flex items-center justify-center gap-4 md:gap-8 overflow-x-auto py-2">
                  {puzzle.sequenceUrls.map((url, index) => (
                    <div key={index} className="flex-shrink-0 w-24 h-24 md:w-36 md:h-36 bg-white rounded-3xl shadow-md p-2 flex items-center justify-center border-b-8 border-teal-100">
                      <img src={url} alt="Item" className="w-full h-full object-contain" />
                    </div>
                  ))}
                  
                  {/* Question Mark */}
                  <div className="flex-shrink-0 w-24 h-24 md:w-36 md:h-36 bg-teal-100 rounded-3xl border-4 border-dashed border-teal-300 flex items-center justify-center animate-pulse">
                    <span className="text-6xl font-black text-teal-400">?</span>
                  </div>
               </div>
            </div>

            {/* Options */}
            <p className="text-2xl font-black text-white drop-shadow-md mb-4">Hangisi Gelecek?</p>
            
            <div className="flex flex-wrap justify-center gap-8">
              {puzzle.optionUrls.map((url, index) => (
                <button 
                  key={index}
                  onClick={() => handleOptionClick(index)}
                  disabled={result === "correct"}
                  className={`
                    w-40 h-40 md:w-52 md:h-52 rounded-[2.5rem] p-4 shadow-xl transition-all duration-300 border-b-8 group relative overflow-hidden bg-white
                    ${result === "correct" && index === puzzle.correctOptionIndex 
                        ? "ring-8 ring-green-400 scale-110 z-20" 
                        : "hover:scale-105 hover:-translate-y-2 border-slate-100 hover:border-slate-200"}
                    ${result === "wrong" && index !== puzzle.correctOptionIndex ? "opacity-50 grayscale" : ""}
                  `}
                >
                  <img src={url} alt="Option" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>

            {/* Celebration */}
            {result === "correct" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                    <div className="text-9xl animate-bounce drop-shadow-2xl">🎉</div>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EncryptionGame;