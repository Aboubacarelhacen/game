import React, { useState, useEffect } from 'react';
import { generateImageCodeGameAssets, speak, stopSpeaking } from '../services/geminiService';

interface ImageCodeGameProps {
  onBack: () => void;
}

const ImageCodeGame: React.FC<ImageCodeGameProps> = ({ onBack }) => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  
  // Game State
  const [targetSequence, setTargetSequence] = useState<number[]>([]); // e.g. [2, 1, 4]
  const [options, setOptions] = useState<number[][]>([]); // e.g. [[2,1,4], [1,2,3], [4,1,2]]
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  // Load Assets Once
  useEffect(() => {
    const initGame = async () => {
      setLoading(true);
      speak("Sıralama oyunu! Bekle, resimleri hazırlıyorum.");
      const assets = await generateImageCodeGameAssets();
      if (assets.length === 4) {
        setImages(assets);
        startNewRound(assets);
      } else {
        speak("Hata oldu, tekrar dene.");
      }
      setLoading(false);
    };

    initGame();
    return () => stopSpeaking();
  }, []);

  const startNewRound = (assets: string[]) => {
    setResult(null);
    
    // 1. Generate Target Sequence (3 random numbers from 1-4)
    const newTarget = [];
    for (let i = 0; i < 3; i++) {
        newTarget.push(Math.floor(Math.random() * 4) + 1);
    }
    setTargetSequence(newTarget);

    // 2. Generate Options
    const opts: number[][] = [];
    // Correct option
    opts.push([...newTarget]);
    
    // 2 Distractors
    while (opts.length < 3) {
        const distractor = [];
        for (let i = 0; i < 3; i++) {
            distractor.push(Math.floor(Math.random() * 4) + 1);
        }
        // Check if unique (simple check)
        const isDuplicate = opts.some(o => o.join('') === distractor.join(''));
        if (!isDuplicate) opts.push(distractor);
    }

    // Shuffle options
    setOptions(opts.sort(() => Math.random() - 0.5));
    
    speak("Resimlere bak. Hangi sayılar doğru?");
  };

  const handleOptionClick = (selectedSequence: number[]) => {
    if (result === "correct") return;

    // Check if arrays match
    const isCorrect = selectedSequence.join('') === targetSequence.join('');

    if (isCorrect) {
      setResult("correct");
      setScore(s => s + 1);
      speak("Harika! Doğru bildin.");
      setTimeout(() => {
        if (score >= 4) {
          // Game Complete logic could go here
          speak("Tebrikler! Oyun bitti.");
          setRound(0);
          setScore(0);
          startNewRound(images);
        } else {
          setRound(r => r + 1);
          startNewRound(images);
        }
      }, 2000);
    } else {
      setResult("wrong");
      speak("Yanlış. Tekrar dene!");
      setTimeout(() => setResult(null), 1000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[3rem] p-4 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-indigo-300 text-white">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-2 z-10 shrink-0">
        <button onClick={() => { stopSpeaking(); onBack(); }} className="bg-white/10 p-3 rounded-full text-2xl hover:bg-white/20 transition-colors">⬅️</button>
        <div className="bg-white/20 px-6 py-2 rounded-full border border-white/30 backdrop-blur-md">
           <h2 className="text-2xl font-black text-white tracking-widest">SIRALAMA</h2>
        </div>
        <div className="text-2xl font-black bg-white/20 w-12 h-12 flex items-center justify-center rounded-full">
           {score}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center gap-4 z-10 overflow-y-auto w-full">
        
        {loading && (
           <div className="flex flex-col items-center justify-center h-full animate-pulse">
             <span className="text-8xl mb-4">🎨</span>
             <p className="text-2xl font-bold">Resimler Çiziliyor...</p>
           </div>
        )}

        {!loading && images.length === 4 && (
            <>
                {/* 1. LEGEND BAR (Top) */}
                <div className="w-full bg-white/10 backdrop-blur-lg rounded-2xl p-3 border border-white/20 flex justify-around md:justify-center md:gap-8 shrink-0">
                    {images.map((img, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2">
                             <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-xl shadow-md p-1">
                                <img src={img} className="w-full h-full object-contain" alt={`Img ${idx+1}`} />
                             </div>
                             <div className="w-10 h-10 rounded-full bg-indigo-800 text-white flex items-center justify-center font-black text-xl shadow-inner border-2 border-indigo-600">
                                {idx + 1}
                             </div>
                        </div>
                    ))}
                </div>

                {/* 2. TARGET SEQUENCE (Center - Images) */}
                <div className="flex-1 flex flex-col justify-center gap-4 py-4 w-full max-w-2xl">
                    <p className="text-center text-indigo-100 font-bold uppercase tracking-wider text-sm">BU RESİMLERİN ŞİFRESİ NE?</p>
                    <div className="flex justify-center gap-4 items-center">
                        {targetSequence.map((num, idx) => (
                            <div key={idx} className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-3xl shadow-2xl p-2 border-b-8 border-indigo-200 animate-float" style={{ animationDelay: `${idx * 100}ms` }}>
                                <img src={images[num - 1]} className="w-full h-full object-contain" alt="Target" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. OPTIONS (Left/Bottom - Numbers) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl pb-4">
                    {options.map((opt, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleOptionClick(opt)}
                            className={`
                                bg-white/90 hover:bg-white rounded-2xl p-4 shadow-lg border-b-8 border-indigo-200 
                                flex justify-center items-center gap-3 transition-transform active:scale-95 active:border-b-0 active:translate-y-2
                                ${result === 'wrong' ? 'shake-animation' : ''}
                            `}
                        >
                            {opt.map((num, nIdx) => (
                                <div key={nIdx} className={`
                                    w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center font-black text-2xl md:text-3xl text-white shadow-md
                                    ${num === 1 ? 'bg-red-400' : 
                                      num === 2 ? 'bg-green-400' : 
                                      num === 3 ? 'bg-blue-400' : 'bg-yellow-400'}
                                `}>
                                    {num}
                                </div>
                            ))}
                        </button>
                    ))}
                </div>

                {/* Result Overlay */}
                {result === "correct" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50 backdrop-blur-sm">
                        <div className="text-center animate-bounce">
                            <span className="text-9xl block mb-4">🌟</span>
                            <h3 className="text-5xl font-black text-yellow-400 drop-shadow-lg">DOĞRU!</h3>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>
      
      <style>{`
        .shake-animation {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
};

export default ImageCodeGame;