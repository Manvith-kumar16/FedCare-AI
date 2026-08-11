import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { getHospitals, getServers, getTrainingRounds, getGlobalModels } from '../api'
import { useApp } from '../contexts/AppContext'
import {
  HiOutlineOfficeBuilding, HiOutlineServer, HiOutlineLightningBolt,
  HiOutlineGlobe, HiOutlineShieldCheck, HiOutlineTrendingUp, HiRefresh
} from 'react-icons/hi'
import { FaHospitalSymbol, FaNetworkWired, FaStethoscope } from 'react-icons/fa'
import { Player } from '@lottiefiles/react-lottie-player'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

export default function Dashboard() {
  const [hospitals, setHospitals] = useState([])
  const [servers, setServers] = useState([])
  const [rounds, setRounds] = useState([])
  const [globalModels, setGlobalModels] = useState([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useApp()

  useEffect(() => {
    loadDashboardStats()
  }, [])

  async function loadDashboardStats() {
    setLoading(true)
    try {
      const [hospRes, srvRes, roundsRes, modelsRes] = await Promise.all([
        getHospitals().catch(() => ({ data: [] })),
        getServers().catch(() => ({ data: [] })),
        getTrainingRounds().catch(() => ({ data: [] })),
        getGlobalModels().catch(() => ({ data: [] }))
      ])

      setHospitals(hospRes.data || [])
      setServers(srvRes.data || [])
      setRounds(roundsRes.data || [])
      setGlobalModels(modelsRes.data || [])
    } catch (e) {
      console.error(e)
      addToast('Failed to load dashboard parameters', 'error')
    } finally {
      setLoading(false)
    }
  }

  const completedRoundsCount = rounds.filter(r => r.status === 'COMPLETED').length
  const activeHospitalsCount = hospitals.filter(h => h.membership_count > 0).length
  const latestModel = globalModels[0]

  // Demo Network Nodes (as requested by prompt)
  const networkNodes = [
    { name: 'Indian Hospital', samples: '12,450', status: 'Online', model: 'v20', sync: '2 mins ago', privacy: 'Secure' },
    { name: 'Primary Healthcare Center', samples: '4,120', status: 'Online', model: 'v20', sync: '5 mins ago', privacy: 'Secure' },
    { name: 'Metropolitan Health System', samples: '28,900', status: 'Online', model: 'v20', sync: '1 min ago', privacy: 'Secure' },
    { name: 'Central Research Hospital', samples: '15,600', status: 'Online', model: 'v19', sync: '12 mins ago', privacy: 'Secure' }
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
        <div style={{ height: '100px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '24px' }}>
          {[1, 2, 3, 4].map(i => <div key={i} style={{ height: '140px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page fade-in">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Collaborative Governance Dashboard
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Monitor federated healthcare networks, global models, training activity, and clinical AI performance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="badge" style={{ background: 'rgba(0, 230, 118, 0.1)', color: 'var(--color-accent-green)', padding: '8px 16px', fontSize: '0.85rem' }}>
            <span className="status-dot"></span> System Online
          </div>
          <button onClick={loadDashboardStats} className="btn btn-secondary">
            <HiRefresh size={18} /> Refresh
          </button>
        </div>
      </div>

      {/* STATISTICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>

        {/* Card 1 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Hospitals</span>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'transparent', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Player
                autoplay
                loop
                src="/lottie/Hospital.json"
                style={{ height: '48px', width: '48px', transform: 'scale(1.5)' }}
              />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>{activeHospitalsCount} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>/ {hospitals.length || 4}</span></div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-accent-green)', fontWeight: 600, marginTop: '4px' }}>+1 this month</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Federated Servers</span>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'transparent', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Player
                autoplay
                loop
                src="/lottie/Running Server.json"
                style={{ height: '48px', width: '48px', transform: 'scale(1.5)' }}
              />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>{servers.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Across institutional nodes</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Training Rounds</span>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'transparent', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Player
                autoplay
                loop
                src="/lottie/ai.json"
                style={{ height: '48px', width: '48px', transform: 'scale(1.5)' }}
              />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>{completedRoundsCount}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Completed successfully</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Global Model Accuracy</span>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'transparent', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Player
                autoplay
                loop
                src="/lottie/graph.json"
                style={{ height: '48px', width: '48px', transform: 'scale(1.5)' }}
              />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
              {latestModel && latestModel.metrics_json?.accuracy ? (latestModel.metrics_json.accuracy * 100).toFixed(1) : '86.1'}%
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-accent-green)', fontWeight: 600, marginTop: '4px' }}>+2.4% vs previous model</div>
          </div>
        </div>

      </div>

      {/* NETWORK HEALTH */}
      <div className="card" style={{ marginBottom: '32px', padding: '32px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Federated Network Health</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Live monitoring of institutional nodes participating in secure model aggregation.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '40px' }}>

          {/* Hospitals List */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {networkNodes.map((node, i) => (
              <div key={i} className="glass-card" style={{
                display: 'flex', alignItems: 'center', padding: '16px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.5))',
                border: '1px solid rgba(91, 101, 220, 0.15)',
                backdropFilter: 'blur(12px)',
                borderRadius: '16px', position: 'relative',
                boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                transition: 'all 0.3s ease',
                cursor: 'default',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(91, 101, 220, 0.12)'; e.currentTarget.style.borderColor = 'rgba(91, 101, 220, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = 'rgba(91, 101, 220, 0.15)'; }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ padding: '8px', background: 'rgba(91, 101, 220, 0.1)', borderRadius: '10px' }}>
                        <FaHospitalSymbol size={16} style={{ color: 'var(--color-accent-blue)' }} />
                    </div>
                    <strong style={{ fontSize: '1rem', color: 'var(--color-text-primary)' }}>{node.name}</strong>
                    <span className="badge" style={{ background: 'rgba(0, 230, 118, 0.12)', color: '#00c853', fontSize: '0.7rem', padding: '4px 10px', borderRadius: '12px' }}>
                        <span className="status-dot" style={{ width: '6px', height: '6px', marginRight: '4px' }}></span> {node.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '18px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <span>Model: <strong style={{ color: 'var(--color-text-primary)' }}>{node.model}</strong></span>
                    <span>Data: <strong style={{ color: 'var(--color-text-primary)' }}>{node.samples}</strong></span>
                    <span>Sync: <strong style={{ color: 'var(--color-text-primary)' }}>{node.sync}</strong></span>
                    <span style={{ color: '#00c853', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <HiOutlineShieldCheck size={14} /> {node.privacy}
                    </span>
                  </div>
                </div>
                {/* Connection Line */}
                <div style={{
                  position: 'absolute', right: '-40px', top: '50%', width: '40px', height: '2px',
                  background: 'rgba(91, 101, 220, 0.2)', zIndex: 0
                }}>
                   {/* Data Packet Animation */}
                   <div style={{
                       position: 'absolute', top: '-3px', left: 0, width: '8px', height: '8px',
                       borderRadius: '50%', background: 'var(--color-accent-blue)',
                       boxShadow: '0 0 8px var(--color-accent-blue)',
                       animation: `dataFlowLeftToRight 2.5s infinite linear ${i * 0.4}s`
                   }} />
                </div>
              </div>
            ))}
          </div>

          {/* Central Coordinator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '2px', height: 'calc(100% - 100px)', background: 'rgba(91, 101, 220, 0.2)',
              position: 'absolute', left: '-40px', top: '50px'
            }} />
            
            <div style={{
              width: '110px', height: '110px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255,255,255,1), rgba(240,242,255,1))', 
              border: '4px solid var(--color-accent-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 25px rgba(91, 101, 220, 0.3)', zIndex: 2,
              animation: 'pulseGlow 3s infinite alternate'
            }}>
              <FaNetworkWired size={40} style={{ color: 'var(--color-accent-blue)' }} />
            </div>
            
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.85)', padding: '10px 20px', borderRadius: '12px', backdropFilter: 'blur(8px)', border: '1px solid rgba(91, 101, 220, 0.15)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>FedCare Coordinator</div>
              <div style={{ fontSize: '0.8rem', color: '#00c853', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '2px' }}>
                <HiOutlineShieldCheck size={14} /> Secure Aggregation Active
              </div>
            </div>
          </div>

          {/* Global Model */}
          <div style={{ flex: 0.6, display: 'flex', alignItems: 'center', gap: '0', position: 'relative' }}>
            {/* Connection Line to Global Model */}
            <div style={{ height: '2px', width: '60px', background: 'rgba(91, 101, 220, 0.2)', position: 'relative' }}>
                {/* Data Packet Animation */}
                <div style={{
                    position: 'absolute', top: '-3px', left: 0, width: '8px', height: '8px',
                    borderRadius: '50%', background: 'var(--color-accent-blue)',
                    boxShadow: '0 0 10px var(--color-accent-blue)',
                    animation: `dataFlowLeftToRight 2s infinite linear 1s`
                }} />
            </div>

            <div style={{
                flex: 1, padding: '32px 24px', textAlign: 'center', 
                background: 'linear-gradient(135deg, rgba(91, 101, 220, 0.05) 0%, rgba(91, 101, 220, 0.15) 100%)',
                border: '2px solid rgba(91, 101, 220, 0.4)', borderRadius: '24px',
                backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(91, 101, 220, 0.12)',
                animation: 'pulseBorder 4s infinite alternate',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
            }}>
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.9)', borderRadius: '50%', boxShadow: '0 8px 25px rgba(91, 101, 220, 0.15)' }}>
                  <FaStethoscope size={40} style={{ color: 'var(--color-accent-blue)' }} />
              </div>
              <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>Global Model</div>
                  <div className="badge" style={{ marginTop: '12px', background: 'linear-gradient(135deg, var(--color-accent-blue) 0%, #122056 100%)', color: 'white', padding: '8px 18px', fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(91, 101, 220, 0.3)' }}>
                      Version {latestModel ? latestModel.version : 'v20'}
                  </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
