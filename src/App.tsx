import { GameTable } from './components/GameTable';
import { ToastProvider } from './contexts/ToastContext';

function App() {
  return (
    <ToastProvider>
      <GameTable />
    </ToastProvider>
  );
}

export default App;
