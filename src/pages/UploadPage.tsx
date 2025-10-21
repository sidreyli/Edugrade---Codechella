import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { GraduationCap, Upload, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft, BookOpen } from 'lucide-react';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (userRole && userRole !== 'student') {
      navigate('/teacher-dashboard');
      return;
    }

    fetchSubmissions();
    fetchAvailableAssignments();
  }, [user, userRole, navigate]);

  const fetchAvailableAssignments = async () => {
    if (!user) return;

    try {
      // Get all classrooms the student is in using RPC (bypasses RLS)
      const { data: classroomsData, error: classroomError } = await supabase
        .rpc('get_student_classrooms', { student_uuid: user.id });

      console.log('Student classrooms (RPC):', { classroomsData, error: classroomError });

      if (classroomError) throw classroomError;

      if (!classroomsData || classroomsData.length === 0) {
        console.log('Student is not in any classrooms');
        setAssignments([]);
        return;
      }

      const classroomIds = classroomsData.map((c: any) => c.id);
      console.log('Classroom IDs:', classroomIds);

      // Fetch all assignments from these classrooms
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          classrooms(name)
        `)
        .in('classroom_id', classroomIds)
        .order('created_at', { ascending: false });

      console.log('Assignments query result:', { assignmentsData, error: assignmentsError });

      if (assignmentsError) {
        console.error('Assignment fetch error:', assignmentsError);
        throw assignmentsError;
      }

      console.log('Available assignments:', assignmentsData);
      setAssignments(assignmentsData || []);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
    }
  };

  const fetchSubmissions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('submissions')
      .select(`
        *,
        assignments(
          title,
          classrooms(name)
        )
      `)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      console.log('Submissions with assignments:', data);
      setSubmissions(data);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setSuccess(false);
      setExtractedText('');
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    setError('');
    setSuccess(false);

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('submissions')
        .getPublicUrl(fileName);

      // Create submission record
      const submissionData: any = {
        student_id: user.id,
        file_url: publicUrl,
        file_name: file.name,
        status: 'processing'
      };

      // Add assignment_id if selected
      if (selectedAssignmentId) {
        submissionData.assignment_id = selectedAssignmentId;
      }

      const { data: submissionResult, error: submissionError } = await supabase
        .from('submissions')
        .insert(submissionData)
        .select()
        .single();

      if (submissionError) throw submissionError;
      const submissionDataFinal = submissionResult;

      if (submissionError) throw submissionError;

      setUploading(false);
      setProcessing(true);

      // Call OCR Edge Function with Google Vision AI
      console.log('Calling extract_text with:', { fileUrl: publicUrl, submissionId: submissionResult.id });
      
      const { data: functionData, error: functionError } = await supabase.functions.invoke('extract_text', {
        body: {
          fileUrl: publicUrl,
          submissionId: submissionResult.id
        }
      });

      console.log('Edge function response:', { functionData, functionError });

      if (functionError) {
        console.error('Edge function error details:', functionError);
        // Try to get more error info from the response
        const errorMessage = functionError.message || JSON.stringify(functionError);
        throw new Error(`OCR failed: ${errorMessage}`);
      }

      if (!functionData || !functionData.success) {
        const errorMsg = functionData?.error || 'Unknown error from OCR service';
        console.error('OCR service error:', errorMsg);
        throw new Error(`OCR failed: ${errorMsg}`);
      }

      console.log('OCR extraction successful:', functionData);

      setProcessing(false);
      setExtractedText(functionData.extractedText || 'No text extracted');
      setSuccess(true);
      
      // Refresh submissions list
      fetchSubmissions();
      
      // Clear file input
      setFile(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: any) {
      setUploading(false);
      setProcessing(false);
      setError(err.message || 'Failed to upload and process file');
    }
  };

  return (
    <div className="min-h-screen bg-neo-white">
      {/* Header */}
      <header className="border-b-4 border-neo-black bg-neo-green">
        <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <GraduationCap size={32} className="sm:w-10 sm:h-10 text-neo-black" strokeWidth={3} />
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase">UPLOAD SUBMISSION</h1>
              <p className="text-xs sm:text-sm uppercase font-bold">EDUGRADE</p>
            </div>
          </div>
          <button onClick={() => navigate('/student-dashboard')} className="btn-brutal bg-neo-white text-neo-black text-sm sm:text-base px-3 sm:px-4 py-2">
            <ArrowLeft size={16} strokeWidth={3} className="sm:w-5 sm:h-5" />
            <span className="ml-1 sm:ml-2">BACK</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12 max-w-4xl">
        {/* Upload Section */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase mb-4 sm:mb-6">SUBMIT YOUR WORK</h2>
          
          <div className="card-brutal p-4 sm:p-6 md:p-8 bg-neo-white mb-4 sm:mb-6">
            {/* Assignment Selection */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm font-bold uppercase mb-3 sm:mb-4 flex items-center gap-2">
                <BookOpen size={16} strokeWidth={3} className="sm:w-5 sm:h-5" />
                SELECT ASSIGNMENT (OPTIONAL)
              </label>
              {assignments.length === 0 ? (
                <div className="p-3 sm:p-4 border-4 border-neo-black bg-neo-yellow">
                  <p className="font-bold text-xs sm:text-sm">
                    No assignments available. Join a classroom first or submit without linking to an assignment.
                  </p>
                </div>
              ) : (
                <>
                  <select
                    value={selectedAssignmentId}
                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                    className="w-full p-3 sm:p-4 border-4 border-neo-black bg-neo-white font-bold text-xs sm:text-sm"
                  >
                    <option value="">-- NO ASSIGNMENT (GENERAL SUBMISSION) --</option>
                    {assignments.map((assignment) => {
                      // Check if student already submitted for this assignment (excluding failed submissions)
                      const alreadySubmitted = submissions.some(
                        sub => sub.assignment_id === assignment.id && sub.status !== 'failed'
                      );
                      return (
                        <option key={assignment.id} value={assignment.id} disabled={alreadySubmitted}>
                          {alreadySubmitted && '✓ '}{assignment.classrooms?.name || 'Unknown Class'} - {assignment.title}
                          {assignment.due_date && ` (Due: ${new Date(assignment.due_date).toLocaleDateString()})`}
                          {alreadySubmitted && ' - ALREADY SUBMITTED'}
                        </option>
                      );
                    })}
                  </select>
                  
                  {/* Show warning if selected assignment already submitted */}
                  {selectedAssignmentId && submissions.some(sub => sub.assignment_id === selectedAssignmentId && sub.status !== 'failed') && (
                    <div className="mt-4 p-4 border-4 border-neo-pink bg-neo-pink bg-opacity-20">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={20} strokeWidth={3} className="flex-shrink-0 mt-1" />
                        <div>
                          <p className="font-bold text-sm">YOU'VE ALREADY SUBMITTED FOR THIS ASSIGNMENT</p>
                          <p className="text-xs mt-1">
                            Uploading again will create a new submission. Your previous submission will remain in your history.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm font-bold uppercase mb-3 sm:mb-4">SELECT FILE</label>
              <div className="relative">
                <input
                  id="file-input"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  className="hidden"
                />
                <label
                  htmlFor="file-input"
                  className="btn-brutal bg-neo-cyan cursor-pointer inline-flex items-center gap-2 text-sm sm:text-base px-3 sm:px-4 py-2"
                >
                  <Upload size={16} strokeWidth={3} className="sm:w-5 sm:h-5" />
                  CHOOSE FILE
                </label>
                {file && (
                  <span className="ml-2 sm:ml-4 font-bold text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">{file.name}</span>
                )}
              </div>
              <p className="text-xs sm:text-sm mt-2 opacity-60">
                SUPPORTED: PDF, DOC, DOCX, TXT, JPG, PNG (MAX 10MB)
              </p>
            </div>

            {error && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-neo-pink border-4 border-neo-black text-neo-white font-bold flex items-center gap-2 text-xs sm:text-sm">
                <AlertCircle size={16} strokeWidth={3} className="sm:w-5 sm:h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-neo-green border-4 border-neo-black font-bold flex items-center gap-2 text-xs sm:text-sm">
                <CheckCircle size={16} strokeWidth={3} className="sm:w-5 sm:h-5 flex-shrink-0" />
                FILE UPLOADED & PROCESSED SUCCESSFULLY!
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading || processing}
              className="btn-brutal-primary w-full flex items-center justify-center gap-2 text-sm sm:text-base py-3 sm:py-4"
            >
              {uploading && (
                <>
                  <Loader2 size={16} strokeWidth={3} className="sm:w-5 sm:h-5 animate-spin" />
                  UPLOADING...
                </>
              )}
              {processing && (
                <>
                  <Loader2 size={16} strokeWidth={3} className="sm:w-5 sm:h-5 animate-spin" />
                  EXTRACTING TEXT...
                </>
              )}
              {!uploading && !processing && (
                <>
                  <Upload size={16} strokeWidth={3} className="sm:w-5 sm:h-5" />
                  UPLOAD & PROCESS
                </>
              )}
            </button>
          </div>

          {/* Extracted Text Display */}
          {extractedText && (
            <div className="card-brutal p-4 sm:p-6 md:p-8 bg-neo-yellow">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <FileText size={20} strokeWidth={3} className="sm:w-6 sm:h-6" />
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold uppercase">EXTRACTED TEXT</h3>
              </div>
              <textarea
                value={extractedText}
                readOnly
                className="w-full h-48 sm:h-64 p-3 sm:p-4 border-4 border-neo-black bg-neo-white font-mono text-xs sm:text-sm resize-none"
              />
            </div>
          )}
        </div>

        {/* Previous Submissions */}
        <div>
          <h3 className="text-2xl sm:text-3xl font-bold uppercase mb-4 sm:mb-6">YOUR SUBMISSIONS</h3>
          
          {submissions.length === 0 ? (
            <div className="card-brutal p-6 sm:p-8 bg-neo-white text-center">
              <FileText size={40} strokeWidth={3} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-30" />
              <p className="font-bold uppercase opacity-60 text-sm sm:text-base">NO SUBMISSIONS YET</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {submissions.map((submission) => (
                <div key={submission.id} className="card-brutal p-4 sm:p-6 bg-neo-white">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
                    <div className="flex-1 w-full sm:w-auto min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={18} strokeWidth={3} className="sm:w-5 sm:h-5 flex-shrink-0" />
                        <h4 className="font-bold uppercase text-sm sm:text-base truncate">{submission.file_name}</h4>
                      </div>
                      {submission.assignments && (
                        <div className="mb-2 p-2 bg-neo-cyan border-2 border-neo-black inline-block max-w-full">
                          <p className="text-[10px] sm:text-xs font-bold uppercase truncate">
                            📚 {submission.assignments.classrooms?.name || 'Unknown Class'} - {submission.assignments.title}
                          </p>
                        </div>
                      )}
                      <p className="text-xs sm:text-sm opacity-60 mb-2">
                        {new Date(submission.created_at).toLocaleString()}
                      </p>
                      {submission.extracted_text && (
                        <details className="mt-4">
                          <summary className="font-bold uppercase cursor-pointer hover:underline">
                            VIEW EXTRACTED TEXT
                          </summary>
                          <div className="mt-4 p-4 border-4 border-neo-black bg-neo-white">
                            <pre className="whitespace-pre-wrap text-sm font-mono">
                              {submission.extracted_text}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                    <div className="sm:ml-4">
                      <span className={`px-3 sm:px-4 py-2 border-4 border-neo-black font-bold text-xs sm:text-sm ${
                        submission.status === 'completed' ? 'bg-neo-green' :
                        submission.status === 'processing' ? 'bg-neo-yellow' :
                        'bg-neo-pink text-neo-white'
                      }`}>
                        {submission.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
