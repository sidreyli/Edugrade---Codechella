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
    const { subject, topic, duration, gradeLevel, learningObjectives, priorKnowledge, performanceSummary, teacherId, classroomId } = await req.json();

    // Only subject, topic, and teacherId are required
    if (!subject || !topic || !teacherId) {
      throw new Error('Missing required fields: subject, topic, teacherId');
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prepare performance context for AI
    const performanceContext = performanceSummary ? `\n\nSTUDENT PERFORMANCE DATA:\n${JSON.stringify(performanceSummary, null, 2)}` : '';

    // Call OpenAI API for lesson plan generation
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert educational curriculum designer and teacher. Create comprehensive, engaging lesson plans that are tailored to student performance data. Your lesson plans should be practical, actionable, and designed to improve student understanding and engagement.

Format your response as a structured lesson plan with the following sections:
1. LESSON OVERVIEW (brief summary)
2. LEARNING OBJECTIVES (3-5 specific, measurable objectives)
3. MATERIALS NEEDED (list of required materials)
4. LESSON ACTIVITIES (detailed step-by-step activities with time estimates)
5. DIFFERENTIATION STRATEGIES (for different learning levels)
6. ASSESSMENT METHODS (how to measure student understanding)
7. HOMEWORK/EXTENSION ACTIVITIES (optional follow-up work)
8. TEACHER NOTES (tips and considerations)

Use clear formatting with headers, bullet points, and numbered lists.`
          },
          {
            role: 'user',
            content: `Create a detailed lesson plan for the following:

SUBJECT: ${subject}
TOPIC: ${topic}
${duration ? `DURATION: ${duration} minutes` : ''}
${gradeLevel ? `GRADE LEVEL: ${gradeLevel}` : ''}
${learningObjectives ? `TEACHER'S LEARNING OBJECTIVES:\n${learningObjectives}` : ''}
${priorKnowledge ? `STUDENTS' PRIOR KNOWLEDGE:\n${priorKnowledge}` : ''}${performanceContext}

Please create a comprehensive lesson plan that addresses the topic and takes into account all the provided information. ${duration ? `Ensure the activities fit within the ${duration}-minute timeframe.` : ''} ${gradeLevel ? `Tailor the content and language to be appropriate for ${gradeLevel} students.` : ''} Focus on areas where students may be struggling and include engaging activities to improve understanding.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    const planContent = openaiData.choices[0].message.content;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save lesson plan to database
    const { data: lessonPlan, error: dbError } = await supabase
      .from('lesson_plans')
      .insert({
        teacher_id: teacherId,
        classroom_id: classroomId || null,
        subject,
        topic,
        plan_content: planContent,
        performance_summary: performanceSummary || null
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        lessonPlan: lessonPlan
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Lesson plan generation error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred during lesson plan generation'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      }
    );
  }
});
