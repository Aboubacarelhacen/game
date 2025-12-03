import React, { useState, useEffect } from 'react';
import { editImage, generateImage, speak } from '../services/geminiService';

interface CharacterCreatorProps {
  onBack: () => void;
  onHeroChange?: (imgUrl: string) => void;
}

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onBack, onHeroChange }) => {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    if (!currentImage) {
      speak("Karakterini seç!");
    }
  }, []);

  const updateHero = (img: string) => {
    setCurrentImage(img);
    if (onHeroChange) {
      onHeroChange(img);
    }
  };

  const handleCreateBase = async (type: string, promptDetails: string) => {
    setLoading(true);
    setLoadingMessage("Çiziyorum...");
    speak(`${type} çiziyorum!`);
    
    try {
      const prompt = `A cute 3D cartoon render of a ${promptDetails}, white background, soft studio lighting, high quality, pixar style, suitable for kids.`;
      const image = await generateImage(prompt);
      updateHero(image);
      speak("İşte geldi! Değiştirmek için düğmelere bas.");
    } catch (e) {
      speak("Hata oldu, tekrar dene.");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (actionName: string, promptAddon: string, successMessage: string) => {
    if (!currentImage) return;
    setLoading(true);
    setLoadingMessage("Yapıyorum...");
    speak(actionName);

    try {
        const response = await fetch(currentImage);
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = async () => {
            const base64data = reader.result as string;
            const base64Content = base64data.split(',')[1];
            
            try {
                const fullPrompt = `Modify this image: ${promptAddon}. Keep the character consistent, cute, 3d render style, white background.`;
                const newImage = await editImage(base64Content, fullPrompt);
                updateHero(newImage);
                speak(successMessage);
            } catch (err) {
                speak("Yapamadım.");
            } finally {
                setLoading(false);
            }
        };
        reader.readAsDataURL(blob);

    } catch (e) {
        setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentImage(null);
    speak("Başa dönüyoruz!");
  };

  return (
    <div className="flex flex-col h-full bg-white/40 backdrop-blur-xl rounded-[3rem] p-4 md:p-8 overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-4 border-white">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 z-10">
        <button onClick={onBack} className="bg-white p-4 rounded-full text-3xl shadow-lg hover:scale-110 transition-transform text-orange-500 border-4 border-orange-100 hover:rotate-12">🔙</button>
        <h2 className="text-3xl md:text-4xl font-black text-orange-500 bg-white/80 px-8 py-3 rounded-full shadow-sm border-2 border-orange-200">Karakter Yap</h2>
        <button onClick={handleReset} className="bg-white p-4 rounded-full text-3xl shadow-lg hover:scale-110 transition-transform text-orange-500 border-4 border-orange-100 hover:-rotate-12">🔄</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10 overflow-y-auto w-full">
        
        {/* Step 1: Selection */}
        {!currentImage && !loading && (
          <div className="grid grid-cols-2 gap-4 md:gap-8 w-full max-w-4xl h-full content-center">
             <HeroOption 
                emoji="🤖" 
                label="Robot" 
                color="bg-slate-200 text-slate-700 border-slate-300"
                onClick={() => handleCreateBase("Robot", "cute friendly robot, shiny metal, round shapes")} 
             />
             <HeroOption 
                emoji="🐱" 
                label="Hayvan" 
                color="bg-orange-200 text-orange-700 border-orange-300"
                onClick={() => handleCreateBase("Hayvan Dost", "cute fluffy animal friend character, puppy or kitten style, standing on two legs, friendly face")} 
             />
             <HeroOption 
                emoji="🦄" 
                label="Sihir" 
                color="bg-purple-200 text-purple-700 border-purple-300"
                onClick={() => handleCreateBase("Sihirli Yaratık", "cute magical creature, colorful unicorn or small dragon, sparkling, fantasy style")} 
             />
             <HeroOption 
                emoji="🦸" 
                label="Süper" 
                color="bg-blue-200 text-blue-700 border-blue-300"
                onClick={() => handleCreateBase("Süper Kahraman", "cute superhero kid, cape and mask, brave pose, comic book style")} 
             />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center animate-pulse py-20 bg-white/60 rounded-[3rem] p-12">
            <div className="text-9xl mb-8 animate-spin">🌀</div>
            <p className="text-4xl font-black text-orange-500">{loadingMessage}</p>
          </div>
        )}

        {/* Step 2: Display & Edit */}
        {currentImage && !loading && (
          <div className="flex flex-col md:flex-row items-center gap-6 w-full h-full pb-4">
            
            {/* Image Preview */}
            <div className="flex-1 w-full h-full bg-gradient-to-b from-white to-orange-50 rounded-[2.5rem] shadow-inner border-4 border-orange-100 p-8 flex items-center justify-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-orange-50/50 to-transparent"></div>
               <img src={currentImage} alt="Karakter" className="max-h-full max-w-full object-contain drop-shadow-2xl z-10 hover:scale-105 transition-transform duration-500" />
            </div>

            {/* Controls */}
            <div className="w-full md:w-80 bg-white/60 p-4 rounded-[2.5rem] border-4 border-white/50 flex flex-col gap-3 h-auto max-h-full overflow-y-auto custom-scrollbar">
              <p className="text-center text-2xl font-black text-orange-400 mb-2">Değiştir</p>
              
              <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                <EditButton emoji="🦒" label="Uzun Boyun" color="bg-yellow-200 text-yellow-800" onClick={() => handleEdit("Boynunu Uzat", "make the neck very long like a giraffe", "Boynu uzadı!")} />
                <EditButton emoji="💜" label="Mor Yap" color="bg-purple-200 text-purple-800" onClick={() => handleEdit("Mor Yap", "change color to purple", "Mor oldu!")} />
                <EditButton emoji="🕶️" label="Gözlük" color="bg-green-200 text-green-800" onClick={() => handleEdit("Gözlük Tak", "add cool sunglasses", "Gözlük takıldı!")} />
                <EditButton emoji="🔥" label="Alev" color="bg-red-200 text-red-800" onClick={() => handleEdit("Alev Ekle", "add fire effects", "Yandı buralar!")} />
                <EditButton emoji="🦋" label="Kanat" color="bg-blue-200 text-blue-800" onClick={() => handleEdit("Kanat Ekle", "add fairy wings", "Uçabilir artık!")} />
                <EditButton emoji="👑" label="Taç" color="bg-amber-200 text-amber-800" onClick={() => handleEdit("Taç Tak", "add a gold king crown", "Kral oldu!")} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const HeroOption: React.FC<{ emoji: string, label: string, color: string, onClick: () => void }> = ({ emoji, label, color, onClick }) => (
  <button 
    onClick={onClick} 
    className={`${color} h-40 md:h-56 rounded-[2.5rem] flex flex-col items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.1)] border-b-8 hover:translate-y-1 hover:border-b-4 active:border-b-0 active:translate-y-2 transition-all group`}
  >
    <span className="text-6xl md:text-8xl mb-2 group-hover:scale-110 transition-transform">{emoji}</span>
    <span className="text-2xl md:text-3xl font-black">{label}</span>
  </button>
);

const EditButton: React.FC<{ emoji: string, label: string, color: string, onClick: () => void }> = ({ emoji, label, color, onClick }) => (
  <button 
    onClick={onClick}
    className={`${color} p-4 rounded-2xl font-bold text-xl shadow-sm border-b-4 border-black/10 hover:border-b-2 hover:translate-y-[2px] active:border-b-0 active:translate-y-[4px] transition-all flex items-center gap-3`}
  >
    <span className="text-3xl">{emoji}</span>
    <span>{label}</span>
  </button>
);

export default CharacterCreator;