import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { submissionText, rubric, submissionId, teacherId, studentId, assignmentId } = await req.json();

    if (!submissionText || !rubric || !submissionId || !teacherId || !studentId) {
      throw new Error('Missing required fields');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch assignment max_score and classroom grading_scale
    let maxScore = 100; // Default
    let gradingScale: any = null;
    let classroomId = null;

    if (assignmentId) {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('max_score, classroom_id, classrooms(grading_scale)')
        .eq('id', assignmentId)
        .single();

      if (!assignmentError && assignmentData) {
        maxScore = assignmentData.max_score || 100;
        classroomId = assignmentData.classroom_id;
        gradingScale = (assignmentData.classrooms as any)?.grading_scale || null;
      }
    }

    // Default grading scale if none exists
    if (!gradingScale) {
      gradingScale = {
        "A": 90,
        "B": 80,
        "C": 70,
        "D": 60,
        "F": 0
      };
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Call OpenAI API for grading with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    let openaiResponse;
    try {
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: {
            type: "json_object"
          },
          messages: [
            {
              role: 'system',
              content: `You are an expert teacher grading student submissions. The assignment has a maximum score of ${maxScore} points.

Analyze the submission thoroughly and provide a comprehensive assessment in JSON format with the following structure:

{
  "score": <integer from 0 to ${maxScore}>,
  "overall_feedback": "<4-5 sentence comprehensive summary covering quality, effort, understanding, and overall performance>",
  "strengths": [
    "<specific strength 1 with details>",
    "<specific strength 2 with details>",
    "<specific strength 3 with details>"
  ],
  "weaknesses": [
    "<specific area for improvement 1 with explanation>",
    "<specific area for improvement 2 with explanation>",
    "<specific area for improvement 3 with explanation>"
  ],
  "recommendations": [
    {
      "topic": "<skill or concept to improve>",
      "resource": "<specific learning resource, practice suggestion, or study tip>",
      "priority": "high"
    },
    {
      "topic": "<another skill or concept>",
      "resource": "<another resource or tip>",
      "priority": "medium"
    }
  ],
  "detailed_feedback": "<comprehensive 5-7 sentence paragraph that:
    1. Summarizes what the student did well with specific examples
    2. Explains what needs improvement with concrete examples
    3. Discusses the student's understanding of key concepts
    4. Provides actionable next steps
    5. Encourages growth mindset>"
}

IMPORTANT:
- The score MUST be between 0 and ${maxScore} points (not a percentage)
- Be VERY detailed and specific - reference actual content from the submission
- Give constructive, actionable feedback that helps students improve
- Be encouraging while being honest about areas needing work
- Focus on both content quality and depth of understanding`
            },
            {
              role: 'user',
              content: `Grade this student submission based on the following rubric. The assignment is worth ${maxScore} points total.

RUBRIC:
${rubric}

STUDENT SUBMISSION:
${submissionText}

Provide detailed grading insights in the JSON format specified. The score should be out of ${maxScore} points.

Be VERY specific and detailed in your feedback:
- Reference specific parts of the student's work
- Explain WHY something is good or needs improvement
- Give concrete examples from their submission
- Provide actionable suggestions for improvement
- Include at least 3 detailed strengths, 3 detailed weaknesses, and 2-3 specific recommendations with resources.`
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('AI grading request timed out. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;

    // Parse AI response
    let feedback: string;
    let score: number;
    let strengths: string[] = [];
    let weaknesses: string[] = [];
    let recommendations: any[] = [];
    let detailedFeedback: string = '';

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(aiResponse);
      score = parsed.score || 0;
      feedback = parsed.overall_feedback || parsed.feedback || parsed.detailed_feedback || aiResponse;
      strengths = parsed.strengths || [];
      weaknesses = parsed.weaknesses || [];
      recommendations = parsed.recommendations || [];
      detailedFeedback = parsed.detailed_feedback || parsed.overall_feedback || feedback;
    } catch {
      // If not JSON, use the whole response as feedback and extract score
      feedback = aiResponse;
      detailedFeedback = aiResponse;
      const scoreMatch = aiResponse.match(/score[:\s]+(\d+)/i);
      score = scoreMatch ? parseInt(scoreMatch[1]) : Math.round(maxScore * 0.75);
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(maxScore, score));

    // Calculate percentage FIRST before determining letter grade
    const percentage = Math.round((score / maxScore) * 100);

    // Calculate letter grade based on PERCENTAGE and classroom grading scale
    let letterGrade = 'F';
    const sortedGrades = Object.entries(gradingScale)
      .map(([letter, threshold]) => ({ letter, threshold: Number(threshold) }))
      .sort((a, b) => b.threshold - a.threshold);

    for (const grade of sortedGrades) {
      if (percentage >= grade.threshold) {
        letterGrade = grade.letter;
        break;
      }
    }

    // Create comprehensive feedback text
    let feedbackText = detailedFeedback;

    if (strengths.length > 0 || weaknesses.length > 0) {
      feedbackText += '\n\n═══════════════════════════════════════\n';

      if (strengths.length > 0) {
        feedbackText += '\n✅ STRENGTHS:\n';
        strengths.forEach((strength, idx) => {
          feedbackText += `\n${idx + 1}. ${strength}`;
        });
        feedbackText += '\n';
      }

      if (weaknesses.length > 0) {
        feedbackText += '\n📝 AREAS FOR IMPROVEMENT:\n';
        weaknesses.forEach((weakness, idx) => {
          feedbackText += `\n${idx + 1}. ${weakness}`;
        });
        feedbackText += '\n';
      }

      if (recommendations.length > 0) {
        feedbackText += '\n💡 RECOMMENDED NEXT STEPS:\n';
        recommendations.forEach((rec, idx) => {
          const priority = rec.priority ? `[${rec.priority.toUpperCase()}]` : '';
          feedbackText += `\n${idx + 1}. ${priority} ${rec.topic}\n   → ${rec.resource}`;
        });
      }
    }

    // Prepare insights data for storage
    const insightsData = {
      strengths,
      weaknesses,
      recommendations,
      detailed_feedback: detailedFeedback,
      letter_grade: letterGrade,
      percentage: percentage
    };

    // Save grade to database
    const { data: gradeData, error: gradeError } = await supabase
      .from('grades')
      .insert({
        teacher_id: teacherId,
        student_id: studentId,
        submission_id: submissionId,
        feedback: feedbackText.trim(),
        score,
        rubric,
        insights: insightsData
      })
      .select()
      .single();

    if (gradeError) {
      throw gradeError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        feedback: feedbackText.trim(),
        score,
        maxScore,
        percentage,
        letterGrade,
        strengths,
        weaknesses,
        recommendations,
        detailedFeedback,
        gradingScale,
        gradeId: gradeData.id,
        message: 'Grade generated and saved successfully'
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Grading error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 500
      }
    );
  }
});
