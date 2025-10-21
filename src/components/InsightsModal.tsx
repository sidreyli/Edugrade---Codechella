import React from 'react';
import {
  X,
  TrendingUp,
  AlertCircle,
  BookOpen,
  Target,
  Award,
  Lightbulb,
  CheckCircle2,
  ArrowUpCircle,
  Sparkles
} from 'lucide-react';
import { getLetterGrade, getGradeColor } from '../utils/grading';

interface Recommendation {
  topic: string;
  resource: string;
  priority: 'high' | 'medium' | 'low';
}

interface GradeInsights {
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: Recommendation[];
  detailed_feedback?: string;
}

interface InsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: {
    file_name: string;
    created_at: string;
    assignments?: {
      title: string;
      max_score?: number;
      classroom_id?: string;
    };
  };
  grade: {
    score: number;
    feedback: string;
    insights?: GradeInsights;
    created_at: string;
  };
  gradingScale?: Record<string, number> | null;
}

const InsightsModal: React.FC<InsightsModalProps> = ({
  isOpen,
  onClose,
  submission,
  grade,
  gradingScale
}) => {
  if (!isOpen) return null;

  const insights = grade.insights || {};
  const strengths = insights.strengths || [];
  const weaknesses = insights.weaknesses || [];
  const recommendations = insights.recommendations || [];
  const detailedFeedback = insights.detailed_feedback || grade.feedback;

  // Calculate percentage based on actual max_score
  const maxScore = submission.assignments?.max_score || 100;
  const percentage = Math.round((grade.score / maxScore) * 100);

  // Debug logging
  console.log('InsightsModal Debug:', {
    score: grade.score,
    maxScore,
    percentage,
    assignmentsData: submission.assignments,
    gradingScale
  });

  const getScoreColorByPercentage = (percentage: number) => {
    if (percentage >= 90) return 'bg-neo-green';
    if (percentage >= 80) return 'bg-neo-cyan';
    if (percentage >= 70) return 'bg-neo-yellow';
    return 'bg-neo-pink';
  };

  const getScoreEmoji = (percentage: number) => {
    if (percentage >= 90) return '🌟';
    if (percentage >= 80) return '🎯';
    if (percentage >= 70) return '👍';
    return '📈';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-neo-pink';
      case 'medium':
        return 'bg-neo-yellow';
      case 'low':
        return 'bg-neo-cyan';
      default:
        return 'bg-neo-white';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'HIGH PRIORITY';
      case 'medium':
        return 'MEDIUM PRIORITY';
      case 'low':
        return 'HELPFUL';
      default:
        return 'RECOMMENDED';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card-brutal bg-neo-white max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b-4 border-neo-black p-6 bg-gradient-to-r from-neo-pink to-neo-cyan">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={24} strokeWidth={3} className="text-neo-white" />
                <h2 className="text-2xl font-bold uppercase text-neo-white">
                  GRADE INSIGHTS
                </h2>
              </div>
              <p className="font-bold text-neo-white text-sm opacity-90">
                {submission.assignments?.title || submission.file_name}
              </p>
              <p className="text-xs text-neo-white opacity-75 mt-1">
                Submitted: {new Date(submission.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neo-black hover:bg-opacity-10 transition-colors rounded"
            >
              <X size={24} strokeWidth={3} className="text-neo-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Score Overview */}
          <div className={`card-brutal p-6 ${getScoreColorByPercentage(percentage)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase opacity-70 mb-1">YOUR SCORE</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">{grade.score}</span>
                  <span className="text-3xl font-bold opacity-60">/{maxScore}</span>
                  <span className="text-3xl ml-2">{getScoreEmoji(percentage)}</span>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-bold text-neo-pink">
                    {percentage}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold uppercase opacity-70 mb-1">GRADE</p>
                <div className={`text-4xl font-bold px-4 py-2 border-4 border-neo-black ${
                  gradingScale ? getGradeColor(getLetterGrade(percentage, gradingScale)) : 'bg-neo-white'
                }`}>
                  {gradingScale ? getLetterGrade(percentage, gradingScale) : (
                    percentage >= 90 ? 'A' :
                    percentage >= 80 ? 'B' :
                    percentage >= 70 ? 'C' :
                    percentage >= 60 ? 'D' : 'F'
                  )}
                </div>
              </div>
            </div>

            {/* Score Bar */}
            <div className="mt-4 h-6 border-4 border-neo-black bg-neo-white overflow-hidden">
              <div
                className="h-full bg-neo-black transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Detailed Feedback */}
          {detailedFeedback && (
            <div className="card-brutal p-6 bg-neo-white">
              <div className="flex items-center gap-2 mb-4">
                <Award size={20} strokeWidth={3} />
                <h3 className="font-bold uppercase text-lg">OVERALL FEEDBACK</h3>
              </div>
              <p className="leading-relaxed text-gray-700">{detailedFeedback}</p>
            </div>
          )}

          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="card-brutal p-6 bg-neo-green">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={20} strokeWidth={3} />
                <h3 className="font-bold uppercase text-lg">YOUR STRENGTHS</h3>
              </div>
              <div className="space-y-3">
                {strengths.map((strength, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center border-4 border-neo-black bg-neo-white rounded-full">
                      <span className="font-bold text-sm">{idx + 1}</span>
                    </div>
                    <p className="flex-1 font-bold pt-1">{strength}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weaknesses / Areas for Improvement */}
          {weaknesses.length > 0 && (
            <div className="card-brutal p-6 bg-neo-yellow">
              <div className="flex items-center gap-2 mb-4">
                <Target size={20} strokeWidth={3} />
                <h3 className="font-bold uppercase text-lg">AREAS FOR IMPROVEMENT</h3>
              </div>
              <div className="space-y-3">
                {weaknesses.map((weakness, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center border-4 border-neo-black bg-neo-white rounded-full">
                      <AlertCircle size={16} strokeWidth={3} />
                    </div>
                    <p className="flex-1 font-bold pt-1">{weakness}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="card-brutal p-6 bg-neo-cyan">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={20} strokeWidth={3} />
                <h3 className="font-bold uppercase text-lg">RECOMMENDED RESOURCES</h3>
              </div>
              <p className="text-sm font-bold opacity-70 mb-4">
                Here are some resources to help you improve:
              </p>
              <div className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="card-brutal p-4 bg-neo-white">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} strokeWidth={3} />
                        <h4 className="font-bold uppercase text-sm">{rec.topic}</h4>
                      </div>
                      <span className={`px-2 py-1 text-xs font-bold uppercase border-2 border-neo-black ${getPriorityColor(rec.priority)}`}>
                        {getPriorityLabel(rec.priority)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-700">{rec.resource}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Motivational Message */}
          <div className="card-brutal p-6 bg-gradient-to-r from-neo-pink to-neo-purple text-neo-white text-center">
            <ArrowUpCircle size={32} strokeWidth={3} className="mx-auto mb-3" />
            <h3 className="text-xl font-bold uppercase mb-2">KEEP GROWING! 🚀</h3>
            <p className="font-bold text-sm opacity-90">
              Every submission is a learning opportunity. Use this feedback to improve your next work!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-4 border-neo-black p-4 bg-neo-white">
          <button
            onClick={onClose}
            className="btn-brutal bg-neo-black text-neo-white w-full"
          >
            CLOSE INSIGHTS
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsightsModal;
