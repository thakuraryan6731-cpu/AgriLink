import { runSecurityTestSuite } from './securityTests';
import { runFarmerOrderTrackingTests } from './farmerOrderTrackingTests';
import { runVisibilityAndContactTestSuite } from './visibilityAndContactTests';
import { runPhase1TestSuite } from './phase1Tests';
import { runAdminServiceTestSuite } from './adminServiceTests';

console.log('================================================================');
console.log(' AGRILINK AI - COMPREHENSIVE AUTOMATED VERIFICATION SUITE');
console.log(' Smart India Hackathon 2026 (SIH26033) - DoCA');
console.log('================================================================\n');

let allPassed = true;

console.log('--- SECTION 1: SECURITY & RLS ENFORCEMENT SUITE ---');
const secResults = runSecurityTestSuite();

secResults.forEach((r, idx) => {
  const statusBadge = r.passed ? '[PASS]' : '[FAIL]';
  console.log(`${idx + 1}. ${statusBadge} ${r.testId}: ${r.name}`);
  console.log(`   Description: ${r.description}`);
  console.log(`   Enforcement: ${r.securityEnforcement}`);
  console.log(`   Result:      ${r.details}\n`);
  if (!r.passed) allPassed = false;
});

console.log('\n--- SECTION 2: FARMER SCREEN 5 ACTIVE ORDERS & TRACKING SUITE ---');
const farmerResults = runFarmerOrderTrackingTests();

farmerResults.forEach((r, idx) => {
  const statusBadge = r.passed ? '[PASS]' : '[FAIL]';
  console.log(`${idx + 1}. ${statusBadge} ${r.testId}: ${r.name}`);
  console.log(`   Description: ${r.description}`);
  console.log(`   Result:      ${r.details}\n`);
  if (!r.passed) allPassed = false;
});

console.log('\n--- SECTION 3: GLOBAL UI VISIBILITY, PRODUCE DATA, PHOTO & CONTACT SUITE ---');
const vcResults = runVisibilityAndContactTestSuite();

vcResults.forEach((r, idx) => {
  const statusBadge = r.passed ? '[PASS]' : '[FAIL]';
  console.log(`${idx + 1}. ${statusBadge} ${r.testId}: ${r.name}`);
  console.log(`   Description: ${r.description}`);
  console.log(`   Result:      ${r.details}\n`);
  if (!r.passed) allPassed = false;
});

console.log('\n--- SECTION 4: PHASE 1 REAL DATA, ADMIN & FARMER COMMUNITY SUITE ---');
const p1Results = runPhase1TestSuite();

p1Results.forEach((r, idx) => {
  const statusBadge = r.passed ? '[PASS]' : '[FAIL]';
  console.log(`${idx + 1}. ${statusBadge} ${r.testId}: ${r.name}`);
  console.log(`   Description: ${r.description}`);
  console.log(`   Result:      ${r.details}\n`);
  if (!r.passed) allPassed = false;
});

console.log('\n--- SECTION 5: PHASE 2 REAL DOCA ADMIN DATA & SERVICES SUITE ---');
const p2Results = runAdminServiceTestSuite();

p2Results.forEach((r, idx) => {
  const statusBadge = r.passed ? '[PASS]' : '[FAIL]';
  console.log(`${idx + 1}. ${statusBadge} ${r.testId}: ${r.name}`);
  console.log(`   Description: ${r.description}`);
  console.log(`   Result:      ${r.details}\n`);
  if (!r.passed) allPassed = false;
});

console.log('----------------------------------------------------------------');
if (allPassed) {
  console.log('SUCCESS: All 36 Security, RLS, Farmer Tracking, Visibility, Contact, Phase 1 & Phase 2 Admin Tests PASSED.');
} else {
  console.error('FAILURE: One or more test suites failed.');
  process.exit(1);
}




