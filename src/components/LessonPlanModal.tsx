import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  Download, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  Target, 
  CheckCircle,
  FileText,
  List,
  Printer,
  BarChart2,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface LessonPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonPlan: {
    subject: string;
    topic: string;
    plan_content: string;
    performance_summary?: any;
    created_at: string;
  } | null;
}

type ViewMode = 'accordion' | 'document' | 'timeline' | 'checklist' | 'print';

const LessonPlanModal: React.FC<LessonPlanModalProps> = ({ 
  isOpen, 
  onClose, 
  lessonPlan 
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]));
  const [viewMode, setViewMode] = useState<ViewMode>('accordion');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  if (!isOpen || !lessonPlan) return null;

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const getSectionIcon = (header: string) => {
    const headerLower = header.toLowerCase();
    if (headerLower.includes('overview')) return '📖';
    if (headerLower.includes('objective')) return '🎯';
    if (headerLower.includes('prerequisite') || headerLower.includes('prior')) return '🧠';
    if (headerLower.includes('material')) return '📚';
    if (headerLower.includes('activit')) return '⏱️';
    if (headerLower.includes('different')) return '🎨';
    if (headerLower.includes('assessment')) return '✅';
    if (headerLower.includes('homework') || headerLower.includes('extension')) return '📝';
    if (headerLower.includes('teacher') || headerLower.includes('note')) return '💡';
    return '📄';
  };

  const getSectionColor = (index: number) => {
    const colors = [
      'bg-blue-50 border-l-4 border-blue-400',
      'bg-green-50 border-l-4 border-green-400',
      'bg-purple-50 border-l-4 border-purple-400',
      'bg-yellow-50 border-l-4 border-yellow-400',
      'bg-cyan-50 border-l-4 border-cyan-400',
      'bg-pink-50 border-l-4 border-pink-400',
      'bg-orange-50 border-l-4 border-orange-400',
      'bg-indigo-50 border-l-4 border-indigo-400',
      'bg-teal-50 border-l-4 border-teal-400',
    ];
    return colors[index % colors.length];
  };

  const getBorderColor = (index: number) => {
    const colors = [
      '#60a5fa', // blue-400
      '#4ade80', // green-400
      '#c084fc', // purple-400
      '#facc15', // yellow-400
      '#22d3ee', // cyan-400
      '#f472b6', // pink-400
      '#fb923c', // orange-400
      '#818cf8', // indigo-400
      '#2dd4bf', // teal-400
    ];
    return colors[index % colors.length];
  };

  const formatListItems = (text: string) => {
    // Convert bullet points and numbered lists to HTML
    const lines = text.split('\n');
    let inList = false;
    let listType = '';
    
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      
      // Numbered list
      if (/^\d+\./.test(trimmed)) {
        const content = trimmed.replace(/^\d+\.\s*/, '');
        return (
          <div key={idx} className="flex gap-3 mb-2 ml-4">
            <span className="font-bold text-neo-pink min-w-[24px]">
              {trimmed.match(/^\d+/)?.[0]}.
            </span>
            <span className="flex-1">{content}</span>
          </div>
        );
      }
      
      // Bullet list
      if (/^[-•*]/.test(trimmed)) {
        const content = trimmed.replace(/^[-•*]\s*/, '');
        return (
          <div key={idx} className="flex gap-3 mb-2 ml-4">
            <span className="text-neo-cyan min-w-[24px]">•</span>
            <span className="flex-1">{content}</span>
          </div>
        );
      }
      
      // Time stamps
      if (/^\[?\d+/.test(trimmed) || /^\(\d+/.test(trimmed)) {
        return (
          <div key={idx} className="flex items-start gap-3 mb-3 p-3 bg-neo-yellow bg-opacity-20 rounded">
            <Clock size={16} className="mt-1 flex-shrink-0" strokeWidth={3} />
            <span className="flex-1 font-medium">{trimmed}</span>
          </div>
        );
      }
      
      // Sub-headings (bold)
      if (/^[A-Z][A-Za-z\s]+:$/.test(trimmed)) {
        return (
          <h4 key={idx} className="font-bold text-lg mt-4 mb-2 text-neo-black">
            {trimmed}
          </h4>
        );
      }
      
      // Regular paragraph
      if (trimmed) {
        return (
          <p key={idx} className="mb-3 leading-relaxed text-gray-700">
            {trimmed}
          </p>
        );
      }
      
      return <div key={idx} className="h-2" />;
    });
  };

  const parsePlanContent = (content: string) => {
    // Try multiple parsing strategies
    
    // Strategy 1: Look for numbered sections (1. SECTION, 2. SECTION, etc.)
    const numberedSectionRegex = /(?:^|\n)(\d+)\.\s*([A-Z][A-Z\s/]+(?:[A-Z]|IES|S)?)\s*\n/g;
    const matches = [...content.matchAll(numberedSectionRegex)];
    
    if (matches.length > 0) {
      const sections = [];
      
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const nextMatch = matches[i + 1];
        
        const header = match[2].trim();
        const startIndex = match.index! + match[0].length;
        const endIndex = nextMatch ? nextMatch.index! : content.length;
        const sectionContent = content.substring(startIndex, endIndex).trim();
        
        sections.push({
          header,
          content: sectionContent,
          index: i
        });
      }
      
      return sections;
    }
    
    // Strategy 2: Look for sections with **HEADER** or ##HEADER## markdown format
    const markdownRegex = /(?:^|\n)(?:\*\*|##)\s*([A-Z][A-Z\s/]+(?:[A-Z]|IES|S)?)\s*(?:\*\*|##)\s*\n/g;
    const markdownMatches = [...content.matchAll(markdownRegex)];
    
    if (markdownMatches.length > 0) {
      const sections = [];
      
      for (let i = 0; i < markdownMatches.length; i++) {
        const match = markdownMatches[i];
        const nextMatch = markdownMatches[i + 1];
        
        const header = match[1].trim();
        const startIndex = match.index! + match[0].length;
        const endIndex = nextMatch ? nextMatch.index! : content.length;
        const sectionContent = content.substring(startIndex, endIndex).trim();
        
        sections.push({
          header,
          content: sectionContent,
          index: i
        });
      }
      
      return sections;
    }
    
    // Strategy 3: Fallback - split by double newlines and treat as sections
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 30);
    if (paragraphs.length > 1) {
      return paragraphs.map((para, idx) => {
        const lines = para.trim().split('\n');
        const firstLine = lines[0].replace(/^[#*\d.\s-]+/, '').trim();
        const header = firstLine.length > 100 ? `Section ${idx + 1}` : firstLine;
        const body = lines.length > 1 ? lines.slice(1).join('\n') : para;
        
        return {
          header,
          content: body,
          index: idx
        };
      });
    }
    
    // Strategy 4: Ultimate fallback - return entire content as one section
    return [{
      header: 'Lesson Plan',
      content: content,
      index: 0
    }];
  };

  const sections = parsePlanContent(lessonPlan.plan_content);
  
  // Debug logging (can be removed in production)
  useEffect(() => {
    console.log('📚 Lesson Plan Parsed:', {
      totalSections: sections.length,
      sections: sections.map(s => s.header),
      firstSectionPreview: sections[0]?.content.substring(0, 100) + '...'
    });
  }, [sections]);

  const toggleCheckItem = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const extractTimelineData = () => {
    // Look for activities section
    const activitiesSection = sections.find((s: any) => 
      s.header.toLowerCase().includes('activit') || 
      s.header.toLowerCase().includes('procedure') ||
      s.header.toLowerCase().includes('schedule')
    );
    
    if (!activitiesSection) {
      // Fallback: search ALL sections for time-stamped activities
      const allLines = sections.flatMap((s: any) => 
        s.content.split('\n').map(line => ({ line, section: s.header }))
      );
      
      const timeline: Array<{ time: string; activity: string; duration: number }> = [];
      
      allLines.forEach(({ line }) => {
        // More flexible time matching patterns
        const patterns = [
          /\[?(\d+)-(\d+)\s*min(?:utes?)?\]?/i,           // [5-10 min] or (5-10 minutes)
          /\((\d+)-(\d+)\s*min(?:utes?)?\)/i,             // (5-10 min)
          /(\d+)-(\d+)\s*min(?:utes?)?:/i,                // 5-10 min:
          /\[?(\d+)\s*min(?:utes?)?\]?/i,                 // [10 min]
          /\((\d+)\s*min(?:utes?)?\)/i,                   // (10 min)
          /(\d+)\s*min(?:utes?)?:/i,                      // 10 min:
        ];
        
        for (const pattern of patterns) {
          const timeMatch = line.match(pattern);
          if (timeMatch) {
            const startTime = parseInt(timeMatch[1]);
            const endTime = timeMatch[2] ? parseInt(timeMatch[2]) : startTime + 5;
            const duration = timeMatch[2] ? endTime - startTime : startTime;
            const activity = line.replace(/\[.*?\]|\(.*?\)|^\d+\.\s*|^[-•*]\s*/g, '').trim();
            
            if (activity && activity.length > 5) {
              timeline.push({
                time: timeMatch[2] ? `${startTime}-${endTime} min` : `${startTime} min`,
                activity,
                duration
              });
              break; // Only match first pattern
            }
          }
        }
      });
      
      return timeline.length > 0 ? timeline : [];
    }

    const lines = activitiesSection.content.split('\n');
    const timeline: Array<{ time: string; activity: string; duration: number }> = [];
    
    lines.forEach(line => {
      // More flexible time matching patterns
      const patterns = [
        /\[?(\d+)-(\d+)\s*min(?:utes?)?\]?/i,
        /\((\d+)-(\d+)\s*min(?:utes?)?\)/i,
        /(\d+)-(\d+)\s*min(?:utes?)?:/i,
        /\[?(\d+)\s*min(?:utes?)?\]?/i,
        /\((\d+)\s*min(?:utes?)?\)/i,
        /(\d+)\s*min(?:utes?)?:/i,
      ];
      
      for (const pattern of patterns) {
        const timeMatch = line.match(pattern);
        if (timeMatch) {
          const startTime = parseInt(timeMatch[1]);
          const endTime = timeMatch[2] ? parseInt(timeMatch[2]) : startTime + 5;
          const duration = timeMatch[2] ? endTime - startTime : startTime;
          const activity = line.replace(/\[.*?\]|\(.*?\)|^\d+\.\s*|^[-•*]\s*/g, '').trim();
          
          if (activity && activity.length > 5) {
            timeline.push({
              time: timeMatch[2] ? `${startTime}-${endTime} min` : `${startTime} min`,
              activity,
              duration
            });
            break;
          }
        }
      }
    });
    
    return timeline;
  };

  const getQuickInfo = () => {
    const materialsSection = sections.find((s: any) => 
      s.header.toLowerCase().includes('material')
    );
    const materialsCount = materialsSection 
      ? materialsSection.content.split('\n').filter((l: string) => l.trim().match(/^[-•*\d]/)).length 
      : 0;

    const activitiesSection = sections.find((s: any) => 
      s.header.toLowerCase().includes('activit')
    );
    const totalDuration = activitiesSection 
      ? activitiesSection.content.match(/\d+\s*min/gi)?.reduce((sum: number, match: string) => {
          const num = parseInt(match.match(/\d+/)?.[0] || '0');
          return sum + num;
        }, 0) || 45
      : 45;

    return {
      materialsCount,
      totalDuration,
      sectionsCount: sections.length
    };
  };

  const quickInfo = getQuickInfo();
  const timelineData = extractTimelineData();
  
  // Debug logging for timeline
  useEffect(() => {
    console.log('⏱️ Timeline Data Extracted:', {
      totalActivities: timelineData.length,
      activities: timelineData.map(t => ({ time: t.time, activity: t.activity.substring(0, 50) }))
    });
  }, [timelineData]);

  const handleDownload = () => {
    const content = `LESSON PLAN
Subject: ${lessonPlan.subject}
Topic: ${lessonPlan.topic}
Generated: ${new Date(lessonPlan.created_at).toLocaleDateString()}

${lessonPlan.plan_content}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lesson-plan-${lessonPlan.subject}-${lessonPlan.topic}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black bg-opacity-50">
      <div className="card-brutal bg-neo-white max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b-4 border-neo-black bg-neo-cyan">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <BookOpen size={32} strokeWidth={3} />
              <div>
                <h2 className="text-2xl font-bold uppercase">AI LESSON PLAN</h2>
                <p className="text-sm font-bold">{lessonPlan.subject} - {lessonPlan.topic}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleDownload}
                className="btn-brutal bg-neo-white text-neo-black p-2"
                title="Download Lesson Plan"
              >
                <Download size={24} strokeWidth={3} />
              </button>
              <button 
                onClick={onClose}
                className="btn-brutal bg-neo-white text-neo-black p-2"
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="px-6 pb-4 flex gap-2 flex-wrap">
            <button
              onClick={() => setViewMode('accordion')}
              className={`btn-brutal text-sm py-2 px-4 flex items-center gap-2 ${
                viewMode === 'accordion' ? 'bg-neo-black text-neo-white' : 'bg-neo-white text-neo-black'
              }`}
            >
              <List size={16} strokeWidth={3} />
              ACCORDION
            </button>
            <button
              onClick={() => setViewMode('document')}
              className={`btn-brutal text-sm py-2 px-4 flex items-center gap-2 ${
                viewMode === 'document' ? 'bg-neo-black text-neo-white' : 'bg-neo-white text-neo-black'
              }`}
            >
              <FileText size={16} strokeWidth={3} />
              DOCUMENT
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`btn-brutal text-sm py-2 px-4 flex items-center gap-2 ${
                viewMode === 'timeline' ? 'bg-neo-black text-neo-white' : 'bg-neo-white text-neo-black'
              }`}
            >
              <BarChart2 size={16} strokeWidth={3} />
              TIMELINE
            </button>
            <button
              onClick={() => setViewMode('checklist')}
              className={`btn-brutal text-sm py-2 px-4 flex items-center gap-2 ${
                viewMode === 'checklist' ? 'bg-neo-black text-neo-white' : 'bg-neo-white text-neo-black'
              }`}
            >
              <CheckCircle size={16} strokeWidth={3} />
              CHECKLIST
            </button>
            <button
              onClick={() => setViewMode('print')}
              className={`btn-brutal text-sm py-2 px-4 flex items-center gap-2 ${
                viewMode === 'print' ? 'bg-neo-black text-neo-white' : 'bg-neo-white text-neo-black'
              }`}
            >
              <Printer size={16} strokeWidth={3} />
              PRINT
            </button>
          </div>
        </div>

        {/* Content Area with Sidebar */}
        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar - Quick Info */}
          {viewMode !== 'print' && (
            <div className="w-64 border-r-4 border-neo-black bg-neo-yellow p-6 overflow-y-auto">
              <h3 className="text-lg font-bold uppercase mb-4">QUICK INFO</h3>
              
              <div className="space-y-4">
                <div className="card-brutal p-3 bg-neo-white">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={16} strokeWidth={3} />
                    <p className="text-xs font-bold uppercase">SUBJECT</p>
                  </div>
                  <p className="font-bold text-sm">{lessonPlan.subject}</p>
                </div>

                <div className="card-brutal p-3 bg-neo-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Target size={16} strokeWidth={3} />
                    <p className="text-xs font-bold uppercase">TOPIC</p>
                  </div>
                  <p className="font-bold text-sm">{lessonPlan.topic}</p>
                </div>

                <div className="card-brutal p-3 bg-neo-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={16} strokeWidth={3} />
                    <p className="text-xs font-bold uppercase">DURATION</p>
                  </div>
                  <p className="font-bold text-sm">{quickInfo.totalDuration} minutes</p>
                </div>

                <div className="card-brutal p-3 bg-neo-white">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={16} strokeWidth={3} />
                    <p className="text-xs font-bold uppercase">MATERIALS</p>
                  </div>
                  <p className="font-bold text-sm">{quickInfo.materialsCount} items</p>
                </div>

                <div className="card-brutal p-3 bg-neo-white">
                  <div className="flex items-center gap-2 mb-1">
                    <List size={16} strokeWidth={3} />
                    <p className="text-xs font-bold uppercase">SECTIONS</p>
                  </div>
                  <p className="font-bold text-sm">{quickInfo.sectionsCount}</p>
                </div>

                <div className="card-brutal p-3 bg-neo-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={16} strokeWidth={3} />
                    <p className="text-xs font-bold uppercase">CREATED</p>
                  </div>
                  <p className="font-bold text-sm">
                    {new Date(lessonPlan.created_at).toLocaleDateString()}
                  </p>
                </div>

                {lessonPlan.performance_summary && (
                  <div className="card-brutal p-3 bg-neo-pink text-neo-white">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={16} strokeWidth={3} />
                      <p className="text-xs font-bold uppercase">CLASS DATA</p>
                    </div>
                    <p className="text-xs font-bold mb-1">
                      Avg: {lessonPlan.performance_summary.averageScore}%
                    </p>
                    <p className="text-xs font-bold">
                      Students: {lessonPlan.performance_summary.totalStudents}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* ACCORDION VIEW */}
            {viewMode === 'accordion' && (
              <div className="space-y-3">
                {sections.map((section: any, idx: number) => (
                  <div 
                    key={idx} 
                    className={`rounded-lg overflow-hidden transition-all ${getSectionColor(idx)}`}
                  >
                    <button
                      onClick={() => toggleSection(idx)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-black hover:bg-opacity-5 transition-colors"
                    >
                      <span className="text-2xl">{getSectionIcon(section.header)}</span>
                      <h3 className="text-lg font-bold flex-1 text-left">
                        {section.header}
                      </h3>
                      {expandedSections.has(idx) ? (
                        <ChevronDown size={20} strokeWidth={3} className="text-gray-600" />
                      ) : (
                        <ChevronRight size={20} strokeWidth={3} className="text-gray-600" />
                      )}
                    </button>

                    {expandedSections.has(idx) && (
                      <div className="p-6 pt-2 bg-white bg-opacity-50">
                        <div className="space-y-2">
                          {formatListItems(section.content)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* DOCUMENT VIEW */}
            {viewMode === 'document' && (
              <div className="max-w-4xl mx-auto space-y-8">
                {sections.map((section: any, idx: number) => (
                  <div key={idx} className="border-l-4 pl-6" style={{ borderColor: getBorderColor(idx) }}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{getSectionIcon(section.header)}</span>
                      <h2 className="text-2xl font-bold uppercase">{section.header}</h2>
                    </div>
                    <div className="space-y-2 text-gray-700 leading-relaxed">
                      {section.content.split('\n').map((line: string, lineIdx: number) => {
                        const trimmed = line.trim();
                        if (!trimmed) return null;
                        
                        // Numbered lists - simple styling for document view
                        if (/^\d+\./.test(trimmed)) {
                          const match = trimmed.match(/^(\d+\.)\s*(.*)$/);
                          if (match) {
                            return (
                              <div key={lineIdx} className="flex gap-2 mb-2 ml-2">
                                <span className="font-semibold text-gray-700">{match[1]}</span>
                                <span className="flex-1">{match[2]}</span>
                              </div>
                            );
                          }
                        }
                        
                        // Bullet points
                        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                          const content = trimmed.substring(1).trim();
                          return (
                            <div key={lineIdx} className="flex gap-2 mb-1 ml-4">
                              <span className="text-gray-600">•</span>
                              <span className="flex-1">{content}</span>
                            </div>
                          );
                        }
                        
                        // Time stamps
                        if (/\[\d+(-\d+)?\s*(min|minutes)\]/.test(trimmed)) {
                          return (
                            <div key={lineIdx} className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded">
                              <Clock size={14} className="text-gray-600" />
                              <span>{trimmed}</span>
                            </div>
                          );
                        }
                        
                        // Sub-headings (lines ending with colon)
                        if (trimmed.endsWith(':')) {
                          return (
                            <p key={lineIdx} className="font-semibold text-gray-800 mt-3 mb-1">
                              {trimmed}
                            </p>
                          );
                        }
                        
                        // Regular paragraphs
                        return <p key={lineIdx} className="mb-2">{trimmed}</p>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TIMELINE VIEW */}
            {viewMode === 'timeline' && (
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold uppercase mb-6 flex items-center gap-2">
                  <BarChart2 size={28} strokeWidth={3} />
                  LESSON TIMELINE
                </h2>
                
                {timelineData.length > 0 ? (
                  <div className="space-y-3">
                    {timelineData.map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="w-32 flex-shrink-0">
                          <div className="card-brutal p-3 bg-neo-cyan text-center">
                            <Clock size={20} strokeWidth={3} className="mx-auto mb-1" />
                            <p className="font-bold text-sm">{item.time}</p>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="card-brutal p-4 bg-neo-white h-full">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-neo-pink rounded-full"></div>
                              <p className="font-bold uppercase text-xs text-gray-600">
                                {item.duration} MINUTES
                              </p>
                            </div>
                            <p className="font-bold">{item.activity}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card-brutal p-8 bg-neo-yellow text-center">
                    <p className="font-bold uppercase">
                      No timeline data available. View other sections in Document or Accordion view.
                    </p>
                  </div>
                )}

                {/* All Other Sections */}
                <div className="mt-8 space-y-4">
                  {sections.filter((s: any) => !s.header.toLowerCase().includes('activit')).map((section: any, idx: number) => (
                    <details key={idx} className="card-brutal p-4 bg-neo-white">
                      <summary className="font-bold uppercase cursor-pointer flex items-center gap-2">
                        <span>{getSectionIcon(section.header)}</span>
                        {section.header}
                      </summary>
                      <div className="mt-4 pl-6 space-y-1 text-sm">
                        {section.content.split('\n').map((line: string, lineIdx: number) => {
                          const trimmed = line.trim();
                          if (!trimmed) return null;
                          return <p key={lineIdx} className="mb-1">{trimmed}</p>;
                        })}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* CHECKLIST VIEW */}
            {viewMode === 'checklist' && (
              <div className="max-w-4xl mx-auto">
                <div className="card-brutal p-6 bg-neo-green mb-6">
                  <h2 className="text-2xl font-bold uppercase mb-2">TEACHING CHECKLIST</h2>
                  <p className="text-sm font-bold">
                    Check off items as you complete them during the lesson
                  </p>
                </div>

                <div className="space-y-6">
                  {sections.map((section: any, idx: number) => (
                    <div key={idx} className="card-brutal p-6 bg-neo-white">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">{getSectionIcon(section.header)}</span>
                        <h3 className="text-xl font-bold uppercase">{section.header}</h3>
                      </div>
                      
                      <div className="space-y-3">
                        {section.content.split('\n').filter((line: string) => line.trim()).map((line: string, lineIdx: number) => {
                          const itemId = `${idx}-${lineIdx}`;
                          const isChecked = checkedItems.has(itemId);
                          
                          return (
                            <label 
                              key={lineIdx}
                              className={`flex items-start gap-3 p-3 border-2 border-neo-black rounded cursor-pointer transition-colors ${
                                isChecked ? 'bg-neo-green bg-opacity-30' : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCheckItem(itemId)}
                                className="mt-1 w-5 h-5 cursor-pointer"
                              />
                              <span className={`flex-1 ${isChecked ? 'line-through opacity-60' : ''}`}>
                                {line.replace(/^[-•*\d+\.]\s*/, '')}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 card-brutal p-4 bg-neo-cyan text-center">
                  <p className="font-bold">
                    {checkedItems.size} of {sections.reduce((acc: number, s: any) => 
                      acc + s.content.split('\n').filter((l: string) => l.trim()).length, 0
                    )} items completed
                  </p>
                </div>
              </div>
            )}

            {/* PRINT VIEW */}
            {viewMode === 'print' && (
              <div className="max-w-4xl mx-auto bg-white p-8 print:p-0">
                <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
                  <h1 className="text-3xl font-bold mb-2">{lessonPlan.subject}</h1>
                  <h2 className="text-xl font-bold text-gray-600 mb-4">{lessonPlan.topic}</h2>
                  <p className="text-sm text-gray-500">
                    Generated: {new Date(lessonPlan.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-6">
                  {sections.map((section: any, idx: number) => (
                    <div key={idx} className="break-inside-avoid">
                      <h3 className="text-lg font-bold uppercase mb-3 pb-2 border-b-2 border-gray-200">
                        {section.header}
                      </h3>
                      <div className="pl-4 space-y-1 text-sm leading-relaxed text-gray-800">
                        {section.content.split('\n').map((line: string, lineIdx: number) => {
                          const trimmed = line.trim();
                          if (!trimmed) return null;
                          return <p key={lineIdx} className="mb-1">{trimmed}</p>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 text-center print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="btn-brutal bg-neo-black text-neo-white px-6 py-3"
                  >
                    <Printer size={20} strokeWidth={3} className="inline mr-2" />
                    PRINT THIS PLAN
                  </button>
                </div>
              </div>
            )}

            {/* Fallback */}
            {sections.length === 0 && (
              <div className="card-brutal p-8 bg-neo-white">
                <div className="whitespace-pre-wrap leading-relaxed text-gray-700">
                  {lessonPlan.plan_content}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar - Progress & Timer */}
        {viewMode !== 'print' && (
          <div className="border-t-4 border-neo-black bg-neo-pink text-neo-white">
            <div className="p-4 flex items-center justify-between flex-wrap gap-4">
              {/* Progress Tracker */}
              {viewMode === 'checklist' && (
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <span className="font-bold uppercase text-sm">PROGRESS:</span>
                    <div className="flex-1 h-4 bg-white bg-opacity-30 border-2 border-neo-black rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-neo-yellow transition-all duration-300"
                        style={{ 
                          width: `${(checkedItems.size / sections.reduce((acc: number, s: any) => 
                            acc + s.content.split('\n').filter((l: string) => l.trim()).length, 0
                          )) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="font-bold text-sm">
                      {Math.round((checkedItems.size / sections.reduce((acc: number, s: any) => 
                        acc + s.content.split('\n').filter((l: string) => l.trim()).length, 0
                      )) * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Timer */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-neo-white text-neo-black px-4 py-2 border-2 border-neo-black">
                  <Clock size={20} strokeWidth={3} />
                  <span className="font-bold text-lg">{formatTime(elapsedTime)}</span>
                </div>
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="btn-brutal bg-neo-white text-neo-black p-2"
                  title={timerRunning ? 'Pause Timer' : 'Start Timer'}
                >
                  {timerRunning ? (
                    <Pause size={20} strokeWidth={3} />
                  ) : (
                    <Play size={20} strokeWidth={3} />
                  )}
                </button>
                <button
                  onClick={() => {
                    setElapsedTime(0);
                    setTimerRunning(false);
                  }}
                  className="btn-brutal bg-neo-white text-neo-black p-2"
                  title="Reset Timer"
                >
                  <RotateCcw size={20} strokeWidth={3} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={handleDownload}
                  className="btn-brutal bg-neo-white text-neo-black px-4 py-2 text-sm"
                >
                  <Download size={16} strokeWidth={3} className="inline mr-2" />
                  DOWNLOAD
                </button>
                <button 
                  onClick={onClose}
                  className="btn-brutal bg-neo-black text-neo-white px-4 py-2 text-sm"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Print View Footer */}
        {viewMode === 'print' && (
          <div className="p-6 border-t-4 border-neo-black bg-neo-white flex gap-4 print:hidden">
            <button 
              onClick={() => window.print()}
              className="btn-brutal bg-neo-black text-neo-white flex-1"
            >
              <Printer size={20} strokeWidth={3} className="mr-2" />
              PRINT NOW
            </button>
            <button 
              onClick={onClose}
              className="btn-brutal bg-neo-white text-neo-black flex-1"
            >
              CLOSE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonPlanModal;
