document.addEventListener('DOMContentLoaded', function() {
  // Auto-redirect if already logged in
  if (Auth.isAuthenticated() && Auth.getRole()) {
    window.location.href = Auth.getDashboardUrl(Auth.getRole());
    return;
  }

  document.getElementById('semester-label').textContent = getCurrentSemester();

  var currentRole = 'student';
  var adminOpen = false;
  var roleTabs = document.querySelectorAll('.role-tab');
  var studentField = document.getElementById('student-field');
  var instructorField = document.getElementById('instructor-field');
  var mainPasswordGroup = document.getElementById('main-password-group');
  var mainExtras = document.getElementById('main-extras');
  var mainSubmitBtn = document.getElementById('main-submit-btn');
  var adminToggle = document.getElementById('admin-toggle');
  var adminSection = document.getElementById('admin-section');
  var statusEl = document.getElementById('login-status');

  function showStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = 'login-status show ' + kind;
  }
  function clearStatus() {
    statusEl.textContent = '';
    statusEl.className = 'login-status';
  }

  function selectRole(role) {
    currentRole = role;
    clearStatus();
    adminOpen = false;
    adminSection.style.display = 'none';
    mainPasswordGroup.style.display = '';
    mainExtras.style.display = '';
    mainSubmitBtn.style.display = '';
    studentField.style.display = role === 'student' ? '' : 'none';
    instructorField.style.display = role === 'instructor' ? '' : 'none';
    roleTabs.forEach(function(tab) {
      tab.classList.toggle('active', tab.getAttribute('data-role') === role);
    });
  }

  roleTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      selectRole(tab.getAttribute('data-role'));
    });
  });

  adminToggle.addEventListener('mouseover', function() { this.style.opacity = '1'; });
  adminToggle.addEventListener('mouseout', function() { this.style.opacity = '0.65'; });
  adminToggle.addEventListener('click', function(e) {
    e.preventDefault();
    clearStatus();
    if (adminOpen) {
      adminOpen = false;
      adminSection.style.display = 'none';
      currentRole = 'student';
      selectRole('student');
    } else {
      adminOpen = true;
      currentRole = 'admin';
      adminSection.style.display = 'block';
      mainPasswordGroup.style.display = 'none';
      mainExtras.style.display = 'none';
      mainSubmitBtn.style.display = 'none';
      studentField.style.display = 'none';
      instructorField.style.display = 'none';
    }
  });

  function getIdentifier(role) {
    if (role === 'student') return document.getElementById('student-id-input').value.trim();
    if (role === 'instructor') return document.getElementById('instructor-id-input').value.trim();
    return document.getElementById('admin-username-input').value.trim();
  }
  function getPassword(role) {
    if (role === 'admin') return document.getElementById('admin-password-input').value.trim();
    return document.getElementById('main-password-input').value.trim();
  }
  function clearInputs() {
    document.getElementById('student-id-input').value = '';
    document.getElementById('instructor-id-input').value = '';
    document.getElementById('main-password-input').value = '';
    document.getElementById('admin-username-input').value = '';
    document.getElementById('admin-password-input').value = '';
  }

  async function attemptLogin(role) {
    var identifier = getIdentifier(role);
    var password = getPassword(role);
    if (!identifier || !password) {
      showStatus('Please enter both identifier and password.', 'error');
      return;
    }
    showStatus('Signing in...', 'success');
    try {
      await Auth.login(role, identifier, password);
      showStatus('Login successful.', 'success');
      window.location.href = Auth.getDashboardUrl(role);
    } catch(err) {
      showStatus(err.message || 'Login failed. Check your credentials.', 'error');
    } finally {
      clearInputs();
    }
  }

  document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    attemptLogin(currentRole);
  });

  document.getElementById('admin-submit-btn').addEventListener('click', function() {
    currentRole = 'admin';
    attemptLogin('admin');
  });
});
