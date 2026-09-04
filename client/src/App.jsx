import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { PlaygroundTab } from './components/playground/PlaygroundTab.jsx';
import { DashboardTab } from './components/dashboard/DashboardTab.jsx';
import { api } from './services/api.js';

export function App() {
  const [activeTab, setActiveTab] = useState('playground'); // Default Landing tab: Playground
  const [config, setConfig] = useState(null);

  useEffect(() => {
    api.getConfig()
      .then(res => setConfig(res))
      .catch(err => console.warn('Could not load public config:', err.message));
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1A2332] flex flex-col selection:bg-[#14304D]/15 selection:text-[#14304D]">
      {/* Top Persistent Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        config={config}
      />

      {/* Main Tab Surface */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={activeTab === 'playground' ? 'block' : 'hidden'}>
          <PlaygroundTab onSwitchToDashboard={() => setActiveTab('dashboard')} />
        </div>

        <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
          <DashboardTab />
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#E2E5EB] bg-white py-4 text-center text-xs text-[#6B7280] font-sans">
        Razorpay Buildathon 2026 • Track 03: AI Revenue Recovery • Powered by Razorpay Test Mode
      </footer>
    </div>
  );
}

export default App;
