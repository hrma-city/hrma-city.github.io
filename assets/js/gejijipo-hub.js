/* 各个击破 · 聚合页渲染 */
(function(){
  var parts = window.GJP_PARTS || [];
  var eps = window.GJP_EPISODES || [];
  var tabbar = document.getElementById('gjpTabbar');
  var grid = document.getElementById('gjpGrid');
  var desc = document.getElementById('gjpDesc');
  if(!grid) return;

  var partName = {};
  parts.forEach(function(p){ partName[p.key]=p; });

  function countOf(key){ return eps.filter(function(e){return e.part===key;}).length; }

  function render(key){
    var list = eps.filter(function(e){return e.part===key;});
    grid.innerHTML = list.map(function(e){
      var p = partName[e.part] || {name:''};
      return ''+
      '<a class="gjp-card" href="gejijipo-player.html?id='+e.id+'">'+
        '<div class="cov">'+
          '<span class="tag">'+e.tag+'</span>'+
          '<span class="dur">约 1 分钟</span>'+
          '<span class="idx">'+p.icon+'<small>'+String(e.no).padStart(2,'0')+'</small></span>'+
        '</div>'+
        '<div class="body">'+
          '<h3>'+e.title+'</h3>'+
          '<p class="en">'+e.en+'</p>'+
          '<p class="desc">'+e.takeaway+'</p>'+
          '<span class="go">▶ 开始观看</span>'+
        '</div>'+
      '</a>';
    }).join('');
    // 更新描述
    var meta = parts.filter(function(p){return p.key===key;})[0];
    if(meta && desc){ desc.textContent = meta.name+'：'+meta.desc; }
  }

  // 构建标签
  tabbar.innerHTML = parts.map(function(p,i){
    return '<button class="gjp-tab'+(i===0?' on':'')+'" data-key="'+p.key+'">'+
      '<span class="t-ic">'+p.icon+'</span>'+p.name+
      '<span class="t-sub">'+countOf(p.key)+' 集</span></button>';
  }).join('');

  tabbar.querySelectorAll('.gjp-tab').forEach(function(btn){
    btn.addEventListener('click', function(){
      tabbar.querySelectorAll('.gjp-tab').forEach(function(b){b.classList.remove('on');});
      btn.classList.add('on');
      render(btn.getAttribute('data-key'));
    });
  });

  render('concept');
})();
