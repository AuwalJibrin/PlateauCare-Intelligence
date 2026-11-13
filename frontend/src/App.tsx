
import { useState } from 'react'
import {
  Activity, AlertTriangle, BarChart3, Bell, CheckCircle2,
  ChevronDown, ClipboardList, CloudRain, Droplets, HeartPulse,
  Home, Leaf, MapPin, Menu, Search, Settings, ShieldCheck,
  ShieldPlus, Sparkles, Thermometer, Users, Wind, Zap,
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import './App.css'

const navigation = [
  { label: 'Dashboard', icon: Home },
  { label: 'Surveillance', icon: Activity },
  { label: 'Environment', icon: Leaf },
  { label: 'Workforce', icon: Users },
  { label: 'Community', icon: HeartPulse },
  { label: 'Response', icon: ShieldPlus },
  { label: 'Audit Trail', icon: ClipboardList },
  { label: 'Settings', icon: Settings },
]

const trendData = [
  { day: 'Mon', cases: 28 },
  { day: 'Tue', cases: 36 },
  { day: 'Wed', cases: 31 },
  { day: 'Thu', cases: 49 },
  { day: 'Fri', cases: 42 },
  { day: 'Sat', cases: 57 },
  { day: 'Sun', cases: 45 },
]

const alerts = [
  { lga: 'Jos North', disease: 'Malaria', level: 'High', status: 'Open', time: 'Today' },
  { lga: 'Barkin Ladi', disease: 'Diarrhoeal disease', level: 'Moderate', status: 'Acknowledged', time: 'Yesterday' },
  { lga: 'Jos South', disease: 'Respiratory illness', level: 'Moderate', status: 'Open', time: 'Yesterday' },
]

const lgas = [
  { name: 'Barkin Ladi', risk: 'moderate' },
  { name: 'Bassa', risk: 'low' },
  { name: 'Bokkos', risk: 'low' },
  { name: 'Jos East', risk: 'low' },
  { name: 'Jos North', risk: 'high' },
  { name: 'Jos South', risk: 'moderate' },
  { name: 'Kanam', risk: 'low' },
  { name: 'Kanke', risk: 'low' },
  { name: 'Langtang North', risk: 'low' },
  { name: 'Langtang South', risk: 'low' },
  { name: 'Mangu', risk: 'low' },
  { name: 'Mikang', risk: 'low' },
  { name: 'Pankshin', risk: 'low' },
  { name: 'Qua’an Pan', risk: 'moderate' },
  { name: 'Riyom', risk: 'low' },
  { name: 'Shendam', risk: 'moderate' },
  { name: 'Wase', risk: 'low' },
]

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><HeartPulse size={27} /></div>
          <div>
            <h2>PlateauCare</h2>
            <span>INTELLIGENCE</span>
          </div>
        </div>

        <p className="brand-tagline">Healthy Plateau. Safer Tomorrow.</p>

        <nav className="navigation">
          <span className="nav-caption">WORKSPACE</span>
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-link ${activePage === label ? 'active' : ''}`}
              onClick={() => {
                setActivePage(label)
                setSidebarOpen(false)
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">PH</div>
            <div>
              <strong>Public Health Officer</strong>
              <span>Plateau State</span>
            </div>
            <ChevronDown size={16} />
          </div>
          <div className="sidebar-note">
            <ShieldCheck size={17} />
            <span>Secure health intelligence platform</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={22} />
            </button>
            <div>
              <div className="breadcrumb">PlateauCare / {activePage}</div>
              <h1>{activePage === 'Dashboard' ? 'Public Health Dashboard' : activePage}</h1>
              <p>Population and workforce health early warning</p>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="demo-indicator"><span /> DEMO DATA</div>
            <button className="icon-button" aria-label="Search"><Search size={19} /></button>
            <button className="icon-button notification" aria-label="Notifications">
              <Bell size={19} /><i />
            </button>
            <div className="date-label">Plateau State, Nigeria</div>
          </div>
        </header>

        <div className="page-content">
          <div className="welcome-row">
            <div>
              <h2>Good day, Public Health Team <span>👋</span></h2>
              <p>Here is the latest overview of population health signals across Plateau State.</p>
            </div>
            <button className="date-filter">Last 30 days <ChevronDown size={16} /></button>
          </div>

          <section className="stats-grid">
            <StatCard icon={<MapPin />} label="LGAs Monitored" value="17" detail="All LGAs represented" tone="blue" />
            <StatCard icon={<ShieldPlus />} label="Health Facilities" value="—" detail="Awaiting live API data" tone="green" />
            <StatCard icon={<AlertTriangle />} label="Active Alerts" value="3" detail="Illustrative demo value" tone="orange" />
            <StatCard icon={<Users />} label="Health Workforce" value="—" detail="Awaiting live API data" tone="purple" />
          </section>

          <section className="dashboard-grid">
            <div className="panel lga-panel">
              <PanelHeading icon={<MapPin />} title="Plateau State Overview" subtitle="Risk distribution across 17 LGAs" />
              <div className="lga-overview">
                <div className="lga-list">
                  {lgas.map((lga) => (
                    <div className="lga-row" key={lga.name}>
                      <span className={`risk-dot ${lga.risk}`} />
                      <span>{lga.name}</span>
                      <span className={`risk-label ${lga.risk}`}>{lga.risk}</span>
                    </div>
                  ))}
                </div>
                <div className="risk-legend">
                  <span><i className="risk-dot low" /> Low</span>
                  <span><i className="risk-dot moderate" /> Moderate</span>
                  <span><i className="risk-dot high" /> High</span>
                </div>
              </div>
              <p className="panel-footnote">LGA risk classifications shown are illustrative, not live assessments.</p>
            </div>

            <div className="panel trend-panel">
              <PanelHeading icon={<BarChart3 />} title="Disease Surveillance" subtitle="Illustrative reported case trend" />
              <div className="chart-legend"><span><i /> Reported cases</span></div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="caseFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2684e8" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#2684e8" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9eef5" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#8995a8', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#8995a8', fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="cases" stroke="#2684e8" strokeWidth={3} fill="url(#caseFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="panel-footnote">Replace demonstration values with surveillance API results during integration.</p>
            </div>

            <div className="panel ai-panel">
              <PanelHeading icon={<Sparkles />} title="AI Health Risk Assessment" subtitle="Decision-support preview" />
              <div className="ai-status"><span className="status-icon"><AlertTriangle size={22} /></span><div><strong>Risk assessment preview</strong><span>Example assessment · Jos North</span></div></div>
              <div className="risk-score"><strong>72</strong><span>/ 100</span></div>
              <div className="risk-meter"><span /></div>
              <div className="risk-caption"><strong>Illustrative high-risk score</strong><span>Not an outbreak probability</span></div>
              <div className="insight-list">
                <strong>Assessment factors</strong>
                <p><CheckCircle2 size={15} /> Disease reporting signals</p>
                <p><CheckCircle2 size={15} /> Environmental conditions</p>
                <p><CheckCircle2 size={15} /> Workforce and community signals</p>
              </div>
              <div className="ai-disclaimer">Demo content only. Live AI assessments require API data.</div>
            </div>

            <div className="panel environment-panel">
              <PanelHeading icon={<Leaf />} title="Environmental Monitoring" subtitle="Environmental indicators" />
              <div className="environment-grid">
                <EnvironmentMetric icon={<Thermometer />} label="Temperature" value="—" unit="°C" />
                <EnvironmentMetric icon={<Droplets />} label="Humidity" value="—" unit="%" />
                <EnvironmentMetric icon={<CloudRain />} label="Rainfall" value="—" unit="mm" />
                <EnvironmentMetric icon={<Wind />} label="Air quality" value="—" unit="AQI" />
              </div>
              <p className="panel-footnote">Live environmental observations will appear here.</p>
            </div>

            <div className="panel alerts-panel">
              <PanelHeading icon={<ShieldCheck />} title="Recent Public Health Alerts" subtitle="Example alert records" />
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Time</th><th>LGA</th><th>Signal</th><th>Risk</th><th>Status</th></tr></thead>
                  <tbody>
                    {alerts.map((alert) => (
                      <tr key={`${alert.lga}-${alert.disease}`}>
                        <td>{alert.time}</td>
                        <td><strong>{alert.lga}</strong></td>
                        <td>{alert.disease}</td>
                        <td><span className={`table-risk ${alert.level.toLowerCase()}`}>{alert.level}</span></td>
                        <td><span className={`table-status ${alert.status.toLowerCase()}`}>{alert.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="text-link" onClick={() => setActivePage('Response')}>View response workspace <span>→</span></button>
            </div>

            <div className="panel workforce-panel">
              <PanelHeading icon={<Users />} title="Workforce & Community" subtitle="Reporting coverage overview" />
              <div className="workforce-placeholder">
                <div className="coverage-ring"><span>—</span><small>Coverage</small></div>
                <div className="coverage-details">
                  <p><CheckCircle2 size={17} /> 17 LGAs represented</p>
                  <p><Activity size={17} /> Workforce records via API</p>
                  <p><HeartPulse size={17} /> Community signals via API</p>
                </div>
              </div>
              <p className="panel-footnote">Coverage metrics will be calculated from submitted records.</p>
            </div>

            <div className="panel quick-panel">
              <PanelHeading icon={<Zap />} title="Quick Access" subtitle="Platform workspaces" />
              <button onClick={() => setActivePage('Surveillance')}><Activity size={17} /> Disease surveillance</button>
              <button onClick={() => setActivePage('Response')}><ShieldCheck size={17} /> Manage public health alerts</button>
              <button onClick={() => setActivePage('Audit Trail')}><ClipboardList size={17} /> View audit trail</button>
            </div>
          </section>

          <footer className="dashboard-footer">
            <span>PlateauCare Intelligence</span>
            <span>Population Health Early Warning · Plateau State, Nigeria</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, detail, tone }: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
  tone: string
}) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  )
}

function PanelHeading({ icon, title, subtitle }: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="panel-heading">
      <div className="panel-title-icon">{icon}</div>
      <div><h3>{title}</h3><p>{subtitle}</p></div>
    </div>
  )
}

function EnvironmentMetric({ icon, label, value, unit }: {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="environment-metric">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value} <small>{unit}</small></strong>
    </div>
  )
}

export default App
