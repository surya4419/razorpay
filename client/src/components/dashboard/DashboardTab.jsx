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

/**
 * Design tokens (matches playground system):
 * Ink #0A1F3D · Primary #2B5FE0 · Slate #5B6B84
 * Ice #F6F9FE · Line #E3E8F0 · Radius: 20 (cards) / 12 (controls) / full (pills)
 */

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
          search: searchQuery || undefined
        })
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
    <div className="space-y-6" style={{ background: '#FBFCFE' }}>
      {/* Sub-navigation */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-1.5 rounded-[14px]"
        style={{ border: '1px solid #E3E8F0', boxShadow: '0 1px 1px rgba(10,31,77,0.03), 0 4px 12px -8px rgba(10,31,77,0.12)' }}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('overview')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-xs font-semibold transition-all"
            style={
              activeSubTab === 'overview'
                ? { background: 'linear-gradient(180deg, #16305A 0%, #0A1F3D 100%)', color: '#FFFFFF', boxShadow: '0 1px 0 rgba(255,255,255,0.1) inset, 0 4px 10px -4px rgba(10,31,77,0.5)' }
                : { color: '#5B6B84', background: 'transparent' }
            }
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Overview & analytics</span>
          </button>

          <button
            onClick={() => setActiveSubTab('bandit_inspect')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-xs font-semibold transition-all"
            style={
              activeSubTab === 'bandit_inspect'
                ? { background: 'linear-gradient(180deg, #16305A 0%, #0A1F3D 100%)', color: '#FFFFFF', boxShadow: '0 1px 0 rgba(255,255,255,0.1) inset, 0 4px 10px -4px rgba(10,31,77,0.5)' }
                : { color: '#5B6B84', background: 'transparent' }
            }
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Bandit & rules under the hood</span>
          </button>
        </div>

        <span className="text-[11px] font-mono hidden sm:block pr-3" style={{ color: '#8B98AC' }}>
          Combined real + simulated dataset
        </span>
      </div>

      {activeSubTab === 'overview' ? (
        <>
          <HeadlineMetrics metrics={metrics} />
          <ControlPanel
            onRunSimulation={handleRunSimulation}
            isSimulating={isSimulating}
            progress={simulationProgress}
            onRefresh={refreshDashboardData}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-2">
              <LearningCurveChart chartData={chartData} divergences={divergences} />
            </div>
            <div className="flex flex-col">
              <LiveFeed events={events} onSelectTransaction={setSelectedTransactionId} />
            </div>
          </div>

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
        </>
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
