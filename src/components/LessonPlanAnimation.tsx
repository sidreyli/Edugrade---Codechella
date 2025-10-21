import React from 'react';
import { Sparkles, Brain, BookOpen, CheckCircle, Loader2, Lightbulb } from 'lucide-react';

interface LessonPlanAnimationProps {
  stage: 'analyzing' | 'researching' | 'structuring' | 'generating' | 'complete';
  progress: number; // 0-100
}

const LessonPlanAnimation: React.FC<LessonPlanAnimationProps> = ({ stage, progress }) => {
  const getStageConfig = () => {
    switch (stage) {
      case 'analyzing':
        return {
          icon: <Sparkles size={32} strokeWidth={3} className="animate-pulse" />,
          title: '🔍 ANALYZING REQUIREMENTS...',
          subtitle: 'Understanding topic, grade level, and learning objectives',
          color: 'bg-neo-cyan'
        };
      case 'researching':
        return {
          icon: <Brain size={32} strokeWidth={3} className="animate-bounce" />,
          title: '📚 RESEARCHING CONTENT...',
          subtitle: 'Gathering educational resources and curriculum standards',
          color: 'bg-neo-yellow'
        };
      case 'structuring':
        return {
          icon: <Lightbulb size={32} strokeWidth={3} className="animate-pulse" />,
          title: '🎯 STRUCTURING LESSON...',
          subtitle: 'Creating engaging activities and assessment strategies',
          color: 'bg-neo-purple text-neo-white'
        };
      case 'generating':
        return {
          icon: <BookOpen size={32} strokeWidth={3} className="animate-pulse" />,
          title: '✍️ GENERATING PLAN...',
          subtitle: 'Writing detailed lesson plan with all components',
          color: 'bg-neo-pink text-neo-white'
        };
      case 'complete':
        return {
          icon: <CheckCircle size={32} strokeWidth={3} className="animate-bounce" />,
          title: '✅ LESSON PLAN READY!',
          subtitle: '✨ Success! Your personalized lesson plan is complete',
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
              <span className="dots-animation">AI is working hard on this</span>
            </div>
          )}
        </div>
      </div>

      {/* Stage Timeline */}
      <div className="grid grid-cols-5 gap-2">
        {['analyzing', 'researching', 'structuring', 'generating', 'complete'].map((s, idx) => {
          const isActive = s === stage;
          const stages = ['analyzing', 'researching', 'structuring', 'generating', 'complete'];
          const isPast = stages.indexOf(s) < stages.indexOf(stage);

          return (
            <div
              key={s}
              className={`p-2 border-2 border-neo-black text-center text-xs font-bold uppercase transition-all ${
                isActive ? 'bg-neo-cyan scale-105' :
                isPast ? 'bg-neo-green' :
                'bg-neo-white opacity-50'
              }`}
            >
              {idx + 1}. {s === 'analyzing' ? 'ANALYZE' : s === 'researching' ? 'RESEARCH' : s === 'structuring' ? 'STRUCTURE' : s === 'generating' ? 'GENERATE' : 'DONE'}
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

export default LessonPlanAnimation;
