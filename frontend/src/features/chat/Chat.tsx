import React, { useState } from 'react';

// Types
interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
}

type MessagesByConversation = {
  [conversationId: string]: Message[];
};

// Placeholder data
const conversations = [
  { id: '1', name: 'General' },
  { id: '2', name: 'Project X' },
  { id: '3', name: 'Random' },
];

const initialMessages: MessagesByConversation = {
  '1': [
    { id: 'm1', sender: 'Alice', content: 'Hello everyone!', timestamp: '10:00' },
    { id: 'm2', sender: 'Bob', content: 'Hi Alice!', timestamp: '10:01' },
  ],
  '2': [
    { id: 'm3', sender: 'Charlie', content: 'Project X update?', timestamp: '09:30' },
  ],
  '3': [
    { id: 'm4', sender: 'Dave', content: 'Random chat here.', timestamp: '11:15' },
  ],
};

export default function Chat() {
  const [selectedConv, setSelectedConv] = useState('1');
  const [messages, setMessages] = useState<MessagesByConversation>(initialMessages);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => ({
      ...prev,
      [selectedConv]: [
        ...prev[selectedConv],
        { id: Date.now().toString(), sender: 'You', content: input, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ],
    }));
    setInput('');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r flex flex-col">
        <div className="p-4 font-bold text-lg border-b">Chats</div>
        <ul className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <li
              key={conv.id}
              className={`p-4 cursor-pointer hover:bg-gray-200 ${selectedConv === conv.id ? 'bg-gray-200 font-semibold' : ''}`}
              onClick={() => setSelectedConv(conv.id)}
            >
              {conv.name}
            </li>
          ))}
        </ul>
        <div className="p-4 border-t text-xs text-gray-500">Telegram-like UI</div>
      </aside>
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-white font-semibold text-lg">{conversations.find((c) => c.id === selectedConv)?.name}</div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
          {messages[selectedConv]?.map((msg: Message) => (
            <div key={msg.id} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded-lg px-4 py-2 max-w-xs ${msg.sender === 'You' ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
                <div className="text-sm">{msg.content}</div>
                <div className="text-xs text-gray-400 mt-1 text-right">{msg.sender} • {msg.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Input */}
        <form
          className="p-4 bg-white border-t flex gap-2"
          onSubmit={e => { e.preventDefault(); handleSend(); }}
        >
          <input
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
} 