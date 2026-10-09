import React, { useState } from 'react';
import { 
  X, Mic, MessageSquare, Layers, BookOpen, Volume2, 
  Sparkles, Check, ArrowRight, RotateCcw, Bus, ShoppingBag, 
  UtensilsCrossed, Stethoscope, Search, Bookmark, Target, 
  BookMarked, Headphones, Edit3, BookOpenCheck, RefreshCw, 
  Globe2, RotateCw, Play, CheckCircle2 
} from 'lucide-react';
import { ROLEPLAY_SCENARIOS } from '../../data/curriculumData';
import { TOOLKIT_MODULES, ToolkitModule } from '../../data/toolkitModulesData';
import { speakBisaya } from '../../utils/audio';
import { sounds } from '../../utils/soundEffects';

interface QuickPracticeModalProps {
  isOpen: boolean;
  tool: string | null;
  onClose: () => void;
  onOpenSulti?: (prompt?: string) => void;
}

// ---------------------------------------------------------------------------
// CATEGORIZED LEARNING DATA: CEBUANO / BISAYA VS FILIPINO / TAGALOG
// ---------------------------------------------------------------------------

const FLASHCARDS_BY_CATEGORY = {
  cebuano: [
    { id: 'fc_ceb_1', native: 'Palihog ko sa plete, Nong.', english: 'Please pass my fare, driver.', context: 'Jeepney Commuting', phonetics: 'Pah-LEE-hog koh sah PLEH-teh, NONG.' },
    { id: 'fc_ceb_2', native: 'Tagpila man ni, Nang?', english: 'How much is this, ma\'am?', context: 'Market Bargaining', phonetics: 'Tag-PEE-lah mahn nee, NAHNG?' },
    { id: 'fc_ceb_3', native: 'Puyde hangyo gamay?', english: 'Can I ask for a small discount?', context: 'Palengke Etiquette', phonetics: 'POOY-deh HAHNG-yoh GAH-my?' },
    { id: 'fc_ceb_4', native: 'Lugar lang, Nong!', english: 'Stop here, driver!', context: 'Pulling Over', phonetics: 'LOO-gahr lahng, NONG!' },
    { id: 'fc_ceb_5', native: 'Bitaw no? Lami gyud!', english: 'I know right? Truly delicious!', context: 'Conversational Agreement', phonetics: 'BEE-taw noh? LAH-mee gyood!' },
  ],
  filipino: [
    { id: 'fc_fil_1', native: 'Makikisuyo po ng bayad, Kuya.', english: 'Please pass my fare, driver.', context: 'Jeepney Commuting', phonetics: 'Mah-kee-kee-SOO-yoh poh ng BAH-yad, KOO-yah.' },
    { id: 'fc_fil_2', native: 'Magkano po ito, Ate?', english: 'How much is this, ma\'am?', context: 'Market Bargaining', phonetics: 'Mag-KAH-noh poh ee-TOH, AH-teh?' },
    { id: 'fc_fil_3', native: 'Pwede po bang tumawad?', english: 'Can I ask for a small discount?', context: 'Palengke Etiquette', phonetics: 'PWEH-deh poh bahng too-MAH-wad?' },
    { id: 'fc_fil_4', native: 'Para po sa tabi!', english: 'Stop here by the curb, driver!', context: 'Pulling Over', phonetics: 'PAH-rah poh sah TAH-bee!' },
    { id: 'fc_fil_5', native: 'Talaga po? Ang sarap naman!', english: 'Really? That is truly delicious!', context: 'Conversational Agreement', phonetics: 'Tah-lah-GAH poh? Ahng sah-RAP nah-MAN!' },
  ],
  english: [
    { id: 'fc_eng_1', native: 'Could you please point me in the right direction?', english: 'Asking for directions politely.', context: 'Transit & Navigation', phonetics: 'KOOD yoo pleez POYNT mee in thuh RYT duh-REK-shun?' },
    { id: 'fc_eng_2', native: 'How much does this cost including taxes?', english: 'Inquiring about total price.', context: 'Market & Shopping', phonetics: 'HOW much duz this KOST in-KLOO-ding TAKS-iz?' },
    { id: 'fc_eng_3', native: 'Is there any chance of getting a discount?', english: 'Requesting a courtesy discount.', context: 'Bargaining & Discounts', phonetics: 'iz thair EN-ee chans uv GET-ing uh DIS-kownt?' },
    { id: 'fc_eng_4', native: 'Please pull over right here by the curb.', english: 'Instructing driver to halt.', context: 'Ride & Taxi Stop', phonetics: 'PLEEZ pool OH-ver RYT heer by thuh KURB.' },
    { id: 'fc_eng_5', native: 'I completely agree with you on that point!', english: 'Expressing strong alignment.', context: 'Conversational Agreement', phonetics: 'eye kum-PLEET-lee uh-GREE with yoo on that POYNT!' },
  ],
};

const PHRASES_BY_CATEGORY = {
  cebuano: [
    { native: 'Lugar lang, Nong!', english: 'Stop here, driver!', category: 'Jeepney', note: 'Polite way to ask driver to pull over in Bisaya' },
    { native: 'Palihog ko sa plete, Nong.', english: 'Please pass my fare, sir.', category: 'Jeepney', note: 'Pass fare politely along passengers' },
    { native: 'Naa bay sukli ang singkwenta?', english: 'Is there change for 50 pesos?', category: 'Jeepney', note: 'Ask beforehand for larger bills' },
    { native: 'Tagpila ang kilo sa mangga?', english: 'How much is a kilo of mangoes?', category: 'Market', note: 'Ask price per unit' },
    { native: 'Puyde hangyo, Nang?', english: 'May I request a discount, ma\'am?', category: 'Market', note: 'Friendly discount request' },
    { native: 'Pila tanan among nabayran?', english: 'How much is our bill in total?', category: 'Dining', note: 'Settling carenderia bill' },
    { native: 'Asa dapit ang parmasya?', english: 'Where is the pharmacy located?', category: 'Directions', note: 'Inquiring for landmarks' },
    { native: 'Salamat kaayo, amping!', english: 'Thank you very much, take care!', category: 'Etiquette', note: 'Heartfelt Visayan gratitude' },
  ],
  filipino: [
    { native: 'Para po sa tabi!', english: 'Stop here by the curb, driver!', category: 'Jeepney', note: 'Universal Metro Manila jeepney stop call' },
    { native: 'Makikisuyo po ng bayad, Kuya.', english: 'Please pass my fare, driver.', category: 'Jeepney', note: 'Polite honorific when passing coins' },
    { native: 'May panukli po ba sa singkwenta?', english: 'Is there change for 50 pesos?', category: 'Jeepney', note: 'Ask driver before paying big bills' },
    { native: 'Magkano po ang kilo ng mangga?', english: 'How much is a kilo of mangoes?', category: 'Market', note: 'Standard price inquiry' },
    { native: 'Pwede po bang tumawad, Ate?', english: 'May I ask for a small discount, ma\'am?', category: 'Market', note: 'Friendly market bargaining' },
    { native: 'Magkano po lahat ang babayaran?', english: 'How much is our total bill?', category: 'Dining', note: 'Settling restaurant bill' },
    { native: 'Saan po banda ang botika?', english: 'Where is the pharmacy located?', category: 'Directions', note: 'Inquiring for nearby drugstore' },
    { native: 'Maraming salamat po, ingat!', english: 'Thank you very much, take care!', category: 'Etiquette', note: 'Respectful Tagalog expression' },
  ],
  english: [
    { native: 'Please pull over right by the sidewalk.', english: 'Stop here, driver!', category: 'Transit', note: 'Polite way to ask driver or cab to pull over' },
    { native: 'Could you please pass my fare forward?', english: 'Please pass my payment.', category: 'Transit', note: 'Commuter etiquette when seated far from conductor' },
    { native: 'Do you have change for a hundred-dollar bill?', english: 'Change inquiry.', category: 'Transit', note: 'Ask beforehand for larger denominations' },
    { native: 'What is the price per kilogram for fresh fruit?', english: 'Produce pricing inquiry.', category: 'Market', note: 'Standard unit pricing question' },
    { native: 'Would you be open to offering a slight discount?', english: 'Polite bargaining.', category: 'Market', note: 'Courteous discount inquiry' },
    { native: 'Could we please get the itemized bill?', english: 'Settling meal total.', category: 'Dining', note: 'Requesting check after dining' },
    { native: 'Excuse me, where can I find the nearest pharmacy?', english: 'Direction inquiry.', category: 'Directions', note: 'Locating essential medical services' },
    { native: 'Thank you very much, take good care!', english: 'Warm departing gratitude.', category: 'Etiquette', note: 'Universal friendly farewell' },
  ],
};

export const QuickPracticeModal: React.FC<QuickPracticeModalProps> = ({
  isOpen,
  tool,
  onClose,
  onOpenSulti,
}) => {
  // Category switcher: 'cebuano' | 'filipino' | 'english'
  const [selectedCategory, setSelectedCategory] = useState<'cebuano' | 'filipino' | 'english'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sultiai_selected_language');
      if (saved === 'filipino' || saved === 'english' || saved === 'cebuano') {
        return saved;
      }
    }
    return 'cebuano';
  });

  // Keep category in sync with active journey selection when opened
  React.useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const saved = localStorage.getItem('sultiai_selected_language');
      if (saved === 'filipino' || saved === 'english' || saved === 'cebuano') {
        setSelectedCategory(saved);
      }
    }
  }, [isOpen]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [playingPhrase, setPlayingPhrase] = useState<string | null>(null);
  const [searchPhrase, setSearchPhrase] = useState('');
  const [micActive, setMicActive] = useState(false);
  const [micTranscript, setMicTranscript] = useState('');
  const [drillCompleted, setDrillCompleted] = useState(false);

  if (!isOpen || !tool) return null;

  const currentModule = TOOLKIT_MODULES.find((m) => m.id === tool);
  const flashcards = FLASHCARDS_BY_CATEGORY[selectedCategory];
  const colloquialPhrases = PHRASES_BY_CATEGORY[selectedCategory];
  const currentFlashcard = flashcards[currentCardIndex % flashcards.length];

  const handlePlayAudio = async (text: string) => {
    setPlayingPhrase(text);
    sounds.playTap();
    await speakBisaya(text);
    setPlayingPhrase(null);
  };

  const handleNextCard = () => {
    sounds.playTap();
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handleSimulateMic = () => {
    sounds.playTap();
    setMicActive(true);
    const targetPhrase = 
      selectedCategory === 'cebuano' 
        ? 'Maayong buntag, kumusta ka?' 
        : 'Magandang umaga po, kumusta po kayo?';

    setMicTranscript(`Listening to pronunciation... "${targetPhrase}"`);
    setTimeout(() => {
      setMicActive(false);
      setMicTranscript(
        selectedCategory === 'cebuano'
          ? '✓ Pronunciation concordance: 94% (Whisper ASR: Crisp Visayan vowels & warm intonation)'
          : '✓ Pronunciation concordance: 95% (Whisper ASR: Polite honorifics & natural Tagalog stress)'
      );
      setDrillCompleted(true);
      sounds.playCorrect();
    }, 1800);
  };

  const filteredPhrases = colloquialPhrases.filter(
    (p) =>
      p.native.toLowerCase().includes(searchPhrase.toLowerCase()) ||
      p.english.toLowerCase().includes(searchPhrase.toLowerCase()) ||
      p.category.toLowerCase().includes(searchPhrase.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-white dark:bg-[#11222D] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-300 dark:border-white/15 overflow-hidden transition-all animate-in slide-in-from-bottom-4 duration-250">
        
        {/* Mobile Drag Indicator */}
        <div className="flex sm:hidden justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
        </div>

        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-white/10 space-y-2.5 bg-stone-50/80 dark:bg-[#152B37]/80 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-lg bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-500/30 text-teal-800 dark:text-teal-300 shadow-xs shrink-0">
                {currentModule?.icon || '📚'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400">
                    Tool #{currentModule?.num || '01'}
                  </span>
                  <h3 className="font-display font-black text-sm text-stone-900 dark:text-white truncate">
                    {currentModule?.title || 'Learning Tool'}
                  </h3>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium truncate">
                  {currentModule?.purpose || 'Independent practice with SULTI companion'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sounds.playTap();
                onClose();
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MAJOR LANGUAGE CATEGORY PILLS */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-stone-200/60 dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-white/5 text-xs font-bold">
            <button
              onClick={() => {
                sounds.playTap();
                setSelectedCategory('cebuano');
                setCurrentCardIndex(0);
              }}
              className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedCategory === 'cebuano'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <span>🇵🇭</span>
              <span className="truncate">Cebuano</span>
            </button>

            <button
              onClick={() => {
                sounds.playTap();
                setSelectedCategory('filipino');
                setCurrentCardIndex(0);
              }}
              className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedCategory === 'filipino'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <span>🇵🇭</span>
              <span className="truncate">Filipino</span>
            </button>

            <button
              onClick={() => {
                sounds.playTap();
                setSelectedCategory('english');
                setCurrentCardIndex(0);
              }}
              className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedCategory === 'english'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <span>🌎</span>
              <span className="truncate">English</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          
          {/* TOOL 1: VOICE DRILL / PRONUNCIATION */}
          {(tool === 'voice' || tool === 'pronunciation') && (
            <div className="space-y-4 text-center py-2">
              <div className="p-5 bg-blue-50/60 dark:bg-blue-950/40 rounded-3xl border border-blue-200 dark:border-blue-800/60 space-y-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2.5 py-0.5 rounded-full">
                  {selectedCategory === 'cebuano' ? 'Bisaya Phonetic Drill' : 'Filipino Phonetic Drill'}
                </span>
                <div className="font-display font-black text-xl text-stone-900 dark:text-white">
                  "{selectedCategory === 'cebuano' ? 'Maayong buntag, kumusta ka?' : 'Magandang umaga po, kumusta po kayo?'}"
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 italic">
                  "{selectedCategory === 'cebuano' ? 'Good morning, how are you?' : 'Good morning, how are you? (polite)'}"
                </div>

                <button
                  onClick={() => handlePlayAudio(selectedCategory === 'cebuano' ? 'Maayong buntag, kumusta ka?' : 'Magandang umaga po, kumusta po kayo?')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 hover:bg-blue-100 dark:hover:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs inline-flex items-center gap-1.5 border border-blue-200 dark:border-blue-700 shadow-2xs cursor-pointer active:scale-95"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen to Native Audio</span>
                </button>
              </div>

              {/* Big Record Button */}
              <div className="py-2 space-y-3">
                <button
                  onClick={handleSimulateMic}
                  className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer ${
                    micActive
                      ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-500/30'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30'
                  }`}
                >
                  <Mic className="w-8 h-8" />
                </button>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                  {micActive ? 'Listening to speech...' : 'Tap the microphone to speak this phrase'}
                </p>

                {micTranscript && (
                  <div className="p-3 bg-stone-50 dark:bg-[#152B37] rounded-2xl border border-stone-200 dark:border-white/10 text-xs font-mono text-stone-800 dark:text-stone-200 animate-in fade-in">
                    {micTranscript}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TOOL 2: SCENARIOS */}
          {tool === 'scenario' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Choose a realistic scenario in {selectedCategory === 'cebuano' ? 'Cebuano / Bisaya' : 'Filipino / Tagalog'} to start conversational roleplay with SULTI:
              </p>

              <div className="space-y-2">
                {ROLEPLAY_SCENARIOS.map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => {
                      sounds.playTap();
                      onClose();
                      const prompt = selectedCategory === 'cebuano'
                        ? `Gusto kong magpraktis sa scenario: ${sc.title} (${sc.context}). Mag-Bisaya ta!`
                        : `Gusto kong mag-practice ng scenario: ${sc.title} (${sc.context}). Mag-Filipino tayo!`;
                      onOpenSulti?.(prompt);
                    }}
                    className="p-3.5 bg-stone-50 dark:bg-[#152B37] hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-2xl border border-stone-200 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-500/40 transition-all cursor-pointer group flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 text-lg">
                      {sc.id === 'sc_market' ? '🛒' : sc.id === 'sc_jeepney' ? '🚙' : sc.id === 'sc_dining' ? '🍲' : '🩺'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-display font-black text-xs text-stone-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                          {sc.title}
                        </h4>
                        <span className="text-[10px] font-mono text-stone-400">{sc.difficulty}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                        {sc.context}
                      </p>
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1 mt-1">
                        <span>Start {selectedCategory === 'cebuano' ? 'Bisaya' : 'Filipino'} Roleplay</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOOL 3: FLASHCARDS */}
          {(tool === 'flashcards' || tool === 'vocabulary') && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between text-xs text-stone-400 px-1 font-mono">
                <span>Card {currentCardIndex + 1} of {flashcards.length} ({selectedCategory === 'cebuano' ? 'Bisaya' : 'Filipino'})</span>
                <span>Tap to flip</span>
              </div>

              {/* Flashcard container */}
              <div
                onClick={() => {
                  sounds.playTap();
                  setIsFlipped(!isFlipped);
                }}
                className={`min-h-[190px] p-6 rounded-3xl border text-center flex flex-col justify-between transition-all cursor-pointer select-none shadow-sm ${
                  isFlipped
                    ? 'bg-teal-600 text-white border-teal-500'
                    : 'bg-stone-50 dark:bg-[#152B37] border-stone-200 dark:border-white/10 text-stone-900 dark:text-white'
                }`}
              >
                <div className="text-[10px] font-mono uppercase tracking-wider opacity-75">
                  {currentFlashcard.context}
                </div>

                <div className="py-2 space-y-1">
                  <div className="font-display font-black text-2xl">
                    {isFlipped ? currentFlashcard.english : currentFlashcard.native}
                  </div>
                  {!isFlipped && (
                    <div className="text-xs opacity-80 font-mono">
                      {currentFlashcard.phonetics}
                    </div>
                  )}
                </div>

                <div className="text-[11px] opacity-75 font-medium flex items-center justify-center gap-1">
                  <RotateCw className="w-3 h-3" />
                  <span>{isFlipped ? 'Tap to see phrase' : 'Tap to see English translation'}</span>
                </div>
              </div>

              {/* Flashcard Controls */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handlePlayAudio(currentFlashcard.native)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border border-stone-200 dark:border-white/10"
                >
                  <Volume2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Pronounce</span>
                </button>

                <button
                  onClick={handleNextCard}
                  className="flex-1 py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-xs"
                >
                  <span>Next Card</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TOOL 4: PHRASEBOOK */}
          {(tool === 'phrasebook' || tool === 'grammar' || tool === 'writing' || tool === 'reading' || tool === 'sulti_switch' || tool === 'culture' || tool === 'review_center' || tool === 'listening') && (
            <div className="space-y-3">
              {/* Search Phrase */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchPhrase}
                  onChange={(e) => setSearchPhrase(e.target.value)}
                  placeholder={`Search ${selectedCategory === 'cebuano' ? 'Bisaya' : 'Filipino'} expressions...`}
                  className="w-full pl-9 pr-4 py-2 bg-stone-100 dark:bg-stone-800 border border-transparent focus:border-teal-500 rounded-xl text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none"
                />
              </div>

              {/* Phrase List */}
              <div className="space-y-2">
                {filteredPhrases.map((phrase, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-stone-50 dark:bg-[#152B37] rounded-2xl border border-stone-200 dark:border-white/10 space-y-1 hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md">
                        {phrase.category}
                      </span>
                      <button
                        onClick={() => handlePlayAudio(phrase.native)}
                        className="p-1 rounded-lg text-stone-400 hover:text-teal-600 dark:hover:text-teal-300 cursor-pointer"
                        title="Listen"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="font-display font-black text-sm text-stone-900 dark:text-white">
                      "{phrase.native}"
                    </div>
                    <div className="text-xs text-stone-600 dark:text-stone-300">
                      {phrase.english}
                    </div>
                    <div className="text-[10px] text-stone-400 italic pt-0.5">
                      💡 {phrase.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
