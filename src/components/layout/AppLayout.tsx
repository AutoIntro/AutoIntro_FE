import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main-container">
        <Outlet />
      </main>
    </div>
  );
}
