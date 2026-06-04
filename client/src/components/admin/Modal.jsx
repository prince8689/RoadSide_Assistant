import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
      ></div>
      
      <div className={`relative bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full ${sizes[size]} animate-slide-up max-h-[90vh] flex flex-col`}>
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-4 mb-2 md:hidden"></div>
        <div className="flex justify-between items-center p-6 border-b border-gray-100 pt-2 md:pt-6">
          <h2 className="text-xl font-bold text-dark">{title}</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-dark flex items-center justify-center transition-colors"
          >
            <FiX className="text-lg" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
