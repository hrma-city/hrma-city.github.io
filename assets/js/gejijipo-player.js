/* 各个击破 · 播放器（插画动画版“短视频” + 语音解说） */
(function(){
  var eps = window.GJP_EPISODES || [];
  var parts = window.GJP_PARTS || [];
  var partName = {}; parts.forEach(function(p){ partName[p.key]=p; });
  var wrap = document.getElementById('plyContent');
  if(!wrap) return;

  function getId(){
    var m = location.search.match(/[?&]id=([^&]+)/);
    return m ? m[1] : null;
  }
  var ep = eps.filter(function(e){return e.id===getId();})[0];
  if(!ep){
    wrap.innerHTML = '<p style="color:var(--ink-3)">未找到该集。<a href="gejijipo.html">返回各个击破</a></p>';
    return;
  }

  var dur = ep.dur || 7000;
  var total = ep.slides.length * dur;
  var p = partName[ep.part] || {name:'',icon:'◆'};

  // 上下集
  var gi = eps.map(function(e){return e.id;}).indexOf(ep.id);
  var prev = gi>0 ? eps[gi-1] : null;
  var next = gi<eps.length-1 ? eps[gi+1] : null;

  // 语音合成支持
  var supported = ('speechSynthesis' in window);
  var zhVoice = null;
  function pickVoice(){
    if(!supported) return;
    var vs = window.speechSynthesis.getVoices();
    zhVoice = vs.filter(function(v){return /zh|cmn|Chinese/i.test(v.lang);})[0] || null;
  }
  if(supported){ pickVoice(); window.speechSynthesis.onvoiceschanged = pickVoice; }

  // 渲染骨架
  wrap.innerHTML = ''+
  '<div class="ply-head">'+
    '<span class="part">'+p.icon+' '+p.name+'</span>'+
    '<h1>'+ep.title+'</h1>'+
    '<span class="en">'+ep.en+'</span>'+
  '</div>'+
  '<p class="ply-sub">'+ep.tag+' · 每集约 1 分钟，自动播放插画动画，可开启语音解说、暂停或跳集。</p>'+
  '<div class="ply-stage">'+
    '<div class="ply-screen" id="screen">'+
      ep.slides.map(function(s,i){ return '<div class="illu-box" data-i="'+i+'">'+(s.illu||'')+'</div>'; }).join('')+
      '<div class="ply-cap"><p class="ct" id="capT"></p><p class="cs" id="capS"></p></div>'+
    '</div>'+
    '<div class="ply-bar">'+
      '<div class="ply-ctrl">'+
        '<button id="btnPrev" title="上一集">⏮</button>'+
        '<button class="primary" id="btnPlay" title="播放/暂停">⏸</button>'+
        '<button id="btnRestart" title="重播">↺</button>'+
        '<button id="btnNext" title="下一集">⏭</button>'+
      '</div>'+
      '<div class="ply-prog" id="prog"><div class="fill" id="fill"></div></div>'+
      '<div class="ply-time" id="time">0:00 / 0:00</div>'+
      '<div class="ply-voice">'+
        '<button id="btnVoice" class="vo" aria-pressed="false" title="开关语音解说">🔈 语音解说</button>'+
        '<select id="voiceRate" title="语速"><option value="0.9">0.9×</option><option value="1" selected>1.0×</option><option value="1.15">1.15×</option><option value="1.3">1.3×</option></select>'+
        '<span class="vstat" id="vstat"></span>'+
      '</div>'+
    '</div>'+
    '<div class="ply-dots" id="dots">'+
      ep.slides.map(function(s,i){ return '<button data-i="'+i+'" title="第'+(i+1)+'页"></button>'; }).join('')+
    '</div>'+
  '</div>'+
  '<div class="ply-script" id="script">'+
    '<div class="sh" id="sh"><h2>📝 文字解说脚本</h2><span class="tog" id="tog">展开 ▾</span></div>'+
    '<div class="sbody" id="sbody"></div>'+
  '</div>'+
  '<div class="ply-nav">'+
    (prev?'<a href="gejijipo-player.html?id='+prev.id+'"><span class="lab">上一集</span>'+prev.title+'</a>':'<a class="disabled"><span class="lab">上一集</span>已是第一集</a>')+
    (next?'<a href="gejijipo-player.html?id='+next.id+'"><span class="lab">下一集</span>'+next.title+'</a>':'<a class="disabled"><span class="lab">下一集</span>已是最后一集</a>')+
  '</div>';

  // 脚本内容
  var scriptHtml = '<ol>' + ep.slides.map(function(s){
    return '<li><b>'+s.cap+'：</b>'+s.say+'</li>';
  }).join('') + '</ol>'+
  '<div class="take"><b>一句话要点：</b>'+ep.takeaway+'</div>'+
  '<button class="copy" id="copyBtn">复制整段脚本</button>';
  document.getElementById('sbody').innerHTML = scriptHtml;

  // 元素引用
  var screen = document.getElementById('screen');
  var boxes = screen.querySelectorAll('.illu-box');
  var capT = document.getElementById('capT');
  var capS = document.getElementById('capS');
  var fill = document.getElementById('fill');
  var timeEl = document.getElementById('time');
  var dots = document.getElementById('dots').querySelectorAll('button');
  var btnPlay = document.getElementById('btnPlay');
  var btnVoice = document.getElementById('btnVoice');
  var voiceRate = document.getElementById('voiceRate');
  var vstat = document.getElementById('vstat');
  var playing = true, idx = 0, slideStart = 0, elapsedIn = 0, raf = null;

  // 语音状态
  var voiceOn = false;
  var rate = 1.0;
  var voiceDur = dur;                 // 当前页允许时长（语音模式下=语音读完+间隙）
  var MAX_VOICE_MS = 14000;           // 单页语音最长等待上限，防止卡死
  var VOICE_GAP = 350;                // 语音读完后留白再翻页

  function stopVoice(){ if(supported){ try{ window.speechSynthesis.cancel(); }catch(e){} } }
  function speakSlide(text){
    if(!supported) return;
    try{ window.speechSynthesis.cancel(); }catch(e){}
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    if(zhVoice) u.voice = zhVoice;
    u.rate = rate; u.pitch = 1.0;
    voiceDur = MAX_VOICE_MS;          // 先给天花板，语音真实结束时再缩短
    u.onend = function(){ voiceDur = Math.min(elapsedIn + VOICE_GAP, MAX_VOICE_MS); };
    u.onerror = function(){ voiceDur = Math.min(elapsedIn + VOICE_GAP, MAX_VOICE_MS); };
    try{ window.speechSynthesis.speak(u); }catch(e){}
  }

  function fmt(ms){ var s=Math.round(ms/1000); return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2); }

  function show(i){
    idx = (i+ep.slides.length)%ep.slides.length;
    boxes.forEach(function(b,k){ b.firstChild && b.classList.toggle('show', k===idx); });
    boxes.forEach(function(b,k){
      var sv = b.querySelector('svg'); if(sv) sv.classList.toggle('show', k===idx);
    });
    capT.textContent = ep.slides[idx].cap;
    capS.textContent = ep.slides[idx].say;
    dots.forEach(function(d,k){ d.classList.toggle('on', k===idx); });
    elapsedIn = 0; slideStart = performance.now();
    if(voiceOn && supported){ speakSlide(ep.slides[idx].say); }
  }

  function curDur(){ return (voiceOn && supported) ? voiceDur : dur; }

  function updateProgress(){
    var sd = curDur();
    var overall = (idx*dur + Math.min(elapsedIn,sd)) / total;
    fill.style.width = (overall*100).toFixed(2)+'%';
    timeEl.textContent = fmt(idx*dur+Math.min(elapsedIn,sd))+' / '+fmt(total);
  }

  function loop(now){
    if(playing){
      elapsedIn = now - slideStart;
      var sd = curDur();
      if(elapsedIn >= sd){
        if(idx < ep.slides.length-1){ show(idx+1); }
        else { elapsedIn = sd; playing=false; btnPlay.textContent='↺'; stopVoice(); }
      }
      updateProgress();
    }
    raf = requestAnimationFrame(loop);
  }

  function play(){
    playing=true; btnPlay.textContent='⏸';
    slideStart = performance.now()-elapsedIn;
    if(voiceOn && supported){ speakSlide(ep.slides[idx].say); }
  }
  function pause(){ playing=false; btnPlay.textContent='▶'; elapsedIn = performance.now()-slideStart; stopVoice(); }

  btnPlay.addEventListener('click', function(){
    if(!playing && idx===ep.slides.length-1 && elapsedIn>=dur){ show(0); }
    playing?pause():play();
  });
  document.getElementById('btnRestart').addEventListener('click', function(){ show(0); play(); });
  document.getElementById('btnPrev').addEventListener('click', function(){ if(idx>0){ show(idx-1); } });
  document.getElementById('btnNext').addEventListener('click', function(){ if(idx<ep.slides.length-1){ show(idx+1); } });
  dots.forEach(function(d){ d.addEventListener('click', function(){ show(parseInt(d.getAttribute('data-i'),10)); play(); }); });
  document.getElementById('prog').addEventListener('click', function(e){
    var r=this.getBoundingClientRect(); var f=(e.clientX-r.left)/r.width;
    var ms=f*total; var ni=Math.floor(ms/dur); show(ni); elapsedIn=ms-ni*dur; slideStart=performance.now()-elapsedIn; if(!playing) play();
  });

  // 语音解说开关
  if(!supported){
    btnVoice.style.display='none';
    voiceRate.style.display='none';
    vstat.textContent = '当前浏览器不支持语音合成，请用 Chrome / Edge / Safari 打开';
  } else {
    btnVoice.addEventListener('click', function(){
      voiceOn = !voiceOn;
      btnVoice.classList.toggle('on', voiceOn);
      btnVoice.setAttribute('aria-pressed', voiceOn);
      btnVoice.textContent = (voiceOn?'🔊':'🔈') + ' 语音解说';
      if(voiceOn){
        vstat.textContent = zhVoice ? ('音色：'+zhVoice.name) : '音色：默认（未找到中文音色，将用系统语音）';
        speakSlide(ep.slides[idx].say);   // 用户点击即手势激活，可直接朗读
      } else {
        stopVoice(); voiceDur = dur; vstat.textContent = '';
      }
    });
    voiceRate.addEventListener('change', function(){
      rate = parseFloat(this.value) || 1.0;
      if(voiceOn && supported){ speakSlide(ep.slides[idx].say); }
    });
  }

  // 脚本折叠
  var scriptBox=document.getElementById('script'), tog=document.getElementById('tog');
  document.getElementById('sh').addEventListener('click', function(){
    scriptBox.classList.toggle('open');
    tog.textContent = scriptBox.classList.contains('open')?'收起 ▴':'展开 ▾';
  });
  document.getElementById('copyBtn').addEventListener('click', function(){
    var txt = '【各个击破 · '+ep.title+'（'+ep.en+'）】\n';
    ep.slides.forEach(function(s,i){ txt += (i+1)+'. '+s.cap+'：'+s.say+'\n'; });
    txt += '\n一句话要点：'+ep.takeaway;
    var btn=this;
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(function(){ btn.textContent='已复制 ✓'; setTimeout(function(){btn.textContent='复制整段脚本';},1500); });
    } else {
      var ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select();
      try{document.execCommand('copy'); btn.textContent='已复制 ✓';}catch(e){ btn.textContent='复制失败'; }
      document.body.removeChild(ta); setTimeout(function(){btn.textContent='复制整段脚本';},1500);
    }
  });

  // 键盘：空格播放/暂停，左右切集，V 开关语音
  document.addEventListener('keydown', function(e){
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT') return;
    if(e.code==='Space'){ e.preventDefault(); playing?pause():play(); }
    else if(e.code==='ArrowRight'){ if(idx<ep.slides.length-1) show(idx+1); }
    else if(e.code==='ArrowLeft'){ if(idx>0) show(idx-1); }
    else if(e.key==='v'||e.key==='V'){ if(supported) btnVoice.click(); }
  });

  // 离开页面时停掉语音
  window.addEventListener('beforeunload', function(){ stopVoice(); });
  window.addEventListener('pagehide', function(){ stopVoice(); });

  // 启动
  show(0);
  raf = requestAnimationFrame(loop);
  setTimeout(function(){ if(!scriptBox.classList.contains('open')){ scriptBox.classList.add('open'); tog.textContent='收起 ▴'; } }, 6000);
})();
