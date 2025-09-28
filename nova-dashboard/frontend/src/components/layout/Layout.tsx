import React from 'react';

/**
 * Main Layout Component
 * 
 * Provides the overall structure for the NovaShield application
 * This is a basic implementation for Phase 1, Week 1
 */

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-xl font-bold text-purple-400">
                🛡️ NovaShield 2025
              </div>
              <div className="text-sm text-gray-400">
                Enterprise Security Platform
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-300">
                Phase 1 Development
              </div>
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-content-center">
                <span className="text-white text-sm font-medium">D</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>
              NovaShield 2025 - Military-Grade Security Platform
            </div>
            <div>
              Version 1.0.0-dev | Phase 1 Week 1
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;