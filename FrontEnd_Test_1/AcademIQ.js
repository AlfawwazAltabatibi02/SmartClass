let currentRole = 'student';
  const API_BASE_URL = 'http://127.0.0.1:8000';
  const DASHBOARD_ROUTES = {
    student: 'student.html',
    instructor: 'instructor.html',
    admin: 'admin.html'
  };

  function setLoginStatus(message, kind) {
    const el = document.getElementById('login-status');
    if (!el) return;

    if (!message) {
      el.textContent = '';
      el.className = 'login-status';
      return;
    }

    el.textContent = message;
    el.className = 'login-status show ' + (kind || 'error');
  }

  function getIdentifierByRole(role) {
    if (role === 'student') {
      return (document.getElementById('student-id-input')?.value || '').trim();
    }
    if (role === 'instructor') {
      return (document.getElementById('instructor-id-input')?.value || '').trim();
    }
    return (document.getElementById('admin-username-input')?.value || '').trim();
  }

  function getPasswordByRole(role) {
    if (role === 'admin') {
      return (document.getElementById('admin-password-input')?.value || '').trim();
    }
    return (document.getElementById('main-password-input')?.value || '').trim();
  }

  function showDashboardForRole(role) {
    const target = DASHBOARD_ROUTES[role];
    if (!target) return;
    window.location.href = target;
  }

  function clearLoginInputs() {
    const ids = [
      'student-id-input',
      'instructor-id-input',
      'main-password-input',
      'admin-username-input',
      'admin-password-input'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  async function attemptLogin(role) {
    const identifier = getIdentifierByRole(role);
    const password = getPasswordByRole(role);

    if (!identifier || !password) {
      setLoginStatus('Please enter both identifier and password.', 'error');
      return;
    }

    setLoginStatus('Signing in...', 'success');

    try {
      const response = await fetch(API_BASE_URL + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role, identifier: identifier, password: password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = (data && data.detail) ? data.detail : 'Login failed. Check your credentials.';
        setLoginStatus(detail, 'error');
        return;
      }

      localStorage.setItem('acadeiq_access_token', data.access_token || '');
      localStorage.setItem('acadeiq_role', data.role || role);
      localStorage.setItem('acadeiq_display_name', data.display_name || '');

      setLoginStatus('Login successful.', 'success');
      showDashboardForRole(role);
    } catch (err) {
      setLoginStatus('Cannot connect to backend. Ensure FastAPI is running on http://127.0.0.1:8000.', 'error');
    } finally {
      clearLoginInputs();
    }
  }

  function selectRole(role, btn) {
    currentRole = role;
    setLoginStatus('', '');
    document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
    if (btn && btn.classList && btn.classList.contains('role-tab')) btn.classList.add('active');
    document.getElementById('field-student').style.display = 'none';
    document.getElementById('field-instructor').style.display = 'none';
    const mainPwd = document.getElementById('main-password-group');
    const adminFields = document.getElementById('admin-fields');
    if (role === 'admin') {
      if (mainPwd) mainPwd.style.display = 'none';
      if (adminFields) adminFields.style.display = 'block';
    } else {
      if (mainPwd) mainPwd.style.display = 'block';
      if (adminFields) adminFields.style.display = 'none';
      document.getElementById('field-' + role).style.display = 'block';
    }
  }

  function toggleAdminLogin() {
    const adminFields = document.getElementById('admin-fields');
    const mainPwd = document.getElementById('main-password-group');
    const isOpen = adminFields.style.display === 'block';
    setLoginStatus('', '');
    if (isOpen) {
      adminFields.style.display = 'none';
      mainPwd.style.display = 'block';
      currentRole = 'student';
      document.getElementById('field-student').style.display = 'block';
      document.getElementById('field-instructor').style.display = 'none';
      document.querySelectorAll('.role-tab').forEach((t, i) => { t.classList.toggle('active', i === 0); });
    } else {
      selectRole('admin', null);
    }
  }

  async function doLogin() {
    await attemptLogin(currentRole);
  }

  async function submitLoginForm(event) {
    event.preventDefault();
    await doLogin();
  }

  async function loginAsAdmin() {
    currentRole = 'admin';
    await attemptLogin('admin');
  }

  function logout() {
    localStorage.removeItem('acadeiq_access_token');
    localStorage.removeItem('acadeiq_role');
    localStorage.removeItem('acadeiq_display_name');
    window.location.href = 'login.html';
  }

  function showStudentTab(tab, btn) {
    document.querySelectorAll('#page-student .topnav-link').forEach(l => l.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#page-student .subpage').forEach(s => s.classList.remove('active'));
    document.getElementById('stu-' + tab).classList.add('active');
  }

  function showInstructorTab(tab, btn) {
    document.querySelectorAll('#page-instructor .topnav-link').forEach(l => l.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#page-instructor .subpage').forEach(s => s.classList.remove('active'));
    document.getElementById('ins-' + tab).classList.add('active');
  }

  function showAdminTab(tab, btn) {
    document.querySelectorAll('#page-admin .topnav-link').forEach(l => l.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#page-admin .subpage').forEach(s => s.classList.remove('active'));
    document.getElementById('adm-' + tab).classList.add('active');
  }

  function switchTab(prefix, tab, btn) {
    const parent = btn.closest('.subpage') || btn.closest('.page');
    parent.querySelectorAll('.sec-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    parent.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    document.getElementById(prefix + '-' + tab).classList.add('active');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.toLowerCase();
    const onLoginPage = path.endsWith('/login.html') || path.endsWith('/academiq.html') || path === '/login.html' || path === '/academiq.html';
    if (!onLoginPage) return;

    const token = localStorage.getItem('acadeiq_access_token');
    const role = localStorage.getItem('acadeiq_role');
    if (token && role && DASHBOARD_ROUTES[role]) {
      showDashboardForRole(role);
    }
  });
