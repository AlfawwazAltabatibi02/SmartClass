// Helper function to calculate instructor availability status for LED indicator
function getInstructorAvailabilityStatusStudent(availability){
  if(!availability||availability.length===0) return 'gray';
  var now=new Date();
  var todayName=now.toLocaleDateString('en-US',{weekday:'long'});
  var nowMin=now.getHours()*60+now.getMinutes();
  var statuses=[];
  for(var i=0;i<availability.length;i++){
    var slot=availability[i];
    if(slot.day===todayName){
      var timeSlot=String(slot.time_slot||'').split('-');
      if(timeSlot.length===2){
        var start=timeSlot[0].split(':').map(Number);
        var end=timeSlot[1].split(':').map(Number);
        var startMin=start[0]*60+start[1];
        var endMin=end[0]*60+end[1];
        if(nowMin>=startMin&&nowMin<endMin){
          statuses.push(slot.status);
        }
      }
    }
  }
  if(statuses.length===0) return 'gray';
  if(statuses.some(function(s){return s==='meeting'||s==='in_class';})) return 'red';
  if(statuses.some(function(s){return s==='office'||s==='available';})) return 'green';
  if(statuses.some(function(s){return s==='lunch'||s==='busy';})) return 'yellow';
  return 'gray';
}

function parseAcademicTitle(fullName){
  var titlePatterns=['Assoc. Prof. Dr.','Assoc. Prof.','Asst. Prof. Dr.','Asst. Prof.','Prof. Dr.','Prof.','Dr.'];
  var title='',name=fullName;
  for(var i=0;i<titlePatterns.length;i++){
    var pattern=titlePatterns[i];
    if(fullName.indexOf(pattern)===0){
      title=pattern;
      name=fullName.substring(pattern.length).trim();
      break;
    }
  }
  return {title:title,name:name};
}

document.addEventListener('DOMContentLoaded', function() {
  if (!Auth.requireRole('student')) return;

  var displayName = Auth.getDisplayName();
  var identifier = Auth.getIdentifier();
  var semester = getCurrentSemester();
  var firstName = displayName ? displayName.split(' ')[0] : 'Student';
  var initials = displayName ? displayName.split(' ').map(function(w){return w[0]}).join('').toUpperCase().slice(0,2) : '??';

  // Avatar & dropdown
  document.getElementById('avatar-initials').textContent = initials;
  document.getElementById('avatar-dropdown').innerHTML =
    '<div class="dropdown-item"><div class="dropdown-label">Name</div><strong>'+(displayName||'Student')+'</strong></div>'+
    '<div class="dropdown-item"><div class="dropdown-label">Email</div>'+(identifier||'')+'</div>'+
    '<div class="dropdown-item"><div class="dropdown-label">Role</div>Student</div>'+
    '<div class="dropdown-item"><div class="dropdown-label">ID</div>'+(identifier||'')+'</div>';
  document.getElementById('btn-logout').addEventListener('click', function(){ Auth.logout(); });

  // Tabs
  var TABS = [{key:'overview',label:'Dashboard'},{key:'timetable',label:'My Timetable'},{key:'instructors',label:'Instructors'},{key:'exams',label:'Exams'}];
  var activeTab = localStorage.getItem('studentActiveTab')||'overview';
  var navTabs = document.getElementById('nav-tabs');
  TABS.forEach(function(tab){
    var btn = document.createElement('button');
    btn.className = 'topnav-link' + (tab.key===activeTab?' active':'');
    btn.textContent = tab.label;
    btn.setAttribute('data-tab', tab.key);
    btn.addEventListener('click', function(){ switchTab(tab.key); });
    navTabs.appendChild(btn);
  });
  document.getElementById('nav-brand').addEventListener('click', function(){ switchTab('overview'); });

  function switchTab(key) {
    activeTab = key;
    localStorage.setItem('studentActiveTab',key);
    document.querySelectorAll('.subpage').forEach(function(el){ el.classList.remove('active'); });
    document.getElementById('tab-'+key).classList.add('active');
    document.querySelectorAll('.topnav-link').forEach(function(el){ el.classList.toggle('active', el.getAttribute('data-tab')===key); });
  }
  // Restore active tab on load
  if(document.getElementById('tab-'+activeTab)){document.querySelectorAll('.subpage').forEach(function(el){el.classList.remove('active');});document.getElementById('tab-'+activeTab).classList.add('active');}

  // Data loading
  var profile = null;
  var mySchedule = [];
  var myToday = [];
  var myCourses = [];
  var myInstructors = [];
  var myExams = [];
  var MIDTERM_EXAMS = [];
  var FINAL_EXAMS = [];
  var todayName = new Date().toLocaleDateString('en-US', {weekday:'long'});
  var nextExamDays = daysUntilNextExam();
  var now = new Date();
  var DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function getNextExam() {
    const upcoming = myExams
      .filter(e => new Date(e.exam_date) > now)
      .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));
    return upcoming[0] ?? null;
  }

  function daysUntilNextExam() {
    const next = getNextExam();
    if (!next) return null;
    const diff = new Date(next.exam_date) - new Date();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function fmtDate(d){ return d.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }
  function fmtShort(d){ return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
  function fmtClock(d){ return d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
  function parseSlotStart(ts){ var p=String(ts || '').split('-')[0].split(':').map(Number); return p[0]*60+p[1]; }
  function isClassNow(t){ var p=String(t || '').split('-'), s=p[0].split(':').map(Number), e=p[1].split(':').map(Number), n=new Date(), st=new Date(n); st.setHours(s[0],s[1],0,0); var en=new Date(n); en.setHours(e[0],e[1],0,0); return n>=st && n<en; }
  function isClassNext(t, arr){ var n=new Date(), up=arr.filter(function(c){ var s=String(c.time || '').split('-')[0].split(':').map(Number), d=new Date(n); d.setHours(s[0],s[1],0,0); return d>n; }); return up.length>0 && up[0].time===t; }
  function extractCode(value){ var text=String(value || '').trim(); if(!text) return ''; return (text.match(/^[A-Za-z0-9]+/) || [''])[0]; }
  function toScheduleRow(row){
    return {
      day: row.day,
      time: row.time_slot,
      courseCode: extractCode(row.class_name),
      courseName: row.subject || row.class_name || '',
      className: row.class_name || row.subject || '',
      room: row.room || '',
      building: row.building || '',
      instructorName: row.instructor || '',
      instructorEmail: row.instructor_email || ''
    };
  }
  function toCourseRow(row){
    return {
      code: extractCode(row.class_name),
      name: row.subject || row.class_name || '',
      className: row.class_name || '',
      instructor: row.instructor || '',
      instructorEmail: row.instructor_email || '',
      officeRoom: row.office_room || '',
      instructorBuilding: row.instructor_building || ''
    };
  }
  function toInstructorRow(row){
    return {
      instructor_id: row.instructor_id,
      name: row.name || '',
      email: row.email || '',
      office_room: row.office_room || '',
      building: row.building || '',
      department: row.department || '',
      office_hours: Array.isArray(row.office_hours) ? row.office_hours : []
    };
  }

  function ensureInstructorTimetableModal(){
    var existing=document.getElementById('inst-timetable-modal');
    if(existing) return existing;
    var modal=document.createElement('div');
    modal.id='inst-timetable-modal';
    modal.style.cssText='display:none;position:fixed;inset:0;z-index:2000;background:rgba(29,53,33,0.45);align-items:center;justify-content:center;padding:20px';
    modal.innerHTML='<div style="width:min(920px,100%);max-height:86vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.2);border:1px solid var(--border)"><div style="display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid var(--border)"><div><div id="inst-timetable-title" style="font-size:18px;font-weight:700;color:var(--ink)">Instructor Timetable</div><div id="inst-timetable-subtitle" style="font-size:12px;color:var(--muted);margin-top:4px"></div></div><button type="button" id="inst-timetable-close" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:#fff;cursor:pointer;font-weight:600">Close</button></div><div id="inst-timetable-body" style="padding:18px 22px"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',function(e){if(e.target===modal) closeInstructorTimetableModal();});
    document.getElementById('inst-timetable-close').addEventListener('click',function(){closeInstructorTimetableModal();});
    return modal;
  }

  function closeInstructorTimetableModal(){
    var modal=document.getElementById('inst-timetable-modal');
    if(!modal) return;
    if(modal.dataset.refreshTimer){ clearInterval(parseInt(modal.dataset.refreshTimer,10)); delete modal.dataset.refreshTimer; }
    modal.style.display='none';
  }

  function calendarIcon(){
    return '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 11h18"></path></svg>';
  }

  function renderInstructorTimetableRows(email,body){
    body.innerHTML='<p style="padding:20px;color:var(--muted);text-align:center">Loading full timetable...</p>';
    return getInstructorFullScheduleAPI(email).then(function(data){
      var classes=data.classes||[], officeHours=data.office_hours||[], availability=data.availability||[];
      if(classes.length===0&&officeHours.length===0&&availability.length===0){
        body.innerHTML='<p style="padding:24px;color:var(--muted);text-align:center">No schedule data for this instructor.</p>';
        return;
      }
      var DAY_ORDER=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      var allItems=[];
      classes.forEach(function(r){allItems.push(Object.assign({},r,{type:'class'}));});
      officeHours.forEach(function(r){allItems.push(Object.assign({},r,{type:'office_hours'}));});
      availability.forEach(function(r){allItems.push(Object.assign({},r,{type:'availability'}));});
      var byDay={};
      DAY_ORDER.forEach(function(d){byDay[d]=[];});
      allItems.forEach(function(item){
        if(!byDay[item.day]) byDay[item.day]=[];
        byDay[item.day].push(item);
      });
      DAY_ORDER.forEach(function(d){
        byDay[d].sort(function(a,b){
          var aStart=String(a.time_slot||'').split('-')[0].split(':').map(Number);
          var bStart=String(b.time_slot||'').split('-')[0].split(':').map(Number);
          return (aStart[0]||0)*60+(aStart[1]||0)-(bStart[0]||0)*60-(bStart[1]||0);
        });
      });
      var html='<div style="display:flex;flex-direction:column;gap:16px">';
      DAY_ORDER.forEach(function(day){
        var items=byDay[day];
        if(items.length===0) return;
        html+='<div><div style="font-weight:700;font-size:13px;color:var(--ink);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)">'+day+'</div>';
        items.forEach(function(row){
          var isClass=row.type==='class';
          var isOfficeHours=row.type==='office_hours';
          var color=isClass?'#e74c3c':isOfficeHours?'#f39c12':'#95a5a6';
          var bgColor=isClass?'rgba(231,76,60,0.05)':isOfficeHours?'rgba(243,156,18,0.05)':'rgba(149,165,166,0.05)';
          var typeLabel=isClass?'Class':isOfficeHours?'Office Hours':'Availability';
          if(row.type==='availability'){
            var st=row.status;
            if(st==='office'||st==='available'){color='#1bbb73';bgColor='rgba(27,187,115,0.05)';typeLabel='Available';}
            else if(st==='meeting'||st==='in_class'){color='#e74c3c';bgColor='rgba(231,76,60,0.05)';typeLabel='In Meeting';}
            else if(st==='lunch'||st==='busy'){color='#f39c12';bgColor='rgba(243,156,18,0.05)';typeLabel='Busy';}
            else{color='#95a5a6';bgColor='rgba(149,165,166,0.05)';typeLabel='Not Available';}
          }
          html+='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 12px;border-left:3px solid '+color+';background:'+bgColor+';border-radius:4px;font-size:13px"><div><div style="font-weight:600;color:var(--ink)">'+(row.class_name||'Meeting')+'</div><div style="font-size:11px;color:var(--muted);margin-top:3px">'+(row.time_slot||'')+'</div></div><div style="text-align:right;font-size:11px;color:'+color+';font-weight:600">'+typeLabel+'</div></div>';
        });
        html+='</div>';
      });
      html+='</div>';
      body.innerHTML=html;
    }).catch(function(e){
      body.innerHTML='<p style="padding:24px;color:var(--danger);text-align:center">Unable to load timetable.</p>';
      console.error('Instructor timetable error:',e);
    });
  }

  function showInstructorTimetable(email,name){
    var modal=ensureInstructorTimetableModal();
    document.getElementById('inst-timetable-title').textContent=(name||'Instructor')+' Timetable';
    document.getElementById('inst-timetable-subtitle').textContent=email||'';
    var body=document.getElementById('inst-timetable-body');
    modal.style.display='flex';
    renderInstructorTimetableRows(email,body);
    if(modal.dataset.refreshTimer){ clearInterval(parseInt(modal.dataset.refreshTimer,10)); }
    modal.dataset.refreshTimer = String(setInterval(function(){
      if(modal.style.display==='flex') renderInstructorTimetableRows(email,body);
    }, 30000));
  }

  function syncDerivedData(){
    todayName = new Date().toLocaleDateString('en-US', {weekday:'long'});
    myToday = mySchedule.filter(function(s){ return s.day === todayName; }).sort(function(a,b){ return parseSlotStart(a.time) - parseSlotStart(b.time); });
    nextExamDays = daysUntilNextExam();
  }

  function renderIdentity(){
    document.getElementById('avatar-initials').textContent = initials;
    document.getElementById('avatar-dropdown').innerHTML =
      '<div class="dropdown-item"><div class="dropdown-label">Name</div><strong>'+(displayName||'Student')+'</strong></div>'+
      '<div class="dropdown-item"><div class="dropdown-label">Email</div>'+(identifier||'')+'</div>'+
      '<div class="dropdown-item"><div class="dropdown-label">Role</div>Student</div>'+
      '<div class="dropdown-item"><div class="dropdown-label">ID</div>'+(identifier||'')+'</div>';
  }

  function renderOverview(){
    var h = now.getHours();
    var greeting = h<12 ? 'Good morning' : h<17 ? 'Good afternoon' : 'Good evening';
   
    var cgpaValue = profile && profile.cgpa !== undefined && profile.cgpa !== null ? profile.cgpa : '3.7';
    document.getElementById('greeting').textContent = greeting + ', ' + firstName + ' 👋';
   
    document.getElementById('overview-date').innerHTML = semester+' &nbsp;·&nbsp; '+fmtDate(now)+' <span style="font-family:\'DM Mono\',monospace;font-size:13px;color:var(--olive);margin-left:8px" id="live-clock">'+fmtClock(now)+'</span>';
   
    document.getElementById('stats-row').innerHTML =
      '<div class="stat-card"><div class="stat-label">Enrolled Courses</div><div class="stat-value">'+myCourses.length+'</div><div class="stat-sub">'+(myCourses.map(function(c){return c.code;}).join(', ')||'None')+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Classes This Week</div><div class="stat-value">'+mySchedule.length+'</div><div class="stat-sub">'+(myToday.length>0?'Today: '+myToday.length+' class'+(myToday.length>1?'es':''):'No classes today')+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Upcoming Exams</div><div class="stat-value">0</div><div class="stat-sub">No upcoming exams</div></div>'+
      '<div class="stat-card"><div class="stat-label">CGPA</div><div class="stat-value">'+cgpaValue+'</div><div class="stat-sub">Great Job!!!</div></div>';
    document.getElementById('today-tag').textContent = fmtShort(now);
    document.getElementById('exam-tag').textContent = semester;
  }

  function renderTodaySchedule(){
    var todayBody = document.getElementById('today-schedule-body');
    if (myToday.length===0) {
      todayBody.innerHTML = '<p style="text-align:center;padding:20px 0;color:var(--muted);font-size:13px">No classes scheduled for today.</p>';
      return;
    }
    var html = '<div style="display:flex;flex-direction:column;gap:10px">';
    myToday.forEach(function(cls){
      var isNow = isClassNow(cls.time), isNext = isClassNext(cls.time, myToday);
      html += '<div style="display:flex;align-items:center;gap:12px;padding:10px;background:'+(isNow?'var(--olive-faint)':'transparent')+';border:'+(isNow?'1px solid var(--olive)':'1px solid var(--border)')+';border-radius:8px">';
      html += '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:'+(isNow?'var(--olive-dark)':'var(--muted)')+';min-width:80px;font-weight:'+(isNow?'600':'400')+'">'+cls.time+'</div>';
      html += '<div style="flex:1"><div style="font-weight:600;font-size:13px">'+cls.courseCode+' - '+cls.courseName+'</div><div style="font-size:11px;color:var(--muted)">'+cls.room+' · '+cls.instructorName+'</div></div>';
      if(isNow) html += '<span class="status-badge pulse" style="background:#4ade80;color:#166534">LIVE</span>';
      if(isNext) html += '<span class="status-badge" style="background:#fef08a;color:#854d0e">NEXT</span>';
      html += '</div>';
    });
    html += '</div>';
    todayBody.innerHTML = html;
  }

  function renderTimetable(){
    document.getElementById('tt-subtitle').innerHTML = semester+' - Personal schedule &nbsp;·&nbsp; <span style="font-family:\'DM Mono\',monospace;font-size:13px;color:var(--olive)" id="tt-clock">'+fmtClock(now)+'</span>';
    setInterval(function(){ var el=document.getElementById('tt-clock'); if(el) el.textContent=fmtClock(new Date()); },1000);

    var ttArea = document.getElementById('timetable-area');
    if (mySchedule.length===0) {
      ttArea.innerHTML = '<p style="text-align:center;padding:40px;color:var(--muted)">You are not enrolled in any classes yet.</p>';
      return;
    }
    var timeSlots = [];
    mySchedule.forEach(function(s){ if(timeSlots.indexOf(s.time)===-1) timeSlots.push(s.time); });
    timeSlots.sort();
    var tt = '<div class="timetable-wrap"><table class="timetable"><thead><tr><th>Time</th>';
    DAY_ORDER.forEach(function(d){
      var isToday = d===todayName;
      tt += '<th style="'+(isToday?'background:var(--olive-dark);color:#fff;border-radius:6px 6px 0 0':'')+'">'+d+(isToday?'<span style="display:block;font-size:9px;font-weight:400;opacity:0.8">Today</span>':'')+'</th>';
    });
    tt += '</tr></thead><tbody>';
    timeSlots.forEach(function(slot){
      tt += '<tr><td class="time-col">'+slot+'</td>';
      DAY_ORDER.forEach(function(d){
        var entry = mySchedule.find(function(s){ return s.time===slot && s.day===d; });
        var isToday = d===todayName;
        if(!entry) { tt += '<td class="tt-empty" style="'+(isToday?'background:rgba(58,92,65,0.04)':'')+'">—</td>'; }
        else { tt += '<td style="'+(isToday?'background:rgba(58,92,65,0.04)':'')+'"><div class="tt-class">'+entry.courseCode+'<br>'+entry.courseName+'<br><span style="font-size:10px;color:var(--muted)">'+entry.room+'</span></div></td>'; }
      });
      tt += '</tr>';
    });
    tt += '</tbody></table></div>';
    ttArea.innerHTML = tt;
  }

  function renderInstructors(){
    var list = document.getElementById('instructor-list');
    
    // 1. If no instructors exist for this student, stop here.
    if(myInstructors.length === 0){ 
      list.innerHTML='<p style="text-align:center;padding:40px;color:var(--muted)">No instructors found.</p>'; 
      return; 
    }
    
    // 2. Build the Search Bar UI
    var ih = '<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px"><input id="stu-inst-search" type="text" placeholder="Search your instructors..." style="width:220px;max-width:38vw;padding:8px 12px;border:1.5px solid var(--border);border-radius:999px;font-family:\'DM Sans\',sans-serif;font-size:12px;outline:none;background:var(--card);color:var(--ink)"><div id="stu-inst-count" style="font-size:12px;color:var(--muted);font-weight:600;white-space:nowrap">'+myInstructors.length+' instructors</div></div></div><div id="stu-inst-results"></div>';
    list.innerHTML = ih;

    // 3. Grab the UI elements (Using UNIQUE names so they don't get stolen!)
    var stuSearchInput = document.getElementById('stu-inst-search');
    var stuResultsDiv = document.getElementById('stu-inst-results');
    var stuCountDiv = document.getElementById('stu-inst-count');

    // 4. The Filter Logic
    function applyStudentFilter(){
      var q = String(stuSearchInput.value || '').trim().toLowerCase();
      var matches = myInstructors.filter(function(inst){
        return String(inst.name || '').toLowerCase().indexOf(q) !== -1;
      });
      
      stuCountDiv.textContent = matches.length + ' instructor' + (matches.length === 1 ? '' : 's');
      var html = '';
      
      if(matches.length === 0){
        html = '<p style="text-align:center;padding:28px;color:var(--muted);font-size:13px">No instructors match your search.</p>';
      } else {
        // Separate instructors into two groups
        var courseInstructors = [];
        var facultyInstructors = [];
        
        // Get emails of instructors teaching the student
        var myCourseInstructorEmails = {};
        myCourses.forEach(function(course){
          if(course.instructorEmail) myCourseInstructorEmails[course.instructorEmail] = true;
        });
        
        // Get student's faculty
        var studentFaculty = profile && profile.faculty ? String(profile.faculty).toLowerCase() : '';
        
        // Categorize instructors
        matches.forEach(function(inst){
          if(myCourseInstructorEmails[inst.email]){
            courseInstructors.push(inst);
          } else if(studentFaculty && inst.department){
            var instFaculty = String(inst.department).toLowerCase();
            if(instFaculty.indexOf(studentFaculty) !== -1){
              facultyInstructors.push(inst);
            }
          }
        });
        
        // Helper function to build instructor card
        function buildInstructorCard(inst){
          var ohStr = 'Not available';
          if(inst.office_hours && inst.office_hours.length > 0){
            ohStr = inst.office_hours.map(function(o){ return o.day+' '+(o.time_slot || '')+' ('+(o.room || inst.office_room || '')+')'; }).join(' | ');
          }
          var fullName = inst.name || 'Unknown Instructor';
          var parsed = parseAcademicTitle(fullName);
          var ini = parsed.name.split(' ').filter(Boolean).map(function(p){return p[0]}).slice(0,2).join('').toUpperCase();
          return '<div class="instructor-row"><div class="instructor-avatar">'+ini+'</div><div class="instructor-info"><div class="instructor-name"><span style="color:#3a5c41;font-weight:600">'+parsed.title+'</span> '+parsed.name+'</div><div class="instructor-dept">'+(inst.department||'Department')+' · '+inst.email+'</div><div class="instructor-courses"><div style="font-size:11px;color:var(--muted)">Office: '+(inst.office_room||'')+' ('+(inst.building||'')+') · '+ohStr+'</div></div></div><div style="display:flex;gap:10px;align-items:center"><button type="button" class="inst-timetable-btn" data-email="'+inst.email+'" data-name="'+fullName+'" title="Open timetable" aria-label="Open timetable" style="width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:999px;background:#fff;color:var(--ink);cursor:pointer">'+calendarIcon()+'</button><span class="avail-dot dot-green" title="Available"></span></div></div>';
        }
        
        // Build grouped HTML
        if(courseInstructors.length > 0){
          html += '<div style="margin-bottom:24px"><div style="font-weight:700;font-size:12px;text-transform:uppercase;color:var(--olive);letter-spacing:0.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--olive)">My Course Instructors</div>';
          courseInstructors.forEach(function(inst){
            html += buildInstructorCard(inst);
          });
          html += '</div>';
        }
        
        if(facultyInstructors.length > 0){
          html += '<div><div style="font-weight:700;font-size:12px;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)">Faculty Instructors</div>';
          facultyInstructors.forEach(function(inst){
            html += buildInstructorCard(inst);
          });
          html += '</div>';
        }
        
        if(courseInstructors.length === 0 && facultyInstructors.length === 0){
          html = '<p style="text-align:center;padding:28px;color:var(--muted);font-size:13px">No instructors match your search.</p>';
        }
      }
      
      stuResultsDiv.innerHTML = html;
      
      // Re-attach button clicks after drawing
      stuResultsDiv.querySelectorAll('.inst-timetable-btn').forEach(function(btn){
        btn.onclick = function(){
          showInstructorTimetable(btn.getAttribute('data-email'), btn.getAttribute('data-name'));
        };
      });
      
      // Update LED indicators based on instructor availability
      function updateInstructorLEDs(){
        stuResultsDiv.querySelectorAll('.instructor-row').forEach(function(row){
          var btn = row.querySelector('.inst-timetable-btn');
          var dot = row.querySelector('.avail-dot');
          if(btn && dot){
            var email = btn.getAttribute('data-email');
            getInstructorFullScheduleAPI(email).then(function(data){
              var status = getInstructorAvailabilityStatusStudent(data.availability || []);
              dot.className = 'avail-dot dot-' + status;
            }).catch(function(e){
              console.error('LED update failed for '+email, e);
              dot.className = 'avail-dot dot-gray';
            });
          }
        });
      }
      
      updateInstructorLEDs();
      // Refresh LEDs every 30 seconds to show real-time availability
      if(window.studentLEDRefreshTimer) clearInterval(window.studentLEDRefreshTimer);
      window.studentLEDRefreshTimer = setInterval(updateInstructorLEDs, 30000);
    }

    // 5. Listen for typing and run once immediately to show the full list
    stuSearchInput.addEventListener('input', applyStudentFilter);
    applyStudentFilter();
  }

  function renderExams(){
    document.getElementById('exam-subtitle').innerHTML = 'Midterm &amp; Final timetable · '+semester;
    function buildExamTable(exams) {
      if(exams.length===0) return '<div class="card"><div class="card-body" style="padding:0"><table class="exam-table"><thead><tr><th>Course</th><th>Date</th><th>Time</th><th>Hall</th><th>Type</th></tr></thead><tbody><tr><td colspan="5" style="text-align:center;padding:40px 20px;color:var(--muted);font-size:14px">No exams, It\'s not exams period!</td></tr></tbody></table></div></div>';
      var h = '<div class="card"><div class="card-body" style="padding:0"><table class="exam-table"><thead><tr><th>Course</th><th>Date</th><th>Time</th><th>Hall</th><th>Type</th></tr></thead><tbody>';
      exams.forEach(function(e){ h += '<tr><td><strong>'+e.course+'</strong></td><td>'+e.date.split(' · ')[0]+'</td><td>'+e.time+'</td><td>'+e.hall+'</td><td><span class="exam-type-badge '+e.cls+'">'+e.badge+'</span></td></tr>'; });
      h += '</tbody></table></div></div>';
      return h;
    }
    document.getElementById('exam-midterm-section').innerHTML = buildExamTable(MIDTERM_EXAMS);
    document.getElementById('exam-final-section').innerHTML = buildExamTable(FINAL_EXAMS);
    document.querySelectorAll('.sec-tab').forEach(function(tab){
      tab.addEventListener('click', function(){
        document.querySelectorAll('.sec-tab').forEach(function(t){t.classList.remove('active')});
        tab.classList.add('active');
        var et = tab.getAttribute('data-exam');
        document.getElementById('exam-midterm-section').classList.toggle('active', et==='midterm');
        document.getElementById('exam-final-section').classList.toggle('active', et==='final');
      });
    });
  }

  function renderAll(){
    renderIdentity();
    renderOverview();
    renderTodaySchedule();
    renderTimetable();
    renderInstructors();
    renderExams();
  }

  async function loadStudentData(){
    try {
      var results = await Promise.all([
        request('/db/student/me/profile'),
        request('/db/student/me/schedule'),
        request('/db/student/me/courses'),
        request('/db/student/me/instructors'),
        getInstructorsAPI()
      ]);
      profile = results[0] || null;
      mySchedule = (results[1] || []).map(toScheduleRow);
      myCourses = (results[2] || []).map(toCourseRow);
      var enrolledInstructors = (results[3] || []).map(toInstructorRow);
      var allInstructors = results[4] || [];
      
      // Filter all instructors by student's faculty
      var studentFaculty = profile && profile.faculty ? String(profile.faculty).toLowerCase() : '';
      var facultyInstructors = [];
      if(studentFaculty){
        facultyInstructors = allInstructors.filter(function(inst){
          var instFaculty = inst.department ? String(inst.department).toLowerCase() : '';
          return instFaculty.indexOf(studentFaculty) !== -1;
        }).map(toInstructorRow);
      }
      
      // Merge enrolled + faculty instructors (remove duplicates by email)
      var emailSet = {};
      myInstructors = [];
      enrolledInstructors.forEach(function(inst){
        if(!emailSet[inst.email]){
          myInstructors.push(inst);
          emailSet[inst.email] = true;
        }
      });
      facultyInstructors.forEach(function(inst){
        if(!emailSet[inst.email]){
          myInstructors.push(inst);
          emailSet[inst.email] = true;
        }
      });
      
      // Sort by department then name
      myInstructors.sort(function(a,b){
        var deptCmp = String(a.department||'').localeCompare(String(b.department||''));
        return deptCmp !== 0 ? deptCmp : String(a.name||'').localeCompare(String(b.name||''));
      });

      if (profile && profile.name) {
        displayName = profile.name;
        firstName = displayName ? displayName.split(' ')[0] : 'Student';
        initials = displayName ? displayName.split(' ').map(function(w){return w[0]}).join('').toUpperCase().slice(0,2) : '??';
      }
    } catch (e) {
      console.error('Failed to load student dashboard data:', e);
      throw e;
    }

    syncDerivedData();
    renderAll();
  }

  loadStudentData();
});
