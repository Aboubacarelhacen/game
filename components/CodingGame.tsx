
import React, { useState, useEffect, useRef } from 'react';
import { generateCodingPuzzle, CodingPuzzle, speak, stopSpeaking } from '../services/geminiService';

const CodingGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [puzzle, setPuzzle] = useState<CodingPuzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [filledSlots, setFilledSlots] = useState<(string | null)[]>([null, null, null]);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  // Drag State
  const [draggingUrl, setDraggingUrl] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{x: number, y: number}>({ x: 0, y: 0 });

  useEffect(() => {
    loadGame(true);
    return () => stopSpeaking();
  }, []);

  const loadGame = async (firstLoad = false) => {
    setLoading(true);
    setPuzzle(null);
    setFilledSlots([null, null, null]);
    setResult(null);

    speak(firstLoad ? "Oyuncağın yerini bul! Rafa bak, sonra kutulara doğru oyuncağı koy." : "Yeni oyuncaklar geliyor!");

    try {
      const data = await generateCodingPuzzle();
      setPuzzle(data);
    } catch (e) {
      speak("Hata oldu.");
    } finally {
      setLoading(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, imageUrl: string) => {
    e.preventDefault();
    setDraggingUrl(imageUrl);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingUrl) {
      setDragPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingUrl || !puzzle) return;

    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const dropZone = elements.find(el => el.getAttribute('data-slot-index'));

    if (dropZone) {
      const idx = parseInt(dropZone.getAttribute('data-slot-index') || '0');
      
      // Update the slot
      const newSlots = [...filledSlots];
      newSlots[idx] = draggingUrl;
      setFilledSlots(newSlots);
      
      speak("Koydum!");
    }
    
    setDraggingUrl(null);
  };

  const checkAnswer = () => {
    if (!puzzle) return;

    const correctImages = puzzle.challengeSequence.map(num => {
       return puzzle.mapping.find(m => m.number === num)?.imageUrl;
    });

    const isCorrect = filledSlots.every((img, idx) => img === correctImages[idx]);

    if (isCorrect) {
      setResult("correct");
      speak("Aferin! Hepsi doğru yerinde.");
      setTimeout(() => loadGame(), 3000);
    } else {
      setResult("wrong");
      speak("Yanlış kutular var. Rafa tekrar bak.");
      setTimeout(() => setResult(null), 2000);
    }
  };

  const isFull = filledSlots.every(s => s !== null);

  return (
    <div 
      className="flex flex-col h-full bg-slate-800/90 backdrop-blur-xl rounded-[3rem] p-4 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-4 border-slate-600 text-white touch-none select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      
      {/* Header */}
      <div className="flex justify-between items-center mb-2 z-10 shrink-0">
        <button onClick={() => { stopSpeaking(); onBack(); }} className="bg-white/10 p-3 rounded-full text-2xl">⬅️</button>
        <div className="bg-slate-700 px-6 py-2 rounded-full border border-slate-500">
           <h2 className="text-2xl font-black text-amber-400">OYUNCAK RAFI</h2>
        </div>
        <button onClick={() => loadGame()} className="bg-white/10 p-3 rounded-full text-2xl">🔄</button>
      </div>

      <div className="flex-1 flex flex-col items-center gap-6 z-10 w-full px-2">
        
        {loading && <div className="text-4xl animate-bounce mt-20">🧸 Hazırlanıyor...</div>}

        {!loading && puzzle && (
            <>
                {/* 1. KEY SHELF (Top) */}
                <div className="w-full max-w-2xl bg-amber-800/50 p-4 rounded-xl border-b-8 border-amber-900 shadow-xl relative">
                    <p className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-amber-900 px-3 py-1 rounded-full text-xs font-black uppercase">DOĞRU YERLER</p>
                    <div className="flex justify-around items-end h-24">
                        {puzzle.mapping.map((item) => (
                            <div key={item.number} className="flex flex-col items-center gap-1">
                                <div className="w-16 h-16 bg-white/10 rounded-lg p-1 flex items-center justify-center mb-1 shadow-lg">
                                    <img src={item.imageUrl} className="w-full h-full object-contain" />
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold border-2 border-slate-600">
                                    {item.number}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. DROP ZONES (Conveyor Belt) */}
                <div className="flex-1 flex flex-col justify-center items-center gap-2 w-full">
                     <div className="text-slate-400 font-bold uppercase text-sm tracking-widest">KUTULARI DOLDUR</div>
                     
                     <div className="flex gap-4 p-6 bg-slate-900/50 rounded-3xl border-x-4 border-slate-700 shadow-inner">
                         {puzzle.challengeSequence.map((num, idx) => (
                             <div key={idx} className="flex flex-col items-center gap-2">
                                 {/* Number Label */}
                                 <span className="text-4xl font-black text-amber-400 drop-shadow-md">{num}</span>
                                 
                                 {/* Box Slot */}
                                 <div 
                                    data-slot-index={idx}
                                    className={`
                                        w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-dashed border-slate-500 bg-slate-800 flex items-center justify-center relative
                                        ${filledSlots[idx] ? 'border-solid border-green-400/50' : ''}
                                    `}
                                 >
                                     {filledSlots[idx] ? (
                                         <img src={filledSlots[idx]!} className="w-full h-full object-contain p-2" />
                                     ) : (
                                         <span className="text-5xl opacity-10">📦</span>
                                     )}
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>

                {/* 3. TOY BOX (Draggables) */}
                <div className="w-full bg-blue-500/10 rounded-t-[2rem] p-4 border-t-4 border-blue-400/30 flex justify-center gap-6 items-center min-h-[120px]">
                    {puzzle.mapping.map((item) => (
                        <div 
                            key={item.number}
                            onPointerDown={(e) => handlePointerDown(e, item.imageUrl)}
                            className="w-20 h-20 bg-white rounded-xl shadow-[0_4px_0_rgba(0,0,0,0.2)] p-2 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform active:scale-95"
                        >
                            <img src={item.imageUrl} className="w-full h-full object-contain pointer-events-none" />
                        </div>
                    ))}
                </div>

                {/* Check Button */}
                <button 
                    onClick={checkAnswer}
                    disabled={!isFull}
                    className={`
                        absolute bottom-32 md:bottom-28 right-4 md:right-10 w-20 h-20 rounded-full font-black text-3xl shadow-xl flex items-center justify-center transition-all
                        ${isFull ? 'bg-green-500 hover:bg-green-400 animate-bounce' : 'bg-slate-600 opacity-50'}
                    `}
                >
                    ✅
                </button>

                {/* Drag Ghost */}
                {draggingUrl && (
                    <div 
                        className="fixed w-24 h-24 pointer-events-none z-50 drop-shadow-2xl"
                        style={{ 
                            left: dragPos.x, 
                            top: dragPos.y, 
                            transform: 'translate(-50%, -50%)' 
                        }}
                    >
                        <img src={draggingUrl} className="w-full h-full object-contain" />
                    </div>
                )}

                {/* Result Overlay */}
                {result === 'correct' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
                        <div className="text-center animate-bounce">
                            <span className="text-8xl">🎉</span>
                            <h2 className="text-5xl font-black text-green-400 mt-4">DOĞRU!</h2>
                        </div>
                    </div>
                )}
                 {result === 'wrong' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
                        <div className="text-center animate-shake">
                            <span className="text-8xl">🤔</span>
                            <h2 className="text-5xl font-black text-red-400 mt-4">TEKRAR DENE</h2>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>
      <style>{`
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
};

export default CodingGame;
