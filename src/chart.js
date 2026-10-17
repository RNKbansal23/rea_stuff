// Lightweight, retina-ready Canvas chart for Monkeytype results

export class TypingChart {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext("2d");
    this.data = []; // [{ second: 1, wpm: 75, rawWpm: 82, errors: 0 }]
    this.hoverIndex = -1;

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);

    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave);
  }

  setData(dataPoints) {
    this.data = dataPoints;
    this.hoverIndex = -1;
    this.render();
  }

  getColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      main: style.getPropertyValue("--main-color").trim() || "#e2b714",
      sub: style.getPropertyValue("--sub-color").trim() || "#646669",
      subAlt: style.getPropertyValue("--sub-alt-color").trim() || "#2c2e31",
      error: style.getPropertyValue("--error-color").trim() || "#ca4754",
      text: style.getPropertyValue("--text-color").trim() || "#d1d0c5",
      bg: style.getPropertyValue("--bg-color").trim() || "#323437"
    };
  }

  handleMouseMove(e) {
    if (!this.data || this.data.length < 2) return;
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const padding = { left: 45, right: 30 };
    const chartWidth = rect.width - padding.left - padding.right;

    let closestIdx = -1;
    let closestDist = Infinity;

    for (let i = 0; i < this.data.length; i++) {
      const x = padding.left + (i / (this.data.length - 1)) * chartWidth;
      const dist = Math.abs(mouseX - x);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    if (this.hoverIndex !== closestIdx) {
      this.hoverIndex = closestIdx;
      this.render();
    }
  }

  handleMouseLeave() {
    this.hoverIndex = -1;
    this.render();
  }

  render() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) return;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const colors = this.getColors();

    const padding = { top: 35, right: 30, bottom: 40, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    if (!this.data || this.data.length === 0) {
      this.ctx.fillStyle = colors.sub;
      this.ctx.font = "14px 'Roboto Mono', monospace";
      this.ctx.textAlign = "center";
      this.ctx.fillText("No test data recorded", width / 2, height / 2);
      return;
    }

    // Determine Y max
    let maxVal = Math.max(...this.data.map(d => Math.max(d.wpm || 0, d.rawWpm || 0)));
    maxVal = Math.max(40, Math.ceil((maxVal + 10) / 20) * 20);

    const getX = (i) => padding.left + (i / (this.data.length - 1 || 1)) * chartW;
    const getY = (val) => padding.top + chartH - (val / maxVal) * chartH;

    // Draw horizontal grid lines
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = colors.subAlt;
    this.ctx.fillStyle = colors.sub;
    this.ctx.font = "11px 'Roboto Mono', monospace";
    this.ctx.textAlign = "right";

    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const val = Math.round((maxVal / steps) * s);
      const y = getY(val);
      this.ctx.beginPath();
      this.ctx.moveTo(padding.left, y);
      this.ctx.lineTo(width - padding.right, y);
      this.ctx.stroke();

      this.ctx.fillText(val, padding.left - 10, y + 4);
    }

    // Draw X axis labels (seconds)
    this.ctx.textAlign = "center";
    const xStep = Math.max(1, Math.floor(this.data.length / 6));
    for (let i = 0; i < this.data.length; i += xStep) {
      const x = getX(i);
      this.ctx.fillText(`${this.data[i].second}s`, x, height - padding.bottom + 20);
    }

    // Draw Raw WPM Line (Subdued Gray dashed)
    this.ctx.beginPath();
    this.ctx.setLineDash([4, 4]);
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = colors.sub;
    for (let i = 0; i < this.data.length; i++) {
      const x = getX(i);
      const y = getY(this.data[i].rawWpm || 0);
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw WPM Line (Smooth Main Color)
    this.ctx.beginPath();
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = colors.main;
    for (let i = 0; i < this.data.length; i++) {
      const x = getX(i);
      const y = getY(this.data[i].wpm || 0);
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();

    // Fill under WPM line
    const gradient = this.ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, `${colors.main}22`);
    gradient.addColorStop(1, `${colors.main}00`);
    this.ctx.lineTo(getX(this.data.length - 1), height - padding.bottom);
    this.ctx.lineTo(getX(0), height - padding.bottom);
    this.ctx.closePath();
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Draw Error markers (red dots with count)
    for (let i = 0; i < this.data.length; i++) {
      const err = this.data[i].errors || 0;
      if (err > 0) {
        const x = getX(i);
        const y = getY(this.data[i].wpm || 0);

        this.ctx.beginPath();
        this.ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        this.ctx.fillStyle = colors.error;
        this.ctx.fill();
        this.ctx.strokeStyle = colors.bg;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      }
    }

    // Hover Indicator & Tooltip
    if (this.hoverIndex >= 0 && this.hoverIndex < this.data.length) {
      const pt = this.data[this.hoverIndex];
      const hx = getX(this.hoverIndex);
      const hy = getY(pt.wpm || 0);

      // Vertical guideline
      this.ctx.beginPath();
      this.ctx.strokeStyle = colors.sub;
      this.ctx.setLineDash([2, 2]);
      this.ctx.moveTo(hx, padding.top);
      this.ctx.lineTo(hx, height - padding.bottom);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Point circle
      this.ctx.beginPath();
      this.ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      this.ctx.fillStyle = colors.main;
      this.ctx.fill();
      this.ctx.strokeStyle = colors.bg;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Tooltip Card
      const tipText1 = `${pt.second}s — ${Math.round(pt.wpm)} wpm`;
      const tipText2 = `Raw: ${Math.round(pt.rawWpm)} | Errors: ${pt.errors || 0}`;

      this.ctx.font = "bold 12px 'Roboto Mono', monospace";
      const w1 = this.ctx.measureText(tipText1).width;
      this.ctx.font = "11px 'Roboto Mono', monospace";
      const w2 = this.ctx.measureText(tipText2).width;
      const tipW = Math.max(w1, w2) + 20;
      const tipH = 46;

      let tipX = hx - tipW / 2;
      if (tipX < padding.left) tipX = padding.left;
      if (tipX + tipW > width - padding.right) tipX = width - padding.right - tipW;
      let tipY = hy - tipH - 12;
      if (tipY < 10) tipY = hy + 15;

      this.ctx.fillStyle = colors.subAlt;
      this.ctx.strokeStyle = colors.sub;
      this.ctx.lineWidth = 1;
      this.roundRect(tipX, tipY, tipW, tipH, 6, true, true);

      this.ctx.fillStyle = colors.main;
      this.ctx.font = "bold 12px 'Roboto Mono', monospace";
      this.ctx.textAlign = "left";
      this.ctx.fillText(tipText1, tipX + 10, tipY + 18);

      this.ctx.fillStyle = colors.text;
      this.ctx.font = "11px 'Roboto Mono', monospace";
      this.ctx.fillText(tipText2, tipX + 10, tipY + 36);
    }
  }

  roundRect(x, y, w, h, r, fill, stroke) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
    if (fill) this.ctx.fill();
    if (stroke) this.ctx.stroke();
  }
}
