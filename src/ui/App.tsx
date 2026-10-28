import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LEVELS } from '../levels/levels';
import { AudioCues, type Cue } from '../audio/audio';
import {
  firstIncompleteIndex, loadProgress, saveProgress, withMuted, withWin, type Progress,
} from '../persistence/progress';
import { TitleScreen } from './TitleScreen';
import { GameScreen } from './GameScreen';
import { About } from './About';

type Screen = { name: 'title' } | { name: 'game'; index: number };

export function App() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [aboutOpen, setAboutOpen] = useState(false);
  const audio = useRef<AudioCues | null>(null);
  if (audio.current === null) audio.current = new AudioCues();
  audio.current.muted = progress.settings.muted;

  const persist = useCallback((next: Progress) => {
    setProgress(next);
    saveProgress(next);
  }, []);

  const cue = useCallback((c: Cue) => audio.current?.play(c), []);
  /** Called from click/keydown handlers: browsers only allow audio after a gesture. */
  const unlock = useCallback(() => audio.current?.unlock(), []);

  const start = (index: number) => {
    unlock();
    setScreen({ name: 'game', index });
  };

  const onWin = useCallback(
    (levelId: string, turns: number, charges: number) => {
      setProgress((p) => {
        const next = withWin(p, levelId, turns, charges);
        if (next !== p) saveProgress(next);
        return next;
      });
    },
    [],
  );

  const toggleMute = () => {
    unlock();
    persist(withMuted(progress, !progress.settings.muted));
  };

  const level = screen.name === 'game' ? LEVELS[screen.index] : undefined;
  const continueIndex = useMemo(() => firstIncompleteIndex(progress), [progress]);

  useEffect(() => {
    document.title = level ? `${level.title} - TRAPLINE` : 'TRAPLINE';
  }, [level]);

  return (
    <div className="app">
      {screen.name === 'title' || !level ? (
        <TitleScreen
          progress={progress}
          continueIndex={continueIndex}
          onPlay={start}
          onAbout={() => setAboutOpen(true)}
          muted={progress.settings.muted}
          onToggleMute={toggleMute}
        />
      ) : (
        <GameScreen
          key={level.id}
          level={level}
          index={screen.name === 'game' ? screen.index : 0}
          progress={progress}
          cue={cue}
          unlock={unlock}
          onWin={onWin}
          onSelectLevel={start}
          onHome={() => setScreen({ name: 'title' })}
          onAbout={() => setAboutOpen(true)}
          muted={progress.settings.muted}
          onToggleMute={toggleMute}
        />
      )}
      {aboutOpen && <About onClose={() => setAboutOpen(false)} />}
    </div>
  );
}