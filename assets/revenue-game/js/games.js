/* ============================================
   游戏模块 — 定价大师 / 超售博弈 / 客户匹配 / 收益经理的一天
   彻底修复：比较逻辑、计算展示、价格上限
   ============================================ */

const Games = (function () {

  // ===== 游戏1: 定价大师（全部重写） =====
  const Pricing = {
    state: { round: 0, totalRounds: PRICING_SCENARIOS.length, results: [], currentPrice: 800, },

    init() {
      document.getElementById('pricingStartBtn').addEventListener('click', () => this.start());
      document.getElementById('pgSubmitBtn').addEventListener('click', () => this.submit());
      document.getElementById('pgNextBtn').addEventListener('click', () => this.next());
      document.getElementById('pgRestartBtn').addEventListener('click', () => this.restart());
      const slider = document.getElementById('pgPriceSlider');
      const display = document.getElementById('pgPriceDisplay');
      slider.addEventListener('input', () => {
        this.state.currentPrice = parseInt(slider.value);
        display.textContent = '¥' + slider.value;
        display.classList.add('changing');
        clearTimeout(this._priceTimer);
        this._priceTimer = setTimeout(() => display.classList.remove('changing'), 200);
      });
    },

    start() {
      this.state.round = 0; this.state.results = [];
      this.showStage('Play'); this.loadRound();
    },

    showStage(stage) {
      ['Start','Play','Result','Final'].forEach(s => {
        document.getElementById('pricingStage'+s).classList.add('hidden');
      });
      const cap = stage.charAt(0).toUpperCase() + stage.slice(1);
      document.getElementById('pricingStage'+cap).classList.remove('hidden');
    },

    loadRound() {
      const s = PRICING_SCENARIOS[this.state.round];
      document.getElementById('pgRoundNum').textContent = this.state.round + 1;
      document.getElementById('pgSceneIcon').textContent = s.icon;
      document.getElementById('pgSceneTitle').textContent = s.title;
      document.getElementById('pgSceneDesc').textContent = s.desc;
      document.getElementById('pgCompPrice').textContent = '¥' + s.compPrice;
      document.getElementById('pgDemandLevel').textContent = s.demand;
      const tags = document.getElementById('pgSceneTags');
      tags.innerHTML = '';
      s.tags.forEach(t => { const el = document.createElement('span'); el.className = 'pgst-tag'; el.textContent = t; tags.appendChild(el); });
      const dots = document.getElementById('pgRoundDots');
      dots.innerHTML = '';
      for (let i = 0; i < this.state.totalRounds; i++) {
        const dot = document.createElement('span'); dot.className = 'pgd-dot';
        if (i < this.state.round) dot.classList.add('done');
        if (i === this.state.round) dot.classList.add('active');
        dots.appendChild(dot);
      }
      const slider = document.getElementById('pgPriceSlider');
      slider.value = s.basePrice; this.state.currentPrice = s.basePrice;
      document.getElementById('pgPriceDisplay').textContent = '¥' + s.basePrice;
    },

    calcOccupancy(price, scenario) {
      const ratio = price / scenario.basePrice;
      const raw = scenario.demandLevel * Math.pow(ratio, -scenario.elasticity);
      return Math.max(0.02, Math.min(0.99, raw));
    },

    calcCompRevPAR(scenario) {
      const occ = this.calcOccupancy(scenario.compPrice, scenario);
      return Math.round(scenario.compPrice * occ);
    },

    submit() {
      const s = PRICING_SCENARIOS[this.state.round];
      const price = this.state.currentPrice;
      const occ = this.calcOccupancy(price, s);
      const revpar = Math.round(price * occ);
      const compRevpar = this.calcCompRevPAR(s);
      this.state.results.push({ round: this.state.round, scenario: s.title, price, occ, revpar, compRevpar, scenario: s });
      this.showResult(s, price, occ, revpar, compRevpar);
    },

    showResult(scenario, price, occ, revpar, compRevpar) {
      document.getElementById('rmPrice').textContent = '¥' + price;
      document.getElementById('rmOcc').textContent = Math.round(occ * 100) + '%';
      document.getElementById('rmRevpar').textContent = '¥' + revpar;
      document.getElementById('rmCompRevpar').textContent = '¥' + compRevpar;

      /* ===== 修正后的判定逻辑（严格比较，不再用宽松阈值制造假结果） ===== */
      const diff = revpar - compRevpar;
      const pctDiff = compRevpar > 0 ? ((diff / compRevpar) * 100) : 0;

      let verdictText, verdictClass, detailHTML;

      if (diff > 0) {
        // 赢了竞品
        if (pctDiff >= 10) {
          verdictText = `✅ 大胜！你的 RevPAR ¥${revpar} 高出竞品 ¥${compRevpar}，领先 ${pctDiff.toFixed(1)}%`;
          verdictClass = 'win';
        } else {
          verdictText = `✅ 险胜！你的 RevPAR ¥${revpar} 略高于竞品 ¥${compRevpar}，领先 ${pctDiff.toFixed(1)}%`;
          verdictClass = 'win';
        }
      } else if (diff === 0) {
        verdictText = `🤝 平手！你的 RevPAR 与竞品完全持平（均 ¥${revpar}）`;
        verdictClass = 'draw';
      } else {
        // 输给竞品
        if (pctDiff > -10) {
          verdictText = `⚠️ 惜败。你的 RevPAR ¥${revpar} 略低于竞品 ¥${compRevpar}，差距 ${Math.abs(pctDiff).toFixed(1)}%`;
          verdictClass = 'lose';
        } else {
          verdictText = `❌ 明显落后。你的 RevPAR ¥${revpar} 低于竞品 ¥${compRevpar}，差距 ${Math.abs(pctDiff).toFixed(1)}%`;
          verdictClass = 'lose';
        }
      }

      /* ===== 计算过程详细展示 ===== */
      const ratio = price / scenario.basePrice;
      const rawOcc = scenario.demandLevel * Math.pow(ratio, -scenario.elasticity);
      const clampedOcc = Math.max(0.02, Math.min(0.99, rawOcc));

      const compRatio = scenario.compPrice / scenario.basePrice;
      const compRawOcc = scenario.demandLevel * Math.pow(compRatio, -scenario.elasticity);
      const compClampedOcc = Math.max(0.02, Math.min(0.99, compRawOcc));

      detailHTML = `
        <div class="calc-breakdown">
          <div class="calc-section">
            <div class="calc-title">📊 你的计算过程</div>
            <div class="calc-row"><span>需求基数 demandLevel</span><span>${(scenario.demandLevel * 100).toFixed(0)}%</span></div>
            <div class="calc-row"><span>需求弹性 elasticity</span><span>${scenario.elasticity}</span></div>
            <div class="calc-row"><span>价格比 price / basePrice</span><span>¥${price} / ¥${scenario.basePrice} = ${ratio.toFixed(3)}</span></div>
            <div class="calc-row"><span>入住率 = ${(scenario.demandLevel*100).toFixed(0)}% × ${ratio.toFixed(3)}^(-${scenario.elasticity})</span><span>${(rawOcc*100).toFixed(1)}% → 截断后 ${(clampedOcc*100).toFixed(1)}%</span></div>
            <div class="calc-row highlight-row"><span>RevPAR = ¥${price} × ${(clampedOcc*100).toFixed(1)}%</span><span class="calc-revpar">¥${revpar}</span></div>
          </div>
          <div class="calc-section">
            <div class="calc-title">🏨 竞品的计算过程</div>
            <div class="calc-row"><span>竞品定价</span><span>¥${scenario.compPrice}</span></div>
            <div class="calc-row"><span>竞品入住率</span><span>${(compClampedOcc*100).toFixed(1)}%</span></div>
            <div class="calc-row highlight-row"><span>竞品 RevPAR</span><span class="calc-revpar">¥${compRevpar}</span></div>
          </div>
        </div>
      `;

      /* ===== 改进建议 ===== */
      let suggestion = '';
      if (diff < 0) {
        // 输了，给出改进建议
        const b = scenario.basePrice;
        const c = scenario.compPrice;
        const e = scenario.elasticity;

        // 简单搜索最优价格（在 basePrice ~ compPrice*1.5 范围内）
        let bestPrice = b, bestRev = 0;
        for (let p = 200; p <= 2000; p += 10) {
          const r = p / b;
          const o = Math.max(0.02, Math.min(0.99, scenario.demandLevel * Math.pow(r, -e)));
          const rv = p * o;
          if (rv > bestRev) { bestRev = rv; bestPrice = p; }
        }
        const bestOcc = Math.max(0.02, Math.min(0.99, scenario.demandLevel * Math.pow(bestPrice / b, -e)));
        const bestRevpar = Math.round(bestPrice * bestOcc);

        if (price < scenario.compPrice && scenario.elasticity < 1.0) {
          suggestion = `💡 <strong>核心洞察</strong>：该场景需求弹性仅 ${scenario.elasticity}（价格不敏感），竞品敢要 ¥${scenario.compPrice} 且仍能卖出足够多的房。你定价 ¥${price} 偏低，虽然入住率更高，但价格的损失超过了入住率带来的增益，导致 RevPAR 落后。<br><br>
          🎯 <strong>最优定价参考</strong>：约 <strong>¥${bestPrice}</strong>（入住率 ${(bestOcc*100).toFixed(0)}%，RevPAR 约 ¥${bestRevpar}）。注意：弹性 < 1 意味着<strong>提价带来的收入增长 > 入住率下降造成的损失</strong>。`;
        } else if (price > scenario.compPrice && scenario.elasticity > 1.2) {
          suggestion = `💡 <strong>核心洞察</strong>：该场景需求弹性高达 ${scenario.elasticity}（价格很敏感），你定价 ¥${price} 过高导致入住率暴跌，RevPAR 反而不如定价更低的竞品。<br><br>
          🎯 <strong>最优定价参考</strong>：约 <strong>¥${bestPrice}</strong>（入住率 ${(bestOcc*100).toFixed(0)}%，RevPAR 约 ¥${bestRevpar}）。弹性 > 1 意味着<strong>降价带来的入住率提升 > 价格下降造成的损失</strong>。`;
        } else {
          suggestion = `💡 <strong>核心洞察</strong>：你的定价 ¥${price} 在此场景下未能最大化 RevPAR。竞品的策略更优——其定价 ¥${scenario.compPrice} 在入住率和价格之间找到了更好的平衡点。<br><br>
          🎯 <strong>最优定价参考</strong>：约 <strong>¥${bestPrice}</strong>（入住率 ${(bestOcc*100).toFixed(0)}%，RevPAR 约 ¥${bestRevpar}）。`;
        }
      } else if (diff > 0 && pctDiff < 5) {
        suggestion = `💡 表现不错但优势不大。你还可以微调定价在 ¥${Math.round(scenario.basePrice*0.9)}-¥${Math.round(scenario.basePrice*1.3)} 之间寻找更优解。`;
      } else {
        suggestion = `💡 做得很好！继续关注不同场景下的需求弹性变化——它是你定价决策的指南针。`;
      }

      detailHTML += `<div class="calc-suggestion">${suggestion}</div>`;

      document.getElementById('pgResultComment').innerHTML = verdictText;
      document.getElementById('pgResultComment').className = 'pg-result-comment ' + verdictClass;
      document.getElementById('pgResultDetail').innerHTML = detailHTML;

      this.renderRoomVisual(occ);

      const nextBtn = document.getElementById('pgNextBtn');
      nextBtn.textContent = this.state.round >= this.state.totalRounds - 1 ? '查看最终成绩 →' : '下一轮 →';

      this.showStage('Result');
    },

    renderRoomVisual(occ) {
      const c = document.getElementById('pgRoomVisual');
      c.innerHTML = '';
      const t = 50, o = Math.round(t * occ);
      for (let i = 0; i < t; i++) {
        const el = document.createElement('div'); el.className = 'room-cell';
        if (i < o) { el.classList.add('occupied'); el.style.transitionDelay = (i * 15) + 'ms'; }
        else el.classList.add('empty-highlight');
        c.appendChild(el);
      }
    },

    next() {
      this.state.round++;
      if (this.state.round >= this.state.totalRounds) this.showFinal();
      else { this.loadRound(); this.showStage('Play'); }
    },

    showFinal() {
      const totalRevpar = this.state.results.reduce((s, r) => s + r.revpar, 0);
      const totalComp = this.state.results.reduce((s, r) => s + r.compRevpar, 0);
      const wins = this.state.results.filter(r => r.revpar > r.compRevpar).length;
      const losses = this.state.results.filter(r => r.revpar < r.compRevpar).length;

      document.getElementById('finalYourRevpar').textContent = '¥' + totalRevpar.toLocaleString();
      document.getElementById('finalCompRevpar').textContent = '¥' + totalComp.toLocaleString();

      const ratio = totalComp > 0 ? totalRevpar / totalComp : 1;
      const rankEl = document.getElementById('finalRank');
      const trophyEl = document.getElementById('finalTrophy');
      const titleEl = document.getElementById('finalTitle');

      let rank, trophy, bg;
      if (ratio >= 1.05) {
        titleEl.textContent = '🏆 恭喜！你是收益管理大师';
        rank = `10轮中赢了 <strong>${wins}</strong> 轮，输了 <strong>${losses}</strong> 轮，总 RevPAR 超越竞品 ${((ratio-1)*100).toFixed(1)}%`;
        trophy = '🏆'; bg = 'rgba(76,175,134,0.12)';
      } else if (ratio >= 1.0) {
        titleEl.textContent = '🥈 优秀！成功超越了竞品';
        rank = `10轮中赢了 <strong>${wins}</strong> 轮，输了 <strong>${losses}</strong> 轮，总 RevPAR 超越竞品 ${((ratio-1)*100).toFixed(1)}%`;
        trophy = '🥈'; bg = 'rgba(76,175,134,0.08)';
      } else if (ratio >= 0.92) {
        titleEl.textContent = '🥉 接近竞品，还有提升空间';
        rank = `10轮中赢了 <strong>${wins}</strong> 轮，输了 <strong>${losses}</strong> 轮，总 RevPAR 落后竞品 ${((1-ratio)*100).toFixed(1)}%`;
        trophy = '🥉'; bg = 'rgba(212,165,116,0.12)';
      } else {
        titleEl.textContent = '📚 需要继续练习';
        rank = `10轮中赢了 <strong>${wins}</strong> 轮，输了 <strong>${losses}</strong> 轮，总 RevPAR 落后竞品 ${((1-ratio)*100).toFixed(1)}%`;
        trophy = '📚'; bg = 'rgba(232,93,93,0.08)';
      }

      rankEl.innerHTML = rank;
      rankEl.style.background = bg;
      trophyEl.textContent = trophy;

      this.drawFinalChart();
      App.updateDashboard('pricing', { totalRevpar, totalCompRevpar: totalComp, ratio });
      this.showStage('Final');
    },

    drawFinalChart() {
      const canvas = document.getElementById('finalChartCanvas');
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const results = this.state.results;
      const maxRev = Math.max(...results.map(r => Math.max(r.revpar, r.compRevpar))) * 1.1 || 100;
      const barW = 26, gap = 6, gW = barW * 2 + gap, gGap = 22;
      const startX = (W - (results.length * gW + (results.length - 1) * gGap)) / 2;
      const pad = { top: 30, bottom: 40 };

      ctx.strokeStyle = 'rgba(26,39,68,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(startX - 20, pad.top); ctx.lineTo(startX - 20, H - pad.bottom); ctx.lineTo(W - 20, H - pad.bottom); ctx.stroke();

      // 每轮标注胜负
      results.forEach((r, i) => {
        const gx = startX + i * (gW + gGap);
        const h1 = (r.revpar / maxRev) * (H - pad.top - pad.bottom);
        ctx.fillStyle = r.revpar >= r.compRevpar ? '#4caf86' : '#d4a574';
        ctx.beginPath(); ctx.roundRect(gx, H - pad.bottom - h1, barW, h1, [4,4,0,0]); ctx.fill();

        const h2 = (r.compRevpar / maxRev) * (H - pad.top - pad.bottom);
        ctx.fillStyle = 'rgba(26,39,68,0.25)';
        ctx.beginPath(); ctx.roundRect(gx + barW + gap, H - pad.bottom - h2, barW, h2, [4,4,0,0]); ctx.fill();

        ctx.fillStyle = 'rgba(26,39,68,0.4)'; ctx.font = '11px "Noto Sans SC"'; ctx.textAlign = 'center';
        ctx.fillText('R' + (i+1), gx + gW/2, H - pad.bottom + 16);
      });

      ctx.font = '13px "Noto Sans SC"'; ctx.textAlign = 'left';
      ctx.fillStyle = '#4caf86'; ctx.fillRect(W/2-100, 10, 14, 14);
      ctx.fillStyle = 'rgba(26,39,68,0.6)'; ctx.fillText('你', W/2-80, 22);
      ctx.fillStyle = 'rgba(26,39,68,0.25)'; ctx.fillRect(W/2-50, 10, 14, 14);
      ctx.fillStyle = 'rgba(26,39,68,0.6)'; ctx.fillText('竞品', W/2-30, 22);
    },

    restart() { this.start(); },
  };

  // ===== 游戏2: 超售博弈 =====
  const Overbooking = {
    state: { round: 0, totalRounds: OVERBOOKING_SCENARIOS.length, results: [], currentBookings: 108 },

    init() {
      document.getElementById('obGameStartBtn').addEventListener('click', () => this.start());
      document.getElementById('obgRollBtn').addEventListener('click', () => this.roll());
      document.getElementById('obgNextBtn').addEventListener('click', () => this.next());
      document.getElementById('obgRestartBtn').addEventListener('click', () => this.restart());
      const slider = document.getElementById('obgBookingsSlider2');
      const display = document.getElementById('obgBookingsDisplay');
      slider.addEventListener('input', () => {
        this.state.currentBookings = parseInt(slider.value);
        display.textContent = slider.value;
      });
    },

    start() { this.state.round = 0; this.state.results = []; this.showStage('Play'); this.loadRound(); },

    showStage(stage) {
      ['Start','Play','Result','Final'].forEach(s => {
        document.getElementById('obGame'+s).classList.add('hidden');
      });
      const cap = stage.charAt(0).toUpperCase() + stage.slice(1);
      document.getElementById('obGame'+cap).classList.remove('hidden');
    },

    loadRound() {
      const s = OVERBOOKING_SCENARIOS[this.state.round];
      document.getElementById('obgRoundNum').textContent = this.state.round + 1;
      document.getElementById('obgSceneIcon').textContent = s.icon;
      document.getElementById('obgSceneTitle').textContent = s.title;
      document.getElementById('obgSceneDesc').textContent = s.desc;
      document.getElementById('obgNoshowHint').textContent = '~' + Math.round(s.noshowRate * 100) + '%';
      const slider = document.getElementById('obgBookingsSlider2');
      slider.value = 108; this.state.currentBookings = 108;
      document.getElementById('obgBookingsDisplay').textContent = '108';
      this.renderHistory();
    },

    renderHistory() {
      const list = document.getElementById('obgHistoryList');
      list.innerHTML = '';
      if (this.state.results.length === 0) {
        list.innerHTML = '<div style="color:var(--text-light);font-size:13px;padding:8px;">暂无记录</div>';
        return;
      }
      this.state.results.forEach((r, i) => {
        const item = document.createElement('div');
        item.className = 'obg-hist-item';
        const revColor = r.netRevenue >= r.baselineRevenue ? 'var(--green)' : 'var(--red)';
        item.innerHTML = `<span class="hist-night">第${i+1}晚 · 预订${r.bookings}间</span><span class="hist-rev" style="color:${revColor}">¥${r.netRevenue.toLocaleString()}</span>`;
        list.appendChild(item);
      });
    },

    roll() {
      const s = OVERBOOKING_SCENARIOS[this.state.round];
      const bookings = this.state.currentBookings;
      const ROOMS = 100, PRICE = 500, WALK = 800;
      const noshowRate = s.noshowRate;
      const expNosh = bookings * noshowRate;
      const actualNosh = Math.round(Math.max(0, expNosh + (Math.random() - 0.5) * expNosh * 0.8));
      const fn = Math.min(actualNosh, bookings);
      const arr = bookings - fn;
      const ci = Math.min(arr, ROOMS);
      const wd = Math.max(0, arr - ROOMS);
      const rev = ci * PRICE;
      const cost = wd * WALK;
      const net = rev - cost;
      const bl = Math.round(ROOMS * PRICE * (1 - noshowRate));

      this.state.results.push({ round: this.state.round, bookings, noshow: fn, arrivals: arr, checkedIn: ci, walked: wd, netRevenue: net, baselineRevenue: bl });
      this.showResult(bookings, arr, ci, wd, fn, net, bl, s);
    },

    showResult(bookings, arrivals, checkedIn, walked, noshow, netRevenue, baseline, scenario) {
      document.getElementById('obgRmBookings').textContent = bookings;
      document.getElementById('obgRmArrivals').textContent = arrivals;
      document.getElementById('obgRmCheckedin').textContent = checkedIn;
      document.getElementById('obgRmWalkout').textContent = walked;
      document.getElementById('obgRmRevenue').textContent = '¥' + netRevenue.toLocaleString();

      const walkMetric = document.getElementById('obgRmWalkoutMetric');
      walkMetric.style.display = walked > 0 ? '' : 'none';

      this.renderGuestAnimation(arrivals, noshow, walked, checkedIn);

      // 详细计算展示
      const emptyRooms = Math.max(0, 100 - arrivals);
      let detailHTML = `
        <div class="calc-breakdown">
          <div class="calc-section">
            <div class="calc-title">📊 今晚计算明细</div>
            <div class="calc-row"><span>接受预订数</span><span>${bookings} 间</span></div>
            <div class="calc-row"><span>No-show 率（历史均值）</span><span>${Math.round(scenario.noshowRate * 100)}%</span></div>
            <div class="calc-row"><span>实际 No-show 数</span><span>${noshow} 人</span></div>
            <div class="calc-row"><span>实际到达</span><span>${arrivals} 人</span></div>
            <div class="calc-row"><span>成功入住</span><span>${checkedIn} 间</span></div>
            ${walked > 0 ? `<div class="calc-row" style="color:var(--red)"><span>😮 Walked 客人（需赔偿）</span><span>${walked} 人 × ¥800 = ¥${walked * 800}</span></div>` : ''}
            ${emptyRooms > 0 ? `<div class="calc-row" style="color:var(--red)"><span>📉 空置房间（收入损失）</span><span>${emptyRooms} 间 × ¥500 = ¥${emptyRooms * 500}</span></div>` : ''}
            <div class="calc-row"><span>客房收入</span><span>${checkedIn} × ¥500 = ¥${checkedIn * 500}</span></div>
            <div class="calc-row"><span>Walking 赔偿</span><span>-¥${walked * 800}</span></div>
            <div class="calc-row highlight-row"><span>净收入</span><span class="calc-revpar">¥${netRevenue.toLocaleString()}</span></div>
          </div>
          <div class="calc-section">
            <div class="calc-title">📈 对比：不超售的期望收入</div>
            <div class="calc-row"><span>不超售（只接受100间）</span><span>期望收入约 ¥${baseline.toLocaleString()}</span></div>
            <div class="calc-row highlight-row" style="color:${netRevenue >= baseline ? 'var(--green)' : 'var(--red)'}">
              <span>${netRevenue >= baseline ? '✅ 超售带来了额外收益' : '⚠️ 超售反而降低了收入'}</span>
              <span>${netRevenue >= baseline ? '+' : ''}¥${(netRevenue - baseline).toLocaleString()}</span>
            </div>
          </div>
        </div>
      `;

      // 建议
      let suggestion = '';
      if (walked > 0) {
        suggestion = `💡 Walking ${walked} 位客人，赔偿 ¥${walked * 800}。建议下次将预订数控制在 ${Math.round(bookings * 0.95)} 以下，减少 Walking 风险。`;
      } else if (emptyRooms > 0 && bookings < 108) {
        suggestion = `💡 有 ${emptyRooms} 间空房，超售不足。No-show 率约 ${Math.round(scenario.noshowRate * 100)}%，建议预订数设为 ${Math.round(100 / (1 - scenario.noshowRate))} 左右。`;
      } else if (emptyRooms > 0) {
        suggestion = `💡 有 ${emptyRooms} 间空房。考虑到 No-show 率约 ${Math.round(scenario.noshowRate * 100)}%，可适度增加超售。`;
      } else {
        suggestion = `💡 完美！没有空房也没有 Walking，收益最大化。`;
      }
      detailHTML += `<div class="calc-suggestion">${suggestion}</div>`;

      // 更新结果卡片中的详情区域
      let detailEl = document.getElementById('obgResultDetail');
      if (!detailEl) {
        detailEl = document.createElement('div');
        detailEl.id = 'obgResultDetail';
        document.querySelector('#obGameResult .obg-result-card').appendChild(detailEl);
      }
      detailEl.innerHTML = detailHTML;

      const nextBtn = document.getElementById('obgNextBtn');
      nextBtn.textContent = this.state.round >= this.state.totalRounds - 1 ? '查看最终结算 →' : '下一晚 →';

      this.showStage('Result');
    },

    renderGuestAnimation(arrivals, noshow, walked, checkedIn) {
      const area = document.getElementById('obgAnimArea');
      area.innerHTML = '';
      const guests = [];
      for (let i = 0; i < checkedIn; i++) guests.push({ type: 'checked-in', icon: '✓' });
      for (let i = 0; i < walked; i++) guests.push({ type: 'walked', icon: '✗' });
      for (let i = 0; i < noshow; i++) guests.push({ type: 'noshow', icon: '?' });
      guests.forEach((g, i) => {
        const el = document.createElement('div'); el.className = 'anim-guest ' + g.type;
        el.textContent = g.icon; el.style.animationDelay = (i * 20) + 'ms';
        area.appendChild(el);
      });
    },

    next() { this.state.round++; if (this.state.round >= this.state.totalRounds) this.showFinal(); else { this.loadRound(); this.showStage('Play'); } },

    showFinal() {
      const totalRev = this.state.results.reduce((s, r) => s + r.netRevenue, 0);
      const totalBL = this.state.results.reduce((s, r) => s + r.baselineRevenue, 0);
      const totalWalked = this.state.results.reduce((s, r) => s + r.walked, 0);
      document.getElementById('obgFinalRevenue').textContent = '¥' + totalRev.toLocaleString();
      document.getElementById('obgFinalBaseline').textContent = '¥' + totalBL.toLocaleString();

      const ratio = totalBL > 0 ? totalRev / totalBL : 1;
      const rankEl = document.getElementById('obgFinalRank');
      const trophyEl = document.getElementById('obgFinalTrophy');
      let rank, trophy, bg;
      if (ratio >= 1.05) {
        rank = '🏆 超售大师！超售策略显著提升了总收入（+' + ((ratio-1)*100).toFixed(1) + '%）';
        trophy = '🏆'; bg = 'rgba(76,175,134,0.12)';
      } else if (ratio >= 1.0) {
        rank = '🥈 不错！你的超售策略跑赢了不超售的基准线';
        trophy = '🥈'; bg = 'rgba(76,175,134,0.08)';
      } else if (ratio >= 0.94) {
        rank = '🥉 略低于基准，Walking 赔偿抵消了部分超售收益';
        trophy = '🥉'; bg = 'rgba(212,165,116,0.12)';
      } else {
        rank = '📚 超售过多——Walking 赔偿严重侵蚀了利润';
        trophy = '📚'; bg = 'rgba(232,93,93,0.08)';
      }
      if (totalWalked > 5) rank += `（共 ${totalWalked} 位客人被 Walked）`;

      rankEl.textContent = rank; rankEl.style.background = bg; trophyEl.textContent = trophy;
      App.updateDashboard('overbooking', { totalRevenue: totalRev, totalBaseline: totalBL, ratio });
      this.showStage('Final');
    },

    restart() { this.start(); },
  };

  // ===== 游戏3: 客户匹配（修复反馈语） =====
  const Segmentation = {
    state: { score: 0, combo: 0, maxCombo: 0, correct: 0, wrong: 0, timeLeft: 60, timer: null, queue: [], currentCustomer: null, locked: false },

    init() {
      document.getElementById('segGameStartBtn').addEventListener('click', () => this.start());
      document.getElementById('segRestartBtn').addEventListener('click', () => this.start());
      document.querySelectorAll('.seg-channel').forEach(btn => {
        btn.addEventListener('click', () => this.answer(btn.dataset.channel, btn));
      });
    },

    start() {
      this.state = { score: 0, combo: 0, maxCombo: 0, correct: 0, wrong: 0, timeLeft: 60, timer: null, queue: [], currentCustomer: null, locked: false };
      this.state.queue = [...SEGMENTATION_CUSTOMERS].sort(() => Math.random() - 0.5);
      document.getElementById('segGameStart').classList.add('hidden');
      document.getElementById('segGameFinal').classList.add('hidden');
      document.getElementById('segGamePlay').classList.remove('hidden');
      this.updateHUD(); this.nextCustomer();
      this.state.timer = setInterval(() => {
        this.state.timeLeft--;
        document.getElementById('segTimer').textContent = this.state.timeLeft + 's';
        if (this.state.timeLeft <= 10) document.getElementById('segTimer').style.color = 'var(--red)';
        if (this.state.timeLeft <= 0) this.end();
      }, 1000);
    },

    nextCustomer() {
      if (this.state.queue.length === 0) this.state.queue = [...SEGMENTATION_CUSTOMERS].sort(() => Math.random() - 0.5);
      this.state.currentCustomer = this.state.queue.shift();
      this.state.locked = false;
      const c = this.state.currentCustomer;
      document.getElementById('segCustIcon').textContent = c.icon;
      document.getElementById('segCustName').textContent = c.name;
      document.getElementById('segCustDesc').textContent = c.desc;
      document.querySelectorAll('.seg-channel').forEach(b => b.classList.remove('correct', 'wrong'));
      document.getElementById('segFeedback').textContent = '';
      document.getElementById('segFeedback').className = 'seg-feedback';
      const card = document.getElementById('segCustomerCard');
      card.style.animation = 'none'; void card.offsetWidth; card.style.animation = 'customerSlideIn 0.4s ease';
    },

    answer(channel, btn) {
      if (this.state.locked) return;
      this.state.locked = true;
      const correct = this.state.currentCustomer.channel === channel;
      const fb = document.getElementById('segFeedback');
      if (correct) {
        this.state.correct++; this.state.combo++; this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);
        const points = 10 + this.state.combo * 2; this.state.score += points;
        btn.classList.add('correct');
        fb.textContent = `✓ 正确！+${points} 分（${this.state.combo} 连击）`;
        fb.className = 'seg-feedback correct';
      } else {
        this.state.wrong++; this.state.combo = 0;
        this.state.score = Math.max(0, this.state.score - 5);
        btn.classList.add('wrong');
        document.querySelectorAll('.seg-channel').forEach(b => { if (b.dataset.channel === this.state.currentCustomer.channel) b.classList.add('correct'); });
        const chName = CHANNEL_INFO[this.state.currentCustomer.channel].name;
        const chPrice = CHANNEL_INFO[this.state.currentCustomer.channel].price;
        fb.innerHTML = `✗ 错误！正确答案：<strong>${chName}（¥${chPrice}）</strong>（-5 分）`;
        fb.className = 'seg-feedback wrong';
      }
      this.updateHUD();
      setTimeout(() => this.nextCustomer(), 1200);
    },

    updateHUD() {
      document.getElementById('segScore').textContent = this.state.score;
      document.getElementById('segCombo').textContent = this.state.combo;
      document.getElementById('segTimer').textContent = this.state.timeLeft + 's';
    },

    end() {
      clearInterval(this.state.timer);
      document.getElementById('segGamePlay').classList.add('hidden');
      document.getElementById('segGameFinal').classList.remove('hidden');
      document.getElementById('segFinalScore').textContent = this.state.score;
      document.getElementById('segFinalCorrect').textContent = this.state.correct;
      document.getElementById('segFinalWrong').textContent = this.state.wrong;
      document.getElementById('segFinalCombo').textContent = this.state.maxCombo;

      const rankEl = document.getElementById('segFinalRank');
      const trophyEl = document.getElementById('segFinalTrophy');
      let rank, trophy, bg;
      if (this.state.score >= 200) { rank = '🏆 细分大师！你对客户类型了如指掌'; trophy = '🏆'; bg = 'rgba(76,175,134,0.12)'; }
      else if (this.state.score >= 120) { rank = '🥈 优秀的市场分析师！'; trophy = '🥈'; bg = 'rgba(76,175,134,0.08)'; }
      else if (this.state.score >= 60) { rank = '🥉 合格，多练几次会更快更准'; trophy = '🥉'; bg = 'rgba(212,165,116,0.12)'; }
      else { rank = '📚 需要复习市场细分概念——再看一遍客人特征对比表'; trophy = '📚'; bg = 'rgba(232,93,93,0.08)'; }
      rankEl.textContent = rank; rankEl.style.background = bg; trophyEl.textContent = trophy;
      App.updateDashboard('segmentation', { score: this.state.score, correct: this.state.correct, wrong: this.state.wrong, maxCombo: this.state.maxCombo });
    },
  };

  // ===== 游戏4: 收益经理的一天 v4.0 — 引导式操作 =====
  const DayInTheLife = {
    state: { phaseIdx: 0, stepIdx: 0, _chosen: false },

    init() {
      document.getElementById('dilStartBtn').addEventListener('click', () => this.start());
      document.getElementById('dilRestartBtn').addEventListener('click', () => this.restart());
    },

    start() {
      this.state = { phaseIdx: 0, stepIdx: 0, _chosen: false };
      this.showStage('Play');
      this.loadStep();
    },

    showStage(stage) {
      ['Start','Play','Final'].forEach(s => {
        const el = document.getElementById('dilStage'+s);
        if (el) el.classList.add('hidden');
      });
      const cap = stage.charAt(0).toUpperCase() + stage.slice(1);
      const el = document.getElementById('dilStage'+cap);
      if (el) el.classList.remove('hidden');
    },

    _current() {
      const flow = DIL_DAY_FLOW;
      if (this.state.phaseIdx >= flow.phases.length) return null;
      const phase = flow.phases[this.state.phaseIdx];
      if (this.state.stepIdx >= phase.steps.length) return null;
      return { phase, step: phase.steps[this.state.stepIdx] };
    },

    _advance() {
      const flow = DIL_DAY_FLOW;
      const phase = flow.phases[this.state.phaseIdx];
      this.state.stepIdx++;
      if (this.state.stepIdx >= phase.steps.length) {
        this.state.phaseIdx++;
        this.state.stepIdx = 0;
      }
      if (this.state.phaseIdx >= flow.phases.length) {
        this.showFinal();
        return false;
      }
      return true;
    },

    loadStep() {
      const cur = this._current();
      if (!cur) { this.showFinal(); return; }

      const { phase, step } = cur;
      this.state._chosen = false;

      // === 顶部进度栏 ===
      const totalPhases = DIL_DAY_FLOW.phases.length;
      const totalSteps = DIL_DAY_FLOW.getTotalSteps();
      const globalStepNum = DIL_DAY_FLOW.phases.slice(0, this.state.phaseIdx)
        .reduce((s, p) => s + p.steps.length, 0) + this.state.stepIdx + 1;

      // 环节信息
      document.getElementById('dilPhaseIcon').textContent = phase.icon;
      document.getElementById('dilPhaseTitle').textContent = phase.title;
      document.getElementById('dilPhaseTime').textContent = phase.time;
      document.getElementById('dilStepCounter').textContent = '第 ' + (this.state.stepIdx + 1) + ' 步 / 共 ' + phase.steps.length + ' 步';
      document.getElementById('dilGlobalCounter').textContent = '进度 ' + globalStepNum + ' / ' + totalSteps;

      // === 引导提示语 ===
      document.getElementById('dilInstruction').textContent = step.instruction;

      // === 数据上下文 ===
      const ctxEl = document.getElementById('dilContext');
      if (step.context) {
        ctxEl.textContent = step.context;
        ctxEl.classList.remove('hidden');
      } else {
        ctxEl.classList.add('hidden');
      }

      // === 操作按钮 ===
      const actionsContainer = document.getElementById('dilActions');
      actionsContainer.innerHTML = '';
      step.actions.forEach((a, i) => {
        const btn = document.createElement('button');
        btn.className = 'dil-action-btn';
        btn.dataset.idx = i;
        btn.innerHTML = '<span class="dil-action-arrow">▸</span> ' + a.label;
        actionsContainer.appendChild(btn);
        btn.addEventListener('click', () => this.doAction(i));
      });

      // 隐藏结果区和继续按钮
      document.getElementById('dilResult').classList.add('hidden');
      document.getElementById('dilContinueBtn').classList.add('hidden');

      // 更新进度条
      document.getElementById('dilProgressFill').style.width =
        (globalStepNum / totalSteps * 100) + '%';

      // 滚动到顶部
      document.getElementById('dilStagePlay').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    doAction(idx) {
      if (this.state._chosen) return;
      this.state._chosen = true;

      const cur = this._current();
      if (!cur) return;
      const { step } = cur;
      const action = step.actions[idx];

      // 高亮选中的按钮，淡出其他
      const buttons = document.querySelectorAll('.dil-action-btn');
      buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === idx) btn.classList.add('dil-action-chosen');
        else btn.classList.add('dil-action-faded');
      });

      // 显示操作结果
      const resultEl = document.getElementById('dilResult');
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = '<div class="dil-result-label">📋 操作结果</div><div class="dil-result-text">' + action.result + '</div>';

      // 显示继续按钮
      const continueBtn = document.getElementById('dilContinueBtn');
      continueBtn.classList.remove('hidden');

      // 判断按钮文案
      const flow = DIL_DAY_FLOW;
      const isLastPhase = this.state.phaseIdx >= flow.phases.length - 1;
      const phase = flow.phases[this.state.phaseIdx];
      const isLastStep = this.state.stepIdx >= phase.steps.length - 1;

      if (isLastPhase && isLastStep) {
        continueBtn.textContent = '🎉 完成一天的工作';
      } else if (isLastStep) {
        continueBtn.textContent = '进入下一环节 →';
      } else {
        continueBtn.textContent = '继续 →';
      }
    },

    nextStep() {
      if (this._advance()) {
        this.loadStep();
      }
    },

    showFinal() {
      this.showStage('Final');
      // 统计完成的环节
      const phasesEl = document.getElementById('dilFinalPhases');
      phasesEl.innerHTML = '';
      DIL_DAY_FLOW.phases.forEach(p => {
        const el = document.createElement('div');
        el.className = 'dil-final-phase';
        el.innerHTML = '<span class="dil-final-phase-icon">' + p.icon + '</span><span class="dil-final-phase-name">' + p.time + ' ' + p.title + '</span><span class="dil-final-check">✓</span>';
        phasesEl.appendChild(el);
      });
      document.getElementById('dilStageFinal').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    restart() { this.start(); },
  };

  return { Pricing, Overbooking, Segmentation, DayInTheLife };
})();
