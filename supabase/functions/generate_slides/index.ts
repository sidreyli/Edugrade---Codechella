import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { lessonPlanId, lessonPlanContent, customization } = await req.json();

    if (!lessonPlanId || !lessonPlanContent) {
      throw new Error('Missing required fields');
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Default customization options
    const theme = customization?.theme || 'professional';
    const targetSlides = customization?.slidesCount || 'auto';
    const includeNotes = customization?.includeNotes !== false;

    // Call OpenAI to generate slides
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
            content: `You are an expert presentation designer and educational content creator.

Your task is to convert lesson plans into comprehensive, detailed slide decks for teachers to use in classroom presentations.

IMPORTANT: Create DETAILED slides with substantial content:
- Each slide should have 6-10 bullet points or content items
- Include explanations, definitions, examples, and context
- Break complex topics into multiple detailed slides
- Provide comprehensive coverage of the material
- Include sub-points and elaborations where appropriate
- Add specific examples, data, or illustrations for each concept

Return a JSON array of slide objects with this EXACT structure:
[
  {
    "slideNumber": 1,
    "type": "title",
    "title": "Main Title",
    "subtitle": "Subtitle or grade level",
    "content": [],
    "speakerNotes": "Introduction guidance for teacher"
  },
  {
    "slideNumber": 2,
    "type": "objectives",
    "title": "Learning Objectives",
    "content": ["Objective 1 with detailed description", "Objective 2 with context", "Objective 3 with expected outcomes", "Objective 4 with application"],
    "speakerNotes": "Review objectives with students, discuss expectations"
  },
  {
    "slideNumber": 3,
    "type": "content",
    "title": "Topic Title",
    "content": ["Detailed point 1 with explanation", "Point 2 with specific example", "Point 3 with context and relevance", "Point 4 with additional details", "Point 5 with implications", "Point 6 with real-world connection"],
    "speakerNotes": "Explain each point thoroughly with examples and check for understanding",
    "suggestedImage": "keyword for visual"
  }
]

Slide types: "title", "objectives", "content", "activity", "example", "summary", "assessment"`
          },
          {
            role: 'user',
            content: `Convert this lesson plan into a comprehensive ${targetSlides === 'auto' ? '15-20' : targetSlides} slide presentation deck with DETAILED content.

LESSON PLAN:
${lessonPlanContent}

CRITICAL REQUIREMENTS:
- Each content slide MUST have 6-10 detailed bullet points
- Include definitions, explanations, examples, and context
- Break down complex topics into multiple slides with depth
- Add sub-points and elaborations
- Include specific examples, data, or case studies
- Provide comprehensive coverage of all concepts

Create a complete slide deck with:
1. Title slide (lesson title, grade/subject)
2. Learning objectives slide (4-6 detailed objectives with expected outcomes)
3. Introduction/Overview slide (context, importance, real-world relevance)
4. Multiple content slides (6-10 points per slide, break topics into multiple slides)
5. Detailed explanation slides (definitions, processes, mechanisms)
6. Examples/application slides (specific scenarios, case studies)
7. Activity/engagement slide (step-by-step instructions with details)
8. Practice/discussion slide (multiple questions with context)
9. Advanced concepts slide (deeper dive into complexities)
10. Summary slide (comprehensive key takeaways)
11. Assessment/quiz slide (detailed questions)

${includeNotes ? 'Include detailed speaker notes (3-5 sentences) for each slide with teaching tips, talking points, and engagement strategies.' : 'Keep speaker notes brief.'}

Make it comprehensive, detailed, and thorough. Ensure students get complete understanding of the topic.

Return ONLY valid JSON array, no markdown formatting.`
          }
        ],
        temperature: 0.8,
        max_tokens: 4000
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    let aiResponse = openaiData.choices[0].message.content;

    // Clean up response - remove markdown code blocks if present
    aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse slides
    let slides;
    try {
      slides = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('AI returned invalid JSON format');
    }

    // Validate slides structure
    if (!Array.isArray(slides) || slides.length === 0) {
      throw new Error('AI returned invalid slides format');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get lesson plan details for title
    const { data: lessonPlan } = await supabase
      .from('lesson_plans')
      .select('title, subject, grade_level, teacher_id')
      .eq('id', lessonPlanId)
      .single();

    // Save slide deck to database
    const { data: slideDeck, error: saveError } = await supabase
      .from('slide_decks')
      .insert({
        lesson_plan_id: lessonPlanId,
        teacher_id: lessonPlan?.teacher_id,
        title: lessonPlan?.title || 'Lesson Slides',
        slides: slides,
        theme: theme
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving slide deck:', saveError);
      throw saveError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        slideDeckId: slideDeck.id,
        slides: slides,
        slideCount: slides.length,
        message: 'Slide deck generated successfully'
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
    console.error('Slide generation error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    );
  }
});
