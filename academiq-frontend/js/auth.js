/**
 * Auth module — manages JWT tokens, login/logout, and route protection.
 * Replaces React's AuthContext + ProtectedRoute.
 */

var Auth = {
  getToken: function() { return localStorage.getItem('acadeiq_access_token') || ''; },
  getRole: function() { return localStorage.getItem('acadeiq_role') || ''; },
  getDisplayName: function() { return localStorage.getItem('acadeiq_display_name') || ''; },
  getIdentifier: function() { return localStorage.getItem('acadeiq_identifier') || ''; },
  isAuthenticated: function() { return Boolean(this.getToken()); },

  saveSession: function(token, role, displayName, identifier) {
    localStorage.setItem('acadeiq_access_token', token);
    localStorage.setItem('acadeiq_role', role);
    localStorage.setItem('acadeiq_display_name', displayName);
    localStorage.setItem('acadeiq_identifier', identifier);
  },

  logout: function() {
    localStorage.removeItem('acadeiq_access_token');
    localStorage.removeItem('acadeiq_role');
    localStorage.removeItem('acadeiq_display_name');
    localStorage.removeItem('acadeiq_identifier');
    window.location.href = '/app/login/login.html';
  },

  login: async function(role, identifier, password) {
    var data = await loginAPI(role, identifier, password);
    var accessToken = data.access_token || '';
    var returnedRole = data.role || role;
    var name = data.display_name || '';
    this.saveSession(accessToken, returnedRole, name, identifier);
    return data;
  },

  /** Redirect to login if not authenticated, or to correct dashboard if wrong role */
  requireRole: function(allowedRole) {
    if (!this.isAuthenticated()) {
      window.location.href = '/app/login/login.html';
      return false;
    }
    var currentRole = this.getRole();
    if (allowedRole && currentRole !== allowedRole) {
      var dashboards = {
        student: '/app/student/student.html',
        instructor: '/app/instructor/instructor.html',
        admin: '/app/admin/admin.html',
      };
      window.location.href = dashboards[currentRole] || '/app/login/login.html';
      return false;
    }
    return true;
  },

  getDashboardUrl: function(role) {
    var dashboards = {
      student: '/app/student/student.html',
      instructor: '/app/instructor/instructor.html',
      admin: '/app/admin/admin.html',
    };
    return dashboards[role] || '/app/login/login.html';
  }
};
