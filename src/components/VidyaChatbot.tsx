import React, { useState, useEffect, useRef } from 'react';
import { VidyaLogo } from './common/VidyaLogo';
import {
  MessageSquare,
  X,
  Minus,
  Send,
  RotateCcw,
  Sparkles,
  Bot,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Maximize2,
  ChevronDown,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSupabaseConfig, getSupabaseClient, getActiveAuthToken } from '../lib/supabase';
import { apiUrl, parseApiResponse } from '../lib/apiConfig';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export const VidyaChatbot: React.FC = () => {
  const { user, role, student } = useAuth();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Determine current user name
  const userName =
    user?.role === 'student'
      ? student?.Name || user?.username || 'Saikiran'
      : user?.username || 'Learner';

  // Generate initial welcome message based on user profile
  const getInitialWelcome = (): string => {
    if (role === 'student') {
      const name = student?.Name || userName || 'Saikiran';
      return `Hi ${name} 👋\nI'm VIDYA AI, your learning assistant.\n\nI can help you understand your performance, identify areas to improve, create study plans, and answer questions about your learning progress.`;
    }

    if (role === 'teacher') {
      return `Hi ${userName} 👋\nI'm VIDYA AI, your academic teaching assistant.\n\nI can help you identify students needing intervention, analyze attendance drops, review subject bottlenecks, and formulate classroom support strategies.`;
    }

    if (role === 'admin') {
      return `Hi ${userName} 👋\nI'm VIDYA AI, your institutional analytics assistant.\n\nI can provide high-level academic performance summaries, student risk distribution, and institutional health insights.`;
    }

    // Unauthenticated / Visitor / Guest
    return `Hi there 👋\nI'm VIDYA AI, your learning assistant.\n\nI can assess your study habits, evaluate your academic risk level, suggest customized study routines, and answer any questions about the VIDYA platform.`;
  };

  // Listen for global open-vidya-chat trigger
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    window.addEventListener('open-vidya-chat', handleOpenChat);
    return () => window.removeEventListener('open-vidya-chat', handleOpenChat);
  }, []);

  // Initialize welcome message once
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-1',
          role: 'model',
          content: getInitialWelcome(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [user, role, student]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    }
  }, [isOpen, isMinimized]);

  // Handle sending a message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessageItem: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessageItem];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare history payload (last 6 items)
      const historyPayload = updatedMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const token = await getActiveAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl('/api/ai/chat'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      });

      const parsed = await parseApiResponse<{ reply: string; timestamp?: string }>(res, '/api/ai/chat');
      if (!parsed.ok || !parsed.data) {
        throw new Error(parsed.error || `Server returned HTTP ${res.status}`);
      }

      const data = parsed.data;
      const aiReply = data.reply || "I'm having trouble retrieving your learning data right now.";

      const aiMessageItem: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        content: aiReply,
        timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessageItem]);
    } catch (err) {
      console.warn('VIDYA Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'model',
          content: "Sorry, I'm having trouble connecting right now. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Action questions
  const getQuickQuestions = (): string[] => {
    if (role === 'student') {
      const riskText = student?.Risk_Level ? `Why is my risk level ${student.Risk_Level}?` : 'Why is my risk level low/medium/high?';
      return [
        'How am I performing?',
        'What should I improve?',
        'Create my study plan',
        riskText,
        'What are my weak subjects?',
        'How can I improve my score?',
      ];
    }

    if (role === 'teacher') {
      return [
        'Which students need attention?',
        'What are common weak subjects?',
        'How can we improve attendance?',
        'Suggest classroom interventions',
      ];
    }

    if (role === 'admin') {
      return [
        'How is the institution performing?',
        'How many students are high risk?',
        'What areas need attention?',
        'Summarize student risk levels',
      ];
    }

    // Guest / Everyone
    return [
      'Assess my study habits',
      'How does VIDYA predict risk?',
      'Create a daily study schedule',
      'How to reduce exam stress?',
    ];
  };

  // Reset / Clear chat
  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        content: getInitialWelcome(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Render markdown-like text with bolding and bullet points
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');

    return (
      <div className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed font-sans text-slate-800">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }

          // Bullet point
          if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const textAfterBullet = trimmed.slice(2);
            return (
              <div key={idx} className="flex items-start gap-2 pl-0.5">
                <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatBold(textAfterBullet) }} />
              </div>
            );
          }

          // Numbered item (e.g. 1. 2. 3.)
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-0.5">
                <span className="text-blue-600 font-mono text-xs font-semibold shrink-0">{numMatch[1]}.</span>
                <span dangerouslySetInnerHTML={{ __html: formatBold(numMatch[2]) }} />
              </div>
            );
          }

          return (
            <p
              key={idx}
              dangerouslySetInnerHTML={{ __html: formatBold(trimmed) }}
            />
          );
        })}
      </div>
    );
  };

  const formatBold = (str: string): string => {
    // Replace **bold** with <strong>bold</strong>
    return str.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
  };

  return (
    <>
      {/* ================= FLOATING CHAT BUTTON ================= */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer active:scale-95 group focus:outline-none focus:ring-4 focus:ring-blue-500/20"
          title="Open VIDYA AI Learning Assistant"
          aria-label="Open VIDYA AI Learning Assistant"
        >
          {/* Subtle VIDYA logo branding + online pulse */}
          <div className="relative flex items-center justify-center">
            <VidyaLogo size="xs" variant="white" iconOnly={true} />
            <span className="absolute -top-1.5 -right-2 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white" />
            </span>
          </div>
        </button>
      )}

      {/* ================= MINIMIZED PILL ================= */}
      {isOpen && isMinimized && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-200 shadow-xl text-slate-800 transition-all">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsMinimized(false)}>
            <VidyaLogo size="xs" iconOnly={true} />
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold leading-tight">VIDYA AI</span>
              <span className="text-[10px] text-emerald-600 font-medium leading-none">● Online</span>
            </div>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer ml-1"
            title="Expand"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ================= FULL CHAT PANEL ================= */}
      {isOpen && !isMinimized && (
        <div
          className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-24px)] h-[600px] max-h-[calc(100vh-90px)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
          role="dialog"
          aria-label="VIDYA AI Learning Assistant"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <VidyaLogo size="xs" iconOnly={true} />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight leading-none">VIDYA AI</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5">Learning Assistant</span>
              </div>
            </div>

            {/* Header controls */}
            <div className="flex items-center gap-1 text-slate-400">
              <button
                onClick={handleClearChat}
                className="p-1.5 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Minimize"
                aria-label="Minimize"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Stream (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender label for AI */}
                  {!isUser && (
                    <div className="flex items-center gap-1 mb-1 pl-1 text-[11px] font-semibold text-slate-500">
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      <span>VIDYA AI</span>
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        {msg.timestamp}
                      </span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] shadow-xs ${
                      isUser
                        ? 'bg-blue-50 text-slate-800 border border-blue-100 rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      renderFormattedContent(msg.content)
                    )}
                  </div>

                  {/* User timestamp */}
                  {isUser && (
                    <span className="text-[10px] text-slate-400 mt-1 pr-1">
                      {msg.timestamp}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Typing / Loading indicator */}
            {isLoading && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1 mb-1 pl-1 text-[11px] font-semibold text-slate-500">
                  <Sparkles className="w-3 h-3 text-blue-600 animate-spin" />
                  <span>VIDYA AI</span>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs text-slate-600 flex items-center gap-2 shadow-xs">
                  <span>VIDYA AI is thinking...</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}

            {/* Quick Action Buttons (shown prominently after initial welcome) */}
            {messages.length <= 2 && !isLoading && (
              <div className="pt-2">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.14em] mb-2 pl-1 font-mono">
                  Suggested Inquiries
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {getQuickQuestions().map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="text-left text-xs bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 text-slate-700 font-normal px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs transition-all cursor-pointer active:scale-98"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick chip bar when conversation is ongoing */}
          {messages.length > 2 && !isLoading && (
            <div className="px-3 py-1.5 bg-slate-50/80 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              <span className="text-[10px] text-slate-400 font-medium font-mono uppercase shrink-0">Try:</span>
              {getQuickQuestions().slice(0, 3).map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Chat Input */}
          <div className="p-3 bg-white border-t border-slate-100">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={1}
                  placeholder="Ask VIDYA AI anything about your learning..."
                  className="w-full resize-none text-xs sm:text-[13px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400 max-h-24 leading-normal"
                />
              </div>

              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className={`p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  inputMessage.trim() && !isLoading
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
                title="Send message"
                aria-label="Send message"
              >
                <ArrowRight className="w-4 h-4 font-bold" />
              </button>
            </form>

            <div className="mt-1.5 text-center">
              <span className="font-serif italic text-[11px] text-slate-400">
                VIDYA — Learn Smarter. Grow Better.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
