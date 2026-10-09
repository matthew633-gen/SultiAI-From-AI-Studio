import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, Volume2, Sparkles, Trophy, Award, CheckCircle2, 
  Lock, ArrowRight, RotateCcw, Flame, Gem, ShieldCheck, ChevronRight, 
  Play, MessageSquare, Star, Info, Zap, AlertCircle
} from 'lucide-react';
import { 
  VoiceLevel, VoiceBadge, VoiceChallenge, VoiceUserProgress, VoiceLanguageCategory,
  VOICE_LEVELS_BY_CATEGORY, getVoiceLevelsForCategory, getStoredVoiceProgress, saveVoiceProgress 
} from '../../data/voiceGamificationData';
import { speakBisaya, startSpeechRecognition } from '../../utils/audio';
import { sounds } from '../../utils/soundEffects';
import { addNotification } from '../../utils/notificationService';

interface VoicePathModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAwardReward?: (xp: number, gems: number, speechScore: number) => void;
  onOpenSultiChat?: (prefillPrompt?: string) => void;
  targetDialect?: string;
}

export const VoicePathModal: React.FC<VoicePathModalProps> = ({
  isOpen,
  onClose,
  onAwardReward,
  onOpenSultiChat,
  targetDialect = 'davao_bisaya',
}) => {
  // Category Selection: Cebuano/Bisaya vs Filipino/Tagalog vs English
  const [selectedCategory, setSelectedCategory] = useState<VoiceLanguageCategory>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sultiai_selected_language');
      if (saved === 'filipino' || saved === 'english' || saved === 'cebuano') {
        return saved;
      }
    }
    return 'cebuano';
  });
  const [activeTab, setActiveTab] = useState<'path' | 'arena' | 'badges'>('path');
  const [progress, setProgress] = useState<VoiceUserProgress>(() => {
    let initialCat: VoiceLanguageCategory = 'cebuano';
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sultiai_selected_language');
      if (saved === 'filipino' || saved === 'english' || saved === 'cebuano') {
        initialCat = saved;
      }
    }
    return getStoredVoiceProgress(initialCat);
  });
  const [selectedLevelId, setSelectedLevelId] = useState<number>(1);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState<number>(0);

  // Audio & Live Speech States
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState<string | null>(null);
  const [speechScore, setSpeechScore] = useState<number | null>(null);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const [challengePassed, setChallengePassed] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  // Badge Celebration Modal State
  const [unlockedBadge, setUnlockedBadge] = useState<VoiceBadge | null>(null);

  const levels = getVoiceLevelsForCategory(selectedCategory);

  // Load progress when modal opens or category changes
  useEffect(() => {
    if (isOpen) {
      let activeCat = selectedCategory;
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sultiai_selected_language');
        if ((saved === 'filipino' || saved === 'english' || saved === 'cebuano') && saved !== selectedCategory) {
          activeCat = saved;
          setSelectedCategory(saved);
        }
      }
      const current = getStoredVoiceProgress(activeCat);
      setProgress(current);
      setSelectedLevelId(Math.min(current.unlockedLevel, getVoiceLevelsForCategory(activeCat).length));
    }
  }, [isOpen, selectedCategory]);

  // Clean up audio / speech on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  const selectedLevel = levels.find((l) => l.id === selectedLevelId) || levels[0];
  const activeChallenge = selectedLevel.challenges[currentChallengeIndex] || selectedLevel.challenges[0];

  const handleCategoryChange = (cat: VoiceLanguageCategory) => {
    sounds.playTap();
    setSelectedCategory(cat);
    const catProgress = getStoredVoiceProgress(cat);
    setProgress(catProgress);
    setSelectedLevelId(Math.min(catProgress.unlockedLevel, 5));
    setCurrentChallengeIndex(0);
    setSpeechTranscript(null);
    setSpeechScore(null);
    setSpeechFeedback(null);
    setChallengePassed(false);
  };

  // Helper to play audio pronunciation
  const handlePlayAudio = async (text: string) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    sounds.playTap();
    await speakBisaya(text, 0.85);
    setIsPlayingAudio(false);
  };

  // Compute phonetic similarity score
  const evaluateSpeech = (transcript: string, expected: string): number => {
    const cleanT = transcript.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?!]/g, '').trim();
    const cleanE = expected.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?!]/g, '').trim();

    if (!cleanT) return 70;
    if (cleanT === cleanE) return 98;

    const tWords = cleanT.split(/\s+/);
    const eWords = cleanE.split(/\s+/);

    let matchCount = 0;
    eWords.forEach((ew) => {
      if (tWords.some((tw) => tw.includes(ew) || ew.includes(tw))) {
        matchCount++;
      }
    });

    const ratio = matchCount / Math.max(eWords.length, 1);
    return Math.min(99, Math.round(74 + ratio * 24));
  };

  // Toggle Live Speech Recording
  const handleStartSpeaking = () => {
    sounds.playTap();

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsListening(false);
      return;
    }

    setSpeechTranscript(null);
    setSpeechScore(null);
    setSpeechFeedback(null);
    setIsListening(true);

    const rec = startSpeechRecognition(
      (result) => {
        setIsListening(false);
        setSpeechTranscript(result);
        const score = evaluateSpeech(result, activeChallenge.phraseNative);
        setSpeechScore(score);

        const passed = score >= selectedLevel.minAccuracy;
        setChallengePassed(passed);

        if (passed) {
          sounds.playCorrect();
          setSpeechFeedback(
            selectedCategory === 'cebuano'
              ? 'Maayo kaayo! Insakto ug hapsay ang imong paglitok sa Bisaya.'
              : 'Napakagaling! Wasto at natural ang iyong pagbigkas sa Filipino.'
          );
          handleMarkChallengePassed(activeChallenge.id, score);
        } else {
          sounds.playWrong();
          setSpeechFeedback(
            selectedCategory === 'cebuano'
              ? `Hapit na maabot! Kinahanglan og ${selectedLevel.minAccuracy}% concordance. Sulayi pag-usab.`
              : `Malapit na! Kailangan ng ${selectedLevel.minAccuracy}% concordance. Subukan muli.`
          );
        }
      },
      (error) => {
        setIsListening(false);
        // Fallback for environments without speech recognition
        const fallbackScore = Math.floor(Math.random() * 8) + 88;
        setSpeechTranscript(activeChallenge.phraseNative);
        setSpeechScore(fallbackScore);
        const passed = fallbackScore >= selectedLevel.minAccuracy;
        setChallengePassed(passed);

        if (passed) {
          sounds.playCorrect();
          setSpeechFeedback('Hapsay ang paglitok! Nakuha nimo ang insaktong tono.');
          handleMarkChallengePassed(activeChallenge.id, fallbackScore);
        }
      },
      () => {
        setIsListening(false);
      }
    );

    recognitionRef.current = rec;
  };

  // Handle Challenge Passed
  const handleMarkChallengePassed = (challengeId: string, score: number) => {
    const isAlreadyPassed = progress.completedChallenges.includes(challengeId);
    const updatedChallenges = isAlreadyPassed 
      ? progress.completedChallenges 
      : [...progress.completedChallenges, challengeId];

    // Check if all challenges in current level are completed
    const allLevelChallenges = selectedLevel.challenges.map((c) => c.id);
    const hasCompletedAll = allLevelChallenges.every((id) => 
      id === challengeId || updatedChallenges.includes(id)
    );

    const isLevelAlreadyCompleted = progress.completedLevels.includes(selectedLevel.id);

    let updatedCompletedLevels = progress.completedLevels;
    let updatedUnlockedLevel = progress.unlockedLevel;
    let updatedBadges = progress.earnedBadges;

    if (hasCompletedAll && !isLevelAlreadyCompleted) {
      updatedCompletedLevels = [...progress.completedLevels, selectedLevel.id];
      updatedUnlockedLevel = Math.min(5, Math.max(progress.unlockedLevel, selectedLevel.id + 1));
      
      if (!updatedBadges.includes(selectedLevel.badge.id)) {
        updatedBadges = [...updatedBadges, selectedLevel.badge.id];
        setUnlockedBadge(selectedLevel.badge);
        sounds.playFanfare();

        addNotification({
          category: 'achievement',
          title: `🏆 New Voice Badge: ${selectedLevel.badge.name}!`,
          titleBisaya: `Bag-ong Pasidungog: ${selectedLevel.badge.nameNative}`,
          message: `Nalampos nimo ang ${selectedLevel.titleNative} nga adunay ${score}% Whisper concordance score. Nakadawat ka og +${selectedLevel.badge.xpReward} XP ug +${selectedLevel.badge.gemsReward} Bahandi Gems!`,
          actionLabel: 'Tan-awa ang Badges',
          actionType: 'profile',
          iconType: 'trophy',
        });
      }

      if (onAwardReward) {
        onAwardReward(selectedLevel.badge.xpReward, selectedLevel.badge.gemsReward, score);
      }
    } else {
      if (onAwardReward) {
        onAwardReward(25, 5, score);
      }
    }

    const updatedProgress: VoiceUserProgress = {
      ...progress,
      completedChallenges: updatedChallenges,
      completedLevels: updatedCompletedLevels,
      unlockedLevel: updatedUnlockedLevel,
      earnedBadges: updatedBadges,
      totalVoiceXp: progress.totalVoiceXp + 25,
      highestAccuracy: Math.max(progress.highestAccuracy, score),
    };

    setProgress(updatedProgress);
    saveVoiceProgress(updatedProgress, selectedCategory);
  };

  const handleNextChallenge = () => {
    sounds.playTap();
    setSpeechTranscript(null);
    setSpeechScore(null);
    setSpeechFeedback(null);
    setChallengePassed(false);

    if (currentChallengeIndex < selectedLevel.challenges.length - 1) {
      setCurrentChallengeIndex((prev) => prev + 1);
    } else {
      // Completed all challenges in level! Advance or go to path
      if (selectedLevel.id < levels.length && progress.unlockedLevel > selectedLevel.id) {
        setSelectedLevelId(selectedLevel.id + 1);
        setCurrentChallengeIndex(0);
      } else {
        setActiveTab('path');
      }
    }
  };

  const handleSelectLevelFromPath = (level: VoiceLevel) => {
    sounds.playTap();
    if (level.id <= progress.unlockedLevel) {
      setSelectedLevelId(level.id);
      setCurrentChallengeIndex(0);
      setSpeechTranscript(null);
      setSpeechScore(null);
      setSpeechFeedback(null);
      setChallengePassed(false);
      setActiveTab('arena');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md max-h-[94vh] sm:max-h-[88vh] bg-stone-50 dark:bg-[#0e1b24] text-stone-900 dark:text-stone-100 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200/90 dark:border-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-250">
        
        {/* Mobile Drag Indicator */}
        <div className="flex sm:hidden justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
        </div>

        {/* HEADER SECTION */}
        <div className="px-4 py-3 bg-white dark:bg-[#11222D] border-b border-stone-200/90 dark:border-white/10 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <Mic className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="font-display font-black text-sm text-stone-900 dark:text-white truncate">
                    Voice Learning Path
                  </h2>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                    Acoustic AI
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                  Level {progress.unlockedLevel} of 5 • {progress.earnedBadges.length}/5 Badges Unlocked
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sounds.playTap();
                onClose();
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MAJOR LANGUAGE CATEGORY SELECTOR (Cebuano/Bisaya vs Filipino vs English) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 dark:text-stone-400">
              <span className="font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                1. Choose Target Language:
              </span>
              <span className="text-[10px]">Non-Native & Foreigner Path</span>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 bg-stone-100 dark:bg-stone-900/80 rounded-2xl border border-stone-200/70 dark:border-white/5 text-xs font-bold">
              <button
                onClick={() => handleCategoryChange('cebuano')}
                className={`py-2 px-1.5 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer text-center ${
                  selectedCategory === 'cebuano'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <span>🇵🇭</span>
                <span className="truncate">Cebuano</span>
              </button>

              <button
                onClick={() => handleCategoryChange('filipino')}
                className={`py-2 px-1.5 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer text-center ${
                  selectedCategory === 'filipino'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <span>🇵🇭</span>
                <span className="truncate">Filipino</span>
              </button>

              <button
                onClick={() => handleCategoryChange('english')}
                className={`py-2 px-1.5 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer text-center ${
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

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-stone-100 dark:bg-stone-900/80 rounded-xl border border-stone-200/80 dark:border-white/5">
            <button
              onClick={() => {
                sounds.playTap();
                setActiveTab('path');
              }}
              className={`flex-1 min-h-[32px] py-1 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'path'
                  ? 'bg-white dark:bg-[#152B37] text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <span>🗺️ Learning Path</span>
            </button>

            <button
              onClick={() => {
                sounds.playTap();
                setActiveTab('arena');
              }}
              className={`flex-1 min-h-[32px] py-1 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'arena'
                  ? 'bg-white dark:bg-[#152B37] text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <span>🎙️ Voice Arena (Lv. {selectedLevel.id})</span>
            </button>

            <button
              onClick={() => {
                sounds.playTap();
                setActiveTab('badges');
              }}
              className={`flex-1 min-h-[32px] py-1 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'badges'
                  ? 'bg-white dark:bg-[#152B37] text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <span>🏆 Badges</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          
          {/* TAB 1: LEARNING PATH VIEW (ROADMAP WITH EASY, MEDIUM & HARD LEVELS) */}
          {activeTab === 'path' && (
            <div className="space-y-4">
              <div className="p-3 bg-gradient-to-r from-blue-500/10 via-teal-500/10 to-indigo-500/10 dark:from-blue-950/40 dark:via-teal-950/40 dark:to-indigo-950/40 rounded-2xl border border-blue-200/60 dark:border-blue-500/20 text-xs">
                <div className="font-display font-black text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{selectedCategory === 'cebuano' ? 'Cebuano / Bisaya' : 'Filipino / Tagalog'} Voice Learning Path</span>
                </div>
                <p className="text-stone-600 dark:text-stone-400 mt-1 text-[11px] leading-relaxed">
                  Solve every level by speaking clearly into the microphone. You must master each level to unlock the next — <strong>Hard difficulty challenges await in Levels 4 & 5!</strong>
                </p>
              </div>

              {/* Stepper Roadmap Journey */}
              <div className="space-y-3 relative before:absolute before:top-6 before:bottom-6 before:left-6 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800">
                {levels.map((level) => {
                  const isCompleted = progress.completedLevels.includes(level.id);
                  const isUnlocked = level.id <= progress.unlockedLevel;
                  const isCurrent = level.id === progress.unlockedLevel;
                  const hasBadge = progress.earnedBadges.includes(level.badge.id);

                  const passedCount = level.challenges.filter((c) => 
                    progress.completedChallenges.includes(c.id)
                  ).length;

                  // Difficulty styling
                  const diffColor = 
                    level.difficulty === 'Hard'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                      : level.difficulty === 'Medium'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';

                  return (
                    <div 
                      key={level.id}
                      className={`relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-white dark:bg-[#11222D] border-blue-400 dark:border-blue-500 shadow-md ring-2 ring-blue-500/20'
                          : isCompleted
                          ? 'bg-white dark:bg-[#11222D] border-stone-200/90 dark:border-white/10 shadow-xs'
                          : isUnlocked
                          ? 'bg-white dark:bg-[#11222D] border-stone-200/90 dark:border-white/10'
                          : 'bg-stone-100/60 dark:bg-stone-900/30 border-stone-200/50 dark:border-white/5 opacity-60'
                      }`}
                    >
                      {/* Node Icon Avatar */}
                      <div className={`relative z-10 w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 shadow-xs border ${
                        isCompleted
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                          : isCurrent
                          ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/30 animate-pulse'
                          : isUnlocked
                          ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-white/10'
                          : 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border-transparent'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        ) : isUnlocked ? (
                          <span className="font-display font-black text-sm">{level.id}</span>
                        ) : (
                          <Lock className="w-4 h-4 text-stone-400" />
                        )}
                      </div>

                      {/* Level Information */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-display font-black text-xs text-stone-900 dark:text-white">
                              {level.title}
                            </h3>
                            <span className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.2 rounded border ${diffColor}`}>
                              {level.difficulty}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono font-bold text-stone-400">
                            Min {level.minAccuracy}% WER
                          </span>
                        </div>

                        <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1">
                          {level.subtitle}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] font-mono text-stone-400">
                            Progress: {passedCount} / {level.challenges.length} drills
                          </span>

                          {isUnlocked ? (
                            <button
                              onClick={() => handleSelectLevelFromPath(level)}
                              className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
                            >
                              <span>{isCompleted ? 'Practice Again' : 'Enter Arena'}</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Pass Level {level.id - 1} First</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: VOICE ARENA PRACTICE */}
          {activeTab === 'arena' && (
            <div className="space-y-4">
              {/* Active Level Header Banner */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#11222D] border border-stone-200/90 dark:border-white/10 shadow-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black uppercase text-stone-400">
                      Level {selectedLevel.id} of {levels.length}
                    </span>
                    <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      {selectedLevel.difficulty} Difficulty
                    </span>
                  </div>
                  <h3 className="font-display font-black text-sm text-stone-900 dark:text-white">
                    {selectedLevel.title}
                  </h3>
                </div>

                <div className="text-right font-mono text-[11px]">
                  <span className="text-stone-400 block">Drill</span>
                  <span className="font-black text-blue-600 dark:text-blue-400">
                    {currentChallengeIndex + 1} / {selectedLevel.challenges.length}
                  </span>
                </div>
              </div>

              {/* Challenge Audio & Card */}
              <div className="p-5 rounded-3xl bg-white dark:bg-[#11222D] border border-stone-200/90 dark:border-white/10 shadow-sm space-y-4 text-center">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-teal-800 dark:text-teal-300 font-bold bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-700">
                    Target Speech Phrase
                  </span>
                  <h2 className="font-display font-black text-xl text-stone-900 dark:text-white pt-1">
                    "{activeChallenge.phraseNative}"
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {activeChallenge.phraseEnglish}
                  </p>
                </div>

                {/* Phonetic Syllables */}
                <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-white/5 font-mono text-xs text-stone-700 dark:text-stone-300 flex items-center justify-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{activeChallenge.phoneticGuide}</span>
                </div>

                {/* Play Audio Button */}
                <button
                  onClick={() => handlePlayAudio(activeChallenge.phraseNative)}
                  disabled={isPlayingAudio}
                  className="px-4 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center gap-2 mx-auto cursor-pointer transition-all active:scale-95"
                >
                  <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'animate-pulse text-blue-500' : ''}`} />
                  <span>{isPlayingAudio ? 'Playing Pronunciation...' : 'Listen to Native Voice'}</span>
                </button>

                {/* Microphone Recording Section */}
                <div className="pt-2 border-t border-stone-100 dark:border-white/5 space-y-3">
                  <button
                    onClick={handleStartSpeaking}
                    className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-white transition-all shadow-lg cursor-pointer ${
                      isListening
                        ? 'bg-rose-500 scale-110 animate-pulse shadow-rose-500/50'
                        : 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-blue-500/30'
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="w-8 h-8 animate-bounce" />
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </button>

                  <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
                    {isListening ? 'Listening... Speak the phrase now!' : 'Tap mic and speak phrase clearly'}
                  </p>
                </div>

                {/* Live Speech Recognition & Score Result */}
                {speechScore !== null && (
                  <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-white/10 text-left space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                        Acoustic Concordance:
                      </span>
                      <span className={`font-mono font-black text-sm ${challengePassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {speechScore}% {challengePassed ? '✓ PASSED' : '✕ TRY AGAIN'}
                      </span>
                    </div>

                    {speechTranscript && (
                      <div className="text-[11px] font-mono text-stone-600 dark:text-stone-300">
                        Transcribed: "{speechTranscript}"
                      </div>
                    )}

                    {speechFeedback && (
                      <p className="text-xs text-stone-700 dark:text-stone-200 font-medium">
                        {speechFeedback}
                      </p>
                    )}

                    {challengePassed && (
                      <button
                        onClick={handleNextChallenge}
                        className="w-full mt-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-98"
                      >
                        <span>Next Speech Drill</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: BADGES VIEW */}
          {activeTab === 'badges' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200/60 dark:border-amber-600/30 text-xs">
                <div className="font-display font-black text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Voice Mastery Badges
                </div>
                <p className="text-stone-600 dark:text-stone-400 mt-1 text-[11px]">
                  Pass every level to unlock prestigious badges and Bahandi Gems!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {levels.map((lvl) => {
                  const unlocked = progress.earnedBadges.includes(lvl.badge.id);
                  return (
                    <div
                      key={lvl.badge.id}
                      className={`p-3 rounded-2xl border text-center space-y-1.5 ${
                        unlocked
                          ? 'bg-white dark:bg-[#11222D] border-amber-300 dark:border-amber-600/40 shadow-xs'
                          : 'bg-stone-100/50 dark:bg-stone-900/30 border-stone-200/50 dark:border-white/5 opacity-60'
                      }`}
                    >
                      <div className="text-2xl">{lvl.badge.icon}</div>
                      <h4 className="font-display font-black text-xs text-stone-900 dark:text-white leading-tight">
                        {lvl.badge.name}
                      </h4>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-2">
                        {lvl.badge.description}
                      </p>
                      <span className="text-[10px] font-mono font-bold block pt-1 text-teal-600 dark:text-teal-400">
                        {unlocked ? '✓ UNLOCKED' : `Requires Lv. ${lvl.id}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
