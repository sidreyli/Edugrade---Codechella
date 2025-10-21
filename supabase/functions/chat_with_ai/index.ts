import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { studentId, message, conversationId } = await req.json();

    if (!studentId || !message) {
      throw new Error('Missing required fields: studentId and message');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // ============================================
    // FETCH STUDENT CONTEXT
    // ============================================

    // 1. Get student profile
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('full_name, role, grade_level')
      .eq('id', studentId)
      .single();

    const studentName = studentProfile?.full_name || 'Student';
    const gradeLevel = (studentProfile as any)?.grade_level || 'Not specified';

    // 2. Get recent grades with insights (last 5)
    const { data: recentGrades } = await supabase
      .from('grades')
      .select(`
        score,
        feedback,
        insights,
        created_at,
        submission:submissions!inner(
          assignment:assignments!inner(
            title,
            subject,
            max_score
          )
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(5);

    // 3. Extract strengths and weaknesses from insights
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recentAssignments: any[] = [];

    if (recentGrades && recentGrades.length > 0) {
      recentGrades.forEach((grade: any) => {
        // Extract insights
        if (grade.insights?.strengths) {
          strengths.push(...grade.insights.strengths);
        }
        if (grade.insights?.weaknesses) {
          weaknesses.push(...grade.insights.weaknesses);
        }

        // Build recent assignments list
        const assignment = grade.submission?.assignment;
        if (assignment) {
          const percentage = Math.round((grade.score / assignment.max_score) * 100);
          recentAssignments.push({
            title: assignment.title,
            subject: assignment.subject,
            score: grade.score,
            maxScore: assignment.max_score,
            percentage: percentage,
            feedback: grade.feedback
          });
        }
      });
    }

    // Remove duplicates and take top 5
    const uniqueStrengths = [...new Set(strengths)].slice(0, 5);
    const uniqueWeaknesses = [...new Set(weaknesses)].slice(0, 5);

    // 4. Calculate subject performance
    const subjectPerformance: Record<string, any> = {};
    recentAssignments.forEach((assignment) => {
      if (!subjectPerformance[assignment.subject]) {
        subjectPerformance[assignment.subject] = {
          total: 0,
          count: 0,
          avg: 0
        };
      }
      subjectPerformance[assignment.subject].total += assignment.percentage;
      subjectPerformance[assignment.subject].count += 1;
    });

    // Calculate averages
    Object.keys(subjectPerformance).forEach((subject) => {
      const data = subjectPerformance[subject];
      data.avg = Math.round(data.total / data.count);
    });

    // 5. Calculate overall average
    const overallAverage = recentAssignments.length > 0
      ? Math.round(recentAssignments.reduce((sum, a) => sum + a.percentage, 0) / recentAssignments.length)
      : 0;

    // ============================================
    // BUILD AI PROMPT WITH CONTEXT
    // ============================================

    const contextUsed = {
      studentName,
      gradeLevel,
      overallAverage,
      strengths: uniqueStrengths,
      weaknesses: uniqueWeaknesses,
      recentAssignments: recentAssignments.slice(0, 3),
      subjectPerformance
    };

    const systemPrompt = `You are StudyBuddy AI, a personalized tutor helping ${studentName}.

STUDENT PROFILE:
- Name: ${studentName}
- Grade Level: ${gradeLevel}
- Overall Average: ${overallAverage}%

STRENGTHS (what they excel at):
${uniqueStrengths.length > 0 ? uniqueStrengths.map(s => `✅ ${s}`).join('\n') : '- Still gathering data...'}

AREAS NEEDING IMPROVEMENT:
${uniqueWeaknesses.length > 0 ? uniqueWeaknesses.map(w => `📝 ${w}`).join('\n') : '- Still gathering data...'}

RECENT ASSIGNMENTS:
${recentAssignments.length > 0
  ? recentAssignments.slice(0, 3).map(a => `- ${a.title} (${a.subject}): ${a.score}/${a.maxScore} (${a.percentage}%)`).join('\n')
  : '- No recent assignments'}

SUBJECT PERFORMANCE:
${Object.entries(subjectPerformance).map(([subject, data]) => `- ${subject}: ${data.avg}%`).join('\n') || '- Not enough data yet'}

YOUR GUIDELINES:
1. Be warm, encouraging, and supportive - use a friendly tone
2. Reference their specific strengths and celebrate progress
3. Address weaknesses gently with actionable advice
4. Relate answers to their recent assignments when relevant
5. Provide concrete, step-by-step study strategies
6. Ask follow-up questions to ensure understanding
7. Suggest practice resources tailored to their level
8. Use growth mindset language ("You're improving at...", "Let's work on...")
9. Break down complex topics into digestible parts
10. Give examples that connect to their grade level and interests

RESPONSE STYLE:
- Keep responses conversational but informative (2-4 paragraphs)
- Use emojis sparingly for encouragement (✨, 💡, 🎯, ✅)
- Format with bullet points or numbered lists when helpful
- End with a follow-up question or encouragement

Remember: You're not just answering questions - you're building their confidence and helping them become better learners!`;

    // ============================================
    // CALL OPENAI API
    // ============================================

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
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;

    // ============================================
    // SAVE TO DATABASE
    // ============================================

    let finalConversationId = conversationId;

    // Create new conversation if needed
    if (!conversationId) {
      const conversationTitle = message.slice(0, 50) + (message.length > 50 ? '...' : '');

      const { data: newConversation, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          student_id: studentId,
          title: conversationTitle,
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (convError) throw convError;
      finalConversationId = newConversation.id;
    } else {
      // Update last_message_at for existing conversation
      await supabase
        .from('chat_conversations')
        .update({
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);
    }

    // Save user message
    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: finalConversationId,
        role: 'user',
        content: message
      });

    if (userMsgError) throw userMsgError;

    // Save AI response with context
    const { error: aiMsgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: finalConversationId,
        role: 'assistant',
        content: aiResponse,
        context_used: contextUsed
      });

    if (aiMsgError) throw aiMsgError;

    // ============================================
    // RETURN RESPONSE
    // ============================================

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        conversationId: finalConversationId,
        contextUsed: contextUsed
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
    console.error('Chat AI error:', error);

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
