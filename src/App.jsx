import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import HomeScreen from './components/HomeScreen';
import QuestionScreen from './components/QuestionScreen';
import ResultScreen from './components/ResultScreen';
import ReviewScreen from './components/ReviewScreen';
import ExplanationScreen from './components/ExplanationScreen';
import ProgressScreen from './components/ProgressScreen';
import CalendarScreen from './components/CalendarScreen';
import FormulaScreen from './components/FormulaScreen';
import ThinkingScreen from './components/thinking/ThinkingScreen';
import './App.css';

function Router() {
  const { state } = useApp();

  switch (state.screen) {
    case 'home':
      return <HomeScreen />;
    case 'question':
      return <QuestionScreen />;
    case 'result':
      return <ResultScreen />;
    case 'review':
      return <ReviewScreen />;
    case 'explanation':
      return <ExplanationScreen />;
    case 'progress':
      return <ProgressScreen />;
    case 'calendar':
      return <CalendarScreen />;
    case 'formula':
      return <FormulaScreen />;
    case 'thinking':
      return <ThinkingScreen />;
    default:
      return <HomeScreen />;
  }
}

const THEME_KEY = 'math_app_theme';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(THEME_KEY) || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <AppProvider>
      <div className="app-container">
        <button className="theme-toggle" onClick={toggleTheme} title="テーマ切替">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <Router />
      </div>
    </AppProvider>
  );
}

export default App;
