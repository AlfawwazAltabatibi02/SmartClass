document.addEventListener('DOMContentLoaded', function() {
  if (!Auth.requireRole('admin')) return;
  var displayName = Auth.getDisplayName();
  var identifier = Auth.getIdentifier();
  var semester = getCurrentSemester();
  var today = new Date();
  var todayName = today.toLocaleDateString('en-US',{weekday:'long'});
  var nowMin = today.getHours()*60+today.getMinutes();
  var initials = (function(){ var s=displayName||identifier||''; if(!s) return 'AD'; var c=s.split('@')[0]; var p=c.split(/[.\s]+/).filter(Boolean); return p.slice(0,2).map(function(x){return x[0].toUpperCase()}).join('')||c.slice(0,2).toUpperCase(); })();
  var BUILDINGS={};
  var DEPT_CFG={CS:{label:'Computer Science',bg:'#3a5c41'},MATH:{label:'Mathematics',bg:'#1e4d8c'},PHYS:{label:'Physics',bg:'#5c2483'},ENG:{label:'English / Writing',bg:'#7a4a0c'}};

  document.getElementById('avatar-initials').textContent = initials;
  document.getElementById('avatar-dropdown').innerHTML = '<div class="dropdown-item"><div class="dropdown-label">Name</div><strong>'+(displayName||'Admin')+'</strong></div><div class="dropdown-item"><div class="dropdown-label">Email</div>'+(identifier||'-')+'</div><div class="dropdown-item"><div class="dropdown-label">Role</div>System Administrator</div>';
  document.getElementById('btn-logout').addEventListener('click', function(){ Auth.logout(); });
  document.querySelectorAll('.dynamic-semester').forEach(function(el){ el.textContent=semester; });
  document.getElementById('adm-semester').textContent = semester;

  var TABS=[{key:'overview',label:'Dashboard'},{key:'timetables',label:'Timetables'},{key:'instructors',label:'Instructors'},{key:'classrooms',label:'Classrooms'},{key:'exams',label:'Exams'},{key:'feedbacks',label:'Feedbacks'},{key:'ai',label:'AI Assistant'}];
  var activeTab=localStorage.getItem('adminActiveTab')||'overview';
  var navTabs=document.getElementById('nav-tabs');
  TABS.forEach(function(tab){var btn=document.createElement('button');btn.className='topnav-link'+(tab.key===activeTab?' active':'');btn.textContent=tab.label;btn.setAttribute('data-tab',tab.key);btn.addEventListener('click',function(){switchTab(tab.key);});navTabs.appendChild(btn);});
  document.getElementById('nav-brand').addEventListener('click',function(){switchTab('overview');});
  function switchTab(key){activeTab=key;localStorage.setItem('adminActiveTab',key);document.querySelectorAll('.subpage').forEach(function(el){el.classList.remove('active');});document.getElementById('tab-'+key).classList.add('active');document.querySelectorAll('.topnav-link').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-tab')===key);});}
  // Restore active tab on load
  if(document.getElementById('tab-'+activeTab)){document.querySelectorAll('.subpage').forEach(function(el){el.classList.remove('active');});document.getElementById('tab-'+activeTab).classList.add('active');}

  var schedule=[],rooms=[],instructors=[],students=[],issues=[],enrollment=[],complaints=[],subjects=[],roomReservations=[];
  var midExams=[],finExams=[],examTab='mid',responseDrafts={};

  (async function(){
    try{
      var r=await Promise.allSettled([getScheduleAPI(),getRoomsAPI(),getInstructorsAPI(),getStudentsAPI(),getOpenIssuesAPI(),getEnrollmentAPI(),getAllComplaintsAPI(),getAllRoomReservationsAPI()]);
      schedule=r[0].status==='fulfilled'?(r[0].value||[]):[];
      rooms=r[1].status==='fulfilled'?(r[1].value||[]):[];
      // Deduplicate rooms by building+room combination (same room code can exist in different buildings)
      var seenRooms=new Set();rooms=rooms.filter(function(r){var key=(r.building||'Unknown')+'|'+(r.room||'');if(seenRooms.has(key))return false;seenRooms.add(key);return true;});
      // Build BUILDINGS from rooms data grouped by building
      BUILDINGS={};
      rooms.forEach(function(r){
        if(!BUILDINGS[r.building]) BUILDINGS[r.building]=[];
        BUILDINGS[r.building].push(r.room);
      });
      instructors=r[2].status==='fulfilled'?(r[2].value||[]):[];
      students=r[3].status==='fulfilled'?(r[3].value||[]):[];
      issues=r[4].status==='fulfilled'?(r[4].value||[]):[];
      enrollment=r[5].status==='fulfilled'?(r[5].value||[]):[];
      complaints=r[6].status==='fulfilled'?(r[6].value||[]):[];
      roomReservations=r[7].status==='fulfilled'?(r[7].value||[]):[];
    }catch(e){console.error('Admin data error:',e);}
    document.getElementById('loading-bar').style.display='none';
    renderAll();
  })();

  function extractDept(cn){var m=(cn||'').match(/^[A-Za-z]+/);return m?m[0].toUpperCase():'GEN';}
  function extractCode(cn){return cn?(cn.split(' - ')[0]||cn):'';}
  function isNowInSlot(ts){var p=ts.split('-');var s=p[0].split(':').map(Number);var e=p[1].split(':').map(Number);return nowMin>=s[0]*60+s[1]&&nowMin<=e[0]*60+e[1];}
  function fmtToday(d){return d.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});}
  function fmtExamDate(ds){return new Date(ds+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});}
  
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

  function renderInstructorTimetableRows(email,name,body){
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
          html+='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 12px;border-left:3px solid '+color+';background:'+bgColor+';border-radius:4px;font-size:13px"><div><div style="font-weight:600;color:var(--ink)">'+(row.class_name||'Meeting')+'</div><div style="font-size:11px;color:var(--muted);margin-top:3px">'+(row.time_slot||'')+' '+((row.building||'')+' '+(row.room||'')).trim()+'</div></div><div style="text-align:right;font-size:11px;color:'+color+';font-weight:600">'+typeLabel+'</div></div>';
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

  function getInstructorAvailabilityStatus(availability){
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

  function showInstructorTimetable(email,name){
    var modal=ensureInstructorTimetableModal();
    document.getElementById('inst-timetable-title').textContent=(name||'Instructor')+' Timetable';
    document.getElementById('inst-timetable-subtitle').textContent=email||'';
    var body=document.getElementById('inst-timetable-body');
    modal.style.display='flex';
    renderInstructorTimetableRows(email,name,body);
    if(modal.dataset.refreshTimer){ clearInterval(parseInt(modal.dataset.refreshTimer,10)); }
    modal.dataset.refreshTimer = String(setInterval(function(){
      if(modal.style.display==='flex') renderInstructorTimetableRows(email,name,body);
    }, 30000));
  }

  function renderAll(){
    var enrollMap={};enrollment.forEach(function(r){enrollMap[r.class_name]=r;});
    var issueRooms=new Set();issues.forEach(function(i){if(i.room)issueRooms.add(i.room);});
    var curSched={};schedule.forEach(function(s){if(s.day===todayName&&isNowInSlot(s.time_slot))curSched[s.room]=s;});
    var roomCards=rooms.map(function(r){
      if(issueRooms.has(r.room))return Object.assign({},r,{uiStatus:'Under Maintain',uiClass:'room-maintain'});
      var cur=curSched[r.room],eRow=cur?enrollMap[cur.class_name]:null;
      if(r.status==='occupied'&&eRow&&eRow.status&&eRow.status!=='FULL')return Object.assign({},r,{uiStatus:'Under Capacity',uiClass:'room-partial'});
      if(r.status==='occupied')return Object.assign({},r,{uiStatus:'In Use',uiClass:'room-used'});
      return Object.assign({},r,{uiStatus:'Available',uiClass:'room-free'});
    });
    var rs={total:roomCards.length,inUse:0,available:0,underCap:0,maintain:0};
    roomCards.forEach(function(r){if(r.uiClass==='room-used')rs.inUse++;if(r.uiClass==='room-free')rs.available++;if(r.uiClass==='room-partial')rs.underCap++;if(r.uiClass==='room-maintain')rs.maintain++;});
    var deptCounts={};schedule.forEach(function(s){var d=extractDept(s.class_name);deptCounts[d]=(deptCounts[d]||0)+1;});
    var schedCards=schedule.map(function(s){return{id:s.schedule_id,course:extractCode(s.class_name),room:s.room,roomLabel:s.building?s.building+' '+s.room:s.room,instructor:s.instructor,dept:extractDept(s.class_name),time:s.time_slot,days:s.day};});

    // Overview
    document.getElementById('adm-stats').innerHTML=
      '<div class="stat-card"><div class="stat-label">Total Students</div><div class="stat-value">'+students.length+'</div><div class="stat-sub">Active this semester</div></div>'+
      '<div class="stat-card"><div class="stat-label">Instructors</div><div class="stat-value">'+instructors.length+'</div><div class="stat-sub">Teaching this term</div></div>'+
      '<div class="stat-card"><div class="stat-label">Active Courses</div><div class="stat-value">'+schedCards.length+'</div><div class="stat-sub">Across '+Object.keys(deptCounts).length+' departments</div></div>'+
      '<div class="stat-card"><div class="stat-label">Classrooms</div><div class="stat-value">'+rs.total+'</div><div class="stat-sub">'+rs.inUse+' in use right now</div></div>'+
      '<div class="stat-card"><div class="stat-label">Conflicts</div><div class="stat-value" style="color:var(--danger)">'+issues.length+'</div><div class="stat-sub">Open issues</div></div>';
    document.getElementById('adm-alert-tag').textContent=issues.length+' Issues';
    var ab=document.getElementById('adm-alerts-body');
    if(issues.length===0){ab.innerHTML='<div style="padding:10px;background:rgba(58,125,90,0.08);border-left:3px solid var(--success);border-radius:0 6px 6px 0;font-size:13px">All systems operational.</div>';}
    else{var ah='<div style="display:flex;flex-direction:column;gap:8px">';issues.slice(0,3).forEach(function(i){ah+='<div style="padding:10px;background:rgba(184,76,76,0.06);border-left:3px solid var(--danger);border-radius:0 6px 6px 0;font-size:13px"><strong>'+i.room+':</strong> '+i.issue_type+' ('+i.day+' '+i.time_slot+')</div>';});ah+='</div>';ab.innerHTML=ah;}
    document.getElementById('adm-quick').innerHTML='<div style="display:flex;flex-direction:column;gap:10px"><button type="button" onclick="switchTab(\'timetables\')" style="width:100%;padding:11px;border:1.5px solid var(--olive);border-radius:8px;background:var(--olive);color:#fff;font-family:\'DM Sans\',sans-serif;font-size:13px;font-weight:600;cursor:pointer">View Courses</button><button type="button" onclick="switchTab(\'instructors\')" style="width:100%;padding:11px;border:1.5px solid var(--border);border-radius:8px;background:#fff;font-family:\'DM Sans\',sans-serif;font-size:13px;font-weight:500;cursor:pointer">View instructors</button><button type="button" onclick="switchTab(\'exams\')" style="width:100%;padding:11px;border:1.5px solid var(--border);border-radius:8px;background:#fff;font-family:\'DM Sans\',sans-serif;font-size:13px;font-weight:500;cursor:pointer">View Exams</button><button type="button" onclick="switchTab(\'feedbacks\')" style="width:100%;padding:11px;border:1.5px solid var(--border);border-radius:8px;background:#fff;font-family:\'DM Sans\',sans-serif;font-size:13px;font-weight:500;cursor:pointer">View Feedbacks</button></div>';
    // Make switchTab global for inline onclick
    window.switchTab = switchTab;

    // Timetable - weekly table format (all courses)
    var ttArea=document.getElementById('adm-tt-area');
    if(schedCards.length===0){ttArea.innerHTML='<p style="text-align:center;padding:40px;color:var(--muted)">No schedule data.</p>';}
    else{
      // Extract unique time slots and days
      var timeSlots=[];var timeSet=new Set();
      schedCards.forEach(function(c){if(!timeSet.has(c.time)){timeSet.add(c.time);timeSlots.push(c.time);}});
      timeSlots.sort();
      
      var daysOfWeek=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      
      // Create a map of courses by time and day
      var courseMap={};
      schedCards.forEach(function(c){
        var key=c.time+'|'+c.days;
        if(!courseMap[key])courseMap[key]=[];
        courseMap[key].push(c);
      });
      
      // Build table HTML
      var tableHtml='<div style="overflow-x:auto;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08)"><table style="width:100%;border-collapse:collapse;background:#fff;font-family:\'DM Sans\',sans-serif;font-size:13px">';
      
      // Header row
      tableHtml+='<thead><tr style="background:#3a5c41;color:#fff;font-weight:600">';
      tableHtml+='<th style="padding:12px 16px;text-align:left;border:1px solid #e0e0e0">Time</th>';
      daysOfWeek.forEach(function(day){
        tableHtml+='<th style="padding:12px 16px;text-align:center;border:1px solid #e0e0e0">'+day+'</th>';
      });
      tableHtml+='</tr></thead>';
      
      // Body rows
      tableHtml+='<tbody>';
      timeSlots.forEach(function(ts,idx){
        tableHtml+='<tr style="'+(idx%2===0?'background:#fafafa':'background:#fff')+'">';
        tableHtml+='<td style="padding:12px 16px;border:1px solid #e0e0e0;font-weight:600;color:var(--ink)">'+ts+'</td>';
        
        daysOfWeek.forEach(function(day){
          var key=ts+'|'+day;
          var courses=courseMap[key]||[];
          var cellHtml='<td style="padding:8px 12px;border:1px solid #e0e0e0;vertical-align:top">';
          if(courses.length===0){
            cellHtml+='<div style="text-align:center;color:var(--muted);font-size:12px">—</div>';
          } else {
            courses.forEach(function(c,i){
              var cfg=DEPT_CFG[c.dept]||{bg:'#3a5c41',label:c.dept};
              cellHtml+='<div style="background:'+cfg.bg+';color:#fff;border-radius:6px;padding:8px;margin:'+(i>0?'4px 0 0 0':'0')+';font-size:11px;font-weight:600;line-height:1.3">';
              cellHtml+='<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+c.course+'</div>';
              cellHtml+='<div style="font-size:10px;opacity:0.9;margin-top:2px">'+c.roomLabel+'</div>';
              cellHtml+='<div style="font-size:10px;opacity:0.8">'+c.instructor+'</div>';
              cellHtml+='</div>';
            });
          }
          cellHtml+='</td>';
          tableHtml+=cellHtml;
        });
        tableHtml+='</tr>';
      });
      tableHtml+='</tbody></table></div>';
      
      ttArea.innerHTML=tableHtml;
    }

    // Instructors
    var il=document.getElementById('adm-inst-list');
    if(instructors.length===0){
      il.innerHTML='<div style="text-align:center;padding:28px;color:var(--muted);font-size:13px">No instructor data.</div>';
    } else {
      var ih='<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px"><input id="adm-inst-search" type="text" placeholder="Search instructors by name..." style="width:220px;max-width:38vw;padding:8px 12px;border:1.5px solid var(--border);border-radius:999px;font-family:\'DM Sans\',sans-serif;font-size:12px;outline:none;background:var(--card);color:var(--ink)"><div id="adm-inst-count" style="font-size:12px;color:var(--muted);font-weight:600;white-space:nowrap">'+instructors.length+' instructors</div></div></div><div id="adm-inst-results">';
      ih+='</div>';
      il.innerHTML=ih;
      var instSearchInput=document.getElementById('adm-inst-search');
      var instResultsDiv=document.getElementById('adm-inst-results');
      var instCountDiv=document.getElementById('adm-inst-count');

      instResultsDiv.addEventListener('click', function(e) {
        // This ensures that even if they click the SVG icon inside the button, it triggers correctly
        var btn = e.target.closest('.inst-timetable-btn');
        if (btn) {
          showInstructorTimetable(btn.getAttribute('data-email'), btn.getAttribute('data-name'));
        }
      });

      function applyInstructorFilter(){
        var q=String(instSearchInput.value||'').trim().toLowerCase();
        var matches=instructors.filter(function(inst){
          return String(inst.name||'').toLowerCase().indexOf(q)!==-1;
        });
        instCountDiv.textContent=matches.length+' instructor'+(matches.length===1?'':'s');
        var html='';
        if(matches.length===0){
          html='<div style="text-align:center;padding:28px;color:var(--muted);font-size:13px">No instructors match your search.</div>';
        } else {
          // Group instructors by department
          var groups={};
          matches.forEach(function(inst){
            var dept=inst.building||'Other';
            if(!groups[dept]) groups[dept]=[];
            groups[dept].push(inst);
          });
          // Sort departments
          Object.keys(groups).sort().forEach(function(dept){
            html+='<div style="margin-bottom:20px"><div style="font-weight:700;font-size:12px;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)">'+dept+'</div>';
            groups[dept].forEach(function(inst){
              var ini=inst.name.split(' ').map(function(p){return p[0]}).slice(0,2).join('').toUpperCase();
              html+='<div class="instructor-row"><div class="instructor-avatar">'+ini+'</div><div class="instructor-info"><div class="instructor-name">'+inst.name+'</div><div class="instructor-dept">'+(inst.department||'Department')+' - Email: '+inst.email+'</div><div class="instructor-courses"><span class="course-pill">Office: '+(inst.office_room||'N/A')+'</span></div></div><div style="display:flex;gap:10px;align-items:center"><button type="button" class="inst-timetable-btn" data-email="'+inst.email+'" data-name="'+inst.name+'" title="Open timetable" aria-label="Open timetable" style="width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:999px;background:#fff;color:var(--ink);cursor:pointer">'+calendarIcon()+'</button><span style="font-size:11px;color:var(--muted);font-weight:600">Active</span><span class="avail-dot dot-gray" data-email="'+inst.email+'"></span></div></div>';
            });
            html+='</div>';
          });
        }
        instResultsDiv.innerHTML=html;
        instSearchInput.querySelectorAll('.inst-timetable-btn').forEach(function(btn){
          btn.onclick=function(){showInstructorTimetable(btn.getAttribute('data-email'),btn.getAttribute('data-name'));};
        });
        // Update LED colors asynchronously with 30-second refresh
        function updateAdminInstructorLEDs(){
          instResultsDiv.querySelectorAll('.avail-dot[data-email]').forEach(function(dot){
            var email=dot.getAttribute('data-email');
            getInstructorFullScheduleAPI(email).then(function(data){
              var status=getInstructorAvailabilityStatus(data.availability||[]);
              dot.className='avail-dot dot-'+status;
            }).catch(function(e){console.error('LED update failed for '+email,e);});
          });
        }
        updateAdminInstructorLEDs();
        if(window.adminInstLEDTimer) clearInterval(window.adminInstLEDTimer);
        window.adminInstLEDTimer = setInterval(updateAdminInstructorLEDs, 30000);
      }
      instSearchInput.addEventListener('input',applyInstructorFilter);
      instSearchInput.addEventListener('keyup',applyInstructorFilter);
      instSearchInput.addEventListener('change',applyInstructorFilter);
      instSearchInput.oninput = applyInstructorFilter;
      applyInstructorFilter();
    }

    // Classrooms
    document.getElementById('adm-today-date').textContent=fmtToday(today);
    document.getElementById('adm-room-stats').innerHTML=
      '<div class="stat-card" id="adm-stat-total"><div class="stat-label">Total Rooms</div><div class="stat-value">'+rs.total+'</div></div>'+
      '<div class="stat-card" id="adm-stat-inuse"><div class="stat-label">In Use</div><div class="stat-value" style="color:var(--danger)">'+rs.inUse+'</div></div>'+
      '<div class="stat-card" id="adm-stat-avail"><div class="stat-label">Available</div><div class="stat-value" style="color:var(--success)">'+rs.available+'</div></div>'+
      '<div class="stat-card" id="adm-stat-cap"><div class="stat-label">Under Capacity</div><div class="stat-value" style="color:var(--gold)">'+rs.underCap+'</div></div>'+
      '<div class="stat-card" id="adm-stat-maintain"><div class="stat-label">Under Maintain</div><div class="stat-value" style="color:#1e3a5f">'+rs.maintain+'</div></div>';
    function updateRoomStats(list){
      var next={total:list.length,inUse:0,available:0,underCap:0,maintain:0};
      list.forEach(function(r){if(r.uiClass==='room-used')next.inUse++;if(r.uiClass==='room-free')next.available++;if(r.uiClass==='room-partial')next.underCap++;if(r.uiClass==='room-maintain')next.maintain++;});
      document.getElementById('adm-room-stats').innerHTML=
        '<div class="stat-card" id="adm-stat-total"><div class="stat-label">Total Rooms</div><div class="stat-value">'+next.total+'</div></div>'+
        '<div class="stat-card" id="adm-stat-inuse"><div class="stat-label">In Use</div><div class="stat-value" style="color:var(--danger)">'+next.inUse+'</div></div>'+
        '<div class="stat-card" id="adm-stat-avail"><div class="stat-label">Available</div><div class="stat-value" style="color:var(--success)">'+next.available+'</div></div>'+
        '<div class="stat-card" id="adm-stat-cap"><div class="stat-label">Under Capacity</div><div class="stat-value" style="color:var(--gold)">'+next.underCap+'</div></div>'+
        '<div class="stat-card" id="adm-stat-maintain"><div class="stat-label">Under Maintain</div><div class="stat-value" style="color:#1e3a5f">'+next.maintain+'</div></div>';
    }
    var controls=document.getElementById('adm-room-controls');
    if(controls){
      if(!controls.dataset.ready){
        controls.innerHTML=
          '<input id="adm-room-search" class="room-search" type="text" placeholder="Search rooms or buildings...">'+
          '<select id="adm-room-building" class="room-filter"></select>'+
          '<div id="adm-room-results" class="room-results"></div>';
        controls.dataset.ready='1';
      }
    }
    var rg=document.getElementById('adm-room-grid');
    if(roomCards.length===0){rg.innerHTML='<div class="room-empty">No room data.</div>';}
    else{
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
              h+='<div class="room-course-details" style="font-size:11px;color:var(--muted);margin-top:2px">👨‍🏫 '+courseData.instructor+'</div>';
              h+='<div class="room-course-details" style="font-size:11px;color:var(--muted)">⏰ '+courseData.time_slot+'</div>';
            } else {
              h+='<div class="room-status">'+r.uiStatus+'</div>';
              h+='<div class="room-cap">Cap: '+r.capacity+'</div>';
            }
            h+='</div>';
          });
          h+='</div></div>';
        });
        rg.innerHTML=h;
      }
      var searchEl=document.getElementById('adm-room-search');
      var buildingEl=document.getElementById('adm-room-building');
      var resultsEl=document.getElementById('adm-room-results');
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
          rooms=res[0]||[];issues=res[1]||[];enrollment=res[2]||[];schedule=res[3]||[];
          // Deduplicate rooms by building+room combination (same room code can exist in different buildings)
          var seenRooms=new Set();rooms=rooms.filter(function(r){var key=(r.building||'Unknown')+'|'+(r.room||'');if(seenRooms.has(key))return false;seenRooms.add(key);return true;});
          issueRooms=new Set();issues.forEach(function(i){if(i.room)issueRooms.add(i.room);});
          enrollMap={};enrollment.forEach(function(r){enrollMap[r.class_name]=r;});
          curSched={};schedule.forEach(function(s){if(s.day===todayName&&isNowInSlot(s.time_slot))curSched[s.room]=s;});
          roomCards=rooms.map(function(r){
            if(issueRooms.has(r.room))return Object.assign({},r,{uiStatus:'Under Maintain',uiClass:'room-maintain'});
            var cur=curSched[r.room],eRow=cur?enrollMap[cur.class_name]:null;
            if(r.status==='occupied'&&eRow&&eRow.status&&eRow.status!=='FULL')return Object.assign({},r,{uiStatus:'Under Capacity',uiClass:'room-partial'});
            if(r.status==='occupied')return Object.assign({},r,{uiStatus:'In Use',uiClass:'room-used'});
            return Object.assign({},r,{uiStatus:'Available',uiClass:'room-free'});
          });
          updateRoomStats(roomCards);
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
    }

    // Room Reservations
    renderRoomReservations();

    // Feedbacks
    renderFeedbacks();

    // Exams
    renderExams();
  }

  function renderRoomReservations(){
    var resSection=document.getElementById('adm-reservations-section');
    if(!resSection) return;
    if(roomReservations.length===0){
      resSection.innerHTML='<div style="padding:20px;background:rgba(58,125,90,0.06);border-left:3px solid rgba(58,125,90,0.3);border-radius:0 6px 6px 0;font-size:13px;color:var(--muted)">No room reservations at this time.</div>';
      return;
    }
    var getInstructorName=function(email){
      var inst=instructors.find(function(i){return i.email===email;});
      return inst?inst.display_name:email;
    };
    var html='<div><h3 style="font-size:15px;font-weight:700;color:var(--ink);margin:0 0 12px 0">Upcoming Room Reservations</h3>';
    html+='<div class="card"><div class="card-body" style="display:flex;flex-direction:column;gap:10px">';
    roomReservations.forEach(function(res){
      var instrName=getInstructorName(res.instructor_email||'');
      var dateObj=new Date(res.date+'T00:00:00');
      var dateStr=dateObj.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      html+='<div style="padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:12px;font-size:12px;align-items:center">';
      html+='<div><div style="color:var(--muted);font-size:11px">Room</div><strong>'+res.room+'</strong></div>';
      html+='<div><div style="color:var(--muted);font-size:11px">Date</div><strong>'+dateStr+'</strong></div>';
      html+='<div><div style="color:var(--muted);font-size:11px">Time</div><strong>'+res.time_slot+'</strong></div>';
      html+='<div><div style="color:var(--muted);font-size:11px">Instructor</div><strong>'+instrName.substring(0,20)+'</strong></div>';
      html+='<div><div style="color:var(--muted);font-size:11px">Purpose</div><strong style="word-break:break-word">'+res.purpose.substring(0,25)+(res.purpose.length>25?'...':'')+'</strong></div>';
      html+='</div>';
    });
    html+='</div></div></div>';
    resSection.innerHTML=html;
  }

  function renderFeedbacks(){
    var fb=document.getElementById('adm-feedbacks-body');
    var h='';

    // Section 1: Classroom Issues
    h+='<div style="margin-bottom:14px"><h3 style="font-size:14px;font-weight:700;color:var(--ink);margin:0">Classroom Issues</h3><div style="font-size:12px;color:var(--muted);margin-top:4px">Reports tied to scheduled classes</div></div>';
    if(issues.length===0){
      h+='<div class="card" style="margin-bottom:24px"><div class="card-body" style="text-align:center;padding:28px;color:var(--muted);font-size:13px">No open feedback issues.</div></div>';
    } else {
      issues.forEach(function(issue){
        h+='<div class="card" style="margin-bottom:20px" data-issue="'+issue.issue_id+'"><div class="card-head"><h3>'+issue.room+' - '+issue.class_name+'</h3><span class="tag" style="background:var(--danger);color:#fff">Unresolved</span></div><div class="card-body"><p style="font-size:14px;color:var(--ink);margin-bottom:10px"><strong>'+issue.issue_type+'</strong> ('+issue.day+' '+issue.time_slot+')</p>';
        if(issue.comment) h+='<p style="font-size:13px;color:var(--muted);margin-bottom:12px">'+issue.comment+'</p>';
        h+='<textarea class="resp-input" data-id="'+issue.issue_id+'" style="width:100%;height:80px;border:1px solid var(--border);border-radius:8px;padding:12px;font-family:\'DM Sans\',sans-serif;font-size:13px;resize:none;margin-bottom:12px;outline:none" placeholder="Type your response..."></textarea>';
        h+='<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:12px;color:var(--muted)">Reported: '+issue.reported_date+'</span><button type="button" class="resolve-btn" data-id="'+issue.issue_id+'" style="padding:8px 16px;background:var(--olive);color:#fff;border:none;border-radius:8px;font-family:\'DM Sans\',sans-serif;font-size:13px;font-weight:600;cursor:pointer">Send Response &amp; Resolve</button></div></div></div>';
      });
    }

    // Section 2: Complaints
    h+='<div style="margin:18px 0 14px"><h3 style="font-size:14px;font-weight:700;color:var(--ink);margin:0">Complaints to Admin</h3><div style="font-size:12px;color:var(--muted);margin-top:4px">Messages submitted by instructors</div></div>';
    if(complaints.length===0){
      h+='<div class="card"><div class="card-body" style="text-align:center;padding:28px;color:var(--muted);font-size:13px">No complaints found.</div></div>';
    } else {
      var STATUS_BADGE={
        open:{label:'Open',bg:'rgba(184,76,76,0.10)',color:'var(--danger)'},
        in_progress:{label:'In Progress',bg:'rgba(217,174,79,0.12)',color:'var(--gold)'},
        resolved:{label:'Resolved',bg:'rgba(58,125,90,0.12)',color:'var(--success)'},
        closed:{label:'Closed',bg:'rgba(0,0,0,0.06)',color:'var(--muted)'}
      };
      var PRI_COLOR={low:'var(--muted)',medium:'var(--gold)',high:'var(--danger)'};

      complaints.forEach(function(c){
        var st=STATUS_BADGE[c.status]||STATUS_BADGE.open;
        var priColor=PRI_COLOR[c.priority]||PRI_COLOR.medium;
        var draftKey='complaint_'+c.complaint_id;
        var draft=responseDrafts[draftKey];
        var initialText=(typeof draft==='string'?draft:(c.admin_response||''));
        var instrLink='/instructor/'+encodeURIComponent(c.instructor_email||'');

        h+='<div class="card" style="margin-bottom:20px" data-complaint="'+c.complaint_id+'">';
        h+='<div class="card-head" style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">';
        h+='<div><h3 style="margin:0">'+(c.subject||'Complaint')+'</h3><div style="margin-top:6px;font-size:12px;color:var(--muted)">From: <strong style="color:var(--ink)">'+(c.instructor_name||'Instructor')+'</strong> · '+(c.instructor_email||'')+'</div></div>';
        h+='<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">';
        h+='<span class="tag" style="background:'+st.bg+';color:'+st.color+'">'+st.label+'</span>';
        h+='<span style="font-size:11px;font-weight:700;color:'+priColor+';text-transform:uppercase;letter-spacing:.06em">'+(c.priority||'medium')+'</span>';
        h+='</div></div>';
        h+='<div class="card-body">';
        h+='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px">';
        h+='<div style="font-size:12px;color:var(--muted)">Category: '+(c.category||'other')+' · Submitted: '+(c.created_at||'')+'</div>';
        h+='<a href="'+instrLink+'" style="padding:7px 12px;border:1.5px solid var(--border);border-radius:8px;background:#fff;font-family:\'DM Sans\',sans-serif;font-size:12px;font-weight:600;color:var(--ink);text-decoration:none;white-space:nowrap">Open Instructor Page</a>';
        h+='</div>';
        h+='<div style="font-size:13px;color:var(--ink);line-height:1.65;padding:10px 12px;background:var(--surface);border-radius:8px;margin-bottom:12px">'+(c.message||'')+'</div>';

        h+='<div style="display:grid;grid-template-columns:1fr 160px;gap:12px;align-items:start">';
        h+='<textarea class="complaint-resp" data-id="'+c.complaint_id+'" style="width:100%;height:84px;border:1px solid var(--border);border-radius:8px;padding:12px;font-family:\'DM Sans\',sans-serif;font-size:13px;resize:none;outline:none" placeholder="Type your response...">'+(initialText||'')+'</textarea>';
        h+='<div style="display:flex;flex-direction:column;gap:10px">';
        h+='<select class="complaint-status" data-id="'+c.complaint_id+'" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:#fff;font-family:\'DM Sans\',sans-serif;font-size:13px;outline:none;cursor:pointer">';
        h+='<option value="in_progress"'+(c.status==='in_progress'?' selected':'')+'>In Progress</option>';
        h+='<option value="resolved"'+(c.status==='resolved'?' selected':'')+'>Resolved</option>';
        h+='<option value="closed"'+(c.status==='closed'?' selected':'')+'>Closed</option>';
        h+='</select>';
        h+='<button type="button" class="complaint-respond-btn" data-id="'+c.complaint_id+'" style="padding:9px 12px;background:var(--olive);color:#fff;border:none;border-radius:8px;font-family:\'DM Sans\',sans-serif;font-size:13px;font-weight:700;cursor:pointer">Send Response</button>';
        h+='</div></div>';
        h+='</div></div>';
      });
    }

    fb.innerHTML=h;

    document.querySelectorAll('.resolve-btn').forEach(function(btn){
      btn.addEventListener('click',async function(){
        var id=btn.getAttribute('data-id');
        var textarea=document.querySelector('.resp-input[data-id="'+id+'"]');
        var resp=textarea?textarea.value.trim():'';
        try{await resolveIssueAPI(parseInt(id),resp||null);issues=await getOpenIssuesAPI();renderFeedbacks();}catch(e){alert(e.message||'Failed to resolve.');}
      });
    });

    document.querySelectorAll('.complaint-resp').forEach(function(t){
      t.addEventListener('input',function(){
        var id=t.getAttribute('data-id');
        responseDrafts['complaint_'+id]=t.value;
      });
    });
    document.querySelectorAll('.complaint-respond-btn').forEach(function(btn){
      btn.addEventListener('click',async function(){
        var id=btn.getAttribute('data-id');
        var textarea=document.querySelector('.complaint-resp[data-id="'+id+'"]');
        var statusSel=document.querySelector('.complaint-status[data-id="'+id+'"]');
        var resp=textarea?textarea.value.trim():'';
        var newStatus=statusSel?statusSel.value:'resolved';
        if(!resp){alert('Please type a response first.');return;}
        btn.disabled=true;btn.textContent='Sending...';
        try{
          await respondToComplaintAPI(parseInt(id),{admin_response:resp,new_status:newStatus});
          complaints=await getAllComplaintsAPI();
          delete responseDrafts['complaint_'+id];
          renderFeedbacks();
        }catch(e){alert(e.message||'Failed to send response.');}
        btn.disabled=false;btn.textContent='Send Response';
      });
    });
  }

  function renderExams(){
    var assignedCourses=Array.from(new Set(schedule.map(function(s){return s.class_name;})));
    function buildTable(exams,type){
      var badge=type==='mid'?'MIDTERM':'FINAL',cls=type==='mid'?'exam-midterm':'exam-final';
      var h='<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button type="button" class="add-exam-btn" data-type="'+type+'" style="padding:8px 16px;background:var(--olive);color:#fff;border:none;border-radius:8px;font-family:\'DM Sans\',sans-serif;font-size:13px;font-weight:600;cursor:pointer">+ Add Exam Slot</button></div>';
      h+='<div class="card"><div class="card-body" style="padding:0"><table class="exam-table"><thead><tr><th>Course</th><th>Instructor</th><th>Date</th><th>Time</th><th>Hall</th><th>Enrolled</th><th>Type</th></tr></thead><tbody>';
      if(exams.length===0){h+='<tr><td colspan="7" style="text-align:center;padding:40px 20px;color:var(--muted);font-size:14px">No exams, It\'s not exams period!</td></tr>';}
      else{exams.forEach(function(s,i){h+='<tr><td><strong>'+s.course+'</strong></td><td>'+s.instructor+'</td><td>'+s.date+'</td><td>'+s.time+'</td><td>'+s.hall+'</td><td>'+s.enrolled+'</td><td><span class="exam-type-badge '+cls+'">'+badge+'</span></td></tr>';});}
      h+='</tbody></table></div></div>';
      return h;
    }
    document.getElementById('adm-exam-mid').innerHTML=buildTable(midExams,'mid');
    document.getElementById('adm-exam-fin').innerHTML=buildTable(finExams,'fin');
    document.querySelectorAll('[data-et]').forEach(function(tab){tab.addEventListener('click',function(){document.querySelectorAll('[data-et]').forEach(function(t){t.classList.remove('active');});tab.classList.add('active');examTab=tab.getAttribute('data-et');document.getElementById('adm-exam-mid').classList.toggle('active',examTab==='mid');document.getElementById('adm-exam-fin').classList.toggle('active',examTab==='fin');});});
    document.querySelectorAll('.add-exam-btn').forEach(function(btn){btn.addEventListener('click',function(){openModal(btn.getAttribute('data-type'));});});

    // Modal
    var modalType='mid';
    function openModal(type){
      modalType=type;
      document.getElementById('exam-modal-subtitle').textContent=type==='mid'?'Adding to Midterm Schedule':'Adding to Final Schedule';
      document.getElementById('exam-modal-error').style.display='none';
      var fh='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px"><div><label style="display:block;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Course</label><select id="ef-course" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:\'DM Sans\',sans-serif;outline:none;cursor:pointer"><option value="">- Select course -</option>';
      assignedCourses.forEach(function(c){fh+='<option value="'+c+'">'+c+'</option>';});
      fh+='</select></div><div><label style="display:block;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Instructor</label><select id="ef-instr" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:\'DM Sans\',sans-serif;outline:none;cursor:pointer"><option value="">- Select instructor -</option>';
      instructors.forEach(function(i){fh+='<option value="'+i.instructor_id+'">'+i.name+'</option>';});
      fh+='</select></div></div>';
      fh+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px"><div><label style="display:block;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Exam Date</label><input id="ef-date" type="date" min="'+new Date().toISOString().split('T')[0]+'" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:\'DM Sans\',sans-serif;outline:none;cursor:pointer"></div><div><label style="display:block;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Enrolled</label><input id="ef-enrolled" type="number" min="0" placeholder="e.g. 56" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:\'DM Sans\',sans-serif;outline:none"></div></div>';
      fh+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px"><div><label style="display:block;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Start Time</label><input id="ef-ts" type="time" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:\'DM Sans\',sans-serif;outline:none;cursor:pointer"></div><div><label style="display:block;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">End Time</label><input id="ef-te" type="time" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:\'DM Sans\',sans-serif;outline:none;cursor:pointer"></div></div>';
      fh+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div><label style="display:block;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Building</label><select id="ef-bldg" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:\'DM Sans\',sans-serif;outline:none;cursor:pointer"><option value="">- Select building -</option>';
      Object.keys(BUILDINGS).forEach(function(b){fh+='<option value="'+b+'">'+b+'</option>';});
      fh+='</select></div><div><label style="display:block;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Hall / Room</label><select id="ef-hall" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:\'DM Sans\',sans-serif;outline:none;cursor:pointer"><option value="">- Pick building first -</option></select></div></div>';
      document.getElementById('exam-modal-fields').innerHTML=fh;
      document.getElementById('ef-bldg').addEventListener('change',function(){var v=this.value;var sel=document.getElementById('ef-hall');sel.innerHTML='<option value="">- Select hall -</option>';(BUILDINGS[v]||[]).forEach(function(h){sel.innerHTML+='<option value="'+h+'">'+h+'</option>';});});
      document.getElementById('exam-modal-overlay').style.display='flex';
    }
    document.getElementById('exam-modal-overlay').addEventListener('click',function(e){if(e.target.id==='exam-modal-overlay')closeModal();});
    document.getElementById('exam-modal-cancel').addEventListener('click',closeModal);
    function closeModal(){document.getElementById('exam-modal-overlay').style.display='none';}
    document.getElementById('exam-modal-add').addEventListener('click',function(){
      var c=document.getElementById('ef-course'),ins=document.getElementById('ef-instr'),dt=document.getElementById('ef-date'),ts=document.getElementById('ef-ts'),te=document.getElementById('ef-te'),hall=document.getElementById('ef-hall'),enr=document.getElementById('ef-enrolled');
      if(!c.value||!ins.value||!dt.value||!ts.value||!te.value||!hall.value){document.getElementById('exam-modal-error').style.display='block';document.getElementById('exam-modal-error').textContent='Please fill in all fields.';return;}
      if(te.value<=ts.value){document.getElementById('exam-modal-error').style.display='block';document.getElementById('exam-modal-error').textContent='End time must be after start time.';return;}
      var slot={course:c.value,instructor:ins.value,date:fmtExamDate(dt.value),time:ts.value+'-'+te.value,hall:hall.value,enrolled:enr.value.trim()||'-'};
      if(modalType==='mid') midExams.push(slot); else finExams.push(slot);
      closeModal();renderExams();
    });
  }
});
