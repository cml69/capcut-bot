/**
 * CapCut Account Creator Bot
 * 
 * Main entry point for the application
 * 
 * @author Nanda Gunawan <admin@countryssh.com>
 * @version 2.0.0
 * @license MIT
 */

import { AccountCreator } from './core/AccountCreator.js';

// ========================================
// RAILWAY/CLOUD AUTO MODE
// ========================================
// Override AccountCreator.run() untuk handle auto mode
const originalRun = AccountCreator.run;

AccountCreator.run = async function() {
  // Import UserInterface di sini
  const { UserInterface } = await import('./services/UserInterface.js');
  
  // Check if running in cloud/non-interactive environment
  const isCloud = process.env.RAILWAY_ENVIRONMENT || 
                  process.env.RENDER || 
                  process.env.NODE_ENV === 'production' ||
                  !process.stdin.isTTY;
  
  if (isCloud) {
    console.log('🚂 Cloud/Non-interactive mode detected\n');
    
    // Override askForAccountCount
    const originalAsk = UserInterface.askForAccountCount;
    UserInterface.askForAccountCount = async function() {
      const count = parseInt(process.env.ACCOUNT_COUNT) || 5;
      console.log(`🔧 Auto mode: Creating ${count} accounts\n`);
      return count;
    };
    
    // Run original with override
    const result = await originalRun.call(this);
    
    // Restore original (optional)
    UserInterface.askForAccountCount = originalAsk;
    
    // Force exit after completion
    setTimeout(() => {
      console.log('\n✅ Process complete. Exiting...');
      process.exit(0);
    }, 3000);
    
    return result;
  } else {
    // Local interactive mode
    console.log('💻 Local interactive mode\n');
    return originalRun.call(this);
  }
};

// ========================================
// Run the application
// ========================================
AccountCreator.run().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
