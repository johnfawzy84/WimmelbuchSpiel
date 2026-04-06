import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  RefreshCw, 
  Trophy, 
  Music, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Sparkles,
  Loader2,
  HelpCircle,
  Type as TypeIcon,
  ImageIcon,
  LayoutGrid
} from "lucide-react";
import confetti from "canvas-confetti";
import { 
  generateHiddenPicture, 
  analyzeImageForObjects, 
  generateBackgroundMusic, 
  HiddenObject 
} from "../services/gemini";

const THEMES = [
  "Underwater Kingdom",
  "Enchanted Forest",
  "Space Station Party",
  "Dinosaur Jungle",
  "Magical Candy Land",
  "Pirate Island Treasure",
  "Robot Workshop",
  "Toy Store at Night"
];

type DisplayMode = "text" | "figure" | "both";

function ObjectSnippet({ imageUrl, boundingBox }: { imageUrl: string, boundingBox: number[] }) {
  const [ymin, xmin, ymax, xmax] = boundingBox;
  const w = xmax - xmin;
  const h = ymax - ymin;
  
  // Calculate scale and position to zoom into the bounding box
  const scaleX = 1000 / w;
  const scaleY = 1000 / h;
  
  return (
    <div className="w-14 h-14 rounded-xl border-2 border-white shadow-sm bg-gray-100 overflow-hidden relative shrink-0">
      <img 
        src={imageUrl} 
        alt="Object snippet"
        className="absolute max-w-none"
        style={{
          width: `${scaleX * 100}%`,
          height: `${scaleY * 100}%`,
          left: `${-(xmin / 1000) * scaleX * 100}%`,
          top: `${-(ymin / 1000) * scaleY * 100}%`,
        }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export default function HiddenPictureGame() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [objects, setObjects] = useState<HiddenObject[]>([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showHint, setShowHint] = useState<string | null>(null);
  const [foundCount, setFoundCount] = useState(0);
  const [currentTheme, setCurrentTheme] = useState(THEMES[0]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("both");
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const startNewGame = async () => {
    setLoading(true);
    setFoundCount(0);
    setShowHint(null);
    
    const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
    setCurrentTheme(theme);
    
    try {
      setLoadingMessage("🎨 Painting a magical world...");
      const img = await generateHiddenPicture(theme);
      setImageUrl(img);
      
      setLoadingMessage("🔍 Hiding secret objects...");
      const foundObjects = await analyzeImageForObjects(img);
      setObjects(foundObjects);
      
      if (!musicUrl) {
        setLoadingMessage("🎵 Composing happy tunes...");
        const music = await generateBackgroundMusic();
        setMusicUrl(music);
      }
    } catch (error) {
      console.error("Game start error:", error);
      setLoadingMessage("Oops! Something went wrong. Let's try again!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startNewGame();
  }, []);

  useEffect(() => {
    if (musicUrl && audioRef.current) {
      audioRef.current.volume = 0.3;
      if (!isMuted) {
        audioRef.current.play().catch(e => console.log("Autoplay blocked", e));
      }
    }
  }, [musicUrl, isMuted]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current || loading) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1000;
    const y = ((e.clientY - rect.top) / rect.height) * 1000;

    // Check if any unfound object is at this location
    const foundIndex = objects.findIndex(obj => {
      if (obj.found) return false;
      const [ymin, xmin, ymax, xmax] = obj.boundingBox;
      // Add a small buffer for easier clicking
      const buffer = 20;
      return x >= xmin - buffer && x <= xmax + buffer && y >= ymin - buffer && y <= ymax + buffer;
    });

    if (foundIndex !== -1) {
      const newObjects = [...objects];
      newObjects[foundIndex].found = true;
      setObjects(newObjects);
      setScore(s => s + 100);
      setFoundCount(f => f + 1);
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF69B4', '#00BFFF', '#7CFC00']
      });

      if (foundCount + 1 === objects.length) {
        // Level complete!
        setTimeout(() => {
          confetti({
            particleCount: 200,
            spread: 160,
            origin: { y: 0.5 }
          });
        }, 500);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9E6] p-4 md:p-8 font-sans text-[#4A4A4A]">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#FF6B6B] p-3 rounded-2xl shadow-lg rotate-[-3deg]">
            <Search className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#FF6B6B]">
              HIDDEN QUEST
            </h1>
            <p className="text-sm font-bold text-[#FF9F43] uppercase tracking-widest">
              {currentTheme}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white px-6 py-2 rounded-full shadow-md border-4 border-[#4ECDC4] flex items-center gap-2">
            <Trophy className="text-[#FFD93D] w-6 h-6" />
            <span className="text-2xl font-black text-[#4ECDC4]">{score}</span>
          </div>
          
          <button 
            onClick={toggleMute}
            className="p-3 bg-white rounded-full shadow-md hover:scale-110 transition-transform border-2 border-gray-100"
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
          
          <button 
            onClick={startNewGame}
            disabled={loading}
            className="flex items-center gap-2 bg-[#FF6B6B] text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-[#FF5252] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            NEW WORLD
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar: Objects to find */}
        <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
          <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-[#FF9F43]">
            <div className="flex flex-col mb-4 gap-3">
              <h2 className="text-xl font-black flex items-center gap-2 text-[#FF9F43]">
                <Sparkles className="w-5 h-5" />
                FIND THESE:
              </h2>
              
              {/* Display Mode Toggle */}
              <div className="flex bg-gray-100 p-1 rounded-xl self-start">
                <button 
                  onClick={() => setDisplayMode("text")}
                  className={`p-2 rounded-lg transition-all ${displayMode === "text" ? "bg-white shadow-sm text-[#FF9F43]" : "text-gray-400 hover:text-gray-600"}`}
                  title="Text Only"
                >
                  <TypeIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setDisplayMode("figure")}
                  className={`p-2 rounded-lg transition-all ${displayMode === "figure" ? "bg-white shadow-sm text-[#FF9F43]" : "text-gray-400 hover:text-gray-600"}`}
                  title="Figure Only"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setDisplayMode("both")}
                  className={`p-2 rounded-lg transition-all ${displayMode === "both" ? "bg-white shadow-sm text-[#FF9F43]" : "text-gray-400 hover:text-gray-600"}`}
                  title="Both"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {objects.map((obj, i) => (
                <motion.div 
                  key={i}
                  initial={false}
                  animate={{ 
                    backgroundColor: obj.found ? "#E8F5E9" : "#F8F9FA",
                    scale: obj.found ? 1.02 : 1
                  }}
                  className={`p-3 rounded-2xl border-2 flex items-center gap-3 ${
                    obj.found ? 'border-[#4ECDC4]' : 'border-gray-100'
                  }`}
                >
                  {/* Figure Display */}
                  {(displayMode === "figure" || displayMode === "both") && imageUrl && (
                    <ObjectSnippet imageUrl={imageUrl} boundingBox={obj.boundingBox} />
                  )}

                  <div className="flex flex-col flex-1 min-w-0">
                    {/* Text Display */}
                    {(displayMode === "text" || displayMode === "both") && (
                      <span className={`font-bold truncate ${obj.found ? 'text-[#4ECDC4] line-through' : 'text-gray-700'}`}>
                        {obj.name}
                      </span>
                    )}
                    
                    {!obj.found && (
                      <button 
                        onClick={() => setShowHint(showHint === obj.name ? null : obj.name)}
                        className="text-[10px] text-gray-400 font-bold hover:text-[#FF9F43] flex items-center gap-1 text-left"
                      >
                        <HelpCircle className="w-3 h-3" />
                        NEED A HINT?
                      </button>
                    )}
                  </div>

                  {obj.found ? (
                    <CheckCircle2 className="text-[#4ECDC4] w-6 h-6 shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-200 shrink-0" />
                  )}
                </motion.div>
              ))}
            </div>
            
            {showHint && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-[#FFF3CD] rounded-xl text-xs font-medium text-[#856404] border border-[#FFEEBA]"
              >
                Hint for {showHint}: {objects.find(o => o.name === showHint)?.description}
              </motion.div>
            )}
          </div>

          {foundCount === objects.length && objects.length > 0 && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#4ECDC4] p-6 rounded-3xl shadow-xl text-white text-center"
            >
              <h3 className="text-2xl font-black mb-2">AMAZING!</h3>
              <p className="font-bold mb-4">You found everything!</p>
              <button 
                onClick={startNewGame}
                className="w-full bg-white text-[#4ECDC4] py-3 rounded-full font-black shadow-lg hover:bg-gray-50 transition-colors"
              >
                PLAY AGAIN
              </button>
            </motion.div>
          )}
        </div>

        {/* Main Game Area */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <div className="relative bg-white p-4 rounded-[2.5rem] shadow-2xl border-8 border-white overflow-hidden aspect-square max-w-[800px] mx-auto">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                >
                  <Loader2 className="w-16 h-16 text-[#FF6B6B]" />
                </motion.div>
                <p className="mt-6 text-xl font-black text-[#FF6B6B] animate-pulse">
                  {loadingMessage}
                </p>
              </div>
            ) : null}

            {imageUrl ? (
              <div className="relative w-full h-full cursor-crosshair group">
                <img 
                  ref={imageRef}
                  src={imageUrl} 
                  alt="Hidden Picture" 
                  className="w-full h-full object-cover rounded-3xl select-none"
                  onClick={handleImageClick}
                  draggable={false}
                />
                
                {/* Visual feedback for found objects (optional, could show circles) */}
                {objects.map((obj, i) => obj.found && (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute border-4 border-[#4ECDC4] rounded-full pointer-events-none shadow-[0_0_15px_rgba(78,205,196,0.5)]"
                    style={{
                      top: `${obj.boundingBox[0] / 10}%`,
                      left: `${obj.boundingBox[1] / 10}%`,
                      width: `${(obj.boundingBox[3] - obj.boundingBox[1]) / 10}%`,
                      height: `${(obj.boundingBox[2] - obj.boundingBox[0]) / 10}%`,
                    }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#4ECDC4] text-white text-[10px] px-2 py-1 rounded-full font-black whitespace-nowrap">
                      FOUND!
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="w-full h-full bg-gray-100 rounded-3xl flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-gray-300 animate-spin" />
              </div>
            )}
          </div>
          
          <p className="text-center mt-4 text-gray-400 font-medium italic">
            Click on the picture to find the hidden objects!
          </p>
        </div>
      </main>

      {/* Hidden Audio Element */}
      {musicUrl && (
        <audio 
          ref={audioRef}
          src={musicUrl} 
          loop 
          autoPlay={!isMuted}
        />
      )}

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-400 text-sm font-medium">
        <p>Created with ✨ for curious kids everywhere</p>
      </footer>
    </div>
  );
}
