import React from 'react';
import { Play, Pause } from 'lucide-react';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { formatAudioDuration } from '../../utils/formatters';

interface AudioWaveformPlayerProps {
  audioUrl?: string;
  duration?: number;
  waveform?: number[];
  isSender?: boolean;
}

export const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({
  audioUrl,
  duration = 15,
  waveform = [],
  isSender = false,
}) => {
  const { isPlaying, currentTime, togglePlay, seekTo, cycleSpeed, playbackRate, progress } =
    useAudioPlayer(audioUrl, duration);

  // Generate default waveform if none supplied
  const bars = waveform.length > 0 ? waveform : [30, 45, 60, 40, 80, 95, 70, 50, 40, 60, 85, 100, 75, 45, 30, 50, 65, 80, 55, 35, 60, 90, 70, 40];

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const frac = Math.max(0, Math.min(1, clickX / rect.width));
    seekTo(frac);
  };

  return (
    <div className="flex items-center gap-3 py-1 px-1 select-none min-w-[240px] max-w-full">
      {/* Play/Pause Circle */}
      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-md ${
          isSender
            ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
        }`}
        title={isPlaying ? 'Pause' : 'Play voice message'}
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </button>

      {/* Waveform track & Time display */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          onClick={handleWaveformClick}
          className="flex items-center gap-[2.5px] h-8 cursor-pointer py-1 group relative"
          title="Click to seek"
        >
          {bars.map((height, i) => {
            const barProgress = i / bars.length;
            const isPlayed = barProgress <= progress;

            return (
              <div
                key={i}
                style={{ height: `${Math.max(15, height)}%` }}
                className={`flex-1 rounded-full transition-all duration-75 ${
                  isPlayed
                    ? isSender
                      ? 'bg-emerald-300'
                      : 'bg-emerald-400'
                    : isSender
                    ? 'bg-emerald-950/60 group-hover:bg-emerald-900/80'
                    : 'bg-neutral-700/80 group-hover:bg-neutral-600'
                }`}
              />
            );
          })}
        </div>

        {/* Timestamp & Speed selector */}
        <div className="flex items-center justify-between text-[11px] font-mono leading-none">
          <span className={isSender ? 'text-emerald-100/90' : 'text-neutral-400'}>
            {isPlaying ? formatAudioDuration(currentTime) : formatAudioDuration(duration)}
          </span>

          <button
            onClick={cycleSpeed}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors ${
              isSender
                ? 'bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
            title="Toggle playback rate (1x, 1.5x, 2x)"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};
