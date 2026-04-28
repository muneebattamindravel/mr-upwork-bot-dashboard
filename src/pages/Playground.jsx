import React, { useEffect, useRef, useState } from 'react';
import { playgroundQuery } from '../apis/playground';
import { toast } from 'sonner';
import { Send, Loader2, Copy, Trash2 } from 'lucide-react';

const MAX_HISTORY = 20;

const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
          isUser
            ? 'bg-purple-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
        }`}
      >
        {msg.content}
        {!isUser && (
          <button
            onClick={() => { navigator.clipboard.writeText(msg.content); toast.success('Copied!'); }}
            className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <Copy className="w-3 h-3" /> Copy
          </button>
        )}
      </div>
    </div>
  );
};

const ContextPanel = ({ contextProjects }) => {
  if (!contextProjects?.length) return null;
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs space-y-1">
      <div className="font-semibold text-gray-500 uppercase tracking-wide mb-2">Context Used</div>
      {contextProjects.map((p, i) => (
        <div key={i} className="flex justify-between items-center">
          <span className="text-gray-700 truncate pr-2">{p.title}</span>
          <span className={`font-bold shrink-0 ${p.similarity >= 70 ? 'text-green-600' : p.similarity >= 40 ? 'text-yellow-600' : 'text-gray-400'}`}>
            {p.similarity}%
          </span>
        </div>
      ))}
    </div>
  );
};

export default function Playground() {
  const [messages, setMessages] = useState([]); // { role, content }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastContext, setLastContext] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const query = input.trim();
    if (!query || loading) return;

    const userMsg = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-MAX_HISTORY).map(m => ({ role: m.role, content: m.content }));
      const res = await playgroundQuery({ query, conversationHistory: history });
      const { answer, contextProjects } = res.data.data;

      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
      setLastContext(contextProjects || []);
    } catch (err) {
      toast.error('Query failed');
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setLastContext([]);
  };

  return (
    <div className="p-4 h-[calc(100vh-5rem)] flex flex-col gap-3 max-w-5xl w-full">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="page-title">🧪 BD Playground</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 italic hidden sm:inline">Searches across all profiles</span>
          <button
            onClick={handleClearChat}
            className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1 text-red-500 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">

        {/* Chat area */}
        <div className="flex flex-col flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-w-0">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-2 py-12">
                <div className="text-4xl">🧪</div>
                <div className="text-sm font-medium">BD Playground</div>
                <div className="text-xs max-w-xs">Ask about Mindravel's capabilities, request outreach messages, or explore past projects — the AI searches across all profiles.</div>
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                  <span className="text-sm text-gray-400">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-gray-100 p-3 flex gap-2 items-end bg-gray-50">
            <textarea
              ref={inputRef}
              rows={2}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="Ask about our capabilities, past projects, or request a proposal draft... (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="btn-primary p-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Context panel */}
        <div className="w-56 shrink-0 space-y-3 hidden lg:block">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Last Context</div>
          {lastContext.length > 0
            ? <ContextPanel contextProjects={lastContext} />
            : <div className="text-xs text-gray-400 italic">Projects used as context will appear here after your first query.</div>
          }
          {messages.length > 0 && (
            <div className="text-xs text-gray-400 mt-4">
              <span className="font-medium text-gray-600">{messages.length}</span> messages in session
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
