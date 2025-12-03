import React, { useState } from 'react';
import { AppView } from './types';
import EncryptionGame from './components/EncryptionGame';
import CodingGame from './components/CodingGame';
import ImageCodeGame from './components/ImageCodeGame';
import CharacterCreator from './components/CharacterCreator';
import PaintingGame from './components/PaintingGame';
import BalloonGame from './components/BalloonGame';
import RocketGame from './components/RocketGame';
import { speak } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [hasStarted, setHasStarted] = useState(false);
  const [heroImage, setHeroImage] = useState<string | null>(null);

  const startGame = () => {
    setHasStarted(true);
    speak("Merhaba! Oynamak için bir ada seç!");
  };

  const handleMenuClick = (targetView: AppView, description: string) => {
    // Speak immediately
    speak(description);
    setView(targetView);
  };

  const renderContent = () => {
    switch (view) {
      case AppView.ENCRYPTION_GAME:
        return <EncryptionGame onBack={() => setView(AppView.HOME)} />;
      case AppView.CODING_GAME:
        return <CodingGame onBack={() => setView(AppView.HOME)} />;
      case AppView.IMAGE_CODE_GAME:
        return <ImageCodeGame onBack={() => setView(AppView.HOME)} />;
      case AppView.CHARACTER_MAKER:
        return (
          <CharacterCreator 
            onBack={() => setView(AppView.HOME)} 
            onHeroChange={(img) => setHeroImage(img)}
          />
        );
      case AppView.PAINTING_GAME:
        return <PaintingGame onBack={() => setView(AppView.HOME)} />;
      case AppView.BALLOON_GAME:
        return <BalloonGame onBack={() => setView(AppView.HOME)} />;
      case AppView.ROCKET_GAME:
        return <RocketGame onBack={() => setView(AppView.HOME)} heroImage={heroImage} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full relative z-10 w-full">
            <header className="text-center mb-8 mt-4 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[150%] bg-white/20 blur-3xl rounded-full -z-10 animate-pulse-slow"></div>
              <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.2)] tracking-wide font-sans animate-float">
                Sihirli Kutu
              </h1>
              <div className="mt-4 inline-block bg-white/90 px-8 py-2 rounded-full shadow-lg transform -rotate-2">
                <p className="text-xl text-pink-500 font-bold">
                  Oyun Zamanı! 🎈
                </p>
              </div>
            </header>

            {/* Floating Islands Menu */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center justify-center w-full max-w-6xl px-4 py-4 perspective-1000">
              
              <FloatingIsland 
                title="Şifre" 
                icon="🔐" 
                colorClass="bg-gradient-to-br from-emerald-300 to-teal-400"
                delay="delay-0"
                onClick={() => handleMenuClick(AppView.ENCRYPTION_GAME, "Şifre Çözme oyunu açılıyor.")}
              />

              <FloatingIsland 
                title="Kodlama" 
                icon="🔢" 
                colorClass="bg-gradient-to-br from-indigo-300 to-blue-500"
                delay="delay-75"
                onClick={() => handleMenuClick(AppView.CODING_GAME, "Kodlama oyunu açılıyor. Sayıları resimlere çevir!")}
              />
              
              <FloatingIsland 
                title="Sıralama" 
                icon="🧩" 
                colorClass="bg-gradient-to-br from-indigo-400 to-purple-500"
                delay="delay-100"
                onClick={() => handleMenuClick(AppView.IMAGE_CODE_GAME, "Sıralama oyunu açılıyor. Resimlerin şifresini bul!")}
              />

              <FloatingIsland 
                title="Karakter" 
                icon="🦸" 
                colorClass="bg-gradient-to-br from-amber-300 to-orange-400"
                delay="delay-150"
                onClick={() => handleMenuClick(AppView.CHARACTER_MAKER, "Karakter Yapma oyunu açılıyor.")}
              />

              <FloatingIsland 
                title="Boyama" 
                icon="🎨" 
                colorClass="bg-gradient-to-br from-pink-300 to-rose-400"
                delay="delay-200"
                onClick={() => handleMenuClick(AppView.PAINTING_GAME, "Sihirli Boyama Odası açılıyor.")}
              />

              <FloatingIsland 
                title="Balon" 
                icon="🎈" 
                colorClass="bg-gradient-to-br from-sky-300 to-cyan-400"
                delay="delay-300"
                onClick={() => handleMenuClick(AppView.BALLOON_GAME, "Balon Patlatmaca açılıyor! Balonları yakala.")}
              />

              <FloatingIsland 
                title="Roket" 
                icon="🚀" 
                colorClass="bg-gradient-to-br from-red-400 to-orange-500"
                delay="delay-500"
                onClick={() => handleMenuClick(AppView.ROCKET_GAME, "Roket yapımı başlıyor! Uzaya çıkmaya hazır mısın?")}
              />

            </div>
            
            <footer className="absolute bottom-4 text-white/80 font-bold text-sm tracking-wider drop-shadow-md">
               Gemini 2.5 ile yapıldı ✨
            </footer>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#A5D8FF] via-[#E4C1F9] to-[#FFC8DD] overflow-hidden relative font-sans selection:bg-pink-300 text-slate-800">
      
      {/* Dynamic Background Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-purple-300/30 rounded-full mix-blend-multiply filter blur-[80px] animate-blob"></div>
      <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-yellow-300/30 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[50vw] h-[50vw] bg-pink-300/30 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-4000"></div>

      {/* Main Content Area */}
      <div className="w-full h-screen relative">
          
          {!hasStarted ? (
            // Start Screen
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/10 backdrop-blur-md">
              <div className="bg-white p-12 rounded-[4rem] shadow-[0_20px_60px_-15px_rgba(255,105,180,0.4)] flex flex-col items-center animate-float border-8 border-pink-100 max-w-lg w-full mx-4">
                <span className="text-9xl mb-6 animate-bounce">🎪</span>
                <h1 className="text-5xl font-black text-slate-700 mb-8 text-center leading-tight">Hoş Geldin!</h1>
                <button 
                  onClick={startGame}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-4xl font-black py-6 rounded-full shadow-xl hover:scale-105 transition-all duration-300 hover:shadow-pink-500/40 active:scale-95 group"
                >
                  <span className="group-hover:animate-pulse inline-block">OYNA ▶</span>
                </button>
              </div>
            </div>
          ) : (
             // App Content
             <div className="w-full h-full flex flex-col p-4 md:p-6">
                 {renderContent()}
             </div>
          )}

      </div>
    </div>
  );
};

interface IslandProps {
  title: string;
  icon: string;
  colorClass: string;
  delay: string;
  onClick: () => void;
  isCenter?: boolean;
}

const FloatingIsland: React.FC<IslandProps> = ({ title, icon, colorClass, delay, onClick, isCenter }) => (
  <button 
    onClick={onClick}
    className={`
      w-32 h-32 md:w-44 md:h-44 z-10
      ${colorClass}
      rounded-[2.5rem] 
      shadow-[0_20px_50px_rgba(0,0,0,0.15)] 
      border-4 border-white/40
      transform transition-all duration-500 
      hover:scale-110 hover:-translate-y-4 hover:shadow-[0_30px_60px_rgba(0,0,0,0.2)] hover:border-white/80
      active:scale-95 active:rotate-2
      flex flex-col items-center justify-center gap-2
      group relative overflow-hidden
      ${delay}
      animate-float
    `}
  >
    {/* Shine effect */}
    <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-white/30 to-transparent rotate-45 pointer-events-none"></div>

    <span className="text-4xl md:text-6xl drop-shadow-md group-hover:scale-110 transition-transform duration-300">{icon}</span>
    <h3 className="text-base md:text-2xl font-black text-white drop-shadow-sm tracking-wide">{title}</h3>
  </button>
);

export default App;