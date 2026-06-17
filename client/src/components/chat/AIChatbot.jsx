import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiX, FiSend, FiMic, FiMicOff, FiImage, FiSettings, FiChevronDown } from 'react-icons/fi';
import axiosInst from '../../api/axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Web Speech API
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN'; // Works for Hinglish too

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText((prev) => prev + (prev ? ' ' : '') + transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
  }

  const toggleListen = () => {
    if (!recognition) return alert('Voice input not supported in this browser.');
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial greeting
      setMessages([
        { 
          id: '1', 
          role: 'assistant', 
          content: 'Hello! I am RoadAssist AI. Describe your vehicle problem, upload a photo, or use voice input and I will help you diagnose it!',
          severity: 'none'
        }
      ]);
    }
  }, [isOpen]);

  const handleSend = async (text = inputText, imageBase64 = null) => {
    if (!text.trim() && !imageBase64) return;

    // Add user message to UI immediately
    const userMsg = { id: Date.now().toString(), role: 'user', content: text, image: imageBase64 };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await axiosInst.post('/ai/chat', { 
        text, 
        imageBase64 
      });
      
      // The axios interceptor returns response.data directly
      const { reply, metadata } = response.data;
      
      setMessages((prev) => [
        ...prev, 
        { 
          id: (Date.now() + 1).toString(), 
          role: 'assistant', 
          content: reply,
          metadata: metadata
        }
      ]);
      
    } catch (error) {
      const isUnavailable = error?.response?.status === 503 || error?.response?.data?.message?.includes('demand');
      const fallbackMsg = isUnavailable 
        ? "AI service is temporarily busy. Please try again in a few moments."
        : "Sorry, I'm having trouble connecting right now. Please try again.";
        
      setMessages((prev) => [
        ...prev, 
        { id: (Date.now() + 1).toString(), role: 'assistant', content: fallbackMsg }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      handleSend('I uploaded an image of my vehicle issue.', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleActionClick = (metadata) => {
    if (metadata.recommended_category_id) {
      // Route to Request Help page with pre-filled category
      navigate('/dashboard/request', { 
        state: { categoryId: metadata.recommended_category_id } 
      });
      setIsOpen(false);
    }
  };

  // Only show to authenticated users (role 'user')
  if (!user || user.role !== 'user') return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[60] flex flex-col items-end">
      
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-80 md:w-96 flex flex-col overflow-hidden mb-4 h-[500px]"
          >
            {/* Header */}
            <div className="bg-primary text-white p-4 flex justify-between items-center shadow-md z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <FiSettings size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">RoadAssist AI</h3>
                  <p className="text-xs text-orange-100">Smart Troubleshooting</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-white/20 rounded-md transition-colors">
                  <FiChevronDown />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-md transition-colors">
                  <FiX />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950 flex flex-col gap-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-sm' 
                      : 'bg-white dark:bg-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 shadow-sm rounded-tl-sm'
                  }`}>
                    {msg.image && (
                      <img src={msg.image} alt="User upload" className="w-full h-32 object-cover rounded-md mb-2" />
                    )}
                    
                    {/* Render message with basic markdown support (bolding and line breaks) */}
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.content.split('**').map((text, i) => i % 2 === 1 ? <strong key={i}>{text}</strong> : text)}
                    </div>
                    
                    {/* Smart Action Buttons based on metadata */}
                    {msg.metadata?.severity === 'critical' && (
                      <div className="mt-3 bg-red-100 text-red-700 p-2 rounded text-xs font-bold border border-red-200">
                        ⚠️ CRITICAL ISSUE: Do not drive. Seek safe location immediately.
                      </div>
                    )}
                    
                    {msg.metadata?.recommended_service_slug && (
                      <button 
                        onClick={() => handleActionClick(msg.metadata)}
                        className="mt-3 w-full bg-orange-100 hover:bg-orange-200 text-primary font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center transition-colors"
                      >
                        Find {msg.metadata.recommended_service_slug.replace('-', ' ')} Mechanics
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm p-4 flex gap-1 items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-end gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-primary transition-colors shrink-0"
                title="Upload Image"
              >
                <FiImage size={20} />
              </button>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleImageUpload} 
              />
              
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={isListening ? "Listening..." : "Ask RoadAssist AI..."}
                  className="w-full bg-transparent border-none py-3 px-4 outline-none resize-none h-[44px] max-h-[100px] text-sm dark:text-white"
                  rows="1"
                />
                <button 
                  onClick={toggleListen}
                  className={`p-2 shrink-0 mr-1 rounded-lg transition-colors ${isListening ? 'text-red-500 bg-red-100' : 'text-gray-400 hover:text-primary'}`}
                >
                  {isListening ? <FiMicOff size={18} /> : <FiMic size={18} />}
                </button>
              </div>

              <button 
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isTyping}
                className="p-3 bg-primary text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md"
              >
                <FiSend size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <AnimatePresence>
        {(!isOpen || isMinimized) && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setIsOpen(true); setIsMinimized(false); }}
            className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(255,138,0,0.4)] relative group"
          >
            <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-30"></div>
            <FiMessageSquare size={24} />
            
            {/* Tooltip */}
            <div className="absolute right-full mr-4 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Need Help? Ask RoadAssist AI
              <div className="absolute right-[-4px] top-1/2 transform -translate-y-1/2 border-y-4 border-y-transparent border-l-4 border-l-gray-800"></div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AIChatbot;
