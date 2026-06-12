(function(){
  function el(id){ return document.getElementById(id); }

  function roleExamples(role){
    if(role === 'student'){
      return ['What classes do I have this week?', 'Who are my instructors?', 'Where is my next class?'];
    }
    if(role === 'instructor'){
      return ['Show my teaching schedule', 'List my students', 'Which rooms are available?'];
    }
    return ['Give me a system overview', 'Show open issues', 'Which rooms are available?'];
  }

  function renderRows(rows){
    if(!rows || rows.length === 0) return '<div class="ai-empty">No matching database rows returned.</div>';
    var cols = Object.keys(rows[0]).slice(0, 6);
    var h = '<div class="ai-table-wrap"><table class="ai-table"><thead><tr>';
    cols.forEach(function(c){ h += '<th>'+c.replace(/_/g, ' ')+'</th>'; });
    h += '</tr></thead><tbody>';
    rows.slice(0, 8).forEach(function(row){
      h += '<tr>';
      cols.forEach(function(c){
        var value = row[c];
        h += '<td>'+(value === null || value === undefined ? '' : String(value))+'</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    return h;
  }

  function addMessage(kind, html){
    var log = el('ai-log');
    if(!log) return;
    var item = document.createElement('div');
    item.className = 'ai-msg ai-' + kind;
    item.innerHTML = html;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  }

  async function ask(message){
    var input = el('ai-input');
    var send = el('ai-send');
    if(!message) message = input ? input.value.trim() : '';
    if(!message) return;
    if(input) input.value = '';
    addMessage('user', '<div class="ai-bubble">'+message+'</div>');
    addMessage('bot', '<div class="ai-bubble ai-loading">Thinking with Smart Class data...</div>');
    if(send) send.disabled = true;
    try{
      var data = await askAIAssistantAPI(message);
      var loading = document.querySelector('.ai-loading');
      if(loading && loading.parentElement) loading.parentElement.remove();
      addMessage('bot',
        '<div class="ai-bubble"><p>'+String(data.answer || '').replace(/\n/g, '<br>')+'</p>' +
        '<div class="ai-source">'+(data.source || 'Smart Class database')+' - '+(data.intent || 'answer')+'</div>' +
        renderRows(data.rows || []) + '</div>'
      );
      renderSuggestions(data.suggestions || roleExamples(Auth.getRole()));
    }catch(e){
      var pending = document.querySelector('.ai-loading');
      if(pending && pending.parentElement) pending.parentElement.remove();
      addMessage('bot', '<div class="ai-bubble ai-error">AI assistant could not answer: '+(e.message || 'Request failed')+'</div>');
    }
    if(send) send.disabled = false;
  }

  function renderSuggestions(items){
    var box = el('ai-suggestions');
    if(!box) return;
    box.innerHTML = '';
    items.forEach(function(text){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-chip';
      btn.textContent = text;
      btn.addEventListener('click', function(){ ask(text); });
      box.appendChild(btn);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    if(!el('ai-assistant')) return;
    renderSuggestions(roleExamples(Auth.getRole()));
    addMessage('bot', '<div class="ai-bubble"><p>Ask me about schedules, instructors, students, rooms, or issues. I only use approved Smart Class database queries for your role.</p></div>');
    var send = el('ai-send');
    var input = el('ai-input');
    if(send) send.addEventListener('click', function(){ ask(); });
    if(input) input.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        ask();
      }
    });
  });
})();
