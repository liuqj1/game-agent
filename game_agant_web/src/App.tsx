import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/routes/routes';
import { NavBar } from '@/components/layout/NavBar';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="pt-16">
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
