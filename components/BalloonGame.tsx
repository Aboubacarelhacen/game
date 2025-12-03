import React, { useState, useEffect, useRef } from 'react';
import { speak, stopSpeaking } from '../services/geminiService';

interface Balloon {
  id: number;
  color: string; // 'red', 'blue', 'yellow', 'green', 'purple'
  colorName: string; // Turkish name
  x: number; // percentage
  y: number; // percentage
  speed: number;
  popped: boolean;
  scale: number;
}

const COLORS = [
  { id: 'red', name: 'Kırmızı', class: 'bg-red-500 shadow-red-500/50' },
  { id: 'blue', name: 'Mavi', class: 'bg-blue-500 shadow-blue-500/50' },
  { id: 'yellow', name: 'Sarı', class: 'bg-yellow-400 shadow-yellow-400/50' },
  { id: 'green', name: 'Yeşil', class: 'bg-green-500 shadow-green-500/50' },
  { id: 'purple', name: 'Mor', class: 'bg-purple-500 shadow-purple-500/50' },
];

const BalloonGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [level, setLevel] = useState(1);
  const [targetTask, setTargetTask] = useState<{ colorId: string, count: number, popped: number } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const reqRef = useRef<number>(0);
  
  // Game Loop for Floating Animation
  useEffect(() => {
    const update = () => {
      setBalloons(prev => prev.map(b => {
        if (b.popped) return b;
        let newY = b.y - b.speed;
        // Reset to bottom if it goes off top, unless level is ending
        if (newY < -20) newY = 120;
        return { ...b, y: newY };
      }));
      reqRef.current = requestAnimationFrame(update);
    };
    reqRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(reqRef.current);
  }, []);

  // Level Management
  useEffect(() => {
    startLevel(level);
    return () => stopSpeaking();
  }, [level]);

  const startLevel = (lvl: number) => {
    setShowCelebration(false);
    
    // Generate Task
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const count = Math.min(2 + Math.floor(lvl / 2), 5); // Increase count slowly
    setTargetTask({ colorId: randomColor.id, count, popped: 0 });

    // Generate Balloons
    // Ensure we have enough of the target color
    const newBalloons: Balloon[] = [];
    const totalBalloons = 8 + lvl; // More balloons as levels go up
    
    // Add required target balloons
    for (let i = 0; i < count; i++) {
        newBalloons.push(createBalloon(randomColor));
    }
    // Add distractors
    for (let i = count; i < totalBalloons; i++) {
        const distColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        newBalloons.push(createBalloon(distColor));
    }

    // Shuffle
    setBalloons(newBalloons.sort(() => Math.random() - 0.5));

    // Audio Instruction
    setTimeout(() => {
        speak(`Seviye ${lvl}. ${count} tane ${randomColor.name} balon patlat!`);
    }, 500);
  };

  const createBalloon = (colorObj: typeof COLORS[0]): Balloon => ({
    id: Math.random(),
    color: colorObj.id,
    colorName: colorObj.name,
    x: Math.random() * 80 + 10, // 10% to 90% width
    y: 100 + Math.random() * 50, // Start below screen
    speed: 0.1 + Math.random() * 0.15,
    popped: false,
    scale: 0.8 + Math.random() * 0.4
  });

  const handlePop = (balloon: Balloon) => {
    if (!targetTask || balloon.popped) return;

    if (balloon.color === targetTask.colorId) {
       // Correct Pop
       const newPoppedCount = targetTask.popped + 1;
       setTargetTask({ ...targetTask, popped: newPoppedCount });
       
       // Pop visual
       setBalloons(prev => prev.map(b => b.id === balloon.id ? { ...b, popped: true } : b));
       
       // Check Win
       if (newPoppedCount >= targetTask.count) {
           speak("Harikasın! Hepsini buldun.");
           setShowCelebration(true);
           setTimeout(() => {
               setLevel(l => l + 1);
           }, 3000);
       } else {
           // Encouragement for intermediate pops
           // speak(`${newPoppedCount}!`); // Optional: count aloud
       }

    } else {
       // Wrong Pop
       speak(`Hayır, o ${COLORS.find(c => c.id === balloon.color)?.name}. Bana ${COLORS.find(c => c.id === targetTask.colorId)?.name} lazım.`);
    }
  };

  const getColorClass = (id: string) => COLORS.find(c => c.id === id)?.class || 'bg-gray-500';

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-300 to-sky-100 rounded-[3rem] p-4 relative overflow-hidden shadow-2xl border-4 border-sky-400">
      
      {/* Background Clouds */}
      <div className="absolute top-10 left-10 text-white/40 text-9xl animate-pulse">☁️</div>
      <div className="absolute top-40 right-20 text-white/30 text-8xl animate-pulse delay-700">☁️</div>

      {/* Header / Task Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-4 bg-white/30 backdrop-blur-md px-8 py-2 rounded-full border border-white/50 shadow-lg">
         {targetTask && (
             <div className="flex items-center gap-2">
                 <span className="text-3xl font-black text-slate-700">{targetTask.popped} / {targetTask.count}</span>
                 <div className={`w-8 h-8 rounded-full border-2 border-white ${getColorClass(targetTask.colorId)}`}></div>
             </div>
         )}
      </div>

      <button onClick={() => { stopSpeaking(); onBack(); }} className="absolute top-4 left-4 z-50 bg-white p-3 rounded-full text-2xl hover:scale-110 transition-transform shadow-lg border-2 border-sky-200">
        🏠
      </button>

      {/* Balloons Container */}
      <div className="absolute inset-0 z-10 pointer-events-none">
         {balloons.map(balloon => (
             !balloon.popped && (
                 <div 
                    key={balloon.id}
                    onClick={(e) => {
                        e.stopPropagation(); // prevent background clicks
                        handlePop(balloon);
                    }}
                    className={`
                        absolute cursor-pointer pointer-events-auto transition-transform active:scale-95 hover:brightness-110
                        w-24 h-32 rounded-full shadow-lg border-b-8 border-black/10
                        flex items-center justify-center
                        ${getColorClass(balloon.color)}
                    `}
                    style={{ 
                        left: `${balloon.x}%`, 
                        top: `${balloon.y}%`,
                        transform: `scale(${balloon.scale})`
                    }}
                 >
                    {/* Balloon Shine */}
                    <div className="absolute top-4 left-4 w-6 h-10 bg-white/30 rounded-full rotate-[30deg]"></div>
                    {/* String */}
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-white/50"></div>
                 </div>
             )
         ))}
      </div>

      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
             <div className="text-center animate-bounce">
                 <div className="text-9xl mb-4">🎈</div>
                 <h2 className="text-5xl font-black text-white drop-shadow-lg">HARİKA!</h2>
             </div>
        </div>
      )}
      
      {/* Hero Character at bottom */}
      <div className="absolute bottom-[-2rem] left-1/2 -translate-x-1/2 w-48 h-48 z-20 animate-bounce-slow opacity-90 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => targetTask && speak(`${targetTask.count} tane ${COLORS.find(c => c.id === targetTask.colorId)?.name} patlat.`)}>
         <span className="text-[10rem]">🦁</span>
      </div>

    </div>
  );
};

export default BalloonGame;
