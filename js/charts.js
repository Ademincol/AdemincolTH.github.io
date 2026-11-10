/* =================================================================
   Ademincol RRHH — Gráficos D3 (Barras horizontales reutilizables)
   ================================================================= */
(function (window) {
  'use strict';

  var Utils = window.Ademincol.Utils;
  var measureCtx = document.createElement('canvas').getContext('2d');

  function textWidth(str, font) {
    measureCtx.font = font;
    return measureCtx.measureText(str).width;
  }

  function truncate(str, maxWidth, font) {
    if (textWidth(str, font) <= maxWidth) return str;
    var s = str;
    while (s.length > 1 && textWidth(s + '…', font) > maxWidth) {
      s = s.slice(0, -1);
    }
    return s + '…';
  }

  function countBy(rows, field) {
    var m = new Map();
    rows.forEach(function (r) {
      var v = (r[field] === null || r[field] === undefined || r[field] === '') ? 'Sin especificar' : r[field];
      m.set(v, (m.get(v) || 0) + 1);
    });
    return Array.from(m, function (kv) {
      return { label: kv[0], value: kv[1] };
    }).sort(function (a, b) {
      return b.value - a.value;
    });
  }

  function topNPlusOther(items, n) {
    if (items.length <= n) return items;
    var top = items.slice(0, n);
    var restTotal = items.slice(n).reduce(function (s, d) { return s + d.value; }, 0);
    var restCount = items.length - n;
    top.push({ label: 'Otros (' + restCount + ')', value: restTotal, isOther: true });
    return top;
  }

  function drawHBar(boxEl, items) {
    var svg = d3.select(boxEl).select('svg');
    if (svg.empty()) svg = d3.select(boxEl).append('svg').attr('role', 'img');

    var width = boxEl.clientWidth || 300;
    var rowH = 26;
    var height = Math.max(items.length * rowH + 14, 110);
    svg.attr('viewBox', '0 0 ' + width + ' ' + height);
    boxEl.style.minHeight = height + 'px';

    var labelFont = '12px "IBM Plex Sans", sans-serif';
    var maxLabelW = Math.min(width * 0.38, 160);
    var longest = items.reduce(function (m, d) {
      return Math.max(m, textWidth(String(d.label), labelFont));
    }, 0);
    var labelColW = Math.min(Math.max(longest + 8, 50), maxLabelW);
    var total = d3.sum(items, function (d) { return d.value; }) || 1;
    var maxVal = d3.max(items, function (d) { return d.value; }) || 1;
    var leftPad = labelColW + 10, valueColW = 74;
    var barMax = Math.max(width - leftPad - valueColW - 8, 20);
    var x = d3.scaleLinear().domain([0, maxVal]).range([0, barMax]);

    var accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#2f5d53';
    var muted = getComputedStyle(document.body).getPropertyValue('--chart-muted').trim() || '#c7cbc2';

    var g = svg.selectAll('g.row').data(items, function (d) { return d.label; });
    g.exit().remove();

    var gEnter = g.enter().append('g').attr('class', 'row');
    gEnter.append('text').attr('class', 'cat-label');
    gEnter.append('rect');
    gEnter.append('text').attr('class', 'bar-label');

    var gAll = gEnter.merge(g);
    gAll.attr('transform', function (d, i) {
      return 'translate(0,' + (i * rowH + 7) + ')';
    });

    gAll.select('text.cat-label')
      .attr('x', labelColW)
      .attr('y', rowH / 2 + 1)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .style('fill', 'var(--ink)')
      .style('font-size', '12px')
      .style('opacity', function (d) { return d.isOther ? 0.7 : 1; })
      .text(function (d) { return truncate(String(d.label), labelColW - 4, labelFont); })
      .selectAll('title')
      .data(function (d) { return [d.label]; })
      .join('title')
      .text(function (d) { return d; });

    gAll.select('rect')
      .attr('x', leftPad)
      .attr('y', 4)
      .attr('height', rowH - 10)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', function (d) { return d.isOther ? muted : accent; })
      .attr('width', function (d) { return Math.max(x(d.value), 2); });

    gAll.select('text.bar-label')
      .attr('y', rowH / 2 + 1)
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .style('fill', 'var(--ink)')
      .attr('x', function (d) { return leftPad + Math.max(x(d.value), 2) + 7; })
      .text(function (d) {
        return Utils.fmtInt(d.value) + ' (' + Utils.fmtPct(d.value / total * 100) + '%)';
      });

    var tip = d3.select(boxEl).select('div.tooltip');
    if (tip.empty()) tip = d3.select(boxEl).append('div').attr('class', 'tooltip');

    gAll.on('mousemove', function (event, d) {
      var rect = boxEl.getBoundingClientRect();
      tip.classed('show', true)
        .style('left', Math.min(event.clientX - rect.left + 10, width - 150) + 'px')
        .style('top', (event.clientY - rect.top - 28) + 'px')
        .html('<b>' + Utils.escapeHtml(d.label) + '</b><br>' + Utils.fmtInt(d.value) + ' · ' + Utils.fmtPct(d.value / total * 100) + '%');
    }).on('mouseleave', function () {
      tip.classed('show', false);
    });
  }

  function renderChart(boxId, rows, field, topN) {
    var items = countBy(rows, field);
    if (topN) items = topNPlusOther(items, topN);
    var box = document.getElementById(boxId);
    if (!box) return;
    if (!items.length) {
      d3.select(box).selectAll('svg').selectAll('*').remove();
      return;
    }
    drawHBar(box, items);
  }

  var Charts = {
    renderChart: renderChart,
    countBy: countBy
  };

  window.Ademincol = window.Ademincol || {};
  window.Ademincol.Charts = Charts;

})(window);

