import React, { useState, useEffect } from 'react';
import { HeadlineMetrics } from './HeadlineMetrics.jsx';
import { ControlPanel } from './ControlPanel.jsx';
import { LearningCurveChart } from './LearningCurveChart.jsx';
import { LiveFeed } from './LiveFeed.jsx';
import { AuditTable } from './AuditTable.jsx';
import { AuditDetail } from './AuditDetail.jsx';
import { BanditUnderTheHood } from './BanditUnderTheHood.jsx';
import { api } from '../../services/api.js';
import { useSocket } from '../../hooks/useSocket.js';
import { LayoutDashboard, Cpu } from 'lucide-react';

export function DashboardTab() {
  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [divergences, setDivergences] = useState([]);
  const [transactionsData, setTransactionsData] = useState({ transactions: [], total: 0 });
  const [page, setPage] = useState(1);
  const [filterRealOnly, setFilterRealOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('overview');

  const { events, simulationProgress } = useSocket();

  const refreshDashboardData = async () => {
    try {
      const [summaryRes, chartRes, banditRes, txnsRes] = await Promise.all([
        api.getMetricsSummary(),
        api.getLearningCurve(),
        api.getBanditState(),
        api.getTransactions({
          page,
          limit: 50,
          isRealRazorpayCall: filterRealOnly ? 'true' : undefined,
          status: statusFilter || undefined,
          search: searchQuery || undefined,
        }),
      ]);
      setMetrics(summaryRes);
      setChartData(chartRes);
      setDivergences(banditRes.divergences || []);
      setTransactionsData(txnsRes);
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
    }
  };

  useEffect(() => { refreshDashboardData(); }, [page, filterRealOnly, statusFilter, searchQuery]);

  useEffect(() => {
    if (simulationProgress) {
      setIsSimulating(true);
      if (simulationProgress.percent === 100) {
        setIsSimulating(false);
        refreshDashboardData();
      }
    }
  }, [simulationProgress]);

  const handleRunSimulation = async (params) => {
    setIsSimulating(true);
    try {
      await api.runSimulation(params);
    } catch (err) {
      console.error('Simulation run error:', err);
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-[12px] p-1" style={{ background: '#E8ECF2' }}>
          <button
            onClick={() => setActiveSubTab('overview')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-xs font-semibold transition-all"
            style={activeSubTab === 'overview'
              ? { background: '#FFFFFF', color: '#0A1F3D', boxShadow: '0 1px 4px rgba(10,31,77,0.10)' }
              : { color: '#5B6B84', background: 'transparent' }}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Overview & analytics</span>
          </button>
          <button
            onClick={() => setActiveSubTab('bandit_inspect')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-xs font-semibold transition-all"
            style={activeSubTab === 'bandit_inspect'
              ? { background: '#FFFFFF', color: '#0A1F3D', boxShadow: '0 1px 4px rgba(10,31,77,0.10)' }
              : { color: '#5B6B84', background: 'transparent' }}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Bandit & rules under the hood</span>
          </button>
        </div>
        <span className="text-[11px] font-mono hidden sm:block" style={{ color: '#8B98AC' }}>
          Combined real + simulated dataset
        </span>
      </div>

      {activeSubTab === 'overview' ? (
        /* Single unified surface */
        <div
          className="rounded-[24px] overflow-hidden"
          style={{
            background: '#F3F5F9',
            boxShadow: '0 2px 4px rgba(10,31,77,0.06), 0 16px 40px -12px rgba(10,31,77,0.28)',
          }}
        >
          {/* Hero metrics */}
          <div className="px-8 pt-8 pb-6">
            <HeadlineMetrics metrics={metrics} />
          </div>

          <div className="mx-6" style={{ height: 1, background: 'rgba(10,31,77,0.07)' }} />

          {/* Simulation controls */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: '#0A1F3D' }}>Analytics & simulation</h2>
              <span className="text-[11px]" style={{ color: '#8B98AC' }}>Live streaming pipeline</span>
            </div>
            <ControlPanel
              onRunSimulation={handleRunSimulation}
              isSimulating={isSimulating}
              progress={simulationProgress}
              onRefresh={refreshDashboardData}
            />
          </div>

          {/* Chart + live feed — items-start so feed doesn't over-stretch */}
          <div className="px-4 pb-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2 rounded-[16px] overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(10,31,77,0.06), 0 8px 24px -8px rgba(10,31,77,0.16)' }}>
              <LearningCurveChart chartData={chartData} divergences={divergences} />
            </div>
            <div className="rounded-[16px] overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(10,31,77,0.06), 0 8px 24px -8px rgba(10,31,77,0.16)' }}>
              <LiveFeed events={events} onSelectTransaction={setSelectedTransactionId} />
            </div>
          </div>

          <div className="mx-6" style={{ height: 1, background: 'rgba(10,31,77,0.07)' }} />

          {/* Transaction ledger */}
          <div className="px-6 pt-4 pb-6">
            <p className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: '#8B98AC' }}>
              Transaction ledger
            </p>
            <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <AuditTable
                transactions={transactionsData.transactions}
                total={transactionsData.total}
                page={page}
                onPageChange={setPage}
                filterRealOnly={filterRealOnly}
                onToggleRealOnly={() => setFilterRealOnly(!filterRealOnly)}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectTransaction={setSelectedTransactionId}
              />
            </div>
          </div>
        </div>
      ) : (
        <BanditUnderTheHood />
      )}

      {selectedTransactionId && (
        <AuditDetail
          transactionId={selectedTransactionId}
          onClose={() => setSelectedTransactionId(null)}
        />
      )}
    </div>
  );
}
