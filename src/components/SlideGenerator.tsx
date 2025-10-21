import React, { useState } from 'react';
import { X, Download, ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import pptxgen from 'pptxgenjs';
import LessonPlanAnimation from './LessonPlanAnimation';

interface Slide {
  slideNumber: number;
  type: string;
  title: string;
  subtitle?: string;
  content: string[];
  speakerNotes: string;
  suggestedImage?: string;
}

interface SlideGeneratorProps {
  lessonPlanId: string;
  lessonPlanContent: string;
  lessonTitle: string;
  onClose: () => void;
}

export default function SlideGenerator({ 
  lessonPlanId, 
  lessonPlanContent, 
  lessonTitle,
  onClose 
}: SlideGeneratorProps) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [slideDeckId, setSlideDeckId] = useState<string | null>(null);
  const [generationStage, setGenerationStage] = useState<'analyzing' | 'researching' | 'structuring' | 'generating' | 'complete' | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);

  const generateSlides = async () => {
    setIsGenerating(true);
    setGenerationStage('analyzing');
    setGenerationProgress(0);

    // Progress animation
    const progressAnimation = async () => {
      // Stage 1: Analyzing (0-20%)
      await new Promise(resolve => setTimeout(resolve, 700));
      setGenerationProgress(10);

      await new Promise(resolve => setTimeout(resolve, 700));
      setGenerationProgress(20);
      setGenerationStage('researching');

      // Stage 2: Researching (21-40%)
      await new Promise(resolve => setTimeout(resolve, 1000));
      setGenerationProgress(30);

      await new Promise(resolve => setTimeout(resolve, 1000));
      setGenerationProgress(40);
      setGenerationStage('structuring');

      // Stage 3: Structuring (41-65%)
      await new Promise(resolve => setTimeout(resolve, 1200));
      setGenerationProgress(52);

      await new Promise(resolve => setTimeout(resolve, 1200));
      setGenerationProgress(65);
      setGenerationStage('generating');

      // Stage 4: Generating (66-85%)
      await new Promise(resolve => setTimeout(resolve, 1500));
      setGenerationProgress(75);

      await new Promise(resolve => setTimeout(resolve, 1500));
      setGenerationProgress(85);
    };

    // Start animation
    progressAnimation();

    try {
      const { data, error } = await supabase.functions.invoke('generate_slides', {
        body: {
          lessonPlanId,
          lessonPlanContent,
          customization: {
            theme: 'professional',
            slidesCount: 'auto',
            includeNotes: true,
          },
        },
      });

      if (error) throw error;

      // Complete animation
      setGenerationProgress(100);
      setGenerationStage('complete');

      // Wait for completion animation
      await new Promise(resolve => setTimeout(resolve, 800));

      setSlides(data.slides);
      setSlideDeckId(data.slideDeckId);
    } catch (error: any) {
      console.error('Error generating slides:', error);
      alert('Failed to generate slides: ' + error.message);
    } finally {
      setIsGenerating(false);
      setGenerationStage(null);
      setGenerationProgress(0);
    }
  };

  const exportToPowerPoint = async () => {
    setIsExporting(true);
    try {
      const pptx = new pptxgen();

      // Set presentation properties
      pptx.author = 'StudyBuddy AI';
      pptx.title = lessonTitle;
      pptx.subject = 'Lesson Plan Presentation';

      // Define theme colors
      const colors = {
        primary: '4F46E5',
        secondary: '10B981',
        text: '1F2937',
        lightText: '6B7280',
      };

      slides.forEach((slide, index) => {
        const pptSlide = pptx.addSlide();

        // Add slide number footer
        pptSlide.addText(`${index + 1}`, {
          x: 9.5,
          y: 7,
          w: 0.5,
          h: 0.3,
          fontSize: 10,
          color: colors.lightText,
          align: 'right',
        });

        if (slide.type === 'title') {
          // Title slide
          pptSlide.background = { color: colors.primary };
          
          pptSlide.addText(slide.title, {
            x: 0.5,
            y: 2.5,
            w: 9,
            h: 1.5,
            fontSize: 44,
            bold: true,
            color: 'FFFFFF',
            align: 'center',
          });

          if (slide.subtitle) {
            pptSlide.addText(slide.subtitle, {
              x: 0.5,
              y: 4.2,
              w: 9,
              h: 0.8,
              fontSize: 24,
              color: 'FFFFFF',
              align: 'center',
            });
          }
        } else {
          // Content slides
          pptSlide.addText(slide.title, {
            x: 0.5,
            y: 0.5,
            w: 9,
            h: 0.8,
            fontSize: 32,
            bold: true,
            color: colors.primary,
          });

          // Add divider line
          pptSlide.addShape(pptx.ShapeType.rect, {
            x: 0.5,
            y: 1.4,
            w: 9,
            h: 0.05,
            fill: { color: colors.secondary },
          });

          // Add content bullets - adjusted for detailed content
          if (slide.content && slide.content.length > 0) {
            const bulletProps = {
              x: 0.8,
              y: 1.8,
              w: 8.4,
              h: 5.2,
              fontSize: 14,
              color: colors.text,
              bullet: { type: 'number' as const },
              lineSpacing: 24,
              valign: 'top' as const,
            };

            pptSlide.addText(
              slide.content.map((item) => ({ text: item, options: { breakLine: true } })),
              bulletProps
            );
          }
        }

        // Add speaker notes
        if (slide.speakerNotes) {
          pptSlide.addNotes(slide.speakerNotes);
        }
      });

      // Save the presentation
      const fileName = `${lessonTitle.replace(/[^a-z0-9]/gi, '_')}_Slides.pptx`;
      await pptx.writeFile({ fileName });

      alert('Presentation exported successfully!');
    } catch (error: any) {
      console.error('Error exporting to PowerPoint:', error);
      alert('Failed to export presentation: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  React.useEffect(() => {
    generateSlides();
  }, []);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const currentSlideData = slides[currentSlide];

  return (
    <div className="fixed inset-0 bg-neo-black/80 flex items-center justify-center z-50 p-4">
      <div className="card-brutal bg-neo-white w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-4 border-neo-black bg-neo-purple">
          <div>
            <h2 className="text-2xl font-bold uppercase text-neo-white">📊 SLIDE GENERATOR</h2>
            <p className="text-sm font-bold text-neo-white/90 mt-1">{lessonTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="btn-brutal bg-neo-pink text-neo-white p-2"
          >
            <X className="w-6 h-6" strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Slide Thumbnails */}
          <div className="w-64 border-r-4 border-neo-black bg-neo-yellow overflow-y-auto p-4">
            <h3 className="text-sm font-bold uppercase text-neo-black mb-4">
              📑 SLIDES ({slides.length})
            </h3>
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-neo-black animate-spin mb-2" strokeWidth={3} />
                <p className="text-sm font-bold text-neo-black">GENERATING...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {slides.map((slide, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-full p-3 border-4 border-neo-black text-left transition-all font-bold uppercase ${
                      currentSlide === index
                        ? 'bg-neo-cyan text-neo-black shadow-brutal'
                        : 'bg-neo-white text-neo-black hover:translate-x-1 hover:translate-y-1'
                    }`}
                  >
                    <div className="text-xs mb-1">SLIDE {slide.slideNumber}</div>
                    <div className="text-sm truncate">{slide.title}</div>
                    <div className="text-xs opacity-75 mt-1">{slide.type.toUpperCase()}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Slide Preview */}
          <div className="flex-1 flex flex-col bg-neo-white">
            {isGenerating ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-2xl">
                  {generationStage && (
                    <LessonPlanAnimation stage={generationStage} progress={generationProgress} />
                  )}
                </div>
              </div>
            ) : currentSlideData ? (
              <>
                {/* Slide Display */}
                <div className="flex-1 p-8 overflow-y-auto">
                  <div className="max-w-4xl mx-auto card-brutal bg-neo-white aspect-video flex flex-col p-8">
                    {currentSlideData.type === 'title' ? (
                      <>
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                          <h1 className="text-5xl font-bold uppercase text-neo-purple mb-4">
                            {currentSlideData.title}
                          </h1>
                          {currentSlideData.subtitle && (
                            <p className="text-2xl font-bold text-neo-black">{currentSlideData.subtitle}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-3xl font-bold uppercase text-neo-purple mb-6 pb-3 border-b-4 border-neo-cyan">
                          {currentSlideData.title}
                        </h2>
                        <div className="flex-1 overflow-y-auto">
                          {currentSlideData.content && currentSlideData.content.length > 0 && (
                            <ul className="space-y-3">
                              {currentSlideData.content.map((item, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="text-neo-cyan font-bold text-xl mr-3 flex-shrink-0">
                                    {idx + 1}.
                                  </span>
                                  <span className="text-base font-bold text-neo-black leading-relaxed">
                                    {item}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Speaker Notes */}
                  {currentSlideData.speakerNotes && (
                    <div className="max-w-4xl mx-auto mt-6 card-brutal bg-neo-pink p-6">
                      <div className="flex items-center mb-3">
                        <FileText className="w-5 h-5 text-neo-white mr-2" strokeWidth={3} />
                        <h3 className="font-bold uppercase text-neo-white">📝 SPEAKER NOTES</h3>
                      </div>
                      <p className="text-sm font-bold text-neo-white">{currentSlideData.speakerNotes}</p>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="border-t-4 border-neo-black p-4 flex items-center justify-between bg-neo-yellow">
                  <button
                    onClick={prevSlide}
                    disabled={currentSlide === 0}
                    className="btn-brutal bg-neo-white text-neo-black px-6 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" strokeWidth={3} />
                    PREV
                  </button>

                  <div className="text-sm font-bold uppercase text-neo-black">
                    SLIDE {currentSlide + 1} / {slides.length}
                  </div>

                  <button
                    onClick={nextSlide}
                    disabled={currentSlide === slides.length - 1}
                    className="btn-brutal bg-neo-white text-neo-black px-6 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    NEXT
                    <ChevronRight className="w-5 h-5" strokeWidth={3} />
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t-4 border-neo-black p-6 bg-neo-green">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="btn-brutal bg-neo-white text-neo-black px-6 py-3"
            >
              CLOSE
            </button>
            <button
              onClick={exportToPowerPoint}
              disabled={isGenerating || isExporting || slides.length === 0}
              className="btn-brutal bg-neo-cyan text-neo-black px-6 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                  EXPORTING...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" strokeWidth={3} />
                  EXPORT TO POWERPOINT
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
