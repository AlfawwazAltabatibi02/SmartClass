document.addEventListener('DOMContentLoaded', function() {
  if (!Auth.isAuthenticated()) { window.location.href = '/app/login/login.html'; return; }
  var viewerRole = Auth.getRole();
  if (viewerRole !== 'instructor' && viewerRole !== 'admin') {
    window.location.href = Auth.getDashboardUrl(viewerRole);
    return;
  }
  var params = new URLSearchParams(window.location.search || '');
  var targetEmail = '';
  var isAdminView = viewerRole === 'admin';
  if (isAdminView) {
    targetEmail = (params.get('email') || '').trim();
    if (!targetEmail) {
      window.location.href = '/app/admin/admin.html';
      return;
    }
  } else {
    targetEmail = Auth.getIdentifier();
  }
  
  // Parse academic title from display name
  function parseAcademicTitle(fullName){
    if(!fullName) return {title:'',name:''};
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
  
  var displayName = Auth.getDisplayName();
  var identifier = Auth.getIdentifier();
  var semester = getCurrentSemester();
  var parsed = parseAcademicTitle(displayName || '');
  var firstName = (parsed.name || displayName || 'Instructor').split(' ')[0];
  var initials = displayName ? displayName.split(' ').filter(function(w){return /^[A-Z]/.test(w)}).map(function(w){return w[0]}).join('').slice(0,2) : 'IN';
  var today = new Date();
  var todayName = today.toLocaleDateString('en-US',{weekday:'long'});
  var nowMin = today.getHours()*60+today.getMinutes();
  var ISSUE_LIST = [{id:'projector',label:'Projector Not Working'},{id:'ac',label:'AC / Heating Issue'},{id:'seating',label:'Seating Problem'},{id:'whiteboard',label:'Whiteboard / Markers'},{id:'network',label:'Network / Wi-Fi'},{id:'lighting',label:'Lighting Issue'},{id:'audio',label:'Audio System'},{id:'other',label:'Other'}];
  var SEV_LABELS = {low:'🟢 Low',medium:'🟡 Medium',high:'🔴 High'};
  var SEV_COLORS = {low:'var(--success)',medium:'var(--gold)',high:'var(--danger)'};
  var COMPLAINT_CATEGORIES = [
    {val:'schedule',label:'Schedule Issue'},
    {val:'classroom',label:'Classroom Problem'},
    {val:'workload',label:'Workload Concern'},
    {val:'equipment',label:'Equipment Request'},
    {val:'policy',label:'Policy Feedback'},
    {val:'student_issue',label:'Student Issue'},
    {val:'other',label:'Other'}
  ];
  var STATUS_BADGE = {
    open: {label:'Open', bg:'rgba(184,76,76,0.1)', color:'var(--danger)'},
    in_progress: {label:'In Progress', bg:'rgba(201,168,76,0.15)', color:'var(--gold)'},
    resolved: {label:'Resolved', bg:'rgba(58,125,90,0.1)', color:'var(--success)'},
    closed: {label:'Closed', bg:'var(--surface)', color:'var(--muted)'}
  };

  // Avatar
  document.getElementById('avatar-initials').textContent = initials;
  document.getElementById('avatar-dropdown').innerHTML = '<div class="dropdown-item"><div class="dropdown-label">Name</div><strong>'+(displayName||'Instructor')+'</strong></div><div class="dropdown-item"><div class="dropdown-label">Email</div>'+(identifier||'-')+'</div><div class="dropdown-item"><div class="dropdown-label">Role</div>Instructor</div>';
  document.getElementById('btn-logout').addEventListener('click', function(){ Auth.logout(); });

  // Tabs
  var TABS = isAdminView
    ? [{key:'overview',label:'Dashboard'},{key:'timetable',label:'My Schedule'},{key:'availability',label:'Availability'},{key:'students',label:'My Students'}]
    : [{key:'overview',label:'Dashboard'},{key:'timetable',label:'My Schedule'},{key:'availability',label:'Availability'},{key:'students',label:'My Students'},{key:'classrooms',label:'Classrooms'},{key:'exams',label:'Exams'},{key:'feedback',label:'Feedback'}];
  var storageKey=isAdminView?'instructorAdminActiveTab':'instructorActiveTab';
  var activeTab=localStorage.getItem(storageKey)||'overview';
  var navTabs=document.getElementById('nav-tabs');
  TABS.forEach(function(tab){var btn=document.createElement('button');btn.className='topnav-link'+(tab.key===activeTab?' active':'');btn.textContent=tab.label;btn.setAttribute('data-tab',tab.key);btn.addEventListener('click',function(){switchTab(tab.key);});navTabs.appendChild(btn);});
  document.getElementById('nav-brand').addEventListener('click',function(){switchTab('overview');});
  function switchTab(key){activeTab=key;localStorage.setItem(storageKey,key);document.querySelectorAll('.subpage').forEach(function(el){el.classList.remove('active');});document.getElementById('tab-'+key).classList.add('active');document.querySelectorAll('.topnav-link').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-tab')===key);});}
  // Restore active tab on load
  if(document.getElementById('tab-'+activeTab)){document.querySelectorAll('.subpage').forEach(function(el){el.classList.remove('active');});document.getElementById('tab-'+activeTab).classList.add('active');}

  // Data loading
  
  var mySchedule=[],myStudents=[],rooms=[],roomCards=[],issues=[],enrollment=[],feedbackHistory=[],allSchedule=[],myAvailability=[],myComplaints=[],myExams=[],MIDTERM_EXAMS=[],FINAL_EXAMS=[];
  (async function(){
    try{
      var results;
      if (isAdminView) {
        results = await Promise.all([
          getInstructorScheduleByEmailAPI(targetEmail),
          getInstructorStudentsByEmailAPI(targetEmail),
          getInstructorAvailabilityByEmailAPI(targetEmail)
        ]);
        mySchedule = results[0] || [];
        myStudents = results[1] || [];
        myAvailability = results[2] || [];
      } else {
        results = await Promise.all([
          getMyInstructorScheduleAPI(),
          getMyInstructorStudentsAPI(),
          getRoomsAPI(),
          getOpenIssuesAPI(),
          getEnrollmentAPI(),
          getMyInstructorIssuesAPI(),
          getScheduleAPI(),
          getMyInstructorAvailabilityAPI(),
          getMyComplaintsAPI(),
        ]);
        mySchedule=results[0]||[];myStudents=results[1]||[];rooms=results[2]||[];issues=results[3]||[];enrollment=results[4]||[];feedbackHistory=results[5]||[];allSchedule=results[6]||[];myAvailability=results[7]||[];myComplaints=results[8]||[];
      }
    }catch(e){console.error('Data load error:',e);}
    document.getElementById('loading-bar').style.display='none';
    renderAll();
  })();

  function renderAll(){
    renderOverview();renderTimetable();renderAvailability();renderStudents();
    if (!isAdminView) {
      renderClassrooms();renderExams();renderFeedback();renderComplaints();initFeedbackSubTabs();
    }
  }

  function formatRoomDate(d){return d.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});}
  function isNowInSlot(ts){var p=ts.split('-');var s=p[0].split(':').map(Number);var e=p[1].split(':').map(Number);return nowMin>=s[0]*60+s[1]&&nowMin<=e[0]*60+e[1];}
  function parseSlotStart(ts){var p=ts.split('-')[0].split(':').map(Number);return p[0]*60+p[1];}

  function parseTimeRangeMinutes(value){
    if(!value) return null;
    var m=String(value).match(/(\d{1,2})\s*:\s*(\d{2})/g);
    if(!m||m.length<2) return null;
    function toMin(s){var parts=s.split(':');return parseInt(parts[0],10)*60+parseInt(parts[1],10);}
    var start=toMin(m[0]);
    var end=toMin(m[1]);
    if(!isFinite(start)||!isFinite(end)||end<=start) return null;
    return {start:start,end:end};
  }
  function rangesOverlap(a,b){return a.start<b.end && b.start<a.end;}
  function scheduleEntryOverlapping(day, gridSlot){
    var r=parseTimeRangeMinutes(gridSlot);
    if(!r) return null;
    for(var i=0;i<mySchedule.length;i++){
      var s=mySchedule[i];
      if(s.day!==day) continue;
      var sr=parseTimeRangeMinutes(s.time_slot);
      if(sr && rangesOverlap(r,sr)) return s;
    }
    return null;
  }

  // Overview
  function renderOverview(){
    var h=today.getHours();var greet=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
    document.getElementById('ins-greeting').textContent=greet+', '+firstName+' 👋';
    document.getElementById('ins-subtitle').innerHTML=semester+' &middot; <span class="dynamic-semester">'+formatRoomDate(today)+'</span>';
    document.getElementById('ins-today-tag').textContent=todayName;
    document.getElementById('ins-exam-tag').textContent=semester;
    var todayCls=mySchedule.filter(function(s){return s.day===todayName;}).sort(function(a,b){return parseSlotStart(a.time_slot)-parseSlotStart(b.time_slot);});
    document.getElementById('ins-stats').innerHTML=
      '<div class="stat-card"><div class="stat-label">Weekly Classes</div><div class="stat-value">'+mySchedule.length+'</div><div class="stat-sub">Across '+new Set(mySchedule.map(function(s){return s.class_name})).size+' courses</div></div>'+
      '<div class="stat-card"><div class="stat-label">Today\'s Classes</div><div class="stat-value">'+todayCls.length+'</div><div class="stat-sub">'+(todayCls.length>0?'Next: '+todayCls[0].class_name:'No classes today')+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Students Enrolled</div><div class="stat-value">'+myStudents.length+'</div><div class="stat-sub">Total across courses</div></div>'+
      '<div class="stat-card"><div class="stat-label">Open Issues</div><div class="stat-value" style="color:var(--danger)">'+(feedbackHistory.filter(function(f){return f.status==='open'}).length)+'</div><div class="stat-sub">Pending feedback</div></div>';
    if(todayCls.length===0){document.getElementById('ins-today-body').innerHTML='<p style="text-align:center;padding:20px 0;color:var(--muted);font-size:13px">No classes today.</p>';return;}
    var th='<div style="display:flex;flex-direction:column;gap:10px">';
    todayCls.forEach(function(cls){
      var isNow=isNowInSlot(cls.time_slot);
      th+='<div style="display:flex;align-items:center;gap:12px;padding:10px;background:'+(isNow?'var(--olive-faint)':'transparent')+';border:'+(isNow?'1px solid var(--olive)':'1px solid var(--border)')+';border-radius:8px">';
      th+='<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:'+(isNow?'var(--olive-dark)':'var(--muted)')+';min-width:90px;font-weight:'+(isNow?'600':'400')+'">'+cls.time_slot+'</div>';
      th+='<div style="flex:1"><div style="font-weight:600;font-size:13px">'+cls.class_name+'</div><div style="font-size:11px;color:var(--muted)">'+(cls.building||'')+' '+cls.room+' · Cap: '+cls.capacity+'</div></div>';
      if(isNow) th+='<span style="font-size:10px;padding:3px 9px;border-radius:20px;background:rgba(58,125,90,0.15);color:var(--success);font-weight:600">LIVE</span>';
      th+='</div>';
    });
    th+='</div>';
    document.getElementById('ins-today-body').innerHTML=th;
  }

  // Timetable
  function renderTimetable(){
    document.getElementById('ins-tt-sub').innerHTML=(isAdminView ? ('Instructor: '+targetEmail+' · ') : 'Personal teaching schedule · ')+semester;
    var DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var slots=[
      '8:30 - 9:20',
      '9:30 - 10:20',
      '10:30 - 11:20',
      '11:30 - 12:20',
      '12:30 - 13:20',
      '13:30 - 14:20',
      '14:30 - 15:20',
      '15:30 - 16:20',
      '16:30 - 17:20'
    ];
    var tbody=document.getElementById('ins-tt-body');
    if(slots.length===0){tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">No scheduled classes.</td></tr>';return;}
    function normalizeSlot(slot){return String(slot || '').replace(/\s+/g,'');}
    function statusLabel(status){
      return {
        available: 'Available',
        inclass: 'In Class',
        lunch: 'Lunch Break',
        meeting: 'Meeting',
        office: 'Office Hrs',
        offcampus: 'Off Campus'
      }[status] || status;
    }
    var availabilityMap={};
    myAvailability.forEach(function(a){
      availabilityMap[a.day+'|'+normalizeSlot(a.time_slot)] = a.status;
    });
    var h='';
    slots.forEach(function(slot){
      h+='<tr><td class="time-col">'+slot+'</td>';
      DAYS.forEach(function(d){
        var entry=scheduleEntryOverlapping(d, slot);
        if(entry){
          h+='<td><div class="tt-class">'+entry.class_name+'<br><span style="font-size:10px;color:rgba(255,255,255,0.7)">'+' '+entry.room+'</span></div></td>';
        } else {
          var status=availabilityMap[d+'|'+normalizeSlot(slot)];
          if(status){
            h+='<td><div class="tt-class">'+statusLabel(status)+'</div></td>';
          } else {
            h+='<td class="tt-empty">—</td>';
          }
        }
      });
      h+='</tr>';
    });
    tbody.innerHTML=h;
  }

  // Availability
  function renderAvailability(){
    var DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var TIMES=['08:30 - 9:20','09:30 - 10:20','10:30 - 11:20','11:30 - 12:20','12:30 - 13:20','13:30 - 14:20','14:30 - 15:20','15:30 - 16:20','16:30 - 17:20'];
    var STATUS_OPTS=[{val:'available',label:'Available',cls:'status-available'},{val:'inclass',label:'In Class',cls:'status-inclass'},{val:'lunch',label:'Lunch Break',cls:'status-lunch'},{val:'meeting',label:'Meeting',cls:'status-meeting'},{val:'office',label:'Office Hrs',cls:'status-office'},{val:'offcampus',label:'Off Campus',cls:'status-offcampus'}];
    var grid=document.getElementById('avail-grid-body');
    function normalizeSlot(slot){return String(slot || '').replace(/\s+/g,'');}
    var availabilityMap={};
    myAvailability.forEach(function(a){
      availabilityMap[a.day+'|'+normalizeSlot(a.time_slot)] = a.status;
    });
    var h='<div class="avail-grid"><div class="avail-header"></div>';
    DAYS.forEach(function(d){h+='<div class="avail-header">'+d.slice(0,3)+'</div>';});
    TIMES.forEach(function(t){
      h+='<div class="avail-header" style="background:var(--surface);color:var(--muted);font-size:10px">'+t+'</div>';
      DAYS.forEach(function(d){
        var scheduled=scheduleEntryOverlapping(d, t);
        var statusKey=d+'|'+normalizeSlot(t);
        var def=scheduled?'inclass':(availabilityMap[statusKey]||'available');
        var disabled=(scheduled || isAdminView)?' disabled':'';
        h+='<select class="avail-select status-'+def+'" data-day="'+d+'" data-time="'+t+'"'+disabled+(scheduled?' title="Scheduled: '+(scheduled.class_name||'Class')+'"':'')+'>';
        STATUS_OPTS.forEach(function(opt){h+='<option value="'+opt.val+'"'+(opt.val===def?' selected':'')+'>'+opt.label+'</option>';});
        h+='</select>';
      });
    });
    h+='</div>';
    grid.innerHTML=h;
    if (!isAdminView) {
      grid.querySelectorAll('.avail-select').forEach(function(sel){
        sel.addEventListener('change',async function(){
          sel.className='avail-select status-'+sel.value;
          var day=sel.getAttribute('data-day');
          var time=sel.getAttribute('data-time');
          try{
            await upsertMyInstructorAvailabilityAPI({day:day,time_slot:time,status:sel.value});
            var key=day+'|'+normalizeSlot(time);
            var existing=myAvailability.find(function(a){return a.day===day&&normalizeSlot(a.time_slot)===normalizeSlot(time);});
            if(existing){existing.status=sel.value;}else{myAvailability.push({day:day,time_slot:time,status:sel.value});}
            renderTimetable();
          }catch(e){
            console.error('Availability update error:',e);
          }
        });
      });
    }
  }

  // Students
  function renderStudents(){
    var courses=[];myStudents.forEach(function(s){if(courses.indexOf(s.class_name)===-1) courses.push(s.class_name);});courses.sort();
    var controls=document.getElementById('stu-controls');
    controls.innerHTML='<input id="stu-search" type="text" placeholder="Search students..." style="flex:1;min-width:200px;padding:10px 14px;border:1.5px solid var(--border);border-radius:9px;font-family:\'DM Sans\',sans-serif;font-size:13px;outline:none;background:var(--card);color:var(--ink)"><select id="stu-filter" style="padding:10px 14px;border:1.5px solid var(--border);border-radius:9px;font-family:\'DM Sans\',sans-serif;font-size:13px;background:var(--card);color:var(--ink);cursor:pointer"><option value="all">All Courses</option></select>';
    var filterEl=document.getElementById('stu-filter');
    courses.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;filterEl.appendChild(o);});
    function renderGrid(){
      var q=document.getElementById('stu-search').value.toLowerCase();
      var f=filterEl.value;
      var grouped={};
      myStudents.forEach(function(s){
        if(f!=='all'&&s.class_name!==f) return;
        if(q&&s.name.toLowerCase().indexOf(q)===-1&&s.email.toLowerCase().indexOf(q)===-1) return;
        if(!grouped[s.class_name]) grouped[s.class_name]=[];
        grouped[s.class_name].push(s);
      });
      var area=document.getElementById('stu-grid-area');
      var keys=Object.keys(grouped).sort();
      if(keys.length===0){area.innerHTML='';document.getElementById('stu-no-results').style.display='block';return;}
      document.getElementById('stu-no-results').style.display='none';
      var h='';
      keys.forEach(function(courseName){
        h+='<div style="margin-bottom:24px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.06em;background:var(--olive);color:#fff">'+courseName+'</span><span style="font-size:12px;color:var(--muted)">'+grouped[courseName].length+' students</span></div>';
        h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">';
        grouped[courseName].forEach(function(s){
          var ini=s.name.split(' ').map(function(w){return w[0]}).join('').toUpperCase().slice(0,2);
          h+='<div class="student-card"><div style="display:flex;align-items:center;gap:12px"><div style="width:36px;height:36px;border-radius:50%;background:var(--olive);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:13px;flex-shrink:0">'+ini+'</div><div><div style="font-weight:600;font-size:13px;color:var(--ink)">'+s.name+'</div><div style="font-size:11px;color:var(--muted)">'+s.email+'</div><div style="font-size:10px;color:var(--olive-light);margin-top:2px">'+(s.program||'Student')+'</div></div></div></div>';
        });
        h+='</div></div>';
      });
      area.innerHTML=h;
    }
    renderGrid();
    document.getElementById('stu-search').addEventListener('input',renderGrid);
    filterEl.addEventListener('change',renderGrid);
  }

  // Classrooms
  function renderClassrooms(){
    document.getElementById('ins-room-date').textContent=formatRoomDate(today);
    var enrollMap={};enrollment.forEach(function(r){enrollMap[r.class_name]=r;});
    var issueSet=new Set();issues.forEach(function(i){if(i.room) issueSet.add(i.room);});
    var curSched={};allSchedule.forEach(function(s){if(s.day===todayName&&isNowInSlot(s.time_slot))curSched[s.room]=s;});
    // Deduplicate rooms by building + room composite key
    var seenRooms=new Set();var uniqueRooms=[];rooms.forEach(function(r){var key=(r.building||'Unknown')+'|'+(r.room||'');if(!seenRooms.has(key)){seenRooms.add(key);uniqueRooms.push(r);}});
    function buildRoomCards(){
      roomCards=uniqueRooms.map(function(room){
        if(issueSet.has(room.room)) return Object.assign({},room,{uiStatus:'Under Maintain',uiClass:'room-maintain'});
        var cur=curSched[room.room],eRow=cur?enrollMap[cur.class_name]:null;
        if(room.status==='occupied'&&eRow&&eRow.status&&eRow.status!=='FULL') return Object.assign({},room,{uiStatus:'Under Capacity',uiClass:'room-partial'});
        if(room.status==='occupied') return Object.assign({},room,{uiStatus:'In Use',uiClass:'room-used'});
        return Object.assign({},room,{uiStatus:'Available',uiClass:'room-free'});
      });
      var stats={total:roomCards.length,inUse:0,available:0,underCap:0,maintain:0};
      roomCards.forEach(function(r){if(r.uiClass==='room-used')stats.inUse++;if(r.uiClass==='room-free')stats.available++;if(r.uiClass==='room-partial')stats.underCap++;if(r.uiClass==='room-maintain')stats.maintain++;});
      document.getElementById('ins-room-stats').innerHTML=
        '<div class="stat-card" id="ins-stat-total"><div class="stat-label">Total Rooms</div><div class="stat-value">'+stats.total+'</div></div>'+
        '<div class="stat-card" id="ins-stat-inuse"><div class="stat-label">In Use</div><div class="stat-value" style="color:var(--danger)">'+stats.inUse+'</div></div>'+
        '<div class="stat-card" id="ins-stat-avail"><div class="stat-label">Available</div><div class="stat-value" style="color:var(--success)">'+stats.available+'</div></div>'+
        '<div class="stat-card" id="ins-stat-cap"><div class="stat-label">Under Capacity</div><div class="stat-value" style="color:var(--gold)">'+stats.underCap+'</div></div>'+
        '<div class="stat-card" id="ins-stat-maintain"><div class="stat-label">Under Maintain</div><div class="stat-value" style="color:#475569">'+stats.maintain+'</div></div>';
    }
    buildRoomCards();
    var controls=document.getElementById('ins-room-controls');
    if(controls){
      if(!controls.dataset.ready){
        controls.innerHTML=
          '<input id="ins-room-search" class="room-search" type="text" placeholder="Search rooms or buildings...">'+
          '<select id="ins-room-building" class="room-filter"></select>'+
          '<div id="ins-room-results" class="room-results"></div>';
        controls.dataset.ready='1';
      }
    }
    var rg=document.getElementById('ins-room-grid');
    if(roomCards.length===0){rg.innerHTML='<div class="room-empty">No room data available.</div>';return;}
    function getBuildingLabel(r){return (r.building||'Other').trim()||'Other';}
    function norm(v){return String(v||'').toLowerCase();}
    function renderGrouped(list){
      if(list.length===0){rg.innerHTML='<div class="room-empty">No rooms match your search.</div>';return;}
      var groups={};
      list.forEach(function(r){var b=getBuildingLabel(r);if(!groups[b])groups[b]=[];groups[b].push(r);});
      var keys=Object.keys(groups).sort();
      var h='';
      keys.forEach(function(b){
        h+='<div class="room-section">';
        h+='<div class="room-section-title">'+b+' <span class="room-count-badge">'+groups[b].length+'</span></div>';
        h+='<div class="room-grid">';
        groups[b].forEach(function(r){
          h+='<div class="room-card '+r.uiClass+'"><div class="room-name">'+r.room+'</div><div class="room-status" style="font-size:11px;color:var(--muted)">'+(r.building||'')+'</div>';
          // Show course info when room is in use or under capacity
          if((r.uiClass==='room-used'||r.uiClass==='room-partial')&&curSched[r.room]){
            var courseData=curSched[r.room];
            h+='<div class="room-course" style="font-weight:600;color:'+(r.uiClass==='room-used'?'#2a542f':'#8a6c10')+';margin-top:4px">'+courseData.class_name+'</div>';
            h+='<div class="room-course-details" style="font-size:11px;color:var(--muted);margin-top:2px">📚 '+courseData.instructor+'</div>';
            h+='<div class="room-course-details" style="font-size:11px;color:var(--muted)">⏰ '+courseData.time_slot+'</div>';
          } else {
            h+='<div class="room-status">'+r.uiStatus+'</div>';
            h+='<div class="room-cap">Cap: '+r.capacity+'</div>';
          }
          if(r.uiClass==='room-free'){h+='<button class="room-reserve-btn" data-room-id="'+r.room+'" data-room-name="'+r.room+'" data-building="'+(r.building||'')+'">Reserve</button>';}
          h+='</div>';
        });
        h+='</div></div>';
      });
      rg.innerHTML=h;
    }
    var searchEl=document.getElementById('ins-room-search');
    var buildingEl=document.getElementById('ins-room-building');
    var resultsEl=document.getElementById('ins-room-results');
    function updateBuildingOptions(){
      if(!buildingEl) return;
      var current=buildingEl.value;
      var buildings=Array.from(new Set(roomCards.map(function(r){return getBuildingLabel(r);}))).sort();
      buildingEl.innerHTML='<option value="">All Buildings</option>';
      buildings.forEach(function(b){var opt=document.createElement('option');opt.value=b;opt.textContent=b;buildingEl.appendChild(opt);});
      if(current){buildingEl.value=current;}
    }
    updateBuildingOptions();
    function applyFilter(){
      var q=searchEl?norm(searchEl.value):'';
      var b=buildingEl?buildingEl.value:'';
      var filtered=roomCards.filter(function(r){
        var inBuilding=!b||getBuildingLabel(r)===b;
        if(!inBuilding) return false;
        if(!q) return true;
        return norm(r.room).indexOf(q)!==-1||norm(r.building).indexOf(q)!==-1||norm(r.uiStatus).indexOf(q)!==-1;
      });
      if(resultsEl){resultsEl.textContent=filtered.length+' rooms';}
      renderGrouped(filtered);
    }
    var refreshTimer;
    async function refreshRooms(){
      try{
        var res=await Promise.all([getRoomsAPI(),getOpenIssuesAPI(),getEnrollmentAPI(),getScheduleAPI()]);
        rooms=res[0]||[];issues=res[1]||[];enrollment=res[2]||[];allSchedule=res[3]||[];
        // Deduplicate rooms again during refresh
        seenRooms=new Set();uniqueRooms=[];rooms.forEach(function(r){var key=(r.building||'Unknown')+'|'+(r.room||'');if(!seenRooms.has(key)){seenRooms.add(key);uniqueRooms.push(r);}});
        issueSet=new Set();issues.forEach(function(i){if(i.room) issueSet.add(i.room);});
        enrollMap={};enrollment.forEach(function(r){enrollMap[r.class_name]=r;});
        curSched={};allSchedule.forEach(function(s){if(s.day===todayName&&isNowInSlot(s.time_slot))curSched[s.room]=s;});
        buildRoomCards();
        updateBuildingOptions();
        applyFilter();
      }catch(e){console.error('Room refresh error:',e);}
    }
    function scheduleRefresh(){
      if(refreshTimer) clearTimeout(refreshTimer);
      refreshTimer=setTimeout(refreshRooms,300);
    }
    if(searchEl){searchEl.addEventListener('input',function(){scheduleRefresh();});}
    if(buildingEl){buildingEl.addEventListener('change',function(){scheduleRefresh();});}
    applyFilter();
    // Create reservation modal
    var existingModal=document.getElementById('room-reservation-modal');
    if(!existingModal){
      var modal=document.createElement('div');modal.id='room-reservation-modal';modal.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;z-index:10000';modal.innerHTML='<div style="background:var(--card);border-radius:12px;padding:32px;max-width:500px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3)"><h2 style="margin:0 0 24px 0;font-size:20px;font-weight:700">Reserve Classroom</h2><div id="res-room-info" style="margin-bottom:24px;padding:16px;background:rgba(58,125,90,0.08);border-radius:8px;border-left:4px solid var(--success)"><strong id="res-room-name">Room Name</strong><div style="font-size:12px;color:var(--muted);margin-top:4px" id="res-room-building">Building</div></div><div style="margin-bottom:20px"><label style="display:block;font-size:12px;font-weight:600;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Date <span style="color:var(--danger)">*</span></label><input id="res-date" type="date" style="width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:8px;font-family:DM Sans,sans-serif;font-size:13px;box-sizing:border-box"></div><div style="margin-bottom:20px"><label style="display:block;font-size:12px;font-weight:600;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Time Slot <span style="color:var(--danger)">*</span></label><select id="res-time" style="width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:8px;font-family:DM Sans,sans-serif;font-size:13px;box-sizing:border-box"><option value="">- Select time -</option></select></div><div style="margin-bottom:20px"><label style="display:block;font-size:12px;font-weight:600;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Purpose <span style="color:var(--danger)">*</span></label><textarea id="res-purpose" placeholder="E.g., Guest lecture, Exam preparation..." style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:8px;font-family:DM Sans,sans-serif;font-size:13px;box-sizing:border-box;resize:vertical;min-height:80px"></textarea></div><div id="res-error" style="display:none;font-size:13px;color:var(--danger);padding:10px 14px;background:rgba(184,76,76,0.08);border:1px solid rgba(184,76,76,0.25);border-radius:8px;margin-bottom:20px"></div><div style="display:flex;gap:12px;justify-content:flex-end"><button id="res-cancel" style="padding:11px 24px;background:var(--surface);color:var(--ink);border:1px solid var(--border);border-radius:8px;font-family:DM Sans,sans-serif;font-size:13px;font-weight:600;cursor:pointer">Cancel</button><button id="res-submit" style="padding:11px 24px;background:var(--olive);color:#fff;border:none;border-radius:8px;font-family:DM Sans,sans-serif;font-size:13px;font-weight:600;cursor:pointer">Reserve</button></div></div>';
      document.body.appendChild(modal);
      // Populate time slots
      var timeEl=document.getElementById('res-time');var times=['08:30','09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30'];times.forEach(function(t){var opt=document.createElement('option');opt.value=t;opt.textContent=t;timeEl.appendChild(opt);});
      // Set minimum date to today
      var dateEl=document.getElementById('res-date');var minDate=new Date();dateEl.min=minDate.toISOString().split('T')[0];
    }
    var modal=document.getElementById('room-reservation-modal');
    var closeModal=function(){modal.style.display='none';document.getElementById('res-error').style.display='none';};
    document.getElementById('res-cancel').addEventListener('click',closeModal);
    modal.addEventListener('click',function(e){if(e.target===modal) closeModal();});
    document.getElementById('res-submit').addEventListener('click',async function(){
      var date=document.getElementById('res-date').value;var time=document.getElementById('res-time').value;var purpose=document.getElementById('res-purpose').value;var errorEl=document.getElementById('res-error');errorEl.style.display='none';if(!date||!time||!purpose){errorEl.textContent='Please fill in all fields';errorEl.style.display='block';return;}
      var roomName=document.getElementById('res-room-name').textContent;try{
        var result=await createRoomReservationAPI({room:roomName,date:date,time_slot:time,purpose:purpose});
        if(result&&result.id){alert('Reservation confirmed!');closeModal();document.getElementById('res-date').value='';document.getElementById('res-time').value='';document.getElementById('res-purpose').value='';}
      }catch(e){console.error('Reservation error:',e);errorEl.textContent=e.message||'Failed to create reservation';errorEl.style.display='block';}
    });
    // Add event listeners to Reserve buttons
    function attachReserveButtons(){
      document.querySelectorAll('.room-reserve-btn').forEach(function(btn){
        if(!btn.dataset.attached){
          btn.addEventListener('click',function(){
            var roomName=this.dataset.roomName;var building=this.dataset.building;
            document.getElementById('res-room-name').textContent=roomName;
            document.getElementById('res-room-building').textContent=building||'Unknown Building';
            modal.style.display='flex';
          });
          btn.dataset.attached='1';
        }
      });
    }
    attachReserveButtons();
    // Re-attach buttons after filtering
    var originalRenderGrouped=renderGrouped;renderGrouped=function(list){originalRenderGrouped(list);attachReserveButtons();};
  }

  // Exams
  function renderExams(){
    document.getElementById('ins-exam-sub').innerHTML='Midterm &amp; Final assignments - <span class="dynamic-semester">'+semester+'</span>';
    var emptyRow='<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--muted);font-size:14px">No exams, It\'s not exams period!</td></tr>';
    document.getElementById('ins-exam-mid').innerHTML='<div class="card"><div class="card-body" style="padding:0"><table class="exam-table"><thead><tr><th>Course</th><th>Date</th><th>Time</th><th>Hall</th><th>Role</th><th>Type</th></tr></thead><tbody>'+emptyRow+'</tbody></table></div></div>';
    document.getElementById('ins-exam-fin').innerHTML='<div class="card"><div class="card-body" style="padding:0"><table class="exam-table"><thead><tr><th>Course</th><th>Date</th><th>Time</th><th>Hall</th><th>Role</th><th>Type</th></tr></thead><tbody>'+emptyRow+'</tbody></table></div></div>';
    document.querySelectorAll('[data-et]').forEach(function(tab){
      tab.addEventListener('click',function(){
        document.querySelectorAll('[data-et]').forEach(function(t){t.classList.remove('active');});
        tab.classList.add('active');
        document.getElementById('ins-exam-mid').classList.toggle('active',tab.getAttribute('data-et')==='mid');
        document.getElementById('ins-exam-fin').classList.toggle('active',tab.getAttribute('data-et')==='fin');
      });
    });
  }

  // Feedback
  function renderFeedback(){
    var selectedScheduleId='',selectedIssues=[],severity='low',comment='';
    var opts=mySchedule.map(function(s){return{id:s.schedule_id,label:s.class_name+' – '+s.room+' ('+s.day+' '+s.time_slot+')'};});
    var formCard=document.getElementById('fb-form-card');
    var ih='<div class="card-head"><h3>New Complaint / Report</h3></div><div class="card-body" style="display:flex;flex-direction:column;gap:20px">';
    ih+='<div><label style="display:block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:8px">Classroom</label><select id="fb-room" style="width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:9px;font-family:\'DM Sans\',sans-serif;font-size:13px;background:var(--card);color:var(--ink);cursor:pointer;outline:none"><option value="">- Select a classroom -</option>';
    opts.forEach(function(o){ih+='<option value="'+o.id+'">'+o.label+'</option>';});
    ih+='</select></div>';
    ih+='<div><label style="display:block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:12px">Issues Reported <span style="color:var(--danger);margin-left:2px">*</span></label><div id="fb-issues" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">';
    ISSUE_LIST.forEach(function(issue){ih+='<label class="issue-item" for="issue-'+issue.id+'"><input id="issue-'+issue.id+'" type="checkbox" value="'+issue.id+'">'+issue.label+'</label>';});
    ih+='</div></div>';
    ih+='<div><label style="display:block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:8px">Severity</label><div style="display:flex;gap:8px;flex-wrap:wrap" id="fb-severity"><button type="button" class="sev-btn sev-active" data-sev="low">'+SEV_LABELS.low+'</button><button type="button" class="sev-btn" data-sev="medium">'+SEV_LABELS.medium+'</button><button type="button" class="sev-btn" data-sev="high">'+SEV_LABELS.high+'</button></div></div>';
    ih+='<div><label style="display:block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:8px">Additional Comments <span style="font-weight:400;color:var(--muted)">(optional)</span></label><textarea id="fb-comment" rows="4" placeholder="Describe the issue in more detail..." style="width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid var(--border);border-radius:9px;font-family:\'DM Sans\',sans-serif;font-size:13px;resize:vertical;background:var(--card);color:var(--ink);outline:none"></textarea></div>';
    ih+='<div id="fb-error" style="display:none;font-size:13px;color:var(--danger);padding:10px 14px;background:rgba(184,76,76,0.08);border:1px solid rgba(184,76,76,0.25);border-radius:8px"></div>';
    ih+='<div style="display:flex;justify-content:flex-end"><button type="button" id="fb-submit" style="padding:12px 32px;background:var(--olive);color:#fff;border:none;border-radius:9px;font-family:\'DM Sans\',sans-serif;font-size:14px;font-weight:600;cursor:pointer">Submit Report</button></div>';
    ih+='</div>';
    formCard.innerHTML=ih;

    // Severity buttons
    document.querySelectorAll('[data-sev]').forEach(function(btn){btn.addEventListener('click',function(){severity=btn.getAttribute('data-sev');document.querySelectorAll('[data-sev]').forEach(function(b){b.classList.toggle('sev-active',b===btn);});});});
    // Issue checkboxes
    document.querySelectorAll('#fb-issues input').forEach(function(cb){cb.addEventListener('change',function(){var lbl=cb.parentElement;lbl.classList.toggle('checked',cb.checked);selectedIssues=Array.from(document.querySelectorAll('#fb-issues input:checked')).map(function(c){return c.value;});});});
    // Submit
    document.getElementById('fb-submit').addEventListener('click',async function(){
      selectedScheduleId=document.getElementById('fb-room').value;
      comment=document.getElementById('fb-comment').value;
      var errEl=document.getElementById('fb-error');
      if(!selectedScheduleId||selectedIssues.length===0){errEl.style.display='block';errEl.textContent='Please select a classroom and at least one issue.';return;}
      errEl.style.display='none';
      try{
        await createInstructorIssueAPI({schedule_id:parseInt(selectedScheduleId),issues:selectedIssues,severity:severity,comment:comment||null});
        document.getElementById('fb-toast').style.display='flex';
        setTimeout(function(){document.getElementById('fb-toast').style.display='none';},4000);
        feedbackHistory=await getMyInstructorIssuesAPI();
        renderFeedbackHistory();
        document.getElementById('fb-room').value='';
        document.querySelectorAll('#fb-issues input').forEach(function(c){c.checked=false;c.parentElement.classList.remove('checked');});
        selectedIssues=[];document.getElementById('fb-comment').value='';
      }catch(e){errEl.style.display='block';errEl.textContent=e.message||'Failed to submit feedback.';}
    });
    renderFeedbackHistory();
  }

  function renderFeedbackHistory(){
    var hist=document.getElementById('fb-history');
    if(feedbackHistory.length===0){hist.innerHTML='<div style="text-align:center;padding:28px;color:var(--muted);font-size:13px;border:1.5px dashed var(--border);border-radius:10px">No feedback submitted yet.</div>';return;}
    var h='';
    feedbackHistory.forEach(function(f){
      h+='<div style="padding:14px 18px;background:var(--card);border:1.5px solid var(--border);border-radius:10px;margin-bottom:10px">';
      h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-weight:600;font-size:13px;color:var(--ink)">📍 '+(f.room||'Room')+'</span><span style="display:flex;gap:8px;align-items:center"><span style="font-size:11px;font-weight:600;color:'+SEV_COLORS[f.severity||'low']+'">'+SEV_LABELS[f.severity||'low']+'</span><span style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted)">'+(f.reported_date||'')+'</span></span></div>';
      h+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:'+(f.comment?'10':'0')+'px"><span style="font-size:11px;padding:3px 9px;border-radius:6px;background:var(--olive-faint);color:var(--olive-dark);font-weight:500">'+(f.issue_type||'')+'</span><span style="font-size:11px;padding:3px 9px;border-radius:6px;background:var(--surface);color:var(--muted);font-weight:500">'+(f.status==='fixed'?'Resolved':'Open')+'</span></div>';
      if(f.comment) h+='<div style="font-size:12px;color:var(--muted);padding:8px 10px;background:var(--surface);border-radius:7px">'+f.comment+'</div>';
      if(f.admin_response) h+='<div style="margin-top:8px;font-size:12px;color:var(--ink);padding:8px 10px;background:rgba(58,125,90,0.08);border-radius:7px">Admin: '+f.admin_response+'</div>';
      h+='</div>';
    });
    hist.innerHTML=h;
  }

  // ── Feedback sub-tabs ─────────────────────────────────────────────────
  function initFeedbackSubTabs(){
    document.querySelectorAll('#fb-sec-tabs [data-fb]').forEach(function(btn){
      btn.addEventListener('click',function(){
        document.querySelectorAll('#fb-sec-tabs [data-fb]').forEach(function(b){b.classList.remove('active');});
        btn.classList.add('active');
        var target=btn.getAttribute('data-fb');
        document.querySelectorAll('.fb-section').forEach(function(s){s.classList.remove('active');});
        document.getElementById('fb-'+target+'-section').classList.add('active');
      });
    });
  }

  // ── Complaints to Admin ───────────────────────────────────────────────
  function renderComplaints(){
    var formCard=document.getElementById('complaint-form-card');
    var ih='<div class="card-head"><h3>Send Complaint to Admin</h3></div><div class="card-body" style="display:flex;flex-direction:column;gap:20px">';

    // Category
    ih+='<div><label style="display:block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:8px">Category <span style="color:var(--danger)">*</span></label><select id="cpl-category" style="width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:9px;font-family:\'DM Sans\',sans-serif;font-size:13px;background:var(--card);color:var(--ink);cursor:pointer;outline:none">';
    COMPLAINT_CATEGORIES.forEach(function(c){ih+='<option value="'+c.val+'">'+c.label+'</option>';});
    ih+='</select></div>';

    // Subject
    ih+='<div><label style="display:block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:8px">Subject <span style="color:var(--danger)">*</span></label><input id="cpl-subject" type="text" maxlength="200" placeholder="Brief summary of your complaint..." style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid var(--border);border-radius:9px;font-family:\'DM Sans\',sans-serif;font-size:13px;background:var(--card);color:var(--ink);outline:none"></div>';

    // Message
    ih+='<div><label style="display:block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:8px">Detailed Message <span style="color:var(--danger)">*</span></label><textarea id="cpl-message" rows="5" placeholder="Explain your complaint in detail..." style="width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid var(--border);border-radius:9px;font-family:\'DM Sans\',sans-serif;font-size:13px;resize:vertical;background:var(--card);color:var(--ink);outline:none"></textarea></div>';

    // Priority
    ih+='<div><label style="display:block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:8px">Priority</label><div style="display:flex;gap:8px;flex-wrap:wrap" id="cpl-priority"><button type="button" class="sev-btn" data-cpri="low">'+SEV_LABELS.low+'</button><button type="button" class="sev-btn sev-active" data-cpri="medium">'+SEV_LABELS.medium+'</button><button type="button" class="sev-btn" data-cpri="high">'+SEV_LABELS.high+'</button></div></div>';

    // Error
    ih+='<div id="cpl-error" style="display:none;font-size:13px;color:var(--danger);padding:10px 14px;background:rgba(184,76,76,0.08);border:1px solid rgba(184,76,76,0.25);border-radius:8px"></div>';

    // Submit
    ih+='<div style="display:flex;justify-content:flex-end"><button type="button" id="cpl-submit" style="padding:12px 32px;background:var(--olive);color:#fff;border:none;border-radius:9px;font-family:\'DM Sans\',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:opacity 0.2s">Send Complaint</button></div>';
    ih+='</div>';
    formCard.innerHTML=ih;

    // Priority toggle
    var cplPriority='medium';
    document.querySelectorAll('[data-cpri]').forEach(function(btn){
      btn.addEventListener('click',function(){
        cplPriority=btn.getAttribute('data-cpri');
        document.querySelectorAll('[data-cpri]').forEach(function(b){b.classList.toggle('sev-active',b===btn);});
      });
    });

    // Submit handler
    document.getElementById('cpl-submit').addEventListener('click',async function(){
      var category=document.getElementById('cpl-category').value;
      var subject=document.getElementById('cpl-subject').value.trim();
      var message=document.getElementById('cpl-message').value.trim();
      var errEl=document.getElementById('cpl-error');

      if(!subject||subject.length<5){errEl.style.display='block';errEl.textContent='Subject must be at least 5 characters.';return;}
      if(!message||message.length<10){errEl.style.display='block';errEl.textContent='Message must be at least 10 characters.';return;}
      errEl.style.display='none';

      var btn=document.getElementById('cpl-submit');
      btn.disabled=true;btn.textContent='Sending...';
      try{
        await createComplaintAPI({category:category,subject:subject,message:message,priority:cplPriority});
        document.getElementById('complaint-toast').style.display='flex';
        setTimeout(function(){document.getElementById('complaint-toast').style.display='none';},4000);
        myComplaints=await getMyComplaintsAPI();
        renderComplaintHistory();
        document.getElementById('cpl-subject').value='';
        document.getElementById('cpl-message').value='';
        document.getElementById('cpl-category').selectedIndex=0;
        cplPriority='medium';
        document.querySelectorAll('[data-cpri]').forEach(function(b){b.classList.toggle('sev-active',b.getAttribute('data-cpri')==='medium');});
      }catch(e){errEl.style.display='block';errEl.textContent=e.message||'Failed to submit complaint.';}
      btn.disabled=false;btn.textContent='Send Complaint';
    });

    renderComplaintHistory();
  }

  function renderComplaintHistory(){
    var hist=document.getElementById('complaint-history');
    if(myComplaints.length===0){
      hist.innerHTML='<div style="text-align:center;padding:28px;color:var(--muted);font-size:13px;border:1.5px dashed var(--border);border-radius:10px">No complaints submitted yet.</div>';
      return;
    }
    var h='';
    myComplaints.forEach(function(c){
      var st=STATUS_BADGE[c.status]||STATUS_BADGE.open;
      var catLabel=COMPLAINT_CATEGORIES.find(function(x){return x.val===c.category;})||{label:c.category};

      h+='<div class="complaint-card">';
      h+='<div class="complaint-header">';
      h+='<div class="complaint-title">'+c.subject+'</div>';
      h+='<div style="display:flex;gap:8px;align-items:center;flex-shrink:0">';
      h+='<span style="font-size:11px;font-weight:600;color:'+SEV_COLORS[c.priority||'medium']+'">'+SEV_LABELS[c.priority||'medium']+'</span>';
      h+='<span class="complaint-status" style="background:'+st.bg+';color:'+st.color+'">'+st.label+'</span>';
      h+='</div></div>';

      h+='<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">';
      h+='<span class="complaint-category-pill">'+catLabel.label+'</span>';
      h+='<span style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted);display:flex;align-items:center">'+(c.created_at||'')+'</span>';
      h+='</div>';

      h+='<div style="font-size:13px;color:var(--ink);line-height:1.6;padding:10px 12px;background:var(--surface);border-radius:8px;margin-bottom:'+(c.admin_response?'10':'0')+'px">'+c.message+'</div>';

      if(c.admin_response){
        h+='<div class="complaint-response">';
        h+='<div style="font-size:11px;font-weight:600;color:var(--olive-dark);margin-bottom:4px">Admin Response</div>';
        h+='<div style="font-size:13px;color:var(--ink);line-height:1.5">'+c.admin_response+'</div>';
        h+='</div>';
      }
      h+='</div>';
    });
    hist.innerHTML=h;
  }
});
