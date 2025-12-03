
import React, { useState, useEffect, useRef } from 'react';
import { speak, stopSpeaking } from '../services/geminiService';

interface RocketPart {
  id: string;
  type: 'nose' | 'body' | 'fins' | 'window';
  icon: string;
  color: string;
  isCorrect: boolean;
}

const RocketGame: React.FC<{ onBack: () => void; heroImage: string | null }> = ({ onBack, heroImage }) => {
  const [parts, setParts] = useState<RocketPart[]>([]);
  const [placedParts, setPlacedParts] = useState<Record<string, boolean>>({
    nose: false,
    body: false,
    fins: false,
    window: false
  });
  
  const [isLaunched, setIsLaunched] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Drag State
  const [draggingPart, setDraggingPart] = useState<RocketPart | null>(null);
  const [dragPos, setDragPos] = useState<{x: number, y: number}>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Init Parts
    const initialParts: RocketPart[] = [
      { id: 'nose1', type: 'nose', icon: '🔺', color: 'text-red-500', isCorrect: true },
      { id: 'body1', type: 'body', icon: '⬜', color: 'text-gray-200', isCorrect: true },
      { id: 'fins1', type: 'fins', icon: '🚀', color: 'text-blue-500', isCorrect: true },
      { id: 'window1', type: 'window', icon: '🔵', color: 'text-sky-300', isCorrect: true },
      // Distractors
      { id: 'nose2', type: 'nose', icon: '🟩', color: 'text-green-500', isCorrect: false },
      { id: 'body2', type: 'body', icon: '🟡', color: 'text-yellow-500', isCorrect: false },
    ];
    setParts(initialParts.sort(() => Math.random() - 0.5));
    
    speak("Roket yapalım! Aşağıdaki parçaları tutup roketin üzerine sürükle.");

    return () => stopSpeaking();
  }, []);

  const handlePointerDown = (e: React.PointerEvent, part: RocketPart) => {
    e.preventDefault(); // Prevent scrolling
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    
    setDraggingPart(part);
    setDragPos({
      x: e.clientX,
      y: e.clientY
    });
    
    speak(part.type === 'nose' ? 'Burun' : part.type === 'body' ? 'Gövde' : part.type === 'window' ? 'Pencere' : 'Kanat');
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingPart) {
        setDragPos({
            x: e.clientX,
            y: e.clientY
        });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingPart) return;

    // Hit Test: Check what is under the finger
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const dropZone = elements.find(el => el.getAttribute('data-zone'));
    
    if (dropZone) {
      const zoneId = dropZone.getAttribute('data-zone');
      
      if (zoneId === draggingPart.type && draggingPart.isCorrect) {
        // Correct Drop
        setPlacedParts(prev => ({ ...prev, [zoneId]: true }));
        setParts(prev => prev.filter(p => p.id !== draggingPart.id));
        speak("Harika! Oldu.");
      } else {
        speak("Oraya uymadı.");
      }
    }
    
    setDraggingPart(null);
  };

  const isComplete = Object.values(placedParts).every(v => v);

  const handleLaunch = () => {
    speak("Ateşlemeye hazırlan! 3... 2... 1...");
    setCountdown(3);
    
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        setCountdown(null);
        setIsLaunched(true);
        speak("Ateşşş! Uzaya gidiyoruz!");
      }
    }, 1000);
  };

  return (
    <div 
      className="flex flex-col h-full bg-slate-900 rounded-[3rem] relative overflow-hidden shadow-2xl border-4 border-slate-700 touch-none select-none"
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      
      {/* Background */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 animate-pulse pointer-events-none"></div>
      <div className="absolute top-10 right-20 text-yellow-100/50 text-6xl animate-spin-slow pointer-events-none">⭐</div>

      {/* Header */}
      <div className="flex justify-between items-center p-6 z-10 pointer-events-none relative">
        <button onClick={() => { stopSpeaking(); onBack(); }} className="bg-white/10 p-3 rounded-full text-2xl pointer-events-auto">🏠</button>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">ROKET YAP</h2>
        <div className="w-12"></div>
      </div>

      {/* Main Game Area */}
      <div className={`flex-1 flex flex-col items-center justify-center relative z-0 w-full transition-transform duration-[4s] ease-in ${isLaunched ? '-translate-y-[150vh]' : ''}`}>
         
         {/* ROCKET STRUCTURE (Drop Zones) */}
         <div className="relative flex flex-col items-center gap-0.5">
            
            {/* Nose Zone */}
            <div 
              data-zone="nose"
              className={`
                w-32 h-24 flex items-center justify-center
                ${placedParts.nose ? '' : 'border-4 border-dashed border-red-500/50 bg-red-500/10 rounded-t-full'}
              `}
            >
              {placedParts.nose ? <span className="text-[6rem] leading-none mb-[-20px] filter drop-shadow-lg">🔺</span> : <span className="opacity-30 text-4xl">?</span>}
            </div>

            {/* Body Zone (Container for Window) */}
            <div className="relative">
                <div 
                  data-zone="body"
                  className={`
                    w-32 h-48 flex items-center justify-center
                    ${placedParts.body ? 'bg-gray-200 rounded-2xl shadow-inner' : 'border-4 border-dashed border-gray-500/50 bg-gray-500/10 rounded-2xl'}
                  `}
                >
                   {!placedParts.body && <span className="opacity-30 text-4xl">?</span>}
                </div>

                {/* Window Zone (Inside Body) */}
                {placedParts.body && (
                    <div 
                        data-zone="window"
                        className={`
                            absolute top-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center overflow-hidden
                            ${placedParts.window ? 'bg-sky-300 border-4 border-sky-200' : 'border-4 border-dashed border-sky-400/50 bg-sky-400/10'}
                        `}
                    >
                         {placedParts.window ? (
                             heroImage ? <img src={heroImage} className="w-full h-full object-cover" /> : <span className="text-3xl">😎</span>
                         ) : null}
                    </div>
                )}
            </div>

            {/* Fins Zone */}
            <div 
              data-zone="fins"
              className={`
                 w-48 h-16 flex items-center justify-center -mt-4 -z-10
                 ${placedParts.fins ? '' : 'border-4 border-dashed border-blue-500/50 bg-blue-500/10 rounded-lg'}
              `}
            >
               {placedParts.fins ? <span className="text-[5rem] text-blue-500 filter drop-shadow-lg">🚀</span> : null}
            </div>

            {/* Fire (Launch Only) */}
            {isLaunched && (
                <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 text-8xl animate-pulse rotate-180 origin-top">🔥</div>
            )}

         </div>

         {/* Launch Button */}
         {isComplete && !isLaunched && !countdown && (
             <button 
                onPointerDown={handleLaunch}
                className="mt-8 bg-gradient-to-r from-red-600 to-orange-500 text-white px-10 py-4 rounded-full font-black text-2xl shadow-[0_0_30px_rgba(234,88,12,0.6)] animate-bounce z-20 pointer-events-auto"
             >
                FIRLAT! 🚀
             </button>
         )}

      </div>

      {/* Parts Tray */}
      {!isLaunched && (
        <div className="h-40 bg-slate-800/90 border-t-4 border-slate-600 p-4 flex gap-4 overflow-x-auto items-center justify-center z-10">
           {parts.map(part => (
             <div
               key={part.id}
               className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center text-5xl cursor-grab touch-none border-2 border-white/20 active:scale-95"
               onPointerDown={(e) => handlePointerDown(e, part)}
             >
               {part.icon}
             </div>
           ))}
        </div>
      )}

      {/* Dragging Ghost */}
      {draggingPart && (
         <div 
           className="fixed pointer-events-none text-7xl z-50 drop-shadow-2xl opacity-90"
           style={{ 
             left: dragPos.x, 
             top: dragPos.y,
             transform: 'translate(-50%, -50%)' 
           }}
         >
           {draggingPart.icon}
         </div>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <span className="text-[12rem] font-black text-white animate-ping">{countdown}</span>
        </div>
      )}
      
      {/* Victory Text */}
      {isLaunched && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <h2 className="text-6xl font-black text-white drop-shadow-[0_4px_0_#000] animate-bounce delay-[3000ms]">İYİ YOLCULUKLAR!</h2>
          </div>
      )}

    </div>
  );
};

export default RocketGame;
