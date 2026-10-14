import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, BookOpen, CircleHelp, LoaderCircle, RotateCcw, Send, Sparkles, UserRound } from 'lucide-react';
import { api } from '../api/client';
import type { FaqAssistantReply } from '../types';
import { GovAlert, GovButton, GovCard } from '../components/GovUI';

type Message = { id: string; role: 'assistant' | 'user'; text: string; reply?: FaqAssistantReply };
const welcome = 'Hello! Ask me about school profiles, assessments, requirements, organisation support, reports, or feedback.';
const suggestions = ['How do I submit an assessment?', 'How are priorities calculated?', 'How can an organisation help?', 'How do I leave equipment feedback?'];

export function FaqAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([{ id: 'welcome', role: 'assistant', text: welcome }]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [messages, busy]);

  async function sendQuestion(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (!trimmed || busy) return;
    setError(''); setQuestion(''); setBusy(true);
    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: trimmed };
    setMessages((current) => [...current, userMessage]);
    try {
      const reply = await api.assistant.ask(trimmed);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', text: reply.answer, reply }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The assistant could not respond. Check your connection and try again.');
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(question);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-8">
      <header className="border-l-4 border-[#0f3460] pl-4 py-1">
        <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-[#6b7c93]">PORTAL HELP</p>
        <h1 className="mt-1 text-2xl font-bold text-[#0f2540]">FAQ Assistant</h1>
        <p className="mt-1 text-sm text-[#586b80]">Get help with common portal workflows and features.</p>
      </header>

      <GovAlert tone="info">
        Answers are grounded in the portal’s help topics. When the administrator configures the AI service, questions use AI; otherwise, the assistant returns the closest verified FAQ answer. It cannot access your account records.
      </GovAlert>

      <GovCard className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] bg-[#f8fafc] px-4 sm:px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#b8cce4] bg-[#edf4fb] text-[#0f3460]"><Bot size={21} /></div>
            <div><p className="text-sm font-bold text-[#0f2540]">Science on Wheels Help</p><p className="text-[11px] text-[#6b7c93]">FAQ assistant · answers from verified help topics</p></div>
          </div>
          <button type="button" onClick={() => { setMessages([{ id: 'welcome', role: 'assistant', text: welcome }]); setError(''); }} className="inline-flex min-h-10 items-center gap-2 border border-[#cbd5e1] bg-white px-3 text-xs font-semibold text-[#1b3f73] hover:bg-[#f0f4f8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f3460]">
            <RotateCcw size={14} /> New conversation
          </button>
        </div>

        <div className="max-h-[min(58vh,620px)] min-h-[340px] overflow-y-auto space-y-4 bg-white px-4 py-5 sm:px-6" aria-live="polite" aria-relevant="additions text">
          {messages.map((message) => (
            <div key={message.id} className={`flex items-start gap-2.5 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center border ${message.role === 'assistant' ? 'border-[#b8cce4] bg-[#edf4fb] text-[#0f3460]' : 'border-[#d1d5db] bg-[#f8fafc] text-[#586b80]'}`} aria-hidden="true">
                {message.role === 'assistant' ? <Bot size={16} /> : <UserRound size={16} />}
              </div>
              <div className={`max-w-[88%] min-w-0 border px-3.5 py-3 sm:max-w-[80%] ${message.role === 'assistant' ? 'border-[#dbe4ee] bg-[#f8fafc]' : 'border-[#0f3460] bg-[#0f3460] text-white'}`}>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
                {message.reply && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#dbe4ee] pt-2.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#52677d]">{message.reply.mode === 'AI' ? <Sparkles size={12} /> : <BookOpen size={12} />}{message.reply.mode === 'AI' ? 'AI answer' : 'FAQ answer'}</span>
                  {message.reply.sources.map((source) => <span key={source} className="border border-[#d1d5db] bg-white px-2 py-0.5 text-[10px] text-[#4b6077]">{source}</span>)}
                </div>}
              </div>
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 pl-10 text-xs text-[#6b7c93]" role="status"><LoaderCircle size={15} className="animate-spin" />Finding a grounded answer…</div>}
          <div ref={endRef} />
        </div>

        {messages.length === 1 && <div className="border-t border-[#e5e7eb] px-4 py-4 sm:px-6">
          <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6b7c93]"><CircleHelp size={13} /> Try asking</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((item) => <button key={item} type="button" onClick={() => void sendQuestion(item)} className="min-h-10 border border-[#cbd5e1] bg-white px-3 py-2 text-xs text-[#1b3f73] hover:bg-[#edf4fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f3460]">{item}</button>)}
          </div>
        </div>}

        {error && <div className="px-4 sm:px-6"><GovAlert tone="error">{error}</GovAlert></div>}
        <form onSubmit={submit} className="flex items-end gap-2 border-t border-[#e5e7eb] bg-[#f8fafc] p-3 sm:p-4">
          <label className="sr-only" htmlFor="faq-question">Ask a question</label>
          <textarea id="faq-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendQuestion(question); } }} rows={2} maxLength={1000} placeholder="Type your question… (Enter to send, Shift+Enter for a new line)" className="min-h-11 max-h-32 min-w-0 flex-1 resize-y border border-[#b8c3ce] bg-white px-3 py-2.5 text-sm text-[#0f2540] placeholder:text-[#8a98a8] focus:outline-none focus:ring-2 focus:ring-[#0f3460]" />
          <GovButton variant="primary" disabled={!question.trim() || busy} aria-label="Send question"><span className="inline-flex items-center gap-2"><Send size={15} /><span className="hidden sm:inline">Send</span></span></GovButton>
        </form>
      </GovCard>
    </div>
  );
}
