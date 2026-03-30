import { AppProvider, useApp } from './contexts/AppContext';
import HomeScreen from './components/HomeScreen';
import QuestionScreen from './components/QuestionScreen';
import ResultScreen from './components/ResultScreen';
import ReviewScreen from './components/ReviewScreen';
import ExplanationScreen from './components/ExplanationScreen';
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
    default:
      return <HomeScreen />;
  }
}

function App() {
  return (
    <AppProvider>
      <div className="app-container">
        <Router />
      </div>
    </AppProvider>
  );
}

export default App;
