import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';
import { FiMessageSquare, FiUser, FiCalendar, FiClock, FiEye, FiX } from 'react-icons/fi';

const AILogsPage = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ai/admin/conversations');
      setConversations(res.data?.conversations || res.data || []);
    } catch (error) {
      toast.error('Failed to load AI conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (id) => {
    try {
      setLoadingMessages(true);
      const res = await api.get(`/ai/conversations/${id}/messages`);
      setMessages(res.data?.messages || res.data || []);
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const openConversation = (conv) => {
    setSelectedConversation(conv);
    fetchMessages(conv.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark">AI Chat Logs</h1>
        <p className="text-gray-500 mt-2">Monitor user interactions with RoadAssist AI to improve the knowledge base.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-semibold text-sm border-b border-gray-100 uppercase tracking-wider">
                <th className="p-4">User</th>
                <th className="p-4">Initial Query</th>
                <th className="p-4">Messages</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conversations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    <FiMessageSquare className="mx-auto text-4xl mb-3 text-gray-300" />
                    No AI conversations found.
                  </td>
                </tr>
              ) : (
                conversations.map((conv) => (
                  <tr key={conv.id} className="hover:bg-orange-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {conv.user_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-dark">{conv.user_name}</p>
                          <p className="text-xs text-gray-500">{conv.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-700 max-w-xs truncate">
                        {conv.first_message || 'Uploaded image'}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
                        {conv.message_count} msgs
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1"><FiCalendar /> {new Date(conv.created_at).toLocaleDateString()}</div>
                      <div className="flex items-center gap-1 mt-1 text-xs"><FiClock /> {new Date(conv.created_at).toLocaleTimeString()}</div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => openConversation(conv)}
                        className="bg-primary/10 text-primary hover:bg-primary hover:text-white p-2 rounded-lg transition-colors"
                      >
                        <FiEye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {selectedConversation.user_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-dark">{selectedConversation.user_name}</h3>
                  <p className="text-xs text-gray-500">
                    {new Date(selectedConversation.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedConversation(null)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-gray-500">No messages found.</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white rounded-tr-sm' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      
                      {msg.metadata && msg.role === 'assistant' && (
                        <div className="mt-3 pt-3 border-t border-gray-100 text-xs">
                          <p><strong>Severity:</strong> <span className="uppercase">{msg.metadata.severity}</span></p>
                          {msg.metadata.recommended_service_slug && (
                            <p><strong>Recommended:</strong> {msg.metadata.recommended_service_slug}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AILogsPage;
