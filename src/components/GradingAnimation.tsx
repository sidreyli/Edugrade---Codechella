import React from 'react';
import { Sparkles, Brain, FileEdit, CheckCircle, Loader2 } from 'lucide-react';

interface GradingAnimationProps {
  stage: 'analyzing' | 'thinking' | 'generating' | 'complete';
  progress: number; // 0-100
}

const GradingAnimation: React.FC<GradingAnimationProps> = ({ stage, progress }) => {
  const getStageConfig = () => {
    switch (stage) {
      case 'analyzing':
        return {
          icon: <Sparkles size={32} strokeWidth={3} className="animate-pulse" />,
          title: '🔍 ANALYZING SUBMISSION...',
          subtitle: 'Reading student\'s work and rubric criteria',
          color: 'bg-neo-cyan'
        };
      case 'thinking':
        return {
          icon: <Brain size={32} strokeWidth={3} className="animate-bounce" />,
          title: '🧠 AI IS THINKING...',
          subtitle: 'Evaluating quality and understanding',
          color: 'bg-neo-yellow'
        };
      case 'generating':
        return {
          icon: <FileEdit size={32} strokeWidth={3} className="animate-pulse" />,
          title: '✍️ GENERATING FEEDBACK...',
          subtitle: 'Creating personalized recommendations',
          color: 'bg-neo-pink text-neo-white'
        };
      case 'complete':
        return {
          icon: <CheckCircle size={32} strokeWidth={3} className="animate-bounce" />,
          title: '✅ GRADE COMPLETE!',
          subtitle: '✨ Success! Grade saved to database',
          color: 'bg-neo-green'
        };
    }
  };

  const config = getStageConfig();

  return (
    <div className="space-y-4">
      {/* Stage Indicator */}
      <div className={`p-6 border-4 border-neo-black ${config.color} transition-all duration-300`}>
        <div className="flex items-center gap-4 mb-3">
          <div className="relative">
            {config.icon}
            {stage !== 'complete' && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-neo-black rounded-full animate-ping"></div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold uppercase mb-1">{config.title}</h3>
            <p className="text-sm font-bold opacity-80">{config.subtitle}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-6 border-4 border-neo-black bg-neo-white overflow-hidden relative">
            {/* Progress Fill */}
            <div
              className="h-full bg-neo-black transition-all duration-500 ease-out relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 shimmer-animation"></div>
            </div>

            {/* Percentage Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-bold text-sm" style={{
                color: progress > 50 ? '#fff' : '#000',
                mixBlendMode: progress > 50 ? 'difference' : 'normal'
              }}>
                {progress}%
              </span>
            </div>
          </div>

          {/* Animated Dots */}
          {stage !== 'complete' && (
            <div className="flex items-center gap-2 text-sm font-bold">
              <Loader2 size={14} strokeWidth={3} className="animate-spin" />
              <span className="dots-animation">Please wait</span>
            </div>
          )}
        </div>
      </div>

      {/* Stage Timeline */}
      <div className="grid grid-cols-4 gap-2">
        {['analyzing', 'thinking', 'generating', 'complete'].map((s, idx) => {
          const isActive = s === stage;
          const isPast = ['analyzing', 'thinking', 'generating', 'complete'].indexOf(s) <
                        ['analyzing', 'thinking', 'generating', 'complete'].indexOf(stage);

          return (
            <div
              key={s}
              className={`p-2 border-2 border-neo-black text-center text-xs font-bold uppercase transition-all ${
                isActive ? 'bg-neo-cyan scale-105' :
                isPast ? 'bg-neo-green' :
                'bg-neo-white opacity-50'
              }`}
            >
              {idx + 1}. {s}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .shimmer-animation {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          animation: shimmer 2s infinite;
        }

        @keyframes dots {
          0%, 20% {
            content: '.';
          }
          40% {
            content: '..';
          }
          60%, 100% {
            content: '...';
          }
        }

        .dots-animation::after {
          content: '';
          animation: dots 1.5s infinite;
        }
      `}</style>
    </div>
  );
};

export default GradingAnimation;
