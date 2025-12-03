import React, { useEffect, useRef, useState } from 'react';
import { LiveClient } from '../services/liveClient';

const LiveChat: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const liveClientRef = useRef<LiveClient | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const toggleSession = async () => {
    if (active) {
      liveClientRef.current?.disconnect();
      setActive(false);
    } else {
      setError(null);
      try {
        liveClientRef.current = new LiveClient({
          onAudioData: (buffer) => visualizeAudio(buffer),
          onClose: () => setActive(false),
          onError: (err) => {
            setError(err.message);
            setActive(false);
          }
        });
        await liveClientRef.current.connect();
        setActive(true);
      } catch (e) {
        setError("Mikrofon izni gerekli veya bağlantı hatası.");
        console.error(e);
      }
    }
  };

  // Simple visualizer to show activity
  const visualizeAudio = (buffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#9F7AEA'; // kid-purple
    
    // Draw a simple wave
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[i * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 space-y-8 bg-blue-50 rounded-3xl">
      <h2 className="text-3xl font-black text-kid-blue mb-4">Sihirli Arkadaş</h2>
      
      <div className="relative w-64 h-64 flex items-center justify-center bg-white rounded-full shadow-xl border-8 border-kid-yellow overflow-hidden">
        {active ? (
          <canvas ref={canvasRef} width={256} height={256} className="w-full h-full" />
        ) : (
          <div className="text-8xl">🤖</div>
        )}
      </div>

      <div className="text-center space-y-2">
        <p className="text-gray-600 text-lg">
          {active ? "Seni Dinliyorum..." : "Konuşmak için düğmeye bas!"}
        </p>
        {error && <p className="text-red-500 font-bold">{error}</p>}
      </div>

      <div className="flex gap-4">
        <button 
          onClick={onBack}
          className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-4 px-8 rounded-full text-xl shadow-lg transition-transform hover:scale-105"
        >
          Geri
        </button>
        <button
          onClick={toggleSession}
          className={`${
            active ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
          } text-white font-bold py-4 px-12 rounded-full text-2xl shadow-lg transition-transform hover:scale-105 animate-pulse`}
        >
          {active ? 'Bitir' : 'Başla'}
        </button>
      </div>
    </div>
  );
};

export default LiveChat;