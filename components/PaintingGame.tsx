import React, { useRef, useState, useEffect } from 'react';
import { generateColoringPage, speak, stopSpeaking } from '../services/geminiService';

const PaintingGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>('#FF6B6B'); // Default color
  const [isFinished, setIsFinished] = useState(false);

  const colors = [
    '#FF6B6B', // Red/Pink
    '#4ECDC4', // Teal
    '#FFE66D', // Yellow
    '#95E1D3', // Mint
    '#A8D0E6', // Light Blue
    '#F7D794', // Peach
    '#778BEB', // Blue
    '#CF6A87', // Rose
    '#F8A5C2', // Pink
    '#E77F67', // Orange
  ];

  useEffect(() => {
    loadNewPage();
    return () => stopSpeaking();
  }, []);

  const loadNewPage = async () => {
    setLoading(true);
    setIsFinished(false);
    speak("Boyama zamanı! İstediğin rengi seç ve dokun.");
    try {
      const img = await generateColoringPage();
      setImageSrc(img);
    } catch (e) {
      speak("Bir hata oldu, tekrar dene.");
    } finally {
      setLoading(false);
    }
  };

  // Draw image to canvas when loaded
  useEffect(() => {
    if (imageSrc && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        // We set fixed canvas size for simplicity in pixel manipulation
        canvas.width = 512;
        canvas.height = 512;
        ctx?.drawImage(img, 0, 0, 512, 512);
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  // --- FLOOD FILL ALGORITHM ---
  const floodFill = (startX: number, startY: number, fillColor: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Convert hex color to RGB
    const r = parseInt(fillColor.slice(1, 3), 16);
    const g = parseInt(fillColor.slice(3, 5), 16);
    const b = parseInt(fillColor.slice(5, 7), 16);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Get starting pixel color
    const startPos = (startY * canvas.width + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    
    // Don't fill if color is same or if clicking on black lines (threshold)
    // Assuming lines are dark (< 100 brightness)
    if ((startR < 100 && startG < 100 && startB < 100)) {
        speak("Çizgileri boyama, boşlukları boya!");
        return;
    }
    
    // Check if we are filling with the same color
    if (startR === r && startG === g && startB === b) return;

    const stack = [[startX, startY]];
    
    while (stack.length) {
      const [x, y] = stack.pop()!;
      const pos = (y * canvas.width + x) * 4;
      
      // Check boundaries and color match (with tolerance for JPEG artifacts)
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      
      // Simple color distance check
      const currentR = data[pos];
      const currentG = data[pos + 1];
      const currentB = data[pos + 2];
      
      const diff = Math.abs(currentR - startR) + Math.abs(currentG - startG) + Math.abs(currentB - startB);
      
      if (diff < 50) { // Tolerance threshold
        data[pos] = r;
        data[pos + 1] = g;
        data[pos + 2] = b;
        data[pos + 3] = 255; // Alpha
        
        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isFinished) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    // Play tap sound effect logic (simulated with TTS short msg or silence)
    // For now, just fill
    floodFill(x, y, selectedColor);
  };

  const handleDone = () => {
      setIsFinished(true);
      speak("Harika! Sen gerçek bir ressamsın!");
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-yellow-100 to-orange-100 rounded-[3rem] p-4 relative overflow-hidden shadow-2xl border-4 border-orange-200">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-2 z-10 shrink-0">
        <button onClick={() => { stopSpeaking(); onBack(); }} className="bg-white p-3 rounded-full text-2xl hover:scale-110 transition-transform shadow-lg border-2 border-orange-200">🏠</button>
        <div className="bg-white/80 px-6 py-2 rounded-full border border-orange-200 shadow-sm">
           <h2 className="text-2xl font-black text-orange-500 tracking-widest">BOYAMA</h2>
        </div>
        <button 
            onClick={loadNewPage} 
            className="bg-white p-3 rounded-full text-2xl hover:scale-110 transition-transform shadow-lg border-2 border-orange-200 text-red-500"
            title="Sıfırla"
        >
            🔄
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 z-10 w-full relative">
        
        {loading ? (
            <div className="flex flex-col items-center animate-bounce">
                <span className="text-8xl">🎨</span>
                <p className="text-2xl font-bold text-orange-400 mt-4">Resim Çiziliyor...</p>
            </div>
        ) : (
            <>
                {/* Canvas Container */}
                <div className={`
                    relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-white
                    ${isFinished ? 'scale-90 transition-transform duration-1000 ring-8 ring-yellow-400' : ''}
                `}>
                    <canvas 
                        ref={canvasRef}
                        className="w-full h-full max-h-[50vh] touch-none cursor-crosshair"
                        onClick={handleCanvasClick}
                        style={{ maxWidth: '512px' }}
                    />
                    
                    {/* Celebration Overlay */}
                    {isFinished && (
                         <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                             <div className="text-9xl animate-ping opacity-50">✨</div>
                         </div>
                    )}
                </div>

                {/* Controls (Hidden if finished) */}
                {!isFinished && (
                    <div className="w-full flex flex-col gap-4 items-center animate-slide-up">
                        {/* Done Button */}
                        <button 
                            onClick={handleDone}
                            className="bg-green-500 hover:bg-green-400 text-white py-3 px-12 rounded-full font-black text-2xl shadow-xl transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <span>BİTTİ!</span> ✅
                        </button>

                        {/* Color Palette */}
                        <div className="w-full max-w-2xl bg-white/50 backdrop-blur-sm p-4 rounded-2xl flex gap-4 overflow-x-auto custom-scrollbar justify-start md:justify-center border border-white/40">
                            {colors.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    className={`
                                        w-16 h-16 rounded-full shrink-0 shadow-md transition-all border-4 
                                        ${selectedColor === color ? 'border-black scale-110' : 'border-white hover:scale-105'}
                                    `}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Finished State Controls */}
                {isFinished && (
                    <div className="flex gap-4 animate-bounce">
                        <button 
                            onClick={loadNewPage}
                            className="bg-blue-500 text-white py-4 px-8 rounded-2xl font-bold text-xl shadow-xl hover:bg-blue-400"
                        >
                            YENİ RESİM 🖌️
                        </button>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default PaintingGame;