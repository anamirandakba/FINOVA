/* ═══════════════════════════════════════════
   FINOVA — script.js
   Fintech Professional UI — No emojis
   ═══════════════════════════════════════════ */

// ── State ─────────────────────────────────
let incomes     = JSON.parse(localStorage.getItem('finova_incomes'))     || [];
let expenses    = JSON.parse(localStorage.getItem('finova_expenses'))    || [];
let simulations = JSON.parse(localStorage.getItem('finova_simulations')) || [];

let financeChart  = null;
let categoryChart = null;
let simChart      = null;

// ── Classification ────────────────────────
const NECESSARY   = ['comida','transporte','servicios'];
const UNNECESSARY = ['entretenimiento','compras_online'];

function classifyExpense(cat) {
  if (NECESSARY.includes(cat))   return 'necessary';
  if (UNNECESSARY.includes(cat)) return 'unnecessary';
  return 'others';
}

const CAT_LABELS = {
  comida:'Alimentación', transporte:'Transporte', servicios:'Servicios',
  entretenimiento:'Entretenimiento', compras_online:'Compras en línea', otros:'Otros'
};
const TYPE_LABELS  = { necessary:'Necesario', unnecessary:'Innecesario', others:'Otro' };
const INV_RATES    = { acciones:.10, fondos:.07, cetes:.10, ahorro_largo:.04 };
const INV_NAMES    = { acciones:'Acciones', fondos:'Fondos de Inversión', cetes:'CETES', ahorro_largo:'Ahorro L/P' };

// ── Persistence ───────────────────────────
function save() {
  localStorage.setItem('finova_incomes',     JSON.stringify(incomes));
  localStorage.setItem('finova_expenses',    JSON.stringify(expenses));
  localStorage.setItem('finova_simulations', JSON.stringify(simulations));
}

// ── Totals ────────────────────────────────
function totals() {
  const totalIncome  = incomes.reduce((s,r) => s + r.amount, 0);
  const totalExpense = expenses.reduce((s,r) => s + r.amount, 0);
  const necessary    = expenses.filter(e => e.type==='necessary').reduce((s,r) => s+r.amount, 0);
  const unnecessary  = expenses.filter(e => e.type==='unnecessary').reduce((s,r) => s+r.amount, 0);
  const others       = expenses.filter(e => e.type==='others').reduce((s,r) => s+r.amount, 0);
  const balance      = totalIncome - totalExpense;
  const saving       = balance > 0 ? balance * 0.20 : 0;
  return { totalIncome, totalExpense, necessary, unnecessary, others, balance, saving };
}

function fmt(n) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// ── KPI Cards ─────────────────────────────
function updateCards() {
  const t = totals();
  document.getElementById('total-ingresos').textContent  = fmt(t.totalIncome);
  document.getElementById('total-gastos').textContent    = fmt(t.totalExpense);
  const balEl = document.getElementById('balance');
  balEl.textContent = fmt(t.balance);
  balEl.style.color = t.balance >= 0 ? 'var(--c-green)' : 'var(--c-red)';
  document.getElementById('ahorro-sugerido').textContent = fmt(t.saving);
}

// ── Savings section ───────────────────────
function updateSavings() {
  const t = totals();
  document.getElementById('savings-display').textContent = fmt(t.saving);
  document.getElementById('sb-income').textContent       = fmt(t.totalIncome);
  document.getElementById('sb-necessary').textContent    = fmt(t.necessary);
  document.getElementById('sb-unnecessary').textContent  = fmt(t.unnecessary);
  document.getElementById('sb-others').textContent       = fmt(t.others);
  document.getElementById('sb-balance').textContent      = fmt(t.balance);
  document.getElementById('sb-saving').textContent       = fmt(t.saving);

  // Ring animation
  const pct = t.totalIncome > 0 ? Math.min((t.saving / t.totalIncome) * 100, 100) : 0;
  const circle = document.getElementById('savings-ring-circle');
  if (circle) circle.style.strokeDashoffset = 314 - (pct / 100) * 314;
}

// ── Tables ────────────────────────────────
function renderIncomeTable() {
  const tbody = document.getElementById('tbody-income');
  if (!incomes.length) { tbody.innerHTML = '<tr><td colspan="4" class="fnv-empty">Sin registros</td></tr>'; return; }
  tbody.innerHTML = [...incomes].reverse().map((r,i) => {
    const idx = incomes.length-1-i;
    return `<tr>
      <td class="fw-500">${r.concept}</td>
      <td style="color:var(--c-green);font-weight:600">${fmt(r.amount)}</td>
      <td class="text-secondary">${r.date}</td>
      <td><button class="fnv-del" onclick="deleteIncome(${idx})"><i class="bi bi-trash3"></i></button></td>
    </tr>`;
  }).join('');
}

function renderExpenseTable() {
  const tbody = document.getElementById('tbody-expense');
  if (!expenses.length) { tbody.innerHTML = '<tr><td colspan="6" class="fnv-empty">Sin registros</td></tr>'; return; }
  tbody.innerHTML = [...expenses].reverse().map((r,i) => {
    const idx = expenses.length-1-i;
    const badge = `<span class="fnv-badge fnv-badge--${r.type}">${TYPE_LABELS[r.type]}</span>`;
    return `<tr class="row-${r.type}">
      <td class="fw-500">${r.concept}</td>
      <td><span class="fnv-badge fnv-badge--cat">${CAT_LABELS[r.category]||r.category}</span></td>
      <td style="font-weight:600">${fmt(r.amount)}</td>
      <td class="text-secondary">${r.date}</td>
      <td>${badge}</td>
      <td><button class="fnv-del" onclick="deleteExpense(${idx})"><i class="bi bi-trash3"></i></button></td>
    </tr>`;
  }).join('');
}

function renderRecentTables() {
  const tbi = document.getElementById('tbody-recent-income');
  const last5i = incomes.slice(-5).reverse();
  tbi.innerHTML = last5i.length
    ? last5i.map(r=>`<tr><td class="fw-500">${r.concept}</td><td style="color:var(--c-green);font-weight:600">${fmt(r.amount)}</td><td class="text-secondary">${r.date}</td></tr>`).join('')
    : '<tr><td colspan="3" class="fnv-empty">Sin registros</td></tr>';

  const tbe = document.getElementById('tbody-recent-expense');
  const last5e = expenses.slice(-5).reverse();
  tbe.innerHTML = last5e.length
    ? last5e.map(r=>`<tr class="row-${r.type}"><td class="fw-500">${r.concept}</td><td><span class="fnv-badge fnv-badge--cat">${CAT_LABELS[r.category]||r.category}</span></td><td style="font-weight:600">${fmt(r.amount)}</td></tr>`).join('')
    : '<tr><td colspan="3" class="fnv-empty">Sin registros</td></tr>';
}

// ── Charts ────────────────────────────────
function updateCharts() {
  const t = totals();
  Chart.defaults.font.family = 'Poppins, sans-serif';

  const ctx1 = document.getElementById('financeChart').getContext('2d');
  if (financeChart) financeChart.destroy();
  financeChart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: ['Ingresos','Gastos','Ahorro'],
      datasets: [{
        data: [t.totalIncome, t.totalExpense, t.saving],
        backgroundColor: ['rgba(31,122,99,.85)','rgba(220,38,38,.85)','rgba(20,184,166,.85)'],
        borderRadius: 8, borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend:{ display:false } },
      scales: {
        y: { beginAtZero:true, grid:{ color:'#EFF6FF' }, ticks:{ callback:v=>'$'+v.toLocaleString(), font:{size:11} } },
        x: { grid:{ display:false }, ticks:{ font:{size:12, weight:'600'} } }
      }
    }
  });

  const catMap = {};
  expenses.forEach(e => { const l=CAT_LABELS[e.category]||e.category; catMap[l]=(catMap[l]||0)+e.amount; });
  const ctx2 = document.getElementById('categoryChart').getContext('2d');
  if (categoryChart) categoryChart.destroy();
  if (!Object.keys(catMap).length) {
    categoryChart = new Chart(ctx2, {
      type:'doughnut',
      data:{ labels:['Sin gastos'], datasets:[{data:[1], backgroundColor:['#E2E8F0']}] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}} }
    });
  } else {
    categoryChart = new Chart(ctx2, {
      type:'doughnut',
      data:{
        labels: Object.keys(catMap),
        datasets:[{ data:Object.values(catMap), backgroundColor:['#1F7A63','#1E3A8A','#D97706','#DC2626','#7C3AED','#0F766E'], hoverOffset:6, borderWidth:2, borderColor:'#fff' }]
      },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom',labels:{font:{size:11},boxWidth:12,padding:12}}} }
    });
  }
}

// ── Investment Section ────────────────────
function updateInvestmentSection() {
  const t = totals();
  const capital = t.saving;
  document.getElementById('inv-capital').textContent = fmt(capital);

  const pct = t.totalIncome > 0 ? Math.min((capital / t.totalIncome)*100, 100) : 0;
  const offset = 314 - (pct/100)*314;
  const ringEl = document.getElementById('ring-fill-circle');
  if (ringEl) { ringEl.style.strokeDashoffset = offset; }
  document.getElementById('ring-pct').textContent = pct.toFixed(1)+'%';

  const hint = document.getElementById('sim-hint');
  if (hint) hint.textContent = capital > 0
    ? `Capital disponible: ${fmt(capital)}`
    : 'Incrementa tu ahorro para tener capital disponible';

  renderInvestmentSuggestions(t, capital);
}

// ── Investment Suggestions ────────────────
function renderInvestmentSuggestions(t, capital) {
  const container = document.getElementById('inv-suggestions');
  const items = [];

  const pctSave    = t.totalIncome > 0 ? (capital/t.totalIncome)*100 : 0;
  const pctUnnec   = t.totalIncome > 0 ? (t.unnecessary/t.totalIncome)*100 : 0;
  const pctExpense = t.totalIncome > 0 ? (t.totalExpense/t.totalIncome)*100 : 0;

  if (t.totalIncome === 0) {
    items.push({ cls:'info', icon:'bi-info-circle', text:'Registra tus ingresos y gastos para recibir sugerencias de inversión personalizadas.' });
  } else if (t.balance <= 0) {
    items.push({ cls:'neg', icon:'bi-x-octagon', text:'<strong>No se recomienda invertir en este momento.</strong> Tu balance actual es negativo o nulo. Prioriza reducir gastos y estabilizar tu flujo financiero.' });
    items.push({ cls:'warn', icon:'bi-exclamation-triangle', text:`Tus gastos superan tus ingresos por ${fmt(Math.abs(t.balance))}. Elimina gastos innecesarios (${fmt(t.unnecessary)}) antes de considerar inversiones.` });
  } else {
    if (pctSave >= 20) {
      items.push({ cls:'pos', icon:'bi-check-circle', text:`Tu nivel de ahorro es del <strong>${pctSave.toFixed(1)}%</strong> de tus ingresos. Con ${fmt(capital)} disponibles, estás en posición sólida para comenzar a invertir.` });
      items.push({ cls:'pos', icon:'bi-bank', text:`<strong>Opción recomendada:</strong> CETES, el instrumento de deuda más seguro del gobierno mexicano (~10% anual). Con ${fmt(capital)}, en un año podrías alcanzar ${fmt(capital*1.10)}.` });
      items.push({ cls:'info', icon:'bi-building', text:`Para diversificar, considera destinar una parte a <strong>Fondos de Inversión</strong> (~7% anual). Reducen el riesgo individual al distribuir el capital en múltiples activos.` });
      if (capital >= 10000) {
        items.push({ cls:'info', icon:'bi-graph-up-arrow', text:`Con capital superior a $10,000 puedes explorar <strong>acciones de empresas consolidadas</strong>. Rendimiento histórico promedio: ~10% anual, con mayor volatilidad.` });
      }
    } else if (pctSave >= 10) {
      items.push({ cls:'warn', icon:'bi-arrow-up-circle', text:`Tu ahorro representa el <strong>${pctSave.toFixed(1)}%</strong> de tus ingresos. Es un inicio correcto, pero la meta recomendada es 20%. Reducir gastos innecesarios acelerará este objetivo.` });
      items.push({ cls:'info', icon:'bi-bank', text:`Con ${fmt(capital)} disponibles, <strong>CETES</strong> o una cuenta de <strong>ahorro a largo plazo</strong> son las alternativas de menor riesgo para comenzar.` });
      if (pctUnnec > 15) items.push({ cls:'warn', icon:'bi-scissors', text:`Tus gastos innecesarios son del <strong>${pctUnnec.toFixed(1)}%</strong>. Reducirlos liberaría capital adicional para inversión.` });
    } else if (pctSave > 0) {
      items.push({ cls:'warn', icon:'bi-exclamation-circle', text:`Tu ahorro disponible (${fmt(capital)}) representa solo el <strong>${pctSave.toFixed(1)}%</strong> de tus ingresos. Se recomienda consolidar al menos el 20% antes de invertir activamente.` });
      items.push({ cls:'info', icon:'bi-lock', text:`Si deseas comenzar, el <strong>ahorro a largo plazo</strong> o los <strong>CETES</strong> ofrecen la mayor seguridad con el capital que dispones actualmente.` });
    }

    if (pctUnnec > 30) {
      items.push({ cls:'neg', icon:'bi-x-circle', text:`Tus gastos innecesarios (${fmt(t.unnecessary)}) representan el ${pctUnnec.toFixed(1)}% de tus ingresos — nivel crítico. Reducir entretenimiento y compras en línea debe ser la prioridad inmediata.` });
    }

    if (pctExpense > 80 && t.balance > 0) {
      items.push({ cls:'warn', icon:'bi-clipboard-data', text:`El ${pctExpense.toFixed(1)}% de tus ingresos se destina a gastos. Antes de incrementar inversiones, trabaja en equilibrar tu presupuesto mensual.` });
    }

    if (capital >= 5000) {
      items.push({ cls:'pos', icon:'bi-pie-chart', text:`<strong>Estrategia de diversificación sugerida:</strong> 40% CETES (capital seguro), 35% Fondos de Inversión (crecimiento moderado), 25% Ahorro a largo plazo (reserva estable).` });
    }
  }

  if (!items.length) {
    items.push({ cls:'info', icon:'bi-info-circle', text:'Agrega más datos financieros para obtener sugerencias detalladas.' });
  }

  const clsMap = { pos:'fnv-sug--pos', warn:'fnv-sug--warn', neg:'fnv-sug--neg', info:'fnv-sug--info' };
  container.innerHTML = items.map((item,i) =>
    `<div class="fnv-sug ${clsMap[item.cls]}" style="animation-delay:${i*.08}s">
      <i class="bi ${item.icon}"></i>
      <span>${item.text}</span>
    </div>`
  ).join('');
}

// ── Simulator ─────────────────────────────
document.getElementById('sim-years').addEventListener('input', function() {
  document.getElementById('sim-years-label').textContent = this.value + ' año' + (this.value==1?'':'s');
});

document.getElementById('btn-simulate').addEventListener('click', runSimulation);

function runSimulation() {
  const type   = document.getElementById('sim-type').value;
  const amount = parseFloat(document.getElementById('sim-amount').value);
  const years  = parseInt(document.getElementById('sim-years').value);
  const freq   = document.getElementById('sim-freq').value;
  if (!amount || amount <= 0) { showToast('Ingresa una cantidad válida'); return; }

  const rate = INV_RATES[type];
  const yearlyData = [];
  let finalValue;

  if (freq === 'once') {
    for (let y=1; y<=years; y++) yearlyData.push({ year:y, value: amount * Math.pow(1+rate, y) });
    finalValue = yearlyData[yearlyData.length-1].value;
  } else if (freq === 'monthly') {
    const mr = rate/12;
    for (let y=1; y<=years; y++) {
      const m = y*12;
      yearlyData.push({ year:y, value: amount * ((Math.pow(1+mr,m)-1)/mr) * (1+mr) });
    }
    finalValue = yearlyData[yearlyData.length-1].value;
  } else {
    let acc=0;
    for (let y=1; y<=years; y++) { acc=(acc+amount)*(1+rate); yearlyData.push({ year:y, value:acc }); }
    finalValue = acc;
  }

  const totalInvested = freq==='once' ? amount : (freq==='monthly' ? amount*12*years : amount*years);
  const gain    = finalValue - totalInvested;
  const gainPct = ((gain/totalInvested)*100).toFixed(1);

  // Show result
  document.getElementById('sim-placeholder').style.display = 'none';
  const result = document.getElementById('sim-result');
  result.style.display = 'block';

  document.getElementById('result-type-badge').textContent = INV_NAMES[type];
  document.getElementById('res-initial').textContent = freq==='once' ? fmt(amount) : fmt(totalInvested)+' total';
  document.getElementById('res-final').textContent   = fmt(finalValue);
  document.getElementById('res-gain').textContent    = fmt(gain);
  document.getElementById('res-gain-pct').textContent = '+'+gainPct+'%';

  // Breakdown hitos
  const step = Math.max(1, Math.floor(years/5));
  const hitos = yearlyData.filter((_,i) => (i+1)%step===0 || i===yearlyData.length-1);
  document.getElementById('res-breakdown').innerHTML = hitos.map(d =>
    `<div class="breakdown-yr"><span>Año ${d.year}</span><strong>${fmt(d.value)}</strong></div>`
  ).join('');

  // Mini chart
  const ctx = document.getElementById('simChart').getContext('2d');
  if (simChart) simChart.destroy();
  Chart.defaults.font.family = 'Poppins, sans-serif';
  simChart = new Chart(ctx, {
    type:'line',
    data:{
      labels: yearlyData.map(d=>'A'+d.year),
      datasets:[
        { label:'Valor estimado', data:yearlyData.map(d=>d.value), borderColor:'#1F7A63', backgroundColor:'rgba(31,122,99,.08)', fill:true, tension:.4, pointRadius:2, borderWidth:2 },
        { label:'Capital invertido', data:yearlyData.map((_,i)=>freq==='once'?amount:(freq==='monthly'?amount*12*(i+1):amount*(i+1))), borderColor:'#3B82F6', borderDash:[5,5], fill:false, tension:.4, pointRadius:0, borderWidth:1.5 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{ font:{size:11}, boxWidth:12, padding:12 } } },
      scales:{ y:{ ticks:{ callback:v=>'$'+v.toLocaleString(), font:{size:10} }, grid:{color:'#EFF6FF'} }, x:{ grid:{display:false}, ticks:{font:{size:10}} } }
    }
  });

  result.dataset.pending = JSON.stringify({ type, amount, years, freq, totalInvested, finalValue, gain, gainPct, date:new Date().toLocaleDateString('es-MX') });
  result.scrollIntoView({ behavior:'smooth', block:'nearest' });
  showToast('Proyección calculada correctamente');
}

document.getElementById('btn-save-sim').addEventListener('click', () => {
  const result = document.getElementById('sim-result');
  if (!result.dataset.pending) return;
  simulations.push({ id:Date.now(), ...JSON.parse(result.dataset.pending) });
  save();
  renderSimulationsTable();
  showToast('Simulación guardada');
});

function renderSimulationsTable() {
  const tbody = document.getElementById('tbody-simulations');
  if (!simulations.length) { tbody.innerHTML='<tr><td colspan="7" class="fnv-empty">Sin simulaciones guardadas</td></tr>'; return; }
  const freqLbl = { once:'Una vez', monthly:'Mensual', yearly:'Anual' };
  tbody.innerHTML = [...simulations].reverse().map((s,i) => {
    const idx = simulations.length-1-i;
    return `<tr>
      <td><span class="fnv-badge-inv">${INV_NAMES[s.type]||s.type}</span></td>
      <td>${fmt(s.amount)} <span class="text-secondary" style="font-size:.78rem">(${freqLbl[s.freq]||s.freq})</span></td>
      <td>${s.years} año${s.years===1?'':'s'}</td>
      <td style="font-weight:600;color:var(--c-green)">${fmt(s.finalValue)}</td>
      <td style="color:var(--c-teal)">+${fmt(s.gain)} <span style="font-size:.75rem">(+${s.gainPct}%)</span></td>
      <td class="text-secondary">${s.date}</td>
      <td><button class="fnv-del" onclick="deleteSimulation(${idx})"><i class="bi bi-trash3"></i></button></td>
    </tr>`;
  }).join('');
}

function deleteSimulation(idx) {
  if (!confirm('¿Eliminar esta simulación?')) return;
  simulations.splice(idx,1); save(); renderSimulationsTable(); showToast('Simulación eliminada');
}

// ── Income / Expense CRUD ──────────────────
document.getElementById('btn-add-income').addEventListener('click', () => {
  const concept = document.getElementById('income-concept').value.trim();
  const amount  = parseFloat(document.getElementById('income-amount').value);
  const date    = document.getElementById('income-date').value;
  if (!concept) return showToast('Escribe el concepto del ingreso');
  if (!amount||amount<=0) return showToast('Ingresa un monto válido');
  if (!date)    return showToast('Selecciona una fecha');
  incomes.push({ id:Date.now(), concept, amount, date });
  document.getElementById('income-concept').value='';
  document.getElementById('income-amount').value='';
  document.getElementById('income-date').value='';
  refreshAll();
  showToast('Ingreso registrado correctamente');
});

document.getElementById('btn-add-expense').addEventListener('click', () => {
  const concept  = document.getElementById('expense-concept').value.trim();
  const amount   = parseFloat(document.getElementById('expense-amount').value);
  const category = document.getElementById('expense-category').value;
  const date     = document.getElementById('expense-date').value;
  if (!concept)  return showToast('Escribe el concepto del gasto');
  if (!amount||amount<=0) return showToast('Ingresa un monto válido');
  if (!category) return showToast('Selecciona una categoría');
  if (!date)     return showToast('Selecciona una fecha');
  const type = classifyExpense(category);
  expenses.push({ id:Date.now(), concept, amount, category, date, type });
  document.getElementById('expense-concept').value='';
  document.getElementById('expense-amount').value='';
  document.getElementById('expense-category').value='';
  document.getElementById('expense-date').value='';
  document.getElementById('classification-preview').style.display='none';
  refreshAll();
  showToast('Gasto registrado correctamente');
});

document.getElementById('expense-category').addEventListener('change', function() {
  const preview = document.getElementById('classification-preview');
  if (!this.value) { preview.style.display='none'; return; }
  const type = classifyExpense(this.value);
  const map = {
    necessary:   { cls:'cp--necessary',   icon:'bi-check-circle', text:'Gasto necesario — clasificado como prioritario' },
    unnecessary: { cls:'cp--unnecessary', icon:'bi-x-circle',     text:'Gasto innecesario — considera si es prescindible' },
    others:      { cls:'cp--neutral',     icon:'bi-dash-circle',  text:'Otro tipo de gasto — clasificación neutral' }
  };
  const m = map[type];
  preview.className = `fnv-classify-preview ${m.cls}`;
  preview.innerHTML = `<i class="bi ${m.icon}"></i><span>${m.text}</span>`;
  preview.style.display='flex';
});

function deleteIncome(idx)  { if (!confirm('¿Eliminar este ingreso?'))  return; incomes.splice(idx,1);  refreshAll(); showToast('Ingreso eliminado'); }
function deleteExpense(idx) { if (!confirm('¿Eliminar este gasto?'))    return; expenses.splice(idx,1); refreshAll(); showToast('Gasto eliminado'); }

// ── Report / AI ────────────────────────────
document.getElementById('btn-generate-report').addEventListener('click', generateReport);

function generateReport() {
  const t = totals();
  if (!incomes.length && !expenses.length) { showToast('Registra datos para generar el análisis'); return; }
  const items = [];
  let score = 50;

  if (t.totalIncome === 0) {
    items.push({ cls:'warn', icon:'bi-exclamation-circle', text:'No tienes ingresos registrados. Agrega tus fuentes de ingreso para un análisis completo.' });
  } else {
    items.push({ cls:'info', icon:'bi-wallet2', text:`Ingresos totales: ${fmt(t.totalIncome)}. ${t.totalIncome>=10000?'Nivel de ingresos sólido.':'Considera diversificar tus fuentes de ingreso.'}` });
    score += 10;
  }

  const pctUnnec = t.totalIncome>0 ? (t.unnecessary/t.totalIncome)*100 : 0;
  if (t.unnecessary>0) {
    if (pctUnnec>30)       { items.push({ cls:'neg',  icon:'bi-x-octagon',          text:`Gastos innecesarios en ${fmt(t.unnecessary)} (${pctUnnec.toFixed(1)}% de ingresos). Nivel crítico. Reduce entretenimiento y compras en línea de forma inmediata.` }); score-=15; }
    else if (pctUnnec>15)  { items.push({ cls:'warn', icon:'bi-exclamation-triangle',text:`Gastos innecesarios: ${fmt(t.unnecessary)} (${pctUnnec.toFixed(1)}%). Nivel moderado — reducirlos incrementaría tu capacidad de ahorro.` }); score-=5; }
    else                   { items.push({ cls:'pos',  icon:'bi-check-circle',        text:`Gastos innecesarios controlados (${pctUnnec.toFixed(1)}%). Buen manejo del gasto discrecional.` }); score+=10; }
  }

  const entertain = expenses.filter(e=>e.category==='entretenimiento').reduce((s,r)=>s+r.amount,0);
  if (entertain > t.totalIncome*0.15) { items.push({ cls:'warn', icon:'bi-display', text:`Entretenimiento: ${fmt(entertain)} — supera el 15% recomendado de tus ingresos. Establece un límite mensual.` }); score-=8; }

  const online = expenses.filter(e=>e.category==='compras_online').reduce((s,r)=>s+r.amount,0);
  if (online > t.totalIncome*0.10) { items.push({ cls:'warn', icon:'bi-bag', text:`Compras en línea: ${fmt(online)}. Verifica si son necesarias antes de comprar para reducir gastos impulsivos.` }); score-=5; }

  if (t.balance<0) {
    items.push({ cls:'neg', icon:'bi-graph-down-arrow', text:`Balance negativo (${fmt(t.balance)}). Los gastos superan los ingresos. Es prioritario corregir esta situación.` }); score-=20;
  } else {
    const pctSave = t.totalIncome>0 ? (t.saving/t.totalIncome)*100 : 0;
    if (pctSave>=20) { items.push({ cls:'pos', icon:'bi-safe2', text:`Excelente. Ahorro potencial de ${fmt(t.saving)} (${pctSave.toFixed(1)}%). Cumples la regla del 20%. Considera invertir este excedente.` }); score+=20; }
    else if (pctSave>0) { items.push({ cls:'warn', icon:'bi-arrow-up-circle', text:`Ahorro potencial: ${fmt(t.saving)} (${pctSave.toFixed(1)}%). La meta óptima es el 20% de los ingresos.` }); score+=5; }
  }

  if (t.necessary>0 && t.necessary<=t.totalIncome*0.50) { items.push({ cls:'pos', icon:'bi-check2-all', text:`Gastos necesarios (${fmt(t.necessary)}) dentro del 50% recomendado. Buena gestión de prioridades.` }); score+=10; }
  if (!expenses.length) items.push({ cls:'info', icon:'bi-info-circle', text:'Sin gastos registrados. Agrégalos para un análisis más preciso.' });

  score = Math.max(0, Math.min(100, score));
  const finalMsg = score>=80
    ? { cls:'pos',  icon:'bi-star', text:'Excelente salud financiera. Mantén la disciplina y considera diversificar tu portafolio de inversión para hacer crecer tu patrimonio. Revisa la sección Inversiones.' }
    : score>=55
    ? { cls:'info', icon:'bi-graph-up', text:'Gestión financiera correcta con margen de mejora. Enfócate en reducir gastos innecesarios e incrementar gradualmente tu fondo de ahorro.' }
    : { cls:'warn', icon:'bi-bell', text:'Tu situación financiera requiere atención. Prioriza eliminar gastos innecesarios, estabilizar tu balance y construir un fondo de emergencia antes de invertir.' };
  items.push(finalMsg);

  const clsMap = { pos:'ri--pos', warn:'ri--warn', neg:'ri--neg', info:'ri--info' };
  document.getElementById('report-items').innerHTML = items.map((item,i)=>
    `<div class="fnv-report-item ${clsMap[item.cls]}" style="animation-delay:${i*.07}s"><i class="bi ${item.icon}"></i><span>${item.text}</span></div>`
  ).join('');

  document.getElementById('score-bar').style.width = score+'%';
  document.getElementById('score-value').textContent = score+' / 100';
  document.getElementById('report-date').textContent = new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'});

  document.getElementById('report-placeholder').style.display='none';
  const results = document.getElementById('report-results');
  results.style.display='block';
  results.scrollIntoView({ behavior:'smooth', block:'nearest' });
  showToast('Análisis generado correctamente');
}

// ── Navigation ────────────────────────────
document.querySelectorAll('.fnv-navlink').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fnv-navlink').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.fnv-section').forEach(s=>s.classList.remove('active'));
    btn.classList.add('active');
    const sec = btn.dataset.section;
    document.getElementById(sec).classList.add('active');
    if (sec==='dashboard')   updateCharts();
    if (sec==='inversiones') updateInvestmentSection();
  });
});

// ── Toast ──────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerHTML = `<i class="bi bi-check-circle-fill" style="color:var(--c-teal)"></i>${msg}`;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 3000);
}

// ── Init ───────────────────────────────────
(function init() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('income-date').value  = today;
  document.getElementById('expense-date').value = today;

  const dateEl = document.getElementById('header-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'});

  refreshAll();
  renderSimulationsTable();
})();

function refreshAll() {
  save();
  updateCards();
  updateSavings();
  renderIncomeTable();
  renderExpenseTable();
  renderRecentTables();
  if (document.getElementById('dashboard').classList.contains('active')) updateCharts();
  if (document.getElementById('inversiones').classList.contains('active')) updateInvestmentSection();
}
