// Test script for forgot password functionality
// Run this with: node test-forgot-password.js

const API_URL = 'http://localhost:3001';

async function testForgotPassword() {
  console.log('🧪 Testing Forgot Password Functionality\n');

  // Test 1: Send OTP to existing user
  console.log('1. Testing forgot password OTP sending...');
  try {
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log('✅ OTP sent successfully:', data.message);
    } else {
      console.log('❌ Failed to send OTP:', data.error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  console.log('\n2. Testing OTP verification...');
  // Note: You'll need to check your email for the actual OTP
  console.log('📧 Check your email for the OTP and test verification manually');

  console.log('\n3. Testing password reset...');
  console.log('🔐 After OTP verification, test password reset with new password');

  console.log('\n✨ Manual Testing Steps:');
  console.log('1. Go to http://localhost:3000/login');
  console.log('2. Click "Forgot your password?"');
  console.log('3. Enter your email and click "Send OTP"');
  console.log('4. Check your email for the 6-digit OTP');
  console.log('5. Enter the OTP and click "Verify OTP"');
  console.log('6. Set a new password meeting all requirements');
  console.log('7. Click "Reset Password"');
  console.log('8. You should be redirected to login with success message');
  console.log('9. Login with your new password');
}

// Run the test
testForgotPassword();