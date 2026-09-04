import React from 'react';
import { Shield } from 'lucide-react';

/**
 * Shares tokens with CardExpiryModal:
 * Ink #0A1F3D · Primary #2B5FE0 · Primary-D #1E46B3
 * Surface (light) #EAF2FE · Radius scale: 28 / 18 / 12
 */

export function Navbar({ activeTab, onTabChange, config }) {
  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'linear-gradient(180deg, #F1F6FE 0%, #E8F0FD 100%)',
        borderBottom: '1px solid #DCE7FA',
        boxShadow: '0 4px 16px -12px rgba(43,95,224,0.35)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(160deg, #3B6FE8 0%, #2B5FE0 100%)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset, 0 4px 10px -3px rgba(43,95,224,0.4)',
              }}
            >
              <Shield className="w-4 h-4 text-white" strokeWidth={2.4} />
            </div>
            <span className="font-semibold tracking-tight text-[15px]" style={{ color: '#0A1F3D' }}>
              AI Revenue Recovery Engine
            </span>
          </div>

          {/* Center tab switcher — minimal, underline only */}
          <nav className="flex items-center gap-7 h-full">
            <button
              onClick={() => onTabChange('playground')}
              className="relative h-full flex items-center text-[13.5px] font-medium transition-colors"
              style={{ color: activeTab === 'playground' ? '#0A1F3D' : '#6B7A93' }}
            >
              Playground
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full transition-opacity"
                style={{
                  background: '#2B5FE0',
                  opacity: activeTab === 'playground' ? 1 : 0,
                }}
              />
            </button>

            <button
              onClick={() => onTabChange('dashboard')}
              className="relative h-full flex items-center text-[13.5px] font-medium transition-colors"
              style={{ color: activeTab === 'dashboard' ? '#0A1F3D' : '#6B7A93' }}
            >
              Dashboard
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full transition-opacity"
                style={{
                  background: '#2B5FE0',
                  opacity: activeTab === 'dashboard' ? 1 : 0,
                }}
              />
            </button>
          </nav>

          {/* Right status tag */}
          <div className="w-[160px] flex justify-end">
           
             
          </div>
        </div>
      </div>
    </header>
  );
}

// --- Demo wrapper ---
export default function Demo() {
  const [tab, setTab] = React.useState('playground');
  return (
    <div style={{ background: '#F6F8FC' }} className="min-h-[300px]">
      <Navbar activeTab={tab} onTabChange={setTab} />
    </div>
  );
}