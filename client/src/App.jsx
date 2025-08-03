

import React, { useRef, useEffect } from 'react';
import { Upload, Send, File, User, Bot } from "lucide-react";

const App = () => {
    const [pdf, setPdf] = React.useState(null);
    const [qun, setQun] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [uploadLoading, setUploadLoading] = React.useState(false);
    const [chat, setChat] = React.useState([
        { role: 'assistant', message: 'Hello! I\'m your AI assistant. Upload a PDF document and I\'ll help you find answers from its content.' }
    ]);

    console.log('chat: ', chat);
    
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chat]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setPdf(file);
        } else {
            alert('Please select a valid PDF file');
        }
    };

    const pdfUpload = async () => {
        if (!pdf) {
            alert('Please select a PDF file first');
            return;
        }
        
        setUploadLoading(true);
        const formData = new FormData();
        formData.append('file', pdf);
        
        try {
            const response = await fetch('http://localhost:3000/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            localStorage.setItem('vectorStores', JSON.stringify(data.vectorStores));
            setChat([...chat, { 
                role: 'system', 
                message: `✅ PDF "${pdf.name}" uploaded successfully! You can now ask questions about its content.` 
            }]);
        } catch (error) {
            console.error(error);
            alert('Failed to upload PDF. Please try again.');
        } finally {
            setUploadLoading(false);
        }
    };

    const handleAsk = async (e) => {
        e.preventDefault();
        if (!qun.trim()) return;
        
        const currentQuestion = qun.trim();
        setQun('');
        setIsLoading(true);
        
        // Add user message immediately
        const newChat = [...chat, { role: 'user', message: currentQuestion }];
        setChat(newChat);
        
        try {
            const response = await fetch('http://localhost:3000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question: currentQuestion })
            });
            const data = await response.json();
            setChat([...newChat, { role: data.role, message: data.message }]);
        } catch (error) {
            console.error(error);
            setChat([...newChat, { 
                role: 'assistant', 
                message: 'Sorry, I encountered an error while processing your question. Please try again.' 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const MessageBubble = ({ messages, index }) => {
        const isUser = messages.role === 'user';
        const isSystem = messages.role === 'assistant';
        
        return (
            <div 
                className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                style={{ 
                    animation: `fadeIn 0.3s ease-out forwards`,
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0,
                    transform: 'translateY(10px)'
                }}
            >
                <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isUser ? 'bg-blue-500 ml-2' : isSystem ? 'bg-green-500 mr-2' : 'bg-purple-500 mr-2'
                    }`}>
                        {isUser ? (
                            <User className="w-4 h-4 text-white" />
                        ) : (
                            <Bot className="w-4 h-4 text-white" />
                        )}
                    </div>
                    
                    {/* Message bubble */}
                    <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                        isUser 
                            ? 'bg-blue-500 text-white rounded-br-md' 
                            : isSystem 
                                ? 'bg-green-100 text-green-800 rounded-bl-md border border-green-200'
                                : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                    }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{messages.message}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 to-blue-50">
            {/* Header */}
            <header className="bg-white shadow-lg border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                PDF AI Assistant
                            </h1>
                            <p className="text-sm text-gray-500">Ask questions about your PDF documents</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
                    {chat.map((messages, index) => (
                        <MessageBubble key={index} messages={messages} index={index} />
                    ))}
                    
                    {/* Loading indicator */}
                    {isLoading && (
                        <div className="flex justify-start mb-4">
                            <div className="flex max-w-[80%]">
                                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-2">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md border border-gray-200">
                                    <div className="flex space-x-1">
                                        <div 
                                            className="w-2 h-2 bg-gray-400 rounded-full"
                                            style={{
                                                animation: 'bounce 1.4s ease-in-out infinite both'
                                            }}
                                        ></div>
                                        <div 
                                            className="w-2 h-2 bg-gray-400 rounded-full"
                                            style={{
                                                animation: 'bounce 1.4s ease-in-out infinite both',
                                                animationDelay: '0.16s'
                                            }}
                                        ></div>
                                        <div 
                                            className="w-2 h-2 bg-gray-400 rounded-full"
                                            style={{
                                                animation: 'bounce 1.4s ease-in-out infinite both',
                                                animationDelay: '0.32s'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* PDF Upload Section */}
                <div className="px-6 py-3 bg-white border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="hidden"
                        />
                        
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
                        >
                            <File className="w-4 h-4" />
                            <span className="text-sm font-medium">
                                {pdf ? pdf.name.substring(0, 20) + (pdf.name.length > 20 ? '...' : '') : 'Select PDF'}
                            </span>
                        </button>
                        
                        <button
                            onClick={pdfUpload}
                            disabled={!pdf || uploadLoading}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors duration-200"
                        >
                            {uploadLoading ? (
                                <div 
                                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                                    style={{ animation: 'spin 1s linear infinite' }}
                                ></div>
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">
                                {uploadLoading ? 'Uploading...' : 'Upload'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Input Section */}
                <div className="px-6 py-4 bg-white border-t border-gray-200">
                    <div className="flex items-end space-x-3">
                        <div className="flex-1">
                            <textarea
                                value={qun}
                                onChange={(e) => setQun(e.target.value)}
                                placeholder="Ask a question about your PDF..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                rows={1}
                                style={{ minHeight: '48px', maxHeight: '120px' }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAsk(e);
                                    }
                                }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleAsk}
                            disabled={!qun.trim() || isLoading}
                            className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl flex items-center justify-center transition-all duration-200 transform hover:scale-105 disabled:scale-100"
                        >
                            {isLoading ? (
                                <div 
                                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                    style={{ animation: 'spin 1s linear infinite' }}
                                ></div>
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
                
                @keyframes bounce {
                    0%, 80%, 100% {
                        transform: scale(0);
                        opacity: 0.5;
                    }
                    40% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default App;
