import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface ChatInterfaceProps {
  studentId: string;
  studentName: string;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  last_message_at: string;
  created_at: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ studentId, studentName, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showConversations, setShowConversations] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchConversations();
    fetchSuggestedQuestions();
  }, [studentId]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
    }
  }, [conversationId]);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('student_id', studentId)
      .order('last_message_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setConversations(data);
    }
  };

  const fetchMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const fetchSuggestedQuestions = async () => {
    // Fetch recent assignments for suggestions
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        assignment:assignments(title, subject)
      `)
      .eq('student_id', studentId)
      .limit(3);

    // Fetch recent grades for weak areas
    const { data: grades } = await supabase
      .from('grades')
      .select('insights')
      .eq('student_id', studentId)
      .limit(5);

    const questions: string[] = [];

    // Add questions based on recent assignments
    if (submissions && submissions.length > 0) {
      const recentTopic = (submissions[0] as any).assignment?.title;
      if (recentTopic) {
        questions.push(`Can you help me understand ${recentTopic}?`);
      }
    }

    // Add questions based on weak areas
    if (grades && grades.length > 0) {
      const weaknesses: string[] = [];
      grades.forEach((grade: any) => {
        if (grade.insights?.weaknesses) {
          weaknesses.push(...grade.insights.weaknesses);
        }
      });
      
      if (weaknesses.length > 0) {
        const uniqueWeaknesses = [...new Set(weaknesses)];
        questions.push(`How can I improve my understanding of ${uniqueWeaknesses[0]}?`);
      }
    }

    // Add general questions
    questions.push("What are some effective study strategies for my grade level?");
    questions.push("Can you explain my recent performance and how to improve?");
    questions.push("What topics should I focus on based on my grades?");
    questions.push("How can I prepare better for my next assignment?");

    setSuggestedQuestions(questions.slice(0, 6));
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setShowConversations(false);
  };

  const handleSelectConversation = (convId: string) => {
    setConversationId(convId);
    setShowConversations(false);
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat_with_ai', {
        body: {
          studentId,
          message: currentMessage,
          conversationId
        }
      });

      if (error) throw error;

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, aiMessage]);
        
        if (!conversationId) {
          setConversationId(data.conversationId);
          fetchConversations();
        }
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      alert('Failed to send message: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuestionClick = (question: string) => {
    setCurrentMessage(question);
  };

  return (
    <div className="fixed inset-0 bg-neo-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card-brutal bg-neo-white w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-4 border-neo-black bg-neo-purple">
          <div className="flex items-center gap-4 flex-1">
            <div>
              <h2 className="text-3xl font-black uppercase text-neo-white flex items-center gap-2">
                <Sparkles className="w-8 h-8" strokeWidth={3} />
                AI STUDY BUDDY
              </h2>
              <p className="text-sm font-bold text-neo-white/90 mt-1">Chat with {studentName}</p>
            </div>

            {/* Conversation Selector */}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleNewChat}
                className="btn-brutal bg-neo-yellow text-neo-black px-4 py-2 text-sm"
              >
                NEW CHAT
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowConversations(!showConversations)}
                  className="btn-brutal bg-neo-cyan text-neo-black px-4 py-2 text-sm flex items-center gap-2"
                >
                  <MessageCircle size={16} strokeWidth={3} />
                  HISTORY ({conversations.length})
                </button>

                {showConversations && conversations.length > 0 && (
                  <div className="absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto card-brutal bg-neo-white p-2 z-10">
                    {conversations.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={`w-full text-left p-3 border-2 border-neo-black mb-2 font-bold hover:bg-neo-cyan transition-colors ${
                          conversationId === conv.id ? 'bg-neo-cyan' : 'bg-neo-white'
                        }`}
                      >
                        <div className="text-sm truncate">{conv.title}</div>
                        <div className="text-xs opacity-60 mt-1">
                          {new Date(conv.last_message_at).toLocaleString()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="btn-brutal bg-neo-pink text-neo-white p-2 ml-4"
          >
            <X className="w-6 h-6" strokeWidth={3} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-neo-white">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <h3 className="text-4xl font-black uppercase text-neo-purple mb-8">
                ASK ME ANYTHING! 💬
              </h3>
              
              {/* Suggested Questions */}
              {suggestedQuestions.length > 0 && (
                <div className="w-full max-w-3xl">
                  <p className="text-sm font-bold uppercase text-neo-black/60 mb-4 text-center">
                    ✨ SUGGESTED QUESTIONS
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {suggestedQuestions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuestionClick(question)}
                        className="card-brutal bg-neo-pink text-neo-white p-4 text-left font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl p-4 border-4 border-neo-black shadow-brutal font-bold ${
                      message.role === 'user'
                        ? 'bg-neo-cyan text-neo-black'
                        : 'bg-neo-purple text-neo-white'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="text-2xl mb-2">🤖</div>
                    )}
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-60 mt-2">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-2xl p-4 border-4 border-neo-black bg-neo-purple text-neo-white shadow-brutal">
                    <div className="flex items-center gap-2 font-bold">
                      <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                      AI is thinking...
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t-4 border-neo-black p-4 bg-neo-yellow">
          <div className="flex gap-3">
            <div className="flex-1">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value.slice(0, 500))}
                onKeyPress={handleKeyPress}
                placeholder="Type your question here..."
                disabled={isLoading}
                className="input-brutal w-full bg-neo-white text-neo-black font-bold h-24 resize-none"
              />
              <div className="text-xs font-bold mt-1 text-neo-black/60">
                {currentMessage.length}/500
              </div>
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !currentMessage.trim()}
              className="btn-brutal bg-neo-cyan text-neo-black px-8 py-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed h-24"
            >
              <Send className="w-6 h-6" strokeWidth={3} />
              <span className="text-lg">SEND</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
