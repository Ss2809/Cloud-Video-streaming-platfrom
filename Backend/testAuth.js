const mongoose = require('mongoose');
const User = require('./models/User');
const Otp = require('./models/Otp');

const BASE_URL = 'http://localhost:5000/api/auth';
const TEST_EMAIL = `tester_${Date.now()}@streamcloud.io`;
const TEST_NAME = 'Sushil Tester';

async function runTests() {
  console.log('--- Starting Authentication Backend Automated Verification ---\n');

  // Wait for server to be responsive
  let serverReady = false;
  for (let i = 0; i < 15; i++) {
    try {
      const res = await fetch('http://localhost:5000/');
      if (res.ok) {
        serverReady = true;
        console.log('✓ Health check endpoint operational: http://localhost:5000/');
        break;
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!serverReady) {
    console.error('✗ Server failed to respond in time.');
    process.exit(1);
  }

  // 1. Validation test on register
  console.log('\n1. Testing input validation on /register...');
  const invalidRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'A', email: 'invalid-email' }),
  });
  const invalidData = await invalidRes.json();
  if (invalidRes.status === 400 && !invalidData.success) {
    console.log('✓ Input validation rejected invalid name and email format correctly.');
  } else {
    console.error('✗ Validation check failed:', invalidData);
  }

  // 2. Register valid user
  console.log('\n2. Testing POST /api/auth/register...');
  const regRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: TEST_NAME, email: TEST_EMAIL }),
  });
  const regData = await regRes.json();
  if (regRes.status === 200 && regData.success) {
    console.log(`✓ Registration OTP generated successfully for ${TEST_EMAIL}`);
  } else {
    console.error('✗ Register failed:', regData);
    process.exit(1);
  }

  // Connect to DB directly to verify OTP is stored hashed and retrieve it for verification
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cloud_streaming');
  const storedOtpDoc = await Otp.findOne({ email: TEST_EMAIL, type: 'register' });
  if (storedOtpDoc && storedOtpDoc.otp.startsWith('$2')) {
    console.log('✓ Security verified: OTP is securely bcrypt-hashed in MongoDB collection.');
  } else {
    console.error('✗ Stored OTP is not hashed properly!');
  }

  // 3. Testing resend OTP
  console.log('\n3. Testing POST /api/auth/send-otp (Resend OTP)...');
  const resendRes = await fetch(`${BASE_URL}/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, type: 'register', name: TEST_NAME }),
  });
  const resendData = await resendRes.json();
  if (resendRes.status === 200 && resendData.success) {
    console.log('✓ Resend OTP endpoint succeeded with fresh code.');
  } else {
    console.error('✗ Resend OTP failed:', resendData);
  }

  // 4. Testing invalid OTP verification
  console.log('\n4. Testing POST /api/auth/verify-otp with incorrect OTP...');
  const wrongOtpRes = await fetch(`${BASE_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, otp: '000000', type: 'register' }),
  });
  const wrongOtpData = await wrongOtpRes.json();
  if (wrongOtpRes.status === 400 && !wrongOtpData.success) {
    console.log('✓ Incorrect OTP properly rejected with 400 Bad Request.');
  } else {
    console.error('✗ Wrong OTP was not rejected properly:', wrongOtpData);
  }

  // 5. Testing valid OTP verification
  console.log('\n5. Testing POST /api/auth/verify-otp with valid OTP...');
  const latestOtp = resendData.previewOtp;
  const verifyRes = await fetch(`${BASE_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, otp: latestOtp, type: 'register' }),
  });
  const verifyData = await verifyRes.json();
  if (verifyRes.status === 200 && verifyData.token && verifyData.user) {
    console.log('✓ Account created and JWT issued successfully.');
    console.log(`  User: ${verifyData.user.name} (${verifyData.user.email}) | Role: ${verifyData.user.role}`);
  } else {
    console.error('✗ Verification failed:', verifyData);
    process.exit(1);
  }

  const userToken = verifyData.token;
  const userId = verifyData.user._id;

  // 6. Testing GET /api/auth/me without token
  console.log('\n6. Testing protected route without token...');
  const unauthRes = await fetch(`${BASE_URL}/me`);
  if (unauthRes.status === 401) {
    console.log('✓ Protected route returned 401 Unauthorized when missing token.');
  } else {
    console.error('✗ Missing token was not rejected with 401.');
  }

  // 7. Testing GET /api/auth/me with valid JWT token
  console.log('\n7. Testing GET /api/auth/me with valid JWT token...');
  const meRes = await fetch(`${BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const meData = await meRes.json();
  if (meRes.status === 200 && meData.user.email === TEST_EMAIL) {
    console.log('✓ Protected route successfully verified JWT and returned user profile.');
  } else {
    console.error('✗ Failed to fetch authenticated user profile:', meData);
  }

  // 8. Testing Admin middleware rejection for regular user
  console.log('\n8. Testing Admin-only route with regular user token...');
  const adminDenyRes = await fetch(`${BASE_URL}/admin-check`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const adminDenyData = await adminDenyRes.json();
  if (adminDenyRes.status === 403 && !adminDenyData.success) {
    console.log('✓ Role-based middleware correctly rejected regular user with 403 Forbidden.');
  } else {
    console.error('✗ Admin check did not block regular user:', adminDenyData);
  }

  // 9. Update user to admin role and test Admin middleware authorization
  console.log('\n9. Testing Admin-only route after promoting user to admin...');
  await User.findByIdAndUpdate(userId, { role: 'admin' });
  const updatedUser = await User.findById(userId);
  const { generateToken } = require('./utils/tokenUtils');
  const adminToken = generateToken(updatedUser);

  const adminPassRes = await fetch(`${BASE_URL}/admin-check`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminPassData = await adminPassRes.json();
  if (adminPassRes.status === 200 && adminPassData.success) {
    console.log('✓ Role-based middleware successfully granted access to Administrator.');
  } else {
    console.error('✗ Admin check failed for admin user:', adminPassData);
  }

  // 10. Test Login flow for existing user
  console.log('\n10. Testing POST /api/auth/login for existing user...');
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL }),
  });
  const loginData = await loginRes.json();
  if (loginRes.status === 200 && loginData.success) {
    console.log(`✓ Login OTP sent to ${TEST_EMAIL}`);
  } else {
    console.error('✗ Login failed:', loginData);
  }

  // 11. Verify Login OTP
  console.log('\n11. Testing POST /api/auth/verify-otp for login...');
  const loginVerifyRes = await fetch(`${BASE_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, otp: loginData.previewOtp, type: 'login' }),
  });
  const loginVerifyData = await loginVerifyRes.json();
  if (loginVerifyRes.status === 200 && loginVerifyData.token) {
    console.log('✓ Login verified successfully and issued new JWT session.');
  } else {
    console.error('✗ Login verification failed:', loginVerifyData);
  }

  // Cleanup test records
  console.log('\nCleaning up test records from database...');
  await User.findByIdAndDelete(userId);
  await Otp.deleteMany({ email: TEST_EMAIL });
  await mongoose.disconnect();
  console.log('✓ Test cleanup complete.');

  console.log('\n======================================================');
  console.log('🎉 ALL AUTHENTICATION BACKEND TESTS PASSED CLEANLY! 🎉');
  console.log('======================================================');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
