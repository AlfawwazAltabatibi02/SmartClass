/**
 * Centralized API service for communicating with the FastAPI backend.
 * All requests include the JWT token when available.
 */
const API_BASE = window.location.origin;

function getToken() {
  return localStorage.getItem('acadeiq_access_token');
}

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  return headers;
}

async function request(endpoint, options) {
  options = options || {};
  const url = API_BASE + endpoint;
  const config = Object.assign({ headers: authHeaders() }, options);

  const response = await fetch(url, config);

  // ---------------------------------------------------------
  // START OF ADDED AUTO-LOGOUT INTERCEPTOR
  // ---------------------------------------------------------
  if (response.status === 401 && endpoint !== '/auth/login') {
    console.warn("Unauthorized: Token expired or invalid. Logging out.");
    
    // Clear the dead token
    localStorage.removeItem('acadeiq_access_token');
    
    // Redirect to the login page (using your exact path from the logs)
    window.location.href = '/app/login/login.html';
    
    // Stop the rest of the JS from executing
    throw new Error('Session expired. Redirecting to login.');
  }
  // ---------------------------------------------------------
  // END OF ADDED AUTO-LOGOUT INTERCEPTOR
  // ---------------------------------------------------------

  var data;
  try { data = await response.json(); } catch(e) { data = {}; }

  if (!response.ok) {
    var detail = data.detail;
    var message;
    if (Array.isArray(detail)) {
      message = detail.map(function(err) { return err.msg; }).join(', ');
    } else {
      message = detail || 'Request failed';
    }
    var error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/* ── Auth API ─────────────────────────────────────────────── */

function loginAPI(role, identifier, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ role: role, identifier: identifier, password: password }),
  });
}

function forgotPasswordAPI(role, identifier) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ role: role, identifier: identifier }),
  });
}

function resetPasswordAPI(role, identifier, new_password) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ role: role, identifier: identifier, new_password: new_password }),
  });
}

function getMeAPI() {
  return request('/auth/me');
}

function healthAPI() {
  return request('/health');
}

function askAIAssistantAPI(message) {
  return request('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message: message }),
  });
}

/* ── Database API ─────────────────────────────────────────── */

function dbHealthAPI() { return request('/db/health'); }
function getScheduleAPI() { return request('/db/schedule'); }
function getTodayScheduleAPI() { return request('/db/schedule/today'); }
function getRoomsAPI() { return request('/db/rooms'); }
function getAvailableRoomsAPI() { return request('/db/rooms/available'); }
function getInstructorsAPI() { return request('/db/instructors'); }
function getOfficeHoursAPI() { return request('/db/instructors/office-hours'); }
function getMyInstructorScheduleAPI() { return request('/db/instructor/me/schedule'); }
function getMyInstructorStudentsAPI() { return request('/db/instructor/me/students'); }
function getMyInstructorIssuesAPI() { return request('/db/instructor/me/issues'); }
function getMyInstructorAvailabilityAPI() { return request('/db/instructor/me/availability'); }
function upsertMyInstructorAvailabilityAPI(payload) {
  return request('/db/instructor/me/availability', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// Admin: view instructor data by email
function getInstructorScheduleByEmailAPI(email) {
  return request('/db/instructor/' + encodeURIComponent(email) + '/schedule');
}
function getInstructorFullScheduleAPI(email) {
  return request('/db/instructor/' + encodeURIComponent(email) + '/full-schedule');
}
function getInstructorStudentsByEmailAPI(email) {
  return request('/db/instructor/' + encodeURIComponent(email) + '/students');
}
function getInstructorAvailabilityByEmailAPI(email) {
  return request('/db/instructor/' + encodeURIComponent(email) + '/availability');
}

function createInstructorIssueAPI(payload) {
  return request('/db/instructor/me/issues', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function getStudentsAPI() { return request('/db/students'); }
function getEnrollmentAPI() { return request('/db/students/enrollment'); }
function getOpenIssuesAPI() { return request('/db/issues'); }

function resolveIssueAPI(issueId, admin_response) {
  return request('/db/issues/' + issueId + '/resolve', {
    method: 'PATCH',
    body: JSON.stringify({ admin_response: admin_response }),
  });
}

function getFaultyEquipmentAPI() { return request('/db/equipment/faulty'); }

/* ── Complaints API ──────────────────────────────────────── */

function getMyComplaintsAPI() { return request('/db/instructor/me/complaints'); }

function createComplaintAPI(payload) {
  return request('/db/instructor/me/complaints', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function getAllComplaintsAPI() { return request('/db/complaints'); }

function respondToComplaintAPI(complaintId, payload) {
  return request('/db/complaints/' + complaintId + '/respond', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/* ── Room Reservation API ────────────────────────────────── */

function createRoomReservationAPI(payload) {
  return request('/db/instructor/me/room-reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function getMyRoomReservationsAPI() {
  return request('/db/instructor/me/room-reservations');
}

function getAllRoomReservationsAPI() {
  return request('/db/room-reservations');
}
