import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ChatMessage } from '../types';
import { MessageSquare, X, Send, Sparkles, ArrowRight, Bot, User, Minimize2 } from 'lucide-react';

interface JagoChatbotProps {
  onNavigate?: (tab: string) => void;
}

export const JagoChatbot: React.FC<JagoChatbotProps> = ({ onNavigate }) => {
  const { apiFetch, user } = useAuth();
  const { t, lang } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_msg',
      sender: 'jago',
      text: `Hello ${user?.fullName || ''}! I am JAGO, your scholarship assistance guide. Ask me about your real-time application status, eligibility, documents, or DBT payments.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await apiFetch('/api/jago/chat', {
        method: 'POST',
        body: JSON.stringify({ message: query, lang })
      });

      const botMsg: ChatMessage = {
        id: `jago_${Date.now()}`,
        sender: 'jago',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: res.intent,
        dataCard: res.dataCard
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'jago',
          text: 'Sorry, could not connect to MoTA servers. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2 border-2 border-amber-400 group transition transform hover:scale-105"
          title="Ask JAGO Assistant"
        >
          <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold text-sm shadow">
            J
          </div>
          <div className="text-left pr-1 hidden sm:block">
            <span className="text-xs font-black tracking-wide block">JAGO</span>
            <span className="text-[10px] text-blue-200 block font-medium">Assistant</span>
          </div>
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[95vw] sm:w-[400px] h-[550px] max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-300 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-[#0b3c5d] px-4 py-3 text-white flex items-center justify-between border-b border-blue-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm">
                J
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm">JAGO</h3>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-400/30">
                    Live Data
                  </span>
                </div>
                <p className="text-[10px] text-blue-200 truncate max-w-[220px]">
                  {t.jagoSubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'jago' && (
                  <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    J
                  </div>
                )}

                <div className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-blue-700 text-white rounded-tr-none shadow-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                }`}>
                  <p className="whitespace-pre-line">{m.text}</p>

                  {/* Render Data Card if intent returned structured live data */}
                  {m.dataCard && (
                    <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                      <span className="font-bold text-[11px] text-blue-800 block mb-1.5 border-b pb-1">
                        {m.dataCard.title}
                      </span>
                      <div className="space-y-1 text-[11px]">
                        {m.dataCard.details.map((d, i) => (
                          <div key={i} className="flex justify-between gap-1">
                            <span className="text-slate-500">{d.label}:</span>
                            <span className="font-bold font-mono text-slate-800 truncate max-w-[150px]">{d.value}</span>
                          </div>
                        ))}
                      </div>

                      {m.dataCard.actionLabel && onNavigate && (
                        <button
                          onClick={() => {
                            if (m.dataCard?.type === 'status') onNavigate('tracking');
                            else if (m.dataCard?.type === 'deficiency') onNavigate('deficiencies');
                            else if (m.dataCard?.type === 'payment') onNavigate('payments');
                            setIsOpen(false);
                          }}
                          className="mt-2 w-full py-1 bg-blue-700 text-white rounded-lg text-[10px] font-bold hover:bg-blue-800 transition flex items-center justify-center gap-1"
                        >
                          <span>{m.dataCard.actionLabel}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  <span className={`text-[9px] block text-right mt-1 ${
                    m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                  }`}>
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                  J
                </div>
                <span>JAGO is querying live application records...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="bg-white px-3 py-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
            {t.jagoSuggestions.slice(0, 3).map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="whitespace-nowrap px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-full border border-slate-200 transition text-[10px] font-medium"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={t.jagoPlaceholder}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className="p-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
