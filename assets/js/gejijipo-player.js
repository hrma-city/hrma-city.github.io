/* 各个击破 · 播放器（插画动画版“短视频”） */
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

  // 渲染骨架
  wrap.innerHTML = ''+
  '<div class="ply-head">'+
    '<span class="part">'+p.icon+' '+p.name+'</span>'+
    '<h1>'+ep.title+'</h1>'+
    '<span class="en">'+ep.en+'</span>'+
  '</div>'+
  '<p class="ply-sub">'+ep.tag+' · 每集约 1 分钟，自动播放插画动画，可暂停或跳集。</p>'+
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
  var playing = true, idx = 0, slideStart = 0, elapsedIn = 0, raf = null;

  function fmt(ms){ var s=Math.round(ms/1000); return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2); }

  function show(i){
    idx = (i+ep.slides.length)%ep.slides.length;
    boxes.forEach(function(b,k){ b.firstChild && b.classList.toggle('show', k===idx); });
    // 直接给 svg 加 show 类
    boxes.forEach(function(b,k){
      var sv = b.querySelector('svg'); if(sv) sv.classList.toggle('show', k===idx);
    });
    capT.textContent = ep.slides[idx].cap;
    capS.textContent = ep.slides[idx].say;
    dots.forEach(function(d,k){ d.classList.toggle('on', k===idx); });
    elapsedIn = 0; slideStart = performance.now();
  }

  function updateProgress(){
    var overall = (idx*dur + Math.min(elapsedIn,dur)) / total;
    fill.style.width = (overall*100).toFixed(2)+'%';
    timeEl.textContent = fmt(idx*dur+Math.min(elapsedIn,dur))+' / '+fmt(total);
  }

  function loop(now){
    if(playing){
      elapsedIn = now - slideStart;
      if(elapsedIn >= dur){
        if(idx < ep.slides.length-1){ show(idx+1); }
        else { // 播完
          elapsedIn = dur; playing=false; btnPlay.textContent='↺';
        }
      }
      updateProgress();
    }
    raf = requestAnimationFrame(loop);
  }

  function play(){ playing=true; btnPlay.textContent='⏸'; slideStart = performance.now()-elapsedIn; }
  function pause(){ playing=false; btnPlay.textContent='▶'; elapsedIn = performance.now()-slideStart; }

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

  // 键盘：空格播放/暂停，左右切集
  document.addEventListener('keydown', function(e){
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
    if(e.code==='Space'){ e.preventDefault(); playing?pause():play(); }
    else if(e.code==='ArrowRight'){ if(idx<ep.slides.length-1) show(idx+1); }
    else if(e.code==='ArrowLeft'){ if(idx>0) show(idx-1); }
  });

  // 启动
  show(0);
  raf = requestAnimationFrame(loop);
  // 5 秒后自动展开脚本（方便边看边读）
  setTimeout(function(){ if(!scriptBox.classList.contains('open')){ scriptBox.classList.add('open'); tog.textContent='收起 ▴'; } }, 6000);
})();
