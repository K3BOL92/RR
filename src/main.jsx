import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Home,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react'
import './styles.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(console.error)
  })
}

const KEY = 'idarat-ratbi-shop-v1'
const money = n => new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)
const dateKey = d => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
const monthKey = d => dateKey(d).slice(0, 7)
const parseDate = value => new Date(`${value}T12:00:00`)
const today = () => dateKey(new Date())
const currentMonth = () => monthKey(new Date())
const monthLabel = key => new Intl.DateTimeFormat('ar-SA', { month: 'long', year: 'numeric' }).format(parseDate(`${key}-01`))
const daysInMonth = key => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate()
const defaultExpenses = () => ({ flowers: 0, goods: 0, rent: 0, salaries: 0, electricity: 0, tax: 0 })

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    return {
      sales: Array.isArray(saved?.sales) ? saved.sales : [],
      monthlyExpenses: saved?.monthlyExpenses && typeof saved.monthlyExpenses === 'object' ? saved.monthlyExpenses : {},
    }
  } catch {
    return { sales: [], monthlyExpenses: {} }
  }
}

function getExpenses(data, key) {
  return { ...defaultExpenses(), ...(data.monthlyExpenses?.[key] || {}) }
}

function App() {
  const [data, setData] = useState(load)
  const [tab, setTab] = useState('home')
  const [sheet, setSheet] = useState(false)
  const [editId, setEditId] = useState(null)
  const [salesFilter, setSalesFilter] = useState(currentMonth())
  const [form, setForm] = useState({ status: 'received', date: today(), amount: '', source: 'cash', notes: '' })

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(data)), [data])

  const thisMonth = currentMonth()
  const salesThisMonth = useMemo(() => data.sales.filter(x => x.date?.startsWith(thisMonth)), [data.sales, thisMonth])
  const expenses = getExpenses(data, thisMonth)
  const expenseTotal = Object.values(expenses).reduce((a, b) => a + (Number(b) || 0), 0)
  const salesTotal = salesThisMonth.reduce((a, x) => a + (Number(x.amount) || 0), 0)
  const receivedTotal = salesThisMonth.filter(x => x.status === 'received').reduce((a, x) => a + (Number(x.amount) || 0), 0)
  const unreceivedTotal = salesThisMonth.filter(x => x.status === 'unreceived').reduce((a, x) => a + (Number(x.amount) || 0), 0)
  const netProfit = salesTotal - expenseTotal

  function openAdd() {
    setEditId(null)
    setForm({ status: 'received', date: today(), amount: '', source: 'cash', notes: '' })
    setSheet(true)
  }
  function openEdit(item) {
    setEditId(item.id)
    setForm({ status: item.status, date: item.date, amount: item.amount, source: item.source, notes: item.notes || '' })
    setSheet(true)
  }
  function closeSheet() {
    setSheet(false)
    setEditId(null)
  }
  function saveSale() {
    const amount = Number(form.amount)
    if (!amount || amount <= 0 || !form.date) return
    const item = { id: editId || crypto.randomUUID(), status: form.status, date: form.date, amount, source: form.source, notes: form.notes.trim() }
    setData(prev => ({ ...prev, sales: editId ? prev.sales.map(x => x.id === editId ? item : x) : [item, ...prev.sales] }))
    closeSheet()
  }
  function deleteSale(id) {
    if (!window.confirm('حذف هذه العملية؟')) return
    setData(prev => ({ ...prev, sales: prev.sales.filter(x => x.id !== id) }))
  }
  function saveExpenses(next) {
    setData(prev => ({ ...prev, monthlyExpenses: { ...prev.monthlyExpenses, [thisMonth]: next } }))
  }
  function resetCurrentMonth() {
    if (!window.confirm(`تفريغ مصروفات ${monthLabel(thisMonth)} والبدء من جديد؟`)) return
    saveExpenses(defaultExpenses())
  }

  return (
    <div className="app" dir="rtl">
      <main style={{ paddingTop: 'max(32px, calc(20px + env(safe-area-inset-top)))' }}>
        {tab === 'home' && <HomePage onAdd={openAdd} salesTotal={salesTotal} receivedTotal={receivedTotal} unreceivedTotal={unreceivedTotal} netProfit={netProfit} />}
        {tab === 'sales' && <SalesPage filter={salesFilter} setFilter={setSalesFilter} sales={data.sales} onEdit={openEdit} onDelete={deleteSale} />}
        {tab === 'expenses' && <ExpensesPage expenses={expenses} total={expenseTotal} sales={salesThisMonth} netProfit={netProfit} onChange={saveExpenses} onReset={resetCurrentMonth} />}
      </main>

      <nav className="bottom-nav" aria-label="التنقل الرئيسي">
        <NavButton active={tab === 'home'} icon={Home} label="إضافة عملية" onClick={() => setTab('home')} />
        <NavButton active={tab === 'sales'} icon={ReceiptText} label="العمليات" onClick={() => setTab('sales')} />
        <NavButton active={tab === 'expenses'} icon={WalletCards} label="المصروفات" onClick={() => setTab('expenses')} />
      </nav>

      {sheet && <SaleSheet form={form} setForm={setForm} edit={Boolean(editId)} onClose={closeSheet} onSave={saveSale} />}
    </div>
  )
}

function NavButton({ active, icon: Icon, label, onClick }) {
  return <button className={active ? 'on' : ''} onClick={onClick}><Icon size={21} /><span>{label}</span></button>
}

function Header({ eyebrow, title, sub }) {
  return <header><div className="brand-mark"><img src={`${import.meta.env.BASE_URL}icons/app-logo.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 13, display: 'block' }} /></div><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{sub && <p>{sub}</p>}</div></header>
}

function HomePage({ onAdd, salesTotal, receivedTotal, unreceivedTotal, netProfit }) {
  return <section>
    <Header eyebrow="صنع بحب❤︎" title="راوند روز" sub={monthLabel(currentMonth())} />
    <div className="welcome-card">
      <div><span>مبيعات الشهر الحالي</span><strong>{money(salesTotal)} <i>ريال</i></strong></div>
      <div className="welcome-icon"><ReceiptText size={25} /></div>
    </div>

    <div className="entry-card">
      <div className="card-title"><div><span>عملية جديدة</span><h2>أضف إيرادًا للمحل</h2></div><Plus size={20} /></div>
      <p className="muted">اضغط الزر لإدخال العملية وحفظها في سجل المبيعات.</p>
      <button className="primary" onClick={onAdd}><Plus size={19} /> إضافة عملية جديدة</button>
    </div>

    <div className="summary-grid">
      <Summary label="المبالغ المستلمة" value={receivedTotal} />
      <Summary label="المبالغ غير المستلمة" value={unreceivedTotal} />
      <Summary label="صافي الربح" value={netProfit} />
    </div>

    <div className="hint-card"><FileText size={19} /><span>كل عملية تحفظ بتاريخها ومصدرها وحالتها، ويمكن تعديلها أو حذفها من سجل العمليات.</span></div>
  </section>
}

function Summary({ label, value }) { return <div className="summary"><span>{label}</span><b>{money(value)} <small>ريال</small></b></div> }

function SalesPage({ filter, setFilter, sales, onEdit, onDelete }) {
  const filtered = sales.filter(x => x.date?.startsWith(filter)).sort((a, b) => b.date.localeCompare(a.date))
  const total = filtered.reduce((a, x) => a + Number(x.amount || 0), 0)
  const received = filtered.filter(x => x.status === 'received').reduce((a, x) => a + Number(x.amount || 0), 0)
  return <section>
    <Header eyebrow="سجل المحل" title="العمليات" sub={`${monthLabel(filter)} • ${filtered.length} عملية`} />
    <div className="month-picker">
      <button onClick={() => moveMonth(filter, setFilter, -1)} aria-label="الشهر السابق"><ChevronRight size={19} /></button>
      <strong>{monthLabel(filter)}</strong>
      <button onClick={() => moveMonth(filter, setFilter, 1)} aria-label="الشهر التالي"><ChevronLeft size={19} /></button>
    </div>
    <div className="sales-total"><div><span>إجمالي المبيعات</span><b>{money(total)} ريال</b></div><div><span>المستلم</span><b>{money(received)} ريال</b></div></div>
    {!filtered.length ? <div className="empty"><ReceiptText size={28} /><b>لا توجد عمليات</b><span>أضف أول عملية من صفحة إضافة عملية.</span></div> :
      <div className="table-wrap"><div className="table-head"><span>الحالة</span><span>التاريخ</span><span>المبلغ</span><span>المصدر</span><span>ملاحظات</span><span></span></div>
        {filtered.map(item => <div className="table-row" key={item.id}>
          <span><StatusBadge status={item.status} /></span>
          <span>{formatDate(item.date)}</span>
          <b>{money(item.amount)} ر.س</b>
          <span>{sourceLabel(item.source)}</span>
          <span className="notes">{item.notes || '—'}</span>
          <span className="actions"><button onClick={() => onEdit(item)} aria-label="تعديل"><Pencil size={14} /></button><button onClick={() => onDelete(item.id)} aria-label="حذف"><Trash2 size={14} /></button></span>
        </div>)}
      </div>}
  </section>
}

function ExpensesPage({ expenses, total, sales, netProfit, onChange, onReset }) {
  const [viewMonth, setViewMonth] = useState(currentMonth())
  useEffect(() => setViewMonth(currentMonth()), [])
  const activeExpenses = viewMonth === currentMonth() ? expenses : getExpenses({ monthlyExpenses: {} }, viewMonth)
  const data = getExpenses({ monthlyExpenses: { [viewMonth]: activeExpenses } }, viewMonth)
  const activeTotal = Object.values(data).reduce((a, b) => a + Number(b || 0), 0)
  const activeSales = sales.filter(x => x.date?.startsWith(viewMonth)).reduce((a, x) => a + Number(x.amount || 0), 0)
  const activeProfit = activeSales - activeTotal
  const canEdit = viewMonth === currentMonth()

  return <section>
    <Header eyebrow="إدارة المحل" title="المصروفات" sub="تُحدّث شهريًا" />
    <div className="month-picker"><button onClick={() => moveMonth(viewMonth, setViewMonth, -1)}><ChevronRight size={19} /></button><strong>{monthLabel(viewMonth)}</strong><button onClick={() => moveMonth(viewMonth, setViewMonth, 1)}><ChevronLeft size={19} /></button></div>
    <div className="expense-card">
      <ExpenseField label="موزعين الورد" value={data.flowers} disabled={!canEdit} onChange={v => onChange({ ...data, flowers: v })} />
      <ExpenseField label="موزعين البضاعة" value={data.goods} disabled={!canEdit} onChange={v => onChange({ ...data, goods: v })} />
      <ExpenseField label="الإيجار" value={data.rent} disabled={!canEdit} onChange={v => onChange({ ...data, rent: v })} />
      <ExpenseField label="رواتب العمال" value={data.salaries} disabled={!canEdit} onChange={v => onChange({ ...data, salaries: v })} />
      <ExpenseField label="الكهرباء" value={data.electricity} disabled={!canEdit} onChange={v => onChange({ ...data, electricity: v })} />
      <ExpenseField label="الضريبة" value={data.tax} disabled={!canEdit} onChange={v => onChange({ ...data, tax: v })} />
      <div className="expense-total"><span>إجمالي المصروفات</span><b>{money(activeTotal)} <small>ريال</small></b></div>
    </div>

    <ProfitChart sales={sales} expenseTotal={activeTotal} month={viewMonth} />

    <div className={`profit-card ${activeProfit < 0 ? 'loss' : ''}`}><div><span>صافي ربح {monthLabel(viewMonth)}</span><b>{money(activeProfit)} ريال</b></div><CircleDollarSign size={27} /></div>

    {canEdit && <button className="reset" onClick={onReset}><RotateCcw size={17} /> بدء شهر جديد — تفريغ مصروفات الشهر</button>}
  </section>
}

function ExpenseField({ label, value, onChange, disabled }) {
  return <label className="expense-field"><span>{label}</span><div><input type="number" min="0" inputMode="decimal" value={value || ''} disabled={disabled} placeholder="0.00" onChange={e => onChange(e.target.value)} /><small>ريال</small></div></label>
}

function ProfitChart({ sales, expenseTotal, month }) {
  const count = daysInMonth(month)
  const points = Array.from({ length: count }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    const key = `${month}-${day}`
    const cumulativeSales = sales.filter(x => x.date === key).reduce((a, x) => a + Number(x.amount || 0), 0)
    return { day: i + 1, value: cumulativeSales }
  }).reduce((arr, point, i) => {
    const prev = i ? arr[i - 1].value : 0
    arr.push({ ...point, value: prev + point.value - (i === count - 1 ? expenseTotal : 0) })
    return arr
  }, [])
  const min = Math.min(0, ...points.map(x => x.value))
  const max = Math.max(1, ...points.map(x => x.value))
  const range = max - min || 1
  const w = 700, h = 220, px = 24, py = 22
  const coords = points.map((p, i) => `${px + (i / Math.max(1, points.length - 1)) * (w - px * 2)},${h - py - ((p.value - min) / range) * (h - py * 2)}`).join(' ')
  return <div className="chart-card"><div className="chart-title"><div><span>صافي الربح خلال الشهر</span><h3>{monthLabel(month)}</h3></div><span className="chart-note">مبيعات متراكمة − المصروفات</span></div><svg className="profit-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"><line x1={px} x2={w - px} y1={h - py - ((0 - min) / range) * (h - py * 2)} y2={h - py - ((0 - min) / range) * (h - py * 2)} /><polyline points={coords} fill="none" /><circle cx={w - px} cy={h - py - ((points.at(-1).value - min) / range) * (h - py * 2)} r="5" /></svg><div className="chart-labels"><span>1</span><span>{Math.ceil(count / 2)}</span><span>{count}</span></div></div>
}

function SaleSheet({ form, setForm, edit, onClose, onSave }) {
  return <div className="veil" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="sheet">
    <div className="handle" /><div className="sheet-head"><div><span>راوند روز</span><h2>{edit ? 'تعديل العملية' : 'إضافة عملية'}</h2></div><button onClick={onClose}><X size={19} /></button></div>
    <label className="field"><span>حالة المبلغ</span><div className="segmented"><button className={form.status === 'received' ? 'selected' : ''} onClick={() => setForm({ ...form, status: 'received' })}><Check size={16} /> مستلم</button><button className={form.status === 'unreceived' ? 'selected' : ''} onClick={() => setForm({ ...form, status: 'unreceived' })}>غير مستلم</button></div></label>
    <label className="field"><span>تاريخ الطلب</span><div className="input-icon"><CalendarDays size={18} /><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div></label>
    <label className="field"><span>المبلغ</span><div className="money-input"><input autoFocus type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /><b>ريال</b></div></label>
    <label className="field"><span>مصدر المبيعات</span><select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}><option value="cash">كاش</option><option value="pos">نقاط بيع</option><option value="bank">تحويل بنكي</option><option value="hungerstation">هنقرستيشن</option></select></label>
    <label className="field"><span>الملاحظات <small>اختياري</small></span><textarea rows="3" placeholder="اكتب أي ملاحظة..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
    <button className="primary" onClick={onSave}><Check size={18} /> {edit ? 'حفظ التعديل' : 'حفظ العملية'}</button>
  </div></div>
}

function StatusBadge({ status }) { return <span className={`badge ${status === 'received' ? 'received' : 'unreceived'}`}>{status === 'received' ? 'مستلم' : 'غير مستلم'}</span> }
function sourceLabel(source) { return ({ cash: 'كاش', pos: 'نقاط بيع', bank: 'تحويل بنكي', hungerstation: 'هنقرستيشن' })[source] || source }
function formatDate(value) { return new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' }).format(parseDate(value)) }
function moveMonth(key, setter, amount) { const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + amount, 1); setter(monthKey(d)) }

createRoot(document.getElementById('root')).render(<App />)
