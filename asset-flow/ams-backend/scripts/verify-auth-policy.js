/* eslint-disable no-console */
const BASE = process.env.API_BASE_URL || 'http://localhost:5000';

const USER_EMP_NO = process.env.TEST_EMPLOYEE_NUMBER || '';
const USER_PASSWORD = process.env.TEST_PASSWORD || '';
const ADMIN_EMP_NO = process.env.TEST_ADMIN_EMPLOYEE_NUMBER || '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || '';

const results = [];

async function call(method, path, { token, body, headers } = {}) {
  const finalHeaders = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, data };
}

function assertCheck(name, condition, details = '') {
  const ok = Boolean(condition);
  results.push({ name, ok, details });
  if (ok) {
    console.log(`PASS: ${name}`);
  } else {
    console.error(`FAIL: ${name}${details ? ` -> ${details}` : ''}`);
  }
}

async function login(employeeNumber, password) {
  const res = await call('POST', '/api/auth/login', {
    body: { employeeNumber, password },
  });
  return res;
}

(async () => {
  try {
    console.log(`Running auth policy checks against ${BASE}\n`);

    // 1) Public route should be reachable
    const health = await call('GET', '/api/health/db');
    assertCheck(
      'Public route /api/health/db is reachable',
      health.status === 200 || health.status === 500,
      `status=${health.status}`,
    );

    // 2) Protected route without token should fail
    const meNoToken = await call('GET', '/api/profile/me');
    assertCheck(
      'Protected route /api/profile/me requires token',
      meNoToken.status === 401,
      `status=${meNoToken.status}`,
    );

    // 3) Spoof headers should not bypass auth
    const spoof = await call('GET', '/api/profile/me', {
      headers: {
        'x-user-id': 'fake-id',
        'x-user-role': 'admin',
      },
    });
    assertCheck(
      'Spoof headers do not bypass auth',
      spoof.status === 401,
      `status=${spoof.status}`,
    );

    // 4) Login with normal user creds (if provided)
    let userToken = '';
    if (USER_EMP_NO && USER_PASSWORD) {
      const userLogin = await login(USER_EMP_NO, USER_PASSWORD);
      assertCheck(
        'User login works',
        userLogin.status === 200 && !!userLogin.data?.token,
        `status=${userLogin.status}`,
      );
      userToken = userLogin.data?.token || '';

      if (userToken) {
        const meWithToken = await call('GET', '/api/profile/me', { token: userToken });
        assertCheck(
          'Protected route works with valid token',
          meWithToken.status === 200,
          `status=${meWithToken.status}`,
        );

        const adminRouteAsUser = await call('GET', '/api/employees', { token: userToken });
        assertCheck(
          'Non-admin cannot access admin route /api/employees',
          adminRouteAsUser.status === 403,
          `status=${adminRouteAsUser.status}`,
        );
      }
    } else {
      console.log('SKIP: User login checks (set TEST_EMPLOYEE_NUMBER + TEST_PASSWORD)');
    }

    // 5) Admin check (optional if creds provided)
    if (ADMIN_EMP_NO && ADMIN_PASSWORD) {
      const adminLogin = await login(ADMIN_EMP_NO, ADMIN_PASSWORD);
      assertCheck(
        'Admin login works',
        adminLogin.status === 200 && !!adminLogin.data?.token,
        `status=${adminLogin.status}`,
      );

      const adminToken = adminLogin.data?.token || '';
      if (adminToken) {
        const adminRoute = await call('GET', '/api/employees', { token: adminToken });
        assertCheck(
          'Admin can access /api/employees',
          adminRoute.status === 200,
          `status=${adminRoute.status}`,
        );
      }
    } else {
      console.log('SKIP: Admin checks (set TEST_ADMIN_EMPLOYEE_NUMBER + TEST_ADMIN_PASSWORD)');
    }

    const passed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    console.log('\nSummary');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal error running checks:', err.message);
    process.exit(1);
  }
})();