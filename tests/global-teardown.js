// tests/global-teardown.js
module.exports = async () => {
  console.log('🧹 Global test teardown starting...');
  
  // Any global cleanup here
  
  console.log('✅ Global test teardown complete');
};