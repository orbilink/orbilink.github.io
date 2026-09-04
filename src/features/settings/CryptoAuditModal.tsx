import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  FileText,
  Lock,
  Cpu,
  KeyRound,
} from 'lucide-react';
import { cryptoTestHarness, CryptoTestResult } from '../../services/crypto/cryptoTestHarness';
import { CryptoAuditEntry } from '../../types/crypto';

interface CryptoAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CryptoAuditModal: React.FC<CryptoAuditModalProps> = ({ isOpen, onClose }) => {
  const [running, setRunning] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<CryptoTestResult[]>([]);
  const [auditSummary, setAuditSummary] = useState<CryptoAuditEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'tests' | 'audit'>('tests');

  useEffect(() => {
    if (isOpen && testResults.length === 0) {
      handleRunTests();
    }
  }, [isOpen]);

  const handleRunTests = async () => {
    setRunning(true);
    try {
      const { results, auditSummary: audit } = await cryptoTestHarness.runAllTests();
      setTestResults(results);
      setAuditSummary(audit);
    } catch (err) {
      console.error('Failed to run crypto test suite:', err);
    } finally {
      setRunning(false);
    }
  };

  if (!isOpen) return null;

  const passedCount = testResults.filter((t) => t.passed).length;
  const allPassed = testResults.length > 0 && passedCount === testResults.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl space-y-6 max-h-[90vh] flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">RYNOX Cryptographic Verification & Audit</h2>
              <p className="text-xs text-slate-400">Phase 6 E2EE & Phase 7 Encrypted Backup Security Test Suite</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Action */}
        <div className="flex items-center justify-between shrink-0 border-b border-slate-800 pb-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'tests'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Security Tests ({passedCount}/{testResults.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'audit'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Security Audit Table
            </button>
          </div>

          <button
            onClick={handleRunTests}
            disabled={running}
            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors shadow"
          >
            {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>{running ? 'Running Tests...' : 'Re-run Tests'}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-4 flex-1 pr-1">
          {activeTab === 'tests' ? (
            <div className="space-y-3">
              {/* Overall Status Badge */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  allPassed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                <div className="flex items-center space-x-2 font-medium">
                  {allPassed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-amber-400" />}
                  <span>{allPassed ? 'All 7 Cryptographic Security Tests Passed' : 'Test Suite in Progress'}</span>
                </div>
                <span className="font-mono text-[11px] opacity-80">
                  {passedCount}/{testResults.length} verified
                </span>
              </div>

              {/* Individual Tests */}
              {testResults.map((test) => (
                <div
                  key={test.testId}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {test.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-slate-200">{test.name}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                        test.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {test.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed pl-6">{test.details}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="py-2.5 px-3 font-medium">Security Property</th>
                      <th className="py-2.5 px-3 font-medium">Status</th>
                      <th className="py-2.5 px-3 font-medium">Implementation Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditSummary.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-200">{item.property}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400 leading-relaxed">
                          {item.evidence}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>WebCrypto SubtleCrypto (ECDH P-256 / AES-256-GCM / HKDF-SHA256)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
