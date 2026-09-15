'use client';
import { useState, useRef, useEffect } from 'react';

interface VoiceTextInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  loading?: boolean;
}

export default function VoiceTextInput({ onSubmit, placeholder, loading }: VoiceTextInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
  }, []);

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Voice input not supported in this browser. Please use text.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setText(transcript);
    };
    recognition.onerror = (event: any) => {
      setIsRecording(false);
      setVoiceError(`Voice error: ${event.error}. Please type your goal instead.`);
    };
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !loading) {
      onSubmit(text.trim());
    }
  };

  return (
    <div className="voice-input-container">
      <form onSubmit={handleSubmit}>
        <div className="voice-input-box">
          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🎯</span>
          <input
            id="goal-input"
            type="text"
            className="voice-input-field"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder || 'e.g., I have a hackathon submission in 3 days...'}
            disabled={loading}
          />
          {voiceSupported && (
            <button
              type="button"
              id="voice-btn"
              className={`voice-btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? '⏹️' : '🎤'}
            </button>
          )}
          <button
            type="submit"
            id="goal-submit-btn"
            className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
            disabled={!text.trim() || loading}
            style={{ borderRadius: 'var(--radius)', flexShrink: 0 }}
          >
            {!loading && '→'}
          </button>
        </div>
      </form>
      {isRecording && (
        <div className="alert alert-danger" style={{ marginTop: 8, padding: '8px 14px', fontSize: '0.8rem' }}>
          🔴 Recording... Speak your goal
        </div>
      )}
      {voiceError && (
        <div className="alert alert-warning" style={{ marginTop: 8, padding: '8px 14px', fontSize: '0.8rem' }}>
          ⚠️ {voiceError}
        </div>
      )}
    </div>
  );
}
