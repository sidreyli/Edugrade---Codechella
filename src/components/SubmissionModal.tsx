import React from 'react';
import { X, FileText, Calendar, User, GraduationCap } from 'lucide-react';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: {
    file_name: string;
    extracted_text: string;
    created_at: string;
    student_name: string;
  } | null;
  grade?: {
    score: number;
    feedback: string;
    rubric: string;
    created_at: string;
  } | null;
}

const SubmissionModal: React.FC<SubmissionModalProps> = ({ 
  isOpen, 
  onClose, 
  submission,
  grade 
}) => {
  if (!isOpen || !submission) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black bg-opacity-50">
      <div className="card-brutal bg-neo-white max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-4 border-neo-black bg-neo-cyan">
          <div className="flex items-center gap-3">
            <FileText size={32} strokeWidth={3} />
            <div>
              <h2 className="text-2xl font-bold uppercase">SUBMISSION DETAILS</h2>
              <p className="text-sm font-bold">{submission.file_name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn-brutal bg-neo-white text-neo-black p-2"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User size={20} strokeWidth={3} />
              <div>
                <p className="text-xs font-bold uppercase opacity-60">STUDENT</p>
                <p className="font-bold">{submission.student_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={20} strokeWidth={3} />
              <div>
                <p className="text-xs font-bold uppercase opacity-60">SUBMITTED</p>
                <p className="font-bold">
                  {new Date(submission.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Extracted Text */}
          <div>
            <h3 className="text-lg font-bold uppercase mb-3 flex items-center gap-2">
              <FileText size={20} strokeWidth={3} />
              EXTRACTED TEXT
            </h3>
            <div className="p-4 border-4 border-neo-black bg-neo-yellow max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {submission.extracted_text}
              </pre>
            </div>
          </div>

          {/* Grade Information */}
          {grade && (
            <div className="card-brutal p-6 bg-neo-green">
              <h3 className="text-lg font-bold uppercase mb-4 flex items-center gap-2">
                <GraduationCap size={20} strokeWidth={3} />
                GRADE INFORMATION
              </h3>

              {/* Score */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold uppercase">SCORE</span>
                  <span className="text-3xl font-bold">{grade.score}/100</span>
                </div>
                <div className="h-4 border-4 border-neo-black bg-neo-white">
                  <div 
                    className="h-full bg-neo-black transition-all"
                    style={{ width: `${grade.score}%` }}
                  />
                </div>
              </div>

              {/* Feedback */}
              <div className="mb-4">
                <h4 className="font-bold uppercase mb-2">FEEDBACK</h4>
                <div className="p-4 border-4 border-neo-black bg-neo-white">
                  <p className="whitespace-pre-wrap">{grade.feedback}</p>
                </div>
              </div>

              {/* Rubric */}
              {grade.rubric && (
                <div className="mb-4">
                  <h4 className="font-bold uppercase mb-2">RUBRIC USED</h4>
                  <div className="p-4 border-4 border-neo-black bg-neo-white">
                    <p className="whitespace-pre-wrap text-sm">{grade.rubric}</p>
                  </div>
                </div>
              )}

              {/* Graded Date */}
              <div className="text-sm font-bold opacity-60">
                GRADED ON: {new Date(grade.created_at).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t-4 border-neo-black bg-neo-white">
          <button 
            onClick={onClose}
            className="btn-brutal-primary w-full"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmissionModal;
