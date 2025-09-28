import React from 'react';

/**
 * Main Dashboard Page
 * 
 * Central hub for the NovaShield platform providing overview of all systems
 * This is a placeholder implementation for Phase 1, Week 1
 */

const Dashboard: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-2">
          Welcome to NovaShield 2025
        </h1>
        <p className="text-gray-400">
          Enterprise Security Platform - Phase 1 Development in Progress
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Security Status */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-100">Security Status</h3>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <p className="text-2xl font-bold text-green-400 mb-1">Secure</p>
          <p className="text-sm text-gray-400">All systems operational</p>
        </div>

        {/* Active Sessions */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-100">Active Sessions</h3>
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          </div>
          <p className="text-2xl font-bold text-blue-400 mb-1">0</p>
          <p className="text-sm text-gray-400">Terminal sessions</p>
        </div>

        {/* System Health */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-100">System Health</h3>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <p className="text-2xl font-bold text-green-400 mb-1">98%</p>
          <p className="text-sm text-gray-400">Overall performance</p>
        </div>

        {/* Development Status */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-100">Development</h3>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          </div>
          <p className="text-2xl font-bold text-yellow-400 mb-1">Phase 1</p>
          <p className="text-sm text-gray-400">Foundation setup</p>
        </div>
      </div>

      {/* Development Progress */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Development Progress</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">Phase 1: Foundation Setup</span>
              <span className="text-gray-400">25%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: '25%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">Phase 2: JARVIS AI System</span>
              <span className="text-gray-400">0%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">Phase 3: Security Operations Center</span>
              <span className="text-gray-400">0%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            Open Terminal
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            Security Scan
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            System Monitor
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;