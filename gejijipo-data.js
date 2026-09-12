/* ============================================================
   各个击破 · 数据层
   - ILLU：免费插画生成器（纯 SVG，无需任何视频/图片素材）
   - GJP_EPISODES：20 集，分 概念篇 / 操作篇 / 案例篇
   每集 = 一个 1 分钟内的“插画视频”（自动播放的幻灯片）
   每页 slide = { illu, cap(字幕标题), say(解说词) }
   脚本面板使用 title + 每页 say + takeaway 拼接而成
   ============================================================ */

/* ---------- 配色 ---------- */
var C = {
  navy:'#1B3A5C', navy2:'#2C5282', gold:'#B8894A', gold2:'#D4A96A',
  soft:'#F7F0E4', ink:'#1F2933', ink2:'#52606D', ink3:'#7B8794',
  line:'#E1E5EA', line2:'#CBD2D9', white:'#fff',
  bg:'#FBF9F4', good:'#2E8B7A', bad:'#D9756B', hot:'#C0392B'
};

/* ---------- SVG 包装 ---------- */
function svg(inner){
  return '<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" class="illu-svg" preserveAspectRatio="xMidYMid meet">'+
    '<rect width="640" height="360" rx="18" fill="'+C.bg+'"/>'+ inner +'</svg>';
}
function txt(x,y,s,size,fill,weight,anchor){
  return '<text x="'+x+'" y="'+y+'" text-anchor="'+(anchor||'middle')+'" font-size="'+(size||16)+
    '" font-weight="'+(weight||400)+'" fill="'+(fill||C.ink)+'" font-family="-apple-system,Segoe UI,Microsoft YaHei,sans-serif">'+s+'</text>';
}

/* ---------- 插画库 ---------- */
var ILLU = {
  /* 标题卡 */
  title:function(t,sub){
    return svg(
      '<rect x="40" y="120" width="560" height="120" rx="16" fill="'+C.white+'" stroke="'+C.line+'"/>'+
      '<rect x="40" y="120" width="8" height="120" rx="4" fill="'+C.gold+'"/>'+
      txt(360,178,t,30,C.navy,800)+
      txt(360,212,sub||'',16,C.ink2,400)+
      txt(360,300,'各个击破 · 1 分钟讲清一个概念',13,C.gold,600)
    );
  },
  /* 大数字指标卡 */
  metric:function(v,l,s,c){
    return svg(
      '<rect x="190" y="78" width="260" height="200" rx="18" fill="'+C.white+'" stroke="'+C.line+'"/>'+
      '<rect x="190" y="78" width="260" height="10" rx="5" fill="'+(c||C.gold)+'"/>'+
      txt(320,196,v,64,(c||C.gold),800)+
      txt(320,238,l,19,C.navy,600)+
      txt(320,266,(s||''),13,C.ink3,400)
    );
  },
  /* 客房网格：filled 已售，total 总房，opts {over:超售数, lowBlocked:被关低价数} */
  rooms:function(filled,total,opts){
    opts=opts||{};
    var n=total, cols=Math.ceil(Math.sqrt(n)), cell=46, gap=10, w=cols*cell+(cols-1)*gap;
    var x0=(640-w)/2, y0=110, s='';
    for(var i=0;i<n;i++){
      var r=Math.floor(i/cols), c=i%cols;
      var x=x0+c*(cell+gap), y=y0+r*(cell+gap);
      var fill, stroke=C.line, lw=1;
      if(i<filled){ fill=C.gold2; } else if(opts.lowBlocked && i>=filled && i<filled+opts.lowBlocked){ fill='#E7ECF1'; stroke=C.line2; }
      else { fill=C.white; }
      s+='<rect x="'+x+'" y="'+y+'" width="'+cell+'" height="'+cell+'" rx="8" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+lw+'"/>';
      if(i<filled){ s+='<path d="M'+(x+14)+' '+(y+23)+' l7 8 l12 -16" stroke="'+C.white+'" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'; }
    }
    if(opts.over){ s+='<rect x="'+(x0+w+24)+'" y="'+y0+'" width="40" height="40" rx="8" fill="'+C.bad+'"/>'+txt(x0+w+44,y0+26,'+'+(opts.over),22,C.white,800); }
    if(opts.lowBlocked){ s+=txt(320,330,'灰格＝被关闭的低价房型',13,C.ink3,400); }
    return svg(s);
  },
  /* 柱状图：pairs=[[label,val0-100,color],...] */
  bars:function(pairs,cap){
    var n=pairs.length, bw=70, gap=(520-n*bw)/(n+1), x0=60, base=300, maxh=200, s='';
    for(var i=0;i<n;i++){
      var p=pairs[i], x=x0+i*(bw+gap), h=Math.round(p[1]/100*maxh);
      s+='<rect x="'+x+'" y="'+(base-h)+'" width="'+bw+'" height="'+h+'" rx="8" fill="'+(p[2]||C.navy2)+'"/>';
      s+=txt(x+bw/2,base-h-12,p[1]+'%',14,C.ink,600);
      s+=txt(x+bw/2,base+20,p[0],14,C.ink2,500);
    }
    s+='<line x1="'+x0+'" y1="'+base+'" x2="'+(640-x0)+'" y2="'+base+'" stroke="'+C.line2+'"/>';
    if(cap) s+=txt(320,46,cap,16,C.navy,700);
    return svg(s);
  },
  /* 日历：hot=高需求日数组(1-31)，event=事件日，min=最少住几晚日 */
  calendar:function(hot,opt){
    opt=opt||{};
    var cols=7, rows=5, cw=70, ch=46, gx=8, gy=8, x0=55, y0=70, s='';
    var wd=['一','二','三','四','五','六','日'];
    for(var c=0;c<7;c++){ s+=txt(x0+c*(cw+gx)+cw/2,y0-12,wd[c],13,C.ink3,500); }
    for(var i=0;i<35;i++){
      var r=Math.floor(i/7), col=i%7, d=i+1;
      var x=x0+col*(cw+gx), y=y0+r*(ch+gy);
      var fill=C.white, stroke=C.line, tcol=C.ink;
      if(hot&&hot.indexOf(d)>=0){ fill=C.soft; stroke=C.gold; tcol=C.hot; }
      if(opt.event&&opt.event.indexOf(d)>=0){ fill=C.gold2; tcol=C.white; }
      if(opt.min&&opt.min.indexOf(d)>=0){ fill='#E7ECF1'; }
      s+='<rect x="'+x+'" y="'+y+'" width="'+cw+'" height="'+ch+'" rx="8" fill="'+fill+'" stroke="'+stroke+'"/>';
      if(d<=31) s+=txt(x+cw/2,y+ch/2+5,d,15,tcol,600);
    }
    if(opt.cap) s+=txt(320,40,opt.cap,15,C.navy,700);
    return svg(s);
  },
  /* 漏斗 */
  funnel:function(stages,cap){
    var n=stages.length, topW=420, x0=110, y0=70, sh=42, gap=10, s='';
    for(var i=0;i<n;i++){
      var w=Math.round(topW*stages[i].v/100), x=x0+(topW-w)/2, y=y0+i*(sh+gap);
      s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+sh+'" rx="8" fill="'+(i%2?C.navy2:C.gold)+'"/>';
      s+=txt(x+12,y+sh/2+5,stages[i].l,15,C.white,600,'start');
      s+=txt(x+w-12,y+sh/2+5,stages[i].v+'%',14,C.white,700,'end');
    }
    if(cap) s+=txt(320,46,cap,15,C.navy,700);
    return svg(s);
  },
  /* 天平：left/right = {l, v} */
  balance:function(left,right,cap){
    return svg(
      '<line x1="320" y1="90" x2="320" y2="250" stroke="'+C.navy+'" stroke-width="4"/>'+
      '<line x1="150" y1="110" x2="490" y2="110" stroke="'+C.navy+'" stroke-width="4"/>'+
      '<path d="M320 250 l-14 -18 h28 z" fill="'+C.navy+'"/>'+
      '<circle cx="320" cy="92" r="8" fill="'+C.gold+'"/>'+
      '<line x1="150" y1="110" x2="150" y2="140" stroke="'+C.navy2+'" stroke-width="2"/>'+
      '<line x1="490" y1="110" x2="490" y2="140" stroke="'+C.navy2+'" stroke-width="2"/>'+
      '<rect x="96" y="140" width="108" height="86" rx="12" fill="'+C.soft+'" stroke="'+C.gold+'"/>'+
      txt(150,176,left.l,15,C.navy,600)+txt(150,206,left.v,20,C.hot,800)+
      '<rect x="436" y="140" width="108" height="86" rx="12" fill="'+C.white+'" stroke="'+C.line+'"/>'+
      txt(490,176,right.l,15,C.navy,600)+txt(490,206,right.v,20,C.bad,800)+
      (cap?txt(320,330,cap,14,C.ink2,500):'')
    );
  },
  /* 横向流程 */
  flow:function(steps,cap){
    var n=steps.length, bw=92, gap=26, w=n*bw+(n-1)*gap, x0=(640-w)/2, y=160, s='';
    for(var i=0;i<n;i++){
      var x=x0+i*(bw+gap);
      s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="64" rx="12" fill="'+(i%2?C.navy2:C.navy)+'"/>';
      s+=txt(x+bw/2,y+40,steps[i],15,C.white,600);
      if(i<n-1){ s+='<path d="M'+(x+bw+4)+' '+(y+32)+' l14 0 m-6 -6 l8 6 l-8 6" stroke="'+C.gold+'" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'; }
    }
    if(cap) s+=txt(320,120,cap,17,C.navy,700);
    return svg(s);
  },
  /* 双方案对比 */
  compare:function(a,b,cap){
    return svg(
      '<rect x="70" y="80" width="220" height="200" rx="16" fill="'+C.white+'" stroke="'+C.line+'"/>'+
      '<rect x="70" y="80" width="220" height="44" rx="16" fill="'+C.navy+'"/>'+
      '<rect x="70" y="104" width="220" height="20" fill="'+C.navy+'"/>'+
      txt(180,110,a.t,17,C.white,700)+
      txt(180,178,a.v,30,(a.c||C.gold),800)+
      txt(180,212,a.s,14,C.ink2,500)+
      (a.note?txt(180,250,a.note,13,C.ink3,400):'')+
      '<rect x="350" y="80" width="220" height="200" rx="16" fill="'+C.white+'" stroke="'+C.line+'"/>'+
      '<rect x="350" y="80" width="220" height="44" rx="16" fill="'+C.gold+'"/>'+
      '<rect x="350" y="104" width="220" height="20" fill="'+C.gold+'"/>'+
      txt(460,110,b.t,17,C.white,700)+
      txt(460,178,b.v,30,(b.c||C.navy2),800)+
      txt(460,212,b.s,14,C.ink2,500)+
      (b.note?txt(460,250,b.note,13,C.ink3,400):'')+
      (cap?txt(320,40,cap,16,C.navy,700):'')
    );
  },
  /* 大箭头 */
  arrow:function(dir,label,val,c){
    var up=(dir==='up');
    var col=c||(up?C.good:C.bad);
    var ax=320, ay1=up?250:110, ay2=up?110:250;
    return svg(
      '<line x1="'+ax+'" y1="'+ay1+'" x2="'+ax+'" y2="'+ay2+'" stroke="'+col+'" stroke-width="14" stroke-linecap="round"/>'+
      '<path d="M'+(ax-18)+' '+(up?138:222)+' l18 -26 l18 26" fill="'+col+'"/>'+
      txt(320,up?90:300,label,18,C.navy,700)+
      txt(320,up?300:90,val,30,col,800)
    );
  },
  /* 提示卡 / 金句 */
  note:function(icon,text,sub){
    return svg(
      '<rect x="60" y="96" width="520" height="168" rx="18" fill="'+C.soft+'" stroke="'+C.gold+'"/>'+
      '<circle cx="120" cy="180" r="34" fill="'+C.white+'" stroke="'+C.gold+'" stroke-width="2"/>'+
      txt(120,192,icon,30,C.gold,800)+
      '<foreignObject x="170" y="116" width="390" height="130"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:-apple-system,Segoe UI,Microsoft YaHei,sans-serif;font-size:18px;line-height:1.6;color:#1F2933;font-weight:600">'+text+'</div></foreignObject>'+
      (sub?txt(320,338,sub,13,C.ink3,400):'')
    );
  },
  /* 横向占比条（市场细分 / CompSet 份额） */
  segments:function(segs,cap){
    var n=segs.length, y=150, h=54, x=60, full=520, s='', cur=x;
    for(var i=0;i<n;i++){
      var w=Math.round(full*segs[i].v/100);
      s+='<rect x="'+cur+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+(segs[i].c||C.navy2)+'"/>';
      if(w>46) s+=txt(cur+w/2,y+h/2+6,segs[i].l,14,C.white,600);
      cur+=w;
    }
    var ly=y+h+26;
    cur=x;
    for(var j=0;j<n;j++){
      var w2=Math.round(full*segs[j].v/100);
      s+='<rect x="'+cur+'" y="'+ly+'" width="12" height="12" rx="3" fill="'+(segs[j].c||C.navy2)+'"/>';
      s+=txt(cur+18,ly+12,segs[j].l+' '+segs[j].v+'%',13,C.ink2,500,'start');
      cur+=w2;
    }
    if(cap) s+=txt(320,110,cap,16,C.navy,700);
    return svg(s);
  },
  /* 时钟（1 分钟主题） */
  clock:function(text){
    return svg(
      '<circle cx="320" cy="180" r="96" fill="'+C.white+'" stroke="'+C.gold+'" stroke-width="6"/>'+
      '<circle cx="320" cy="180" r="6" fill="'+C.navy+'"/>'+
      '<line x1="320" y1="180" x2="320" y2="116" stroke="'+C.navy+'" stroke-width="5" stroke-linecap="round"/>'+
      '<line x1="320" y1="180" x2="368" y2="180" stroke="'+C.gold+'" stroke-width="5" stroke-linecap="round"/>'+
      txt(320,310,text||'1 分钟，讲清一个概念',16,C.navy,700)
    );
  }
};

/* ============================================================
   剧集数据
   ============================================================ */
var GJP_EPISODES = [
  /* ====================== 概念篇 ====================== */
  {
    id:'c1', part:'concept', no:1, title:'什么是收益管理', en:'Revenue Management',
    tag:'核心概念', dur:7000,
    takeaway:'收益管理＝在有限库存下，把产品卖给对的人，换最优总收入。不是单纯卖贵，也不是单纯卖满。',
    slides:[
      {illu:ILLU.title('收益管理','在正确的时间，把正确的房，卖给正确的人'),cap:'一句话定义',say:'收益管理，就是在正确的时间，把正确的房间，卖给正确的人，换来最优的总收入。'},
      {illu:ILLU.rooms(0,10),cap:'空房＝零收入',say:'没卖出去的房间，一过夜里十二点价值就归零。库存稀缺，是收益管理的起点。'},
      {illu:ILLU.rooms(10,10),cap:'满房≠赚最多',say:'但满房也不等于赚得最多——如果全是低价卖掉的，总收入可能还不如少卖几间高价。'},
      {illu:ILLU.compare({t:'只求满房',v:'¥3.0万',s:'100间×¥300',note:'量高、价低'},{t:'量价平衡',v:'¥4.0万',s:'80间×¥500',note:'量价更优',c:C.gold}),cap:'比一比就懂',say:'同样是 100 间房，满房低价赚 3 万，控量保价反而赚 4 万。收益管理要的是总收入最大。'},
      {illu:ILLU.flow(['数据','预测','定价','库存','复盘'],'闭环五步'),cap:'一套闭环',say:'它是一套闭环：看数据、做预测、定价格、管库存、再复盘，循环优化。'},
      {illu:ILLU.note('✦','收益管理＝在有限库存下最大化总收入，不是单纯卖贵或卖满。','记住这句话就够了'),cap:'核心金句',say:'所以请记住：收益管理是在有限库存下最大化总收入，不是单纯卖贵，也不是单纯卖满。'}
    ]
  },
  {
    id:'c2', part:'concept', no:2, title:'入住率 Occupancy', en:'OCC',
    tag:'核心指标', dur:7000,
    takeaway:'入住率＝已售房÷可售房。它看“卖了多少”，但不看“卖了多少钱”，必须配合房价一起看。',
    slides:[
      {illu:ILLU.title('入住率 Occupancy','已售房 ÷ 可售房'),cap:'定义',say:'入住率，就是已售房间数除以可售房间数，回答“房卖出去多少”。'},
      {illu:ILLU.metric('80%','入住率','100 间卖了 80 间'),cap:'算给你看',say:'比如 100 间房卖了 80 间，入住率就是 80%。'},
      {illu:ILLU.rooms(8,10),cap:'八成已售',say:'图上金色是已售、白色是空置，一眼就能看出卖了几成。'},
      {illu:ILLU.bars([['周一',25,C.navy2],['周三',55,C.navy2],['周五',95,C.gold],['周日',70,C.navy2]],'一周入住率起伏'),cap:'天天不一样',say:'入住率每天变：周一九成空，周五几乎满。这正是收益管理要应对的需求波动。'},
      {illu:ILLU.note('!','高入住率≠高收益，还要看平均房价。','两个指标要一起看'),cap:'常见误区',say:'但注意：高入住率不等于高收益，还得看平均房价。两个指标必须一起看。'},
      {illu:ILLU.note('✓','入住率＝已售房 ÷ 可售房，只看“量”不看“价”。','配合 ADR、RevPAR 才有意义'),cap:'一句话记住',say:'一句话：入住率只看“卖了多少间”，不看“卖了多少钱”，要配合房价指标才有意义。'}
    ]
  },
  {
    id:'c3', part:'concept', no:3, title:'平均房价 ADR', en:'Average Daily Rate',
    tag:'核心指标', dur:7000,
    takeaway:'ADR＝客房总收入÷已售房。它看“每间卖多少钱”，提价前先看需求弹性，别把客人吓跑。',
    slides:[
      {illu:ILLU.title('平均房价 ADR','客房总收入 ÷ 已售房'),cap:'定义',say:'平均房价 ADR，是客房总收入除以已售房间数，回答“每间房平均卖多少钱”。'},
      {illu:ILLU.metric('¥520','平均房价','客房收入 ÷ 已售房'),cap:'算给你看',say:'客房收入 4 万、卖了 80 间，ADR 就是 500 元。'},
      {illu:ILLU.compare({t:'低价走量',v:'¥300',s:'100间全售',note:'入住率高'},{t:'高价精选',v:'¥500',s:'80间售出',note:'单价更高',c:C.gold}),cap:'价量权衡',say:'卖 100 间单价 300，和卖 80 间单价 500，总收入可能差不多甚至更高——这就是定价空间。'},
      {illu:ILLU.note('!','ADR 只算房费，不含餐饮、会议等其他收入，也不含税费。','别算错分母'),cap:'范围提醒',say:'记住 ADR 只算房费，不含餐饮、会议等其他收入，也不含税费。'},
      {illu:ILLU.arrow('up','提价','(要看需求弹性)',C.gold),cap:'提价有前提',say:'想提高 ADR？可以，但得看需求弹性——涨太多会把客人吓跑，反而少赚。'},
      {illu:ILLU.note('✓','ADR＝客房总收入 ÷ 已售房，看“每间卖多少钱”。','配合入住率才完整'),cap:'一句话记住',say:'一句话：ADR 看每间房卖多少钱，必须和入住率搭配，才看得清真实表现。'}
    ]
  },
  {
    id:'c4', part:'concept', no:4, title:'RevPAR 每可售房收入', en:'Revenue Per Available Room',
    tag:'终极标尺', dur:7000,
    takeaway:'RevPAR＝客房收入÷可售房＝ADR×入住率。它同时含“量”和“价”，是跨酒店可比的终极标尺。',
    slides:[
      {illu:ILLU.title('RevPAR','每可售房收入 · 量价合一'),cap:'定义',say:'RevPAR 是每可售房收入，把“卖了多少间”和“卖多少钱”合成一个数。'},
      {illu:ILLU.metric('¥416','RevPAR','= ADR × 入住率'),cap:'公式',say:'它等于 ADR 乘以入住率，也等于客房收入除以可售房。两个算法结果一样。'},
      {illu:ILLU.bars([['高入住低价',360,C.navy2],['中入住高价',416,C.gold],['低入住超高价',380,C.navy2]],'谁更赚？看 RevPAR'),cap:'量价平衡最香',say:'光看入住率或光看房价都会误判；RevPAR 一比就知道：中入住高价的组合最赚。'},
      {illu:ILLU.note('★','RevPAR 同时含“量”和“价”，是跨酒店、跨时段可比的终极标尺。','做对标就用它'),cap:'为什么重要',say:'因为它同时含量和价，是跨酒店、跨时段都能公平比较的终极标尺。'},
      {illu:ILLU.note('✓','RevPAR＝客房收入 ÷ 可售房＝ADR × 入住率。','每天盯这个数'),cap:'一句话记住',say:'一句话：RevPAR＝收入÷可售房＝ADR×入住率，每天盯它，最不会偏。'}
    ]
  },
  {
    id:'c5', part:'concept', no:5, title:'需求预测', en:'Demand Forecasting',
    tag:'决策前提', dur:7000,
    takeaway:'先预测，再定价。把历史、节假日、展会叠加起来估需求，并每周滚动修正，允许误差但别偏差太大。',
    slides:[
      {illu:ILLU.title('需求预测','先看清未来，再决定怎么卖'),cap:'为什么先做它',say:'收益管理的第一步不是定价，而是预测——先看清未来需求，才知道该怎么卖。'},
      {illu:ILLU.calendar([5,6,7,12,13,14,20,21],{cap:'红＝高需求日'}),cap:'标出高峰',say:'把节假日、展会、赛事这些高需求日先在日历上标出来。'},
      {illu:ILLU.flow(['历史','+事件','=预测'],'预测怎么来'),cap:'三样叠一起',say:'预测=历史规律＋即将发生的事件。历史告诉我们常态，事件告诉我们异常。'},
      {illu:ILLU.bars([['预测',82,C.gold],['实际',78,C.navy2]],'预测 vs 实际'),cap:'允许误差',say:'预测允许有误差，但要用实际结果不断校准，越做越准。'},
      {illu:ILLU.note('✓','先预测，再定价；每周滚动修正，允许误差别偏差太大。','预测是定价的地基'),cap:'一句话记住',say:'一句话：先预测再定价，每周滚动修正，预测准了，后面的动作才稳。'}
    ]
  },
  {
    id:'c6', part:'concept', no:6, title:'市场细分', en:'Market Segmentation',
    tag:'差别定价基础', dur:7000,
    takeaway:'不同客人价格敏感度不同。把客源分成散客、会员、协议、团队、OTA 等，才能差别定价又不伤高端。',
    slides:[
      {illu:ILLU.title('市场细分','把客人分成不同“价格敏感度”的群'),cap:'为什么分',say:'不同客人对价格敏感度不同：有人图便宜，有人看重服务。分群才能差别定价。'},
      {illu:ILLU.segments([{l:'散客',v:30,c:C.gold},{l:'会员',v:22,c:C.navy},{l:'协议',v:20,c:C.navy2},{l:'团队',v:18,c:'#8AA0B6'},{l:'OTA',v:10,c:C.gold2}],'客源结构示例'),cap:'五大常见细分',say:'常见细分有：散客、会员、协议客、团队、OTA。每群占比和价格承受力都不同。'},
      {illu:ILLU.compare({t:'不细分',v:'统一价',s:'高端客被低价拉低',note:'浪费利润'},{t:'细分',v:'分层价',s:'各取所需',note:'利润更高',c:C.gold}),cap:'细分的好处',say:'不细分只能统一定价，要么赶走低端、要么便宜了高端；细分让各群各取所需，利润更高。'},
      {illu:ILLU.note('!','细分的前提：各渠道价格不串货、不冲突。','否则细分失效'),cap:'前提条件',say:'但细分有个前提：各渠道价格不能互相串、互相冲突，否则细分就失效了。'},
      {illu:ILLU.note('✓','把客源分群，才能差别定价又不伤高端客。','细分是定价的基础'),cap:'一句话记住',say:'一句话：市场细分是差别定价的基础，分好群，才能既填房又保价。'}
    ]
  },
  {
    id:'c7', part:'concept', no:7, title:'价格弹性', en:'Price Elasticity',
    tag:'定价心理学', dur:7000,
    takeaway:'价格弹性＝价变一点，需求变多少。旺季需求“硬”，可涨；淡季需求“软”，涨价反而掉量，要慎涨。',
    slides:[
      {illu:ILLU.title('价格弹性','价格动一点，需求动多少？'),cap:'定义',say:'价格弹性，就是价格动一点，需求量跟着动多少。它是定价的核心直觉。'},
      {illu:ILLU.arrow('up','涨价 10%','(需求掉 25%)',C.bad),cap:'弹性大',say:'如果一涨价，需求大幅下降，叫“弹性大”——淡季、可替代产品常这样。'},
      {illu:ILLU.arrow('up','涨价 10%','(需求只掉 3%)',C.good),cap:'弹性小',say:'如果涨价需求几乎不动，叫“弹性小”——旺季、刚需、独家资源常这样，可以大胆涨。'},
      {illu:ILLU.balance({l:'旺季',v:'弹性小↑可涨'},{l:'淡季',v:'弹性大↑慎涨'},'时段不同，策略不同'),cap:'分时段用',say:'所以旺季需求硬，可涨价；淡季需求软，涨价反而掉量，要慎涨。'},
      {illu:ILLU.note('✓','价变→需求变多少＝弹性。旺季可涨，淡季慎涨。','看弹性下菜单价'),cap:'一句话记住',say:'一句话：看弹性下菜单价——旺季敢涨，淡季别硬涨。'}
    ]
  },
  {
    id:'c8', part:'concept', no:8, title:'竞品对标组 CompSet', en:'Competitive Set',
    tag:'对标标尺', dur:7000,
    takeaway:'选 3–5 家最可比的酒店组成 CompSet，用 STR 指数对标：指数>100 说明你领先，<100 说明落后。',
    slides:[
      {illu:ILLU.title('竞品对标组 CompSet','选 3–5 家最像你的酒店'),cap:'是什么',say:'CompSet 是你挑出的 3 到 5 家最可比的酒店，用来做公平对标。'},
      {illu:ILLU.compare({t:'我院',v:'ADR ¥520',s:'Occ 82%',note:'自家'},{t:'竞品均值',v:'ADR ¥480',s:'Occ 78%',note:'对标组',c:C.gold}),cap:'两两比',say:'把自己的 ADR、入住率和对标组均值一比，立刻知道贵了还是便宜了。'},
      {illu:ILLU.bars([['我院',108,C.gold],['竞品A',100,C.navy2],['竞品B',96,C.navy2],['竞品C',92,C.navy2]],'STR 指数（100＝持平）'),cap:'看指数',say:'用 STR 指数更直观：以对标组均值为 100，我院 108 就是领先 8%。'},
      {illu:ILLU.note('★','指数 >100 领先，<100 落后。对标让你知道自己在市场里的位置。','每月看一次'),cap:'怎么读',say:'指数大于 100 说明你领先，小于 100 说明落后。对标让你看清自己的市场位置。'},
      {illu:ILLU.note('✓','选 3–5 家可比酒店组 CompSet，用 STR 指数对标。','>100 领先'),cap:'一句话记住',say:'一句话：建好 CompSet，盯 STR 指数，大于 100 你就跑赢了对标组。'}
    ]
  },

  /* ---------- 概念篇补充：重要指标与易漏概念 ---------- */
  {
    id:'c9', part:'concept', no:9, title:'预订进度 Pick-up', en:'On-the-books',
    tag:'过程指标', dur:7000,
    takeaway:'预订进度＝距入住日还有 N 天时，已经锁定的房量及收入，与历史同期比领先还是落后。它是每天判断“该放量还是收紧”的仪表盘。',
    slides:[
      {illu:ILLU.title('预订进度 Pick-up','距入住 N 天，已锁定的房量'),cap:'是什么',say:'预订进度，就是距离客人入住还有 N 天时，系统里已经锁定的房量和收入。'},
      {illu:ILLU.metric('62%','当前进度','提前 30 天已订出',C.gold),cap:'算给你看',say:'比如提前 30 天已经订出 62%，这就是当前进度。'},
      {illu:ILLU.bars([['历史同期',58,C.navy2],['今年',72,C.gold]],'进度领先还是落后'),cap:'对比同期',say:'和历史同期一比：今年 72%、去年 58%，说明进度领先，可以收紧低价了。'},
      {illu:ILLU.flow(['历史基线','+在手预订','=进度'],'进度怎么来'),cap:'三步得出',say:'历史同期是基线，加上现在的在手预订，就得出进度，用来判断趋势。'},
      {illu:ILLU.note('★','进度领先→收紧低价/关房；进度落后→加快促销/放开低价。','每天看一眼'),cap:'怎么用',say:'进度领先就收紧低价，落后就加快促销——它是每天放量和收紧的仪表盘。'},
      {illu:ILLU.note('✓','预订进度＝距入住 N 天已锁定房量 ÷ 可售房，对比历史同期。','操作篇 o2/o3 会用到它'),cap:'一句话记住',say:'一句话：预订进度是和历史的赛跑，领先就收、落后就放。'}
    ]
  },
  {
    id:'c10', part:'concept', no:10, title:'市场渗透指数 MPI', en:'MPI',
    tag:'对标指标', dur:7000,
    takeaway:'MPI＝本店入住率 ÷ 竞组平均入住率。>100 表示你抢到了比对手更多的份额；<100 表示份额在流失，要靠量抢回来。',
    slides:[
      {illu:ILLU.title('市场渗透指数 MPI','本店入住率 ÷ 竞组平均入住率'),cap:'定义',say:'MPI 是市场渗透指数，看你在本区域抢到了多少份额。'},
      {illu:ILLU.metric('108','MPI','>100 抢到更多份额',C.gold),cap:'公式',say:'它等于本店入住率除以竞组平均入住率，大于 100 就说明你领先。'},
      {illu:ILLU.compare({t:'我院',v:'OCC 82%',s:'竞组均值 76%',note:'自己'},{t:'竞组均值',v:'OCC 76%',s:'对标基准',note:'基准',c:C.gold}),cap:'算一算',say:'我院入住率 82%、竞组均值 76%，82÷76≈108，份额领先 8%。'},
      {illu:ILLU.bars([['我院',108,C.gold],['竞A',100,C.navy2],['竞B',96,C.navy2],['竞C',92,C.navy2]],'STR 指数（100＝持平）'),cap:'看指数',say:'用指数更直观：我院 108，跑赢了整个对标组。'},
      {illu:ILLU.note('!','MPI<100 说明份额在掉，要靠促销/放量把量抢回来。','落后要抢量'),cap:'怎么读',say:'MPI 小于 100 说明份额在流失，得靠量抢回来，别只盯着价格。'},
      {illu:ILLU.note('✓','MPI＝本店入住率 ÷ 竞组平均入住率，看市场份额。','和 ARI/RGI 一起看'),cap:'一句话记住',say:'一句话：MPI 看份额，大于 100 你就跑赢了对手的客源。'}
    ]
  },
  {
    id:'c11', part:'concept', no:11, title:'价格指数 ARI', en:'ARI',
    tag:'对标指标', dur:7000,
    takeaway:'ARI＝本店 ADR ÷ 竞组平均 ADR。>100 表示卖得比对手贵；但 ARI 高而 MPI 低，说明贵到把客人吓跑了，要警惕。',
    slides:[
      {illu:ILLU.title('价格指数 ARI','本店 ADR ÷ 竞组平均 ADR'),cap:'定义',say:'ARI 是价格指数，看你的房价在市场中处于什么位置。'},
      {illu:ILLU.metric('112','ARI','>100 卖得比对手贵',C.gold),cap:'公式',say:'它等于本店平均房价除以竞组平均房价，大于 100 就说明更贵。'},
      {illu:ILLU.compare({t:'我院',v:'ADR ¥560',s:'竞组均值 ¥500',note:'自己'},{t:'竞组均值',v:'ADR ¥500',s:'对标基准',note:'基准',c:C.gold}),cap:'算一算',say:'我院 ADR 560、竞组 500，560÷500≈112，价格领先 12%。'},
      {illu:ILLU.balance({l:'ARI高+MPI高',v:'量价双优'},{l:'ARI高+MPI低',v:'吓跑客人'},'两个一起看才准'),cap:'关键组合',say:'ARI 高但 MPI 低，说明贵到把客人赶跑了——这是危险信号。'},
      {illu:ILLU.note('!','ARI 要和 MPI 配对看：贵且份额稳才健康，贵却掉量要降价。','别单看 ARI'),cap:'常见误区',say:'ARI 不能单看：贵但份额掉，反而该降价抢量。'},
      {illu:ILLU.note('✓','ARI＝本店 ADR ÷ 竞组平均 ADR，看价格位置。','配合 MPI 才有意义'),cap:'一句话记住',say:'一句话：ARI 看价格高低，必须和 MPI 一起看才不误判。'}
    ]
  },
  {
    id:'c12', part:'concept', no:12, title:'综合收益指数 RGI', en:'RGI',
    tag:'终极标尺', dur:7000,
    takeaway:'RGI＝本店 RevPAR ÷ 竞组平均 RevPAR。它把量和价合在一起，是比 MPI、ARI 更终极的竞争力标尺。>100 全面领先。',
    slides:[
      {illu:ILLU.title('综合收益指数 RGI','本店 RevPAR ÷ 竞组平均 RevPAR'),cap:'定义',say:'RGI 是综合收益指数，把量和价合成一个最终标尺。'},
      {illu:ILLU.metric('115','RGI','量价合一的终局',C.gold),cap:'公式',say:'它等于本店 RevPAR 除以竞组平均 RevPAR，大于 100 就是全面领先。'},
      {illu:ILLU.bars([['我院',115,C.gold],['竞组',100,C.navy2]],'RGI（100＝持平）'),cap:'看指数',say:'我院 RGI 115，说明在量价综合上跑赢了整个对标组。'},
      {illu:ILLU.note('★','RGI＝MPI × ARI 的实质：它已经包含了份额和价格两层信息。','最该盯的数'),cap:'为什么最牛',say:'RGI 本质是 MPI 和 ARI 的综合，所以最该每天盯。'},
      {illu:ILLU.note('✓','RGI＝本店 RevPAR ÷ 竞组平均 RevPAR，量价合一的最终标尺。','>100 全面领先'),cap:'一句话记住',say:'一句话：RGI 是终极标尺，大于 100 说明你既抢到量又卖好价。'}
    ]
  },
  {
    id:'c13', part:'concept', no:13, title:'TrevPAR 每可售房总收入', en:'TrevPAR',
    tag:'产出指标', dur:7000,
    takeaway:'TrevPAR＝全部收入（房费+餐饮+会议+其他）÷可售房。比 RevPAR 多出非客房收入，衡量单间房的综合产出。',
    slides:[
      {illu:ILLU.title('TrevPAR','每可售房总收入（含全部收入）'),cap:'定义',say:'TrevPAR 是每可售房总收入，把房费以外的收入也算进来。'},
      {illu:ILLU.compare({t:'RevPAR',v:'¥416',s:'只算房费',note:'单一'},{t:'TrevPAR',v:'¥620',s:'房费+餐饮+会议',note:'更全面',c:C.gold}),cap:'差在哪',say:'RevPAR 只算房费 416，TrevPAR 加上餐饮会议后到 620，单房产出更高。'},
      {illu:ILLU.metric('¥620','TrevPAR','比 RevPAR 多出 204',C.gold),cap:'算给你看',say:'多出的 204 来自餐饮和会议——这些才是综合产出。'},
      {illu:ILLU.note('★','餐饮/会议强的酒店，TrevPAR 会明显拉开和 RevPAR 的差距。','看综合产出用它'),cap:'为什么重要',say:'餐饮会议强的店，TrevPAR 才能体现真实单房产出，光看 RevPAR 会低估。'},
      {illu:ILLU.note('✓','TrevPAR＝总收入 ÷ 可售房，衡量单间房的综合产出。','酒店业的“单产”'),cap:'一句话记住',say:'一句话：TrevPAR 看单房总产出，不止房费，餐饮会议都算。'}
    ]
  },
  {
    id:'c14', part:'concept', no:14, title:'GOPPAR 每可售房经营毛利', en:'GOPPAR',
    tag:'盈利指标', dur:7000,
    takeaway:'GOPPAR＝经营毛利（收入−运营成本）÷可售房。它扣掉人工、能耗、物料，才是酒店真正赚到的钱。房价高但成本高，GOPPAR 可能反低。',
    slides:[
      {illu:ILLU.title('GOPPAR','每可售房经营毛利（扣成本）'),cap:'定义',say:'GOPPAR 是每可售房经营毛利，把成本扣掉后看真赚多少。'},
      {illu:ILLU.compare({t:'RevPAR',v:'¥416',s:'毛收入',note:'未扣成本'},{t:'GOPPAR',v:'¥310',s:'扣完成本',note:'真赚',c:C.gold}),cap:'差在哪',say:'RevPAR 416 是毛收入，扣掉人工能耗物料后 GOPPAR 只剩 310，这才是利润。'},
      {illu:ILLU.metric('¥310','GOPPAR','扣完成本后的真赚',C.gold),cap:'算给你看',say:'房价高但食材和人工也高，GOPPAR 反而可能比低价店低。'},
      {illu:ILLU.note('!','别只看 RevPAR：成本高会把利润吃掉，GOPPAR 才反映经营效率。','控成本也重要'),cap:'常见误区',say:'只看 RevPAR 会忽略成本，GOPPAR 才反映真实盈利效率。'},
      {illu:ILLU.note('✓','GOPPAR＝经营毛利 ÷ 可售房，看真正盈利。','收益管理也要管成本'),cap:'一句话记住',say:'一句话：GOPPAR 扣完成本才是真赚，收益管理不只管收入也管效率。'}
    ]
  },
  {
    id:'c15', part:'concept', no:15, title:'NRevPAR 净可售房收入', en:'NRevPAR',
    tag:'净贡献指标', dur:7000,
    takeaway:'NRevPAR＝净房收入（扣掉佣金、渠道费）÷可售房。它揭示不同渠道的真实贡献：OTA 抽成高，净收入就少。',
    slides:[
      {illu:ILLU.title('NRevPAR','每可售房净收入（扣渠道费）'),cap:'定义',say:'NRevPAR 是净可售房收入，把佣金和渠道费扣掉后看净贡献。'},
      {illu:ILLU.compare({t:'RevPAR',v:'¥460',s:'含 OTA 佣金',note:'毛'},{t:'NRevPAR',v:'¥390',s:'扣 15% 佣金',note:'净',c:C.gold}),cap:'差在哪',say:'RevPAR 460 里含 OTA 15% 佣金，扣掉后净收入只剩 390。'},
      {illu:ILLU.metric('¥390','NRevPAR','扣完佣金后的净',C.gold),cap:'算给你看',say:'渠道越贵，净收入越少——NRevPAR 帮你看清哪个渠道真划算。'},
      {illu:ILLU.note('!','直订渠道 NRevPAR 远高于 OTA：少抽成=多净收。','引导直订'),cap:'怎么用',say:'直订不抽成，NRevPAR 更高，所以收益管理都鼓励客人官网直订。'},
      {illu:ILLU.note('✓','NRevPAR＝净收入 ÷ 可售房，扣掉佣金看渠道真实贡献。','算净账用它'),cap:'一句话记住',say:'一句话：NRevPAR 扣掉佣金看净账，帮你判断哪个渠道真值得做。'}
    ]
  },
  {
    id:'c16', part:'concept', no:16, title:'四大指标怎么选', en:'Which Metric',
    tag:'指标对比', dur:8000,
    takeaway:'RevPAR 看房的量价；TrevPAR 看单房总产出；GOPPAR 看扣成本后的盈利；NRevPAR 看扣渠道费后的净贡献。四个层层递进，不是越高越好，看你要管哪一层。',
    slides:[
      {illu:ILLU.title('四大指标怎么选','RevPAR / TrevPAR / GOPPAR / NRevPAR'),cap:'总览',say:'四个指标常混：其实它们管的是不同的层，别只盯一个。'},
      {illu:ILLU.compare({t:'RevPAR',v:'看房量价',s:'最基础',note:'房费层'},{t:'TrevPAR',v:'看全收入',s:'+餐饮会议',note:'单产层',c:C.gold}),cap:'第一对',say:'RevPAR 只看房费，TrevPAR 把餐饮会议也算进单房产出。'},
      {illu:ILLU.compare({t:'GOPPAR',v:'看盈利',s:'扣成本',note:'效率层'},{t:'NRevPAR',v:'看净贡献',s:'扣渠道费',note:'净账层',c:C.gold}),cap:'第二对',say:'GOPPAR 扣成本看盈利，NRevPAR 扣渠道费看净贡献。'},
      {illu:ILLU.flow(['房费→RevPAR','总产出→TrevPAR','盈利→GOPPAR','净贡献→NRevPAR'],'层层递进'),cap:'怎么选',say:'要看哪层就选哪个：管房效用 RevPAR，管综合用 TrevPAR，管效率用 GOPPAR，管净账用 NRevPAR。'},
      {illu:ILLU.note('✓','四指标层层递进：房费→全收入→毛利→净贡献，按管理目标选。','不是越高越好'),cap:'一句话记住',say:'一句话：四个指标层层递进，看你要管哪一层就选哪个，不是越高越好。'}
    ]
  },
  {
    id:'c17', part:'concept', no:17, title:'置换分析 Displacement', en:'Displacement',
    tag:'决策方法', dur:7000,
    takeaway:'置换分析＝比较“同一间房量给不同客源，谁的净收益更高”。把房留给低价长住团队，还是高价散客？要算清再决定，避免凭感觉。',
    slides:[
      {illu:ILLU.title('置换分析','这间房给低价团队，还是高价散客？'),cap:'是什么',say:'置换分析，是比较同一批房量给不同客源，谁更赚的决策方法。'},
      {illu:ILLU.balance({l:'低价团队',v:'满但薄'},{l:'高价散客',v:'少但厚'},'哪边净收益高？'),cap:'两难',say:'低价团队能把房填满但利润薄，高价散客房少却更厚——到底给谁？'},
      {illu:ILLU.flow(['算团队贡献','算散客期望','比净收益'],'三步决策'),cap:'怎么做',say:'做法：算团队带来的净贡献，再算散客的期望净收益，谁高给谁。'},
      {illu:ILLU.note('!','凭感觉留房常错：用置换分析把“机会成本”算出来。','别拍脑袋'),cap:'为什么重要',say:'凭感觉常把房留给低价，置换分析把机会成本算清，决策才稳。'},
      {illu:ILLU.note('✓','置换分析＝比较同一房量给不同客源的净收益，择优分配。','操作篇 o3/o5 会用到'),cap:'一句话记住',say:'一句话：置换分析算清机会成本，把房留给净收益最高的客源。'}
    ]
  },
  {
    id:'c18', part:'concept', no:18, title:'No-show 与取消率', en:'No-show / Cancellation',
    tag:'风险指标', dur:7000,
    takeaway:'No-show 率＝订了不来；取消率＝订了又取消。两者是超额预订和房量决策的地基：历史 No-show 率直接决定能超售几间。',
    slides:[
      {illu:ILLU.title('No-show 与取消率','订了不来 / 订了又取消'),cap:'两个率',say:'No-show 是订了不来入住，取消率是订了又取消，两个都要盯。'},
      {illu:ILLU.metric('8%','No-show 率','超售的依据',C.gold),cap:'算给你看',say:'比如历史 No-show 率 8%，这就是你能超售的安全上限参考。'},
      {illu:ILLU.bars([['No-show',8,C.bad],['取消',12,C.navy2]],'两类流失比例'),cap:'一起看',say:'No-show 8%、取消 12%，合起来是房量决策的底座。'},
      {illu:ILLU.note('★','历史 No-show+取消率＝超额预订上限（操作篇 o3 会算）。','地基指标'),cap:'怎么用',say:'这两个率直接决定能超售几间、该留多少弹性房，是地基。'},
      {illu:ILLU.note('✓','No-show率+取消率＝超售与房量决策的地基。','先算这两个率'),cap:'一句话记住',say:'一句话：No-show 和取消率是超售的地基，先算清它们再动房量。'}
    ]
  },
  {
    id:'c19', part:'concept', no:19, title:'价格一致性 Rate Parity', en:'Rate Parity',
    tag:'渠道纪律', dur:7000,
    takeaway:'价格一致性＝同一房型在各渠道挂牌价（含含税总价）必须一致。不一致会让客人比价后流失、还伤品牌，是渠道管理的红线。',
    slides:[
      {illu:ILLU.title('价格一致性','各渠道同房型，价格必须一致'),cap:'是什么',say:'价格一致性，就是同一房型在各渠道的挂牌价必须一致。'},
      {illu:ILLU.compare({t:'一致',v:'信任稳',s:'客人不比价',note:'健康'},{t:'不一致',v:'流失',s:'比价后跑',note:'危险',c:C.gold}),cap:'两后果',say:'价格一致客人信任稳；不一致客人比价后跑掉，还觉得你乱定价。'},
      {illu:ILLU.note('!','不一致→客人比价流失、品牌受损、还触发渠道罚则。','渠道红线'),cap:'红线',say:'价格不一致后果很严重：流失、伤品牌，还可能被渠道处罚。'},
      {illu:ILLU.note('★','含含税总价都要一致；直订价可低但不能破坏对外挂牌价。','含税后比价'),cap:'细节',say:'注意是含税总价一致；官网直订可以有会员权益，但对外挂牌价不能乱。'},
      {illu:ILLU.note('✓','各渠道同房型挂牌价（含税）一致，是渠道管理的红线。','见法典表 H'),cap:'一句话记住',say:'一句话：价格一致性是红线，各渠道同房型含税价必须一致。'}
    ]
  },
  {
    id:'c20', part:'concept', no:20, title:'平均停留时长 LOS', en:'Length of Stay',
    tag:'需求结构', dur:7000,
    takeaway:'LOS＝平均住几晚。长住少翻房成本、收益稳；短住易把高峰拆成碎片低价。它和 MinLOS（操作篇 o6）配合，保护高峰收益。',
    slides:[
      {illu:ILLU.title('平均停留时长 LOS','客人平均住几晚'),cap:'是什么',say:'LOS 是平均停留时长，看客人平均住几晚。'},
      {illu:ILLU.metric('2.3 晚','平均 LOS','长短影响收益节奏',C.gold),cap:'算给你看',say:'比如平均住 2.3 晚，长短混搭决定了翻房成本和收益节奏。'},
      {illu:ILLU.note('★','长住→少翻房、稳收益；短住→易把高峰拆成碎片低价。','结构影响收益'),cap:'为什么重要',say:'长住省翻房成本、收益稳；短住太多会把周末高峰拆碎，贱卖房量。'},
      {illu:ILLU.note('✓','LOS＝总住间夜 ÷ 总订单。配 MinLOS 保护高峰收益（操作篇 o6）。','和连住配合'),cap:'一句话记住',say:'一句话：LOS 看住几晚，配最小连住天数，才能护住高峰收益。'}
    ]
  },

  /* ====================== 操作篇 ====================== */
  {
    id:'o1', part:'op', no:1, title:'搭建价格体系', en:'Rate Structure',
    tag:'动手做', dur:7000,
    takeaway:'从基础价出发，叠淡旺季系数、细分价、渠道价，形成一张“价盘”。价不分明会导致渠道冲突、利润漏损。',
    slides:[
      {illu:ILLU.title('搭建价格体系','把价格从“一个数”变成“一张盘”'),cap:'目标',say:'价格体系，是把单一房价变成一张有层次的价格盘，而不是随口报一个数。'},
      {illu:ILLU.flow(['基础价','淡旺季系数','细分价','渠道价'],'四层叠加'),cap:'四步走',say:'做法：先定基础价，再叠淡旺季系数，然后分细分价，最后分渠道价。'},
      {illu:ILLU.metric('¥480','基础价','再往上叠系数',C.navy),cap:'起点',say:'比如基础价 480，旺季系数 1.3 就是 624，会员再打折，渠道再区分。'},
      {illu:ILLU.note('!','价不分明＝渠道互相串价、利润漏损。','价盘要清爽'),cap:'为什么重要',say:'价不分明，各渠道就会互相串价、打价格战，利润从缝里漏掉。'},
      {illu:ILLU.note('✓','基础价→淡旺季→细分→渠道，叠成一张价盘。','先有盘，再调价'),cap:'一句话记住',say:'一句话：先把价盘搭清楚，后面的动态调价才有根基。'}
    ]
  },
  {
    id:'o2', part:'op', no:2, title:'做一份入住率预测', en:'Build a Forecast',
    tag:'动手做', dur:7000,
    takeaway:'取历史基数，叠加节假日/展会等事件，得出未来入住率预测；每周滚动更新，用实际结果校准。',
    slides:[
      {illu:ILLU.title('做一份入住率预测','未来 30 天，每天卖几成？'),cap:'要算什么',say:'入住率预测，就是估出未来一段时间、每一天大概能卖几成房。'},
      {illu:ILLU.calendar([6,7,13,14,20,21],{cap:'先标事件日'}),cap:'第一步标事件',say:'第一步：把节假日、展会、赛事标在日历上，它们是需求的异常点。'},
      {illu:ILLU.flow(['历史基数','叠加事件','得出预测'],'三步出数'),cap:'三步出数',say:'第二步：拿历史同期的基数，叠加这些事件的影响，第三步就得出预测。'},
      {illu:ILLU.bars([['上周',72,C.navy2],['本周',85,C.gold],['下周',90,C.gold]],'滚动更新'),cap:'每周滚一滚',say:'预测不是做一次就完，每周用实际结果滚动修正，越靠近越准。'},
      {illu:ILLU.note('✓','历史基数＋事件＝预测；每周滚动修正。','预测是每天的功课'),cap:'一句话记住',say:'一句话：预测是每天的功课，历史加事件，再滚动修正，就会有谱。'}
    ]
  },
  {
    id:'o3', part:'op', no:3, title:'设置超额预订', en:'Overbooking',
    tag:'动手做', dur:7000,
    takeaway:'总有客人预订不来（No-show）。按历史 No-show 率设超售上限，用“空房损失”换“多卖一间”的收益，但要防翻房。',
    slides:[
      {illu:ILLU.title('超额预订','总会有人订了不来，房别空着'),cap:'为什么要超',say:'总有人预订了却不来入住，叫 No-show。超订，就是多卖几间以防空房。'},
      {illu:ILLU.rooms(11,10,{over:1}),cap:'多卖 1 间',say:'10 间房卖 11 间：只要不超过 1 人 No-show，就不会翻车。'},
      {illu:ILLU.balance({l:'空房损失',v:'¥0 白丢'},{l:'超售多赚',v:'+¥500'},'用空房风险换收益'),cap:'天平两端',say:'一端是空房白丢的钱，一端是多卖一间赚的钱。超订就是用风险换收益。'},
      {illu:ILLU.note('!','上限＝历史 No-show 率。超太多会“翻房”，要赔要安置。','设上限、留预案'),cap:'红线',say:'但上限要按历史 No-show 率来设；超太多会翻房，得赔偿、得安置，反而亏。'},
      {illu:ILLU.note('✓','按 No-show 率设超售上限，留好翻房预案。','敢超，也要兜得住'),cap:'一句话记住',say:'一句话：超订要敢，但上限要稳、预案要备，才兜得住。'}
    ]
  },
  {
    id:'o4', part:'op', no:4, title:'动态调价', en:'Dynamic Pricing',
    tag:'动手做', dur:7000,
    takeaway:'价随供需动：需求高就涨、低就稳。先看预测和竞品，再动手改价，不是定死不变。',
    slides:[
      {illu:ILLU.title('动态调价','价格该跟着供需走，不是焊死',''),cap:'核心',say:'动态调价，就是让价格跟着供需实时动，而不是定死一成不变。'},
      {illu:ILLU.flow(['看预测','看竞品','调价格'],'调价三步'),cap:'先看清再动',say:'调价前先看两样：自己的需求预测，和竞品的实际价格。'},
      {illu:ILLU.arrow('up','需求高','(该涨)',C.gold),cap:'高需求涨',say:'预测需求高、房快满，就往上提；需求低、房还多，就稳住别硬涨。'},
      {illu:ILLU.bars([['周一',300,C.navy2],['周三',380,C.navy2],['周五',560,C.gold],['周日',460,C.navy2]],'一周价格曲线'),cap:'价随需动',say:'看这条价格曲线：周末需求旺，价就高；周中需求弱，价就低。'},
      {illu:ILLU.note('✓','价随供需动：高需求涨、低需求稳，先看预测和竞品。','别定死'),cap:'一句话记住',say:'一句话：价格别焊死，跟着预测和竞品走，高就涨、低就稳。'}
    ]
  },
  {
    id:'o5', part:'op', no:5, title:'关房与关低价房型', en:'Close to Arrival',
    tag:'动手做', dur:7000,
    takeaway:'高需求时关掉低价房型/低价渠道，保住房量给高价客人。常与最低住几晚组合使用，避免低价占满。',
    slides:[
      {illu:ILLU.title('关房与关低价','高需求时，把低价“藏起来”'),cap:'做什么',say:'关房，就是在高需求时，不再接某种低价房型或低价渠道的新预订。'},
      {illu:ILLU.rooms(8,10,{lowBlocked:2}),cap:'关掉 2 间低价',say:'图上灰色是被关掉的低价房——房量留给愿意付高价的客人。'},
      {illu:ILLU.compare({t:'开着低价',v:'满但低价',s:'利润薄',note:'量高'},{t:'关掉低价',v:'价高量稳',s:'利润厚',note:'更优',c:C.gold}),cap:'关了更赚',say:'开着低价容易满房却利润薄；关掉低价，房量留给高价客，利润更厚。'},
      {illu:ILLU.note('★','常和“最低住几晚”组合用，避免碎片低价占满房。','组合拳更狠'),cap:'组合技',say:'它常和最低住几晚一起用，防止低价短住把房占满，组合拳更有效。'},
      {illu:ILLU.note('✓','高需求关低价房型/渠道，房量留给高价客。','配合 MinLOS 更稳'),cap:'一句话记住',say:'一句话：高需求时关低价，把房留给肯出高价的客人。'}
    ]
  },
  {
    id:'o6', part:'op', no:6, title:'最小停留天数', en:'MinLOS',
    tag:'动手做', dur:7000,
    takeaway:'设最低住几晚（MinLOS），防止短碎预订占满高峰房。节假日尤其该设，既保价又提总收益。',
    slides:[
      {illu:ILLU.title('最小停留天数 MinLOS','高峰日，至少住几晚？'),cap:'是什么',say:'MinLOS 是最低停留天数：预订高峰日，客人至少要住几晚才接。'},
      {illu:ILLU.calendar([1,2,3,4,5],{min:[1,2,3,4,5],cap:'假期设 MinLOS=2'}),cap:'假期设限制',say:'比如黄金周设 MinLOS=2：只住一晚的碎片预订就不接，房留给连住客。'},
      {illu:ILLU.flow(['防碎片','保连住','提收益'],'三个好处'),cap:'为什么设',say:'它防碎片预订、保连住客、提总收益，一举三得。'},
      {illu:ILLU.note('!','只在该设的日期设，平日设了会挡正常客。','别滥用'),cap:'注意',say:'但只在高峰日设；平日也设，会把正常客人挡在门外。'},
      {illu:ILLU.note('✓','高峰日设 MinLOS，防碎片占房、保连住提收益。','节假日的利器'),cap:'一句话记住',say:'一句话：节假日用 MinLOS 拦碎片，房留给连住客，收益更稳。'}
    ]
  },
  {
    id:'o7', part:'op', no:7, title:'释放与收紧房量', en:'Inventory Release',
    tag:'动手做', dur:7000,
    takeaway:'库存是“时间的”：临近日期按预测分批放量，别一次放完。先给高价，留空间给更高价。',
    slides:[
      {illu:ILLU.title('释放与收紧房量','房量要“分批放”，不是一次倒',''),cap:'核心',say:'库存是时间的：房量要分批放，越临近日期越按预测收紧或放开。'},
      {illu:ILLU.bars([['T-30',100,C.navy2],['T-14',80,C.navy2],['T-7',55,C.gold],['T-1',30,C.gold]],'越近越收紧'),cap:'放量节奏',say:'提前 30 天全放开，越临近越收紧，把房留给最后愿意出高价的客人。'},
      {illu:ILLU.flow(['先放高价','观察需求','再放开低价'],'放的逻辑'),cap:'先贵后便宜',say:'逻辑是：先放高价房型，看需求起来，再逐步放开低价，别一次倒完。'},
      {illu:ILLU.note('!','一次放完＝把高价空间也廉价卖掉。','留一手'),cap:'误区',say:'一次放完，等于把本可卖高价的空间也廉价卖掉了，是常见浪费。'},
      {illu:ILLU.note('✓','房量分批放：先高价后低价，临近按预测收紧。','时间是你的筹码'),cap:'一句话记住',say:'一句话：房量是时间筹码，先贵后便宜，临近再收紧，别一次倒光。'}
    ]
  },

  /* ====================== 案例篇 ====================== */
  {
    id:'s1', part:'case', no:1, title:'黄金周涨满房', en:'Holiday Sell-out',
    tag:'真实场景', dur:7000,
    takeaway:'黄金周需求爆满：提前涨价、关低价、设 MinLOS，三招并用，满房且高价，RevPAR 拉满。',
    slides:[
      {illu:ILLU.title('案例·黄金周','需求爆满的一周怎么打？'),cap:'场景',say:'黄金周，全城需求爆满。这一周的目标：满房，还要高价。'},
      {illu:ILLU.calendar([1,2,3,4,5,6,7],{cap:'7 天全红＝全满需求'}),cap:'需求全红',say:'七天需求全红，几乎不用愁卖，但要愁“卖便宜了”。'},
      {illu:ILLU.flow(['提前涨价','关低价','设MinLOS'],'三招并用'),cap:'打法',say:'打法：提前涨价打开价格空间，关掉低价房型，再设最低住几晚。'},
      {illu:ILLU.metric('¥4.8万','当日 RevPAR 拉满',C.gold),cap:'结果',say:'三招下来，不仅满房，单价也高，单日 RevPAR 直接拉满。'},
      {illu:ILLU.note('✓','黄金周：提前涨＋关低价＋MinLOS，满房且高价。','高峰日的标准动作'),cap:'一句话记住',say:'一句话：黄金周就这三招——涨价、关低价、设连住，满房又高价。'}
    ]
  },
  {
    id:'s2', part:'case', no:2, title:'展会期间控价', en:'Expo Control',
    tag:'真实场景', dur:7000,
    takeaway:'周中展会周边普涨：不盲目跟涨，而是控价保高房价、关低价渠道，用高价房吃满周中刚需。',
    slides:[
      {illu:ILLU.title('案例·展会周','周中突然来一波刚需',''),cap:'场景',say:'展会周，周中本该淡，却因展会来一波刚需客，周边都在涨。'},
      {illu:ILLU.bars([['周一',70,C.navy2],['周二',95,C.gold],['周三',96,C.gold],['周四',80,C.navy2]],'周中异常高'),cap:'周中翘尾',say:'看曲线：周二周三需求异常高，是平时没有的周中高峰。'},
      {illu:ILLU.compare({t:'不控价',v:'照常价',s:'被低价占满',note:'浪费'},{t:'控价',v:'保高价',s:'吃满刚需',note:'更赚',c:C.gold}),cap:'控不控差很多',say:'不控价会被低价占满；控价保住房量给高价刚需客，周中也能赚。'},
      {illu:ILLU.flow(['识别展会','关低价','保高价'],'三步控价'),cap:'怎么做',say:'做法：识别展会需求、关掉低价渠道、把房量留给高价刚需。'},
      {illu:ILLU.note('✓','展会周中：识别刚需、关低价、保高价，吃满异常需求。','周中也能满血'),cap:'一句话记住',say:'一句话：展会周中别浪费，关低价保高价，把异常需求吃满。'}
    ]
  },
  {
    id:'s3', part:'case', no:3, title:'淡季保价不盲降', en:'Low Season Hold',
    tag:'真实场景', dur:7000,
    takeaway:'淡季需求低：别一味砍价，用长住套餐、连住优惠填房，保住房价底盘，避免陷入价格战。',
    slides:[
      {illu:ILLU.title('案例·淡季','需求低，先别急着降价',''),cap:'场景',say:'淡季需求低、房很多。第一反应常是降价，但这往往是下策。'},
      {illu:ILLU.arrow('down','需求低','(慎降价)',C.bad),cap:'别慌降',say:'需求软、弹性大，一降价量也起不来多少，反而把房价底盘砸了。'},
      {illu:ILLU.balance({l:'盲目降价',v:'价崩量平'},{l:'保价+套餐',v:'价稳量增'},'两套路对比'),cap:'两条路',say:'一条路盲目降价价崩量平；另一条路保价底盘、用套餐和连住优惠填房，更稳。'},
      {illu:ILLU.flow(['保底价','长住套餐','连住优惠'],'填房不降价'),cap:'怎么做',say:'做法：守住底价，推长住套餐、连住优惠，用价值填房而不是用低价填房。'},
      {illu:ILLU.note('✓','淡季：守底价＋套餐/连住优惠填房，不盲目砍价。','避开价格战'),cap:'一句话记住',say:'一句话：淡季别慌降，守价盘、用套餐填房，避开价格战。'}
    ]
  },
  {
    id:'s4', part:'case', no:4, title:'竞品突发降价', en:'Competitor Drop',
    tag:'真实场景', dur:7000,
    takeaway:'竞品突然降价：先看清自己定位，未必跟降。用差异化（位置、服务、会员）守住客群，必要时只调部分细分。',
    slides:[
      {illu:ILLU.title('案例·竞品降价','邻居突然大降价，跟不跟？',''),cap:'场景',say:'竞品突然大幅降价，前台慌了：要不要跟着降？'},
      {illu:ILLU.compare({t:'跟降',v:'利润薄',s:'陷入价格战',note:'两败'},{t:'守定位',v:'差异化',s:'留住客群',note:'更稳',c:C.gold}),cap:'跟或不跟',say:'盲目跟降只会陷入价格战、两败俱伤；守住定位、用差异化留客更稳。'},
      {illu:ILLU.flow(['看定位','看客群','局部调'],'应对三步'),cap:'怎么应对',say:'应对：先看自己定位，再看核心客群敏感度，必要时只调部分细分，不全盘跟。'},
      {illu:ILLU.note('★','不一定跟。看定位与客群：差异化的，守住；价格敏感的，局部跟。','分情况'),cap:'关键判断',say:'关键判断：不一定跟。有差异化的守住，只对价格敏感的那部分局部跟。'},
      {illu:ILLU.note('✓','竞品降价：先看定位，未必跟；差异化守住，局部微调。','别被带节奏'),cap:'一句话记住',say:'一句话：竞品降价别被带节奏，看定位、守差异，局部微调即可。'}
    ]
  },
  {
    id:'s5', part:'case', no:5, title:'超售翻房补救', en:'Walk-in Recovery',
    tag:'真实场景', dur:7000,
    takeaway:'订超了多 1 间：预案比赔偿重要。识别翻房客→升级/赔礼/安置周边，把损失和差评降到最低。',
    slides:[
      {illu:ILLU.title('案例·翻房','订超了，多出 1 间客',''),cap:'场景',say:'超订设得偏松，结果当天真多出 1 位客人没房——翻房了。'},
      {illu:ILLU.rooms(11,10,{over:1}),cap:'多 1 间',say:'10 间卖了 11 间，No-show 没发生，就多出 1 位需要安置的客人。'},
      {illu:ILLU.flow(['识别翻房客','升级/赔礼','安置周边'],'补救三步'),cap:'怎么救',say:'补救：先识别谁翻房，给升级或赔礼，再安置到周边同房型酒店，报销差价。'},
      {illu:ILLU.note('!','预案比赔偿更重要：平时就和周边酒店谈好互助。','功夫在事前'),cap:'关键',say:'关键：预案比赔偿重要。平时就和周边酒店谈好互助，出事不抓瞎。'},
      {illu:ILLU.note('✓','翻房：识别→升级/赔礼→安置周边，预案在平时备好。','兜得住才敢超'),cap:'一句话记住',say:'一句话：翻房不可怕，有预案才敢超；平时备好互助，出事能兜住。'}
    ]
  }
];

/* 暴露给页面 */
window.GJP_EPISODES = GJP_EPISODES;
window.GJP_PARTS = [
  {key:'concept', name:'概念篇', desc:'一个视频讲清一个收益管理核心概念', icon:'◆'},
  {key:'op', name:'操作篇', desc:'一个视频演示一个可上手的操作步骤', icon:'✦'},
  {key:'case', name:'案例篇', desc:'一个视频拆解一个真实经营场景', icon:'★'}
];
