function logout() {
  localStorage.removeItem('acadeiq_access_token');
  localStorage.removeItem('acadeiq_role');
  localStorage.removeItem('acadeiq_display_name');
  window.location.href = '../login/login.html';
}

function showInstructorTab(tab, btn) {
  document.querySelectorAll('#page-instructor .topnav-link').forEach(l => l.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#page-instructor .subpage').forEach(s => s.classList.remove('active'));
  document.getElementById('ins-' + tab).classList.add('active');
}

function switchTab(prefix, tab, btn) {
  const parent = btn.closest('.subpage') || btn.closest('.page');
  parent.querySelectorAll('.sec-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  parent.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.getElementById(prefix + '-' + tab).classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('acadeiq_access_token');
  const role = localStorage.getItem('acadeiq_role');
  if (!token || role !== 'instructor') {
    window.location.href = '../login/login.html';
  }
});
