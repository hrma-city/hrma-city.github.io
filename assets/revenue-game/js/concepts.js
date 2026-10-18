/* ============================================
   概念动画模块 — 交互式可视化讲解
   ============================================ */

const Concepts = (function () {

  // ===== 1. RevPAR 公式交互 =====
  function initFormulaDemo() {
    const adrSlider = document.getElementById('adrSlider');
    const occSlider = document.getElementById('occSlider');
    const adrDisplay = document.getElementById('adrDisplay');
    const occDisplay = document.getElementById('occDisplay');
    const fvaAdr = document.getElementById('fvaAdr');
    const fvaOcc = document.getElementById('fvaOcc');
    const fvaRevpar = document.getElementById('fvaRevpar');

    function updateFormula() {
      const adr = parseInt(adrSlider.value);
      const occ = parseInt(occSlider.value);
      const revpar = Math.round(adr * (occ / 100));

      adrDisplay.textContent = adr;
      occDisplay.textContent = occ;

      // 更新气泡
      fvaAdr.querySelector('.fb-value').textContent = '¥' + adr;
      fvaOcc.querySelector('.fb-value').textContent = occ + '%';
      fvaRevpar.querySelector('.fb-value').textContent = '¥' + revpar;

      // 脉冲动画
      [fvaAdr, fvaOcc, fvaRevpar].forEach(el => {
        el.classList.remove('pulse');
        void el.offsetWidth;
        el.classList.add('pulse');
      });
    }

    if (adrSlider && occSlider) {
      adrSlider.addEventListener('input', updateFormula);
      occSlider.addEventListener('input', updateFormula);
    }
  }

  // ===== 2. 定价权衡曲线 =====
  function initTradeoffChart() {
    const canvas = document.getElementById('tradeoffCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const padding = { top: 30, right: 50, bottom: 50, left: 60 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    const priceMin = 200;
    const priceMax = 1200;

    // 需求弹性函数：价格越高入住率越低（S曲线）
    function getOccupancy(price) {
      const mid = 650;
      const steepness = 0.006;
      const occ = 0.95 / (1 + Math.exp(steepness * (price - mid)));
      return Math.max(0.05, Math.min(0.98, occ));
    }

    function getRevPAR(price) {
      return price * getOccupancy(price);
    }

    let mouseX = -1;
    let hoverPrice = 650;

    function priceToX(price) {
      return padding.left + ((price - priceMin) / (priceMax - priceMin)) * chartW;
    }

    function xToPrice(x) {
      return priceMin + ((x - padding.left) / chartW) * (priceMax - priceMin);
    }

    function occToY(occ) {
      return padding.top + (1 - occ) * chartH;
    }

    function revparToY(revpar) {
      const maxRev = 700;
      return padding.top + (1 - Math.min(revpar / maxRev, 1)) * chartH;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // 背景网格
      ctx.strokeStyle = 'rgba(26,39,68,0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartH / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(W - padding.right, y);
        ctx.stroke();
      }

      // 坐标轴
      ctx.strokeStyle = 'rgba(26,39,68,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, H - padding.bottom);
      ctx.lineTo(W - padding.right, H - padding.bottom);
      ctx.stroke();

      // Y轴标签（入住率）
      ctx.fillStyle = 'rgba(26,39,68,0.5)';
      ctx.font = '12px "Noto Sans SC"';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 5; i++) {
        const occ = 1 - i / 5;
        const y = padding.top + (chartH / 5) * i;
        ctx.fillText(Math.round(occ * 100) + '%', padding.left - 8, y + 4);
      }

      // X轴标签（价格）
      ctx.textAlign = 'center';
      for (let p = priceMin; p <= priceMax; p += 200) {
        const x = priceToX(p);
        ctx.fillText('¥' + p, x, H - padding.bottom + 20);
      }

      // 轴标题
      ctx.fillStyle = 'rgba(26,39,68,0.4)';
      ctx.font = '13px "Noto Sans SC"';
      ctx.fillText('房价 (¥)', W / 2, H - 12);

      ctx.save();
      ctx.translate(16, H / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('入住率 / RevPAR', 0, 0);
      ctx.restore();

      // 入住率曲线
      ctx.strokeStyle = '#4a90d9';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let p = priceMin; p <= priceMax; p += 5) {
        const x = priceToX(p);
        const y = occToY(getOccupancy(p));
        if (p === priceMin) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // ADR 线（就是 y = price，映射到同一坐标）
      ctx.strokeStyle = '#d4a574';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      for (let p = priceMin; p <= priceMax; p += 5) {
        const x = priceToX(p);
        const y = revparToY(p); // ADR mapped to revpar scale area for comparison
        if (p === priceMin) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // RevPAR 曲线
      ctx.strokeStyle = '#e85d5d';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let p = priceMin; p <= priceMax; p += 5) {
        const x = priceToX(p);
        const y = revparToY(getRevPAR(p));
        if (p === priceMin) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 找到 RevPAR 最高点
      let maxRevPAR = 0;
      let maxPrice = priceMin;
      for (let p = priceMin; p <= priceMax; p += 1) {
        const r = getRevPAR(p);
        if (r > maxRevPAR) {
          maxRevPAR = r;
          maxPrice = p;
        }
      }
      // 标记最优点
      const optX = priceToX(maxPrice);
      const optY = revparToY(maxRevPAR);
      ctx.fillStyle = 'rgba(212,165,116,0.15)';
      ctx.beginPath();
      ctx.arc(optX, optY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d4a574';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(optX, optY, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#b8860b';
      ctx.font = 'bold 12px "Noto Sans SC"';
      ctx.textAlign = 'center';
      ctx.fillText('最优定价 ¥' + maxPrice, optX, optY - 24);

      // 悬停指示
      if (hoverPrice >= priceMin && hoverPrice <= priceMax) {
        const hx = priceToX(hoverPrice);
        const occ = getOccupancy(hoverPrice);
        const rev = getRevPAR(hoverPrice);

        // 竖线
        ctx.strokeStyle = 'rgba(26,39,68,0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(hx, padding.top);
        ctx.lineTo(hx, H - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // 点
        ctx.fillStyle = '#4a90d9';
        ctx.beginPath();
        ctx.arc(hx, occToY(occ), 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e85d5d';
        ctx.beginPath();
        ctx.arc(hx, revparToY(rev), 6, 0, Math.PI * 2);
        ctx.fill();

        // 信息框
        const boxX = Math.min(hx + 12, W - 160);
        const boxY = padding.top + 10;
        ctx.fillStyle = 'rgba(26,39,68,0.92)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, 148, 76, 8);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '13px "Noto Sans SC"';
        ctx.textAlign = 'left';
        ctx.fillText('房价: ¥' + hoverPrice, boxX + 12, boxY + 20);
        ctx.fillStyle = '#7eb5f0';
        ctx.fillText('入住率: ' + Math.round(occ * 100) + '%', boxX + 12, boxY + 40);
        ctx.fillStyle = '#f5a3a3';
        ctx.fillText('RevPAR: ¥' + Math.round(rev), boxX + 12, boxY + 60);
      }
    }

    canvas.addEventListener('mousemove', function (e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const x = (e.clientX - rect.left) * scaleX;
      if (x >= padding.left && x <= W - padding.right) {
        hoverPrice = Math.round(xToPrice(x) / 10) * 10;
        draw();
      }
    });

    canvas.addEventListener('mouseleave', function () {
      hoverPrice = -1;
      draw();
    });

    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) * scaleX;
      if (x >= padding.left && x <= W - padding.right) {
        hoverPrice = Math.round(xToPrice(x) / 10) * 10;
        draw();
      }
    }, { passive: false });

    draw();
  }

  // ===== 3. 动态定价 Demo =====
  function initDynamicDemo() {
    const canvas = document.getElementById('demandCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    let currentScenario = 'normal';
    let currentPrice = 600;

    function getOccupancy(price, scenario) {
      const s = DYNAMIC_SCENARIOS[scenario];
      const occ = s.baseDemand + s.slope * (price - 400);
      return Math.max(0.05, Math.min(0.98, occ));
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const s = DYNAMIC_SCENARIOS[currentScenario];

      // 网格
      ctx.strokeStyle = 'rgba(26,39,68,0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(W - padding.right, y);
        ctx.stroke();
      }

      // 坐标轴
      ctx.strokeStyle = 'rgba(26,39,68,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, H - padding.bottom);
      ctx.lineTo(W - padding.right, H - padding.bottom);
      ctx.stroke();

      // Y轴标签
      ctx.fillStyle = 'rgba(26,39,68,0.4)';
      ctx.font = '11px "Noto Sans SC"';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) {
        const occ = 1 - i / 4;
        const y = padding.top + (chartH / 4) * i;
        ctx.fillText(Math.round(occ * 100) + '%', padding.left - 6, y + 4);
      }

      // X轴标签
      ctx.textAlign = 'center';
      for (let p = 200; p <= 1500; p += 300) {
        const x = padding.left + ((p - 200) / 1300) * chartW;
        ctx.fillText('¥' + p, x, H - padding.bottom + 16);
      }

      // 需求曲线
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let p = 200; p <= 1500; p += 5) {
        const x = padding.left + ((p - 200) / 1300) * chartW;
        const y = padding.top + (1 - getOccupancy(p, currentScenario)) * chartH;
        if (p === 200) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 填充区域
      ctx.fillStyle = s.color + '15';
      ctx.beginPath();
      ctx.moveTo(padding.left, H - padding.bottom);
      for (let p = 200; p <= 1500; p += 5) {
        const x = padding.left + ((p - 200) / 1300) * chartW;
        const y = padding.top + (1 - getOccupancy(p, currentScenario)) * chartH;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W - padding.right, H - padding.bottom);
      ctx.closePath();
      ctx.fill();

      // 当前价格指示线
      const px = padding.left + ((currentPrice - 200) / 1300) * chartW;
      ctx.strokeStyle = 'rgba(26,39,68,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(px, padding.top);
      ctx.lineTo(px, H - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // 交点
      const occ = getOccupancy(currentPrice, currentScenario);
      const py = padding.top + (1 - occ) * chartH;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      // 场景标签
      ctx.fillStyle = 'rgba(26,39,68,0.6)';
      ctx.font = 'bold 13px "Noto Sans SC"';
      ctx.textAlign = 'left';
      ctx.fillText(s.name, padding.left + 8, padding.top + 18);

      // 更新读数
      const revpar = Math.round(currentPrice * occ);
      const rdPrice = document.getElementById('rdPrice');
      const rdOcc = document.getElementById('rdOcc');
      const rdRevpar = document.getElementById('rdRevpar');
      const dynPriceLabel = document.getElementById('dynPriceLabel');
      if (rdPrice) rdPrice.textContent = '¥' + currentPrice;
      if (rdOcc) rdOcc.textContent = Math.round(occ * 100) + '%';
      if (rdRevpar) rdRevpar.textContent = '¥' + revpar;
      if (dynPriceLabel) dynPriceLabel.textContent = currentPrice;
    }

    // Tab 切换
    document.querySelectorAll('.demo-tab').forEach(tab => {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.demo-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        currentScenario = this.dataset.scenario;
        draw();
      });
    });

    // 价格滑块
    const slider = document.getElementById('dynPriceSlider');
    if (slider) {
      slider.addEventListener('input', function () {
        currentPrice = parseInt(this.value);
        draw();
      });
    }

    draw();
  }

  // ===== 4. 超售模拟器 =====
  function initOverbookingDemo() {
    const slider = document.getElementById('obBookingsSlider');
    const bookingsDisplay = document.getElementById('obBookings');
    const noshowRateDisplay = document.getElementById('obNoshowRate');
    const simulateBtn = document.getElementById('obSimulateBtn');
    const result = document.getElementById('obDemoResult');

    if (!slider) return;

    const NOSHOW_RATE = 0.08;
    const ROOM_PRICE = 500;
    const WALK_COST = 800;
    const TOTAL_ROOMS = 100;

    noshowRateDisplay.textContent = Math.round(NOSHOW_RATE * 100);

    slider.addEventListener('input', function () {
      bookingsDisplay.textContent = this.value;
    });

    simulateBtn.addEventListener('click', function () {
      const bookings = parseInt(slider.value);
      // 模拟 No-show（二项分布近似）
      const expectedNoshow = bookings * NOSHOW_RATE;
      const actualNoshow = Math.round(expectedNoshow + (Math.random() - 0.5) * expectedNoshow * 0.6);
      const finalNoshow = Math.max(0, Math.min(bookings - 1, actualNoshow));
      const arrivals = bookings - finalNoshow;
      const checkedIn = Math.min(arrivals, TOTAL_ROOMS);
      const walked = Math.max(0, arrivals - TOTAL_ROOMS);
      const emptyRooms = TOTAL_ROOMS - checkedIn;

      const roomRevenue = checkedIn * ROOM_PRICE;
      const walkCost = walked * WALK_COST;
      const netRevenue = roomRevenue - walkCost;

      document.getElementById('obArrivals').textContent = arrivals;
      document.getElementById('obNoshow').textContent = finalNoshow;
      document.getElementById('obCheckedin').textContent = checkedIn;
      document.getElementById('obWalkout').textContent = walked;
      document.getElementById('obRevenue').textContent = '¥' + netRevenue.toLocaleString();

      const walkoutRow = document.getElementById('obWalkoutRow');
      if (walked > 0) {
        walkoutRow.style.color = 'var(--red)';
      } else {
        walkoutRow.style.color = '';
      }

      result.classList.remove('hidden');
      result.style.animation = 'none';
      void result.offsetWidth;
      result.style.animation = 'fadeInUp 0.4s ease';
    });
  }

  // ===== 概念学习进度标记 =====
  const learnedConcepts = new Set();

  function markConceptLearned(conceptId) {
    learnedConcepts.add(conceptId);
    updateDashboard();
  }

  function updateDashboard() {
    const total = 5;
    const count = learnedConcepts.size;
    const status = document.getElementById('dashConceptStatus');
    const fill = document.getElementById('dashConceptFill');
    if (status) status.textContent = count + ' / ' + total + ' 已学';
    if (fill) fill.style.width = (count / total * 100) + '%';

    const dashCard = document.getElementById('dashConcept1');
    if (dashCard && count === total) {
      dashCard.classList.add('completed');
    }
  }

  // ===== 滚动观察器：概念进入视口时标记为已学 =====
  function initConceptObserver() {
    const sections = document.querySelectorAll('.concept-section');
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.dataset.concept;
          if (id) markConceptLearned(id);
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.4 });

    sections.forEach(s => {
      s.classList.add('reveal');
      observer.observe(s);
    });
  }

  // ===== Hero 酒店窗户灯光动画 =====
  function initHotelWindows() {
    const container = document.getElementById('hotelFloors');
    if (!container) return;

    const floors = 5;
    const windowsPerFloor = 9;
    for (let f = 0; f < floors; f++) {
      const row = document.createElement('div');
      row.className = 'hotel-floor-row';
      for (let w = 0; w < windowsPerFloor; w++) {
        const win = document.createElement('div');
        win.className = 'hotel-window';
        row.appendChild(win);
      }
      container.appendChild(row);
    }

    // 随机点亮窗户
    const windows = container.querySelectorAll('.hotel-window');
    function lightUpRandom() {
      windows.forEach(w => w.classList.remove('lit'));
      const litCount = Math.floor(windows.length * (0.4 + Math.random() * 0.35));
      const indices = [];
      while (indices.length < litCount) {
        const idx = Math.floor(Math.random() * windows.length);
        if (!indices.includes(idx)) indices.push(idx);
      }
      indices.forEach((idx, i) => {
        setTimeout(() => {
          windows[idx].classList.add('lit');
        }, i * 50);
      });
    }
    lightUpRandom();
    setInterval(lightUpRandom, 4000);
  }

  // ===== 初始化所有概念模块 =====
  function init() {
    initHotelWindows();
    initFormulaDemo();
    initTradeoffChart();
    initDynamicDemo();
    initOverbookingDemo();
    initConceptObserver();
  }

  return {
    init,
    markConceptLearned,
    getLearnedCount: () => learnedConcepts.size,
  };
})();
