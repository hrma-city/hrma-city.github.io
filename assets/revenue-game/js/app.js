/* ============================================
   主应用 — 导航、进度追踪、仪表盘、初始化
   ============================================ */

const App = (function () {

  const gameRecords = {
    pricing: null,
    overbooking: null,
    segmentation: null,
    dayInLife: null,
  };

  // ===== 导航滚动效果 =====
  function initNav() {
    const nav = document.getElementById('topNav');
    const navProgressFill = document.getElementById('navProgressFill');
    const navProgressLabel = document.getElementById('navProgressLabel');

    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrollTop / docHeight, 1);

      navProgressFill.style.width = (progress * 100) + '%';
      navProgressLabel.textContent = Math.round(progress * 100) + '%';

      if (scrollTop > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ===== 平滑滚动 =====
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ===== 路线图卡片点击跳转 =====
  function initRoadmap() {
    document.querySelectorAll('.roadmap-item').forEach(item => {
      item.addEventListener('click', function () {
        const module = this.dataset.module;
        const target = document.getElementById(module);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ===== 滚动显示动画 =====
  function initScrollReveal() {
    const elements = document.querySelectorAll(
      '.section-header, .roadmap-item, .metric-card, .seg-card, .game-intro-card, .dash-card, .seg-insight'
    );

    elements.forEach(el => el.classList.add('reveal'));

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.15 });

    elements.forEach(el => observer.observe(el));
  }

  // ===== 更新仪表盘 =====
  function updateDashboard(game, data) {
    gameRecords[game] = data;

    if (game === 'pricing') {
      const status = document.getElementById('dashPricingStatus');
      const best = document.getElementById('dashPricingBest');
      const card = document.getElementById('dashGame1');
      status.textContent = '已完成';
      best.textContent = '总 RevPAR: ¥' + data.totalRevpar.toLocaleString();
      card.classList.add('completed');
    }

    if (game === 'overbooking') {
      const status = document.getElementById('dashOverbookingStatus');
      const best = document.getElementById('dashOverbookingBest');
      const card = document.getElementById('dashGame2');
      status.textContent = '已完成';
      best.textContent = '总净收入: ¥' + data.totalRevenue.toLocaleString();
      card.classList.add('completed');
    }

    if (game === 'segmentation') {
      const status = document.getElementById('dashSegStatus');
      const best = document.getElementById('dashSegBest');
      const card = document.getElementById('dashGame3');
      status.textContent = '已完成';
      best.textContent = '最佳得分: ' + data.score + ' 分';
      card.classList.add('completed');
    }

    if (game === 'dayInLife') {
      const status = document.getElementById('dashDilStatus');
      const best = document.getElementById('dashDilBest');
      const card = document.getElementById('dashGame4');
      status.textContent = '已完成';
      best.textContent = '得分: ' + data.score + '/' + data.maxScore + ' (' + Math.round(data.ratio * 100) + '%)';
      card.classList.add('completed');
    }

    checkCompletion();
  }

  // ===== 检查全部完成 =====
  function checkCompletion() {
    const conceptCount = Concepts.getLearnedCount();
    const gamesDone = Object.values(gameRecords).filter(v => v !== null).length;
    const allDone = conceptCount >= 5 && gamesDone >= 4;

    if (allDone) {
      const badge = document.getElementById('completionBadge');
      badge.classList.remove('hidden');

      // 计算总评
      let medal = '🥇 全能毕业生';
      const pricingRatio = gameRecords.pricing ? gameRecords.pricing.ratio : 0;
      const obRatio = gameRecords.overbooking ? gameRecords.overbooking.ratio : 0;
      const segScore = gameRecords.segmentation ? gameRecords.segmentation.score : 0;
      const dilRatio = gameRecords.dayInLife ? gameRecords.dayInLife.ratio : 0;

      const avgPerformance = (pricingRatio + obRatio + dilRatio) / 3;
      if (avgPerformance >= 1.0 && segScore >= 150) {
        medal = '🥇 卓越毕业生 — 你已具备专业收益经理的核心能力';
      } else if (avgPerformance >= 0.85 && segScore >= 100) {
        medal = '🥈 优秀毕业生 — 表现出色，继续精进';
      } else {
        medal = '🥉 合格毕业生 — 基础扎实，实战可期';
      }
      document.getElementById('cbMedal').textContent = medal;

      showToast('🎉 恭喜完成全部课程！', 'success');
    }
  }

  // ===== Toast 提示 =====
  function showToast(message, type) {
    type = type || 'info';
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ===== 概念进入视口提示 =====
  function initConceptToasts() {
    const conceptNames = {
      revpar: '📚 概念1: 三大核心指标',
      tradeoff: '📚 概念2: 定价权衡',
      dynamic: '📚 概念3: 动态定价',
      segmentation: '📚 概念4: 市场细分',
      overbooking: '📚 概念5: 超售策略',
    };
    const seen = new Set();

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting && !seen.has(entry.target.id)) {
          seen.add(entry.target.id);
          const concept = entry.target.dataset.concept;
          if (concept && conceptNames[concept]) {
            // 不弹 toast，避免干扰，只标记
          }
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('.concept-section').forEach(s => observer.observe(s));
  }

  // ===== Canvas roundRect polyfill (for older browsers) =====
  function polyfillRoundRect() {
    if (!CanvasRenderingContext2D.prototype.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (typeof r === 'number') r = [r, r, r, r];
        else if (r.length === 2) r = [r[0], r[1], r[0], r[1]];
        this.beginPath();
        this.moveTo(x + r[0], y);
        this.lineTo(x + w - r[1], y);
        this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
        this.lineTo(x + w, y + h - r[2]);
        this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
        this.lineTo(x + r[3], y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
        this.lineTo(x, y + r[0]);
        this.quadraticCurveTo(x, y, x + r[0], y);
        this.closePath();
        return this;
      };
    }
  }

  // ===== 初始化 =====
  function init() {
    polyfillRoundRect();
    initNav();
    initSmoothScroll();
    initRoadmap();
    initScrollReveal();
    initConceptToasts();

    Concepts.init();
    Games.Pricing.init();
    Games.Overbooking.init();
    Games.Segmentation.init();
    Games.DayInTheLife.init();

    // 欢迎提示
    setTimeout(() => {
      showToast('欢迎来到 RevPAR大师！向下滚动开始学习', 'info');
    }, 1500);
  }

  return {
    init,
    updateDashboard,
    showToast,
  };
})();

// ===== 启动 =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', App.init);
} else {
  App.init();
}
