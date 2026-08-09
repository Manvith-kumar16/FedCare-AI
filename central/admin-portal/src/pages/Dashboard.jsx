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
              <div key={i} style={{
                display: 'flex', alignItems: 'center', padding: '16px',
                background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)',
                borderRadius: '12px', position: 'relative'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <FaHospitalSymbol style={{ color: 'var(--color-accent-blue)' }} />
                    <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{node.name}</strong>
                    <span className="badge badge-active" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{node.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <span>Model: <strong>{node.model}</strong></span>
                    <span>Data: <strong>{node.samples}</strong></span>
                    <span>Sync: <strong>{node.sync}</strong></span>
                    <span style={{ color: 'var(--color-accent-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <HiOutlineShieldCheck /> {node.privacy}
                    </span>
                  </div>
                </div>
                {/* Connection Line */}
                <div style={{
                  position: 'absolute', right: '-40px', top: '50%', width: '40px', height: '2px',
                  background: 'var(--color-border)', zIndex: 0
                }} />
              </div>
            ))}
          </div>

          {/* Central Coordinator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '2px', height: 'calc(100% - 100px)', background: 'var(--color-border)',
              position: 'absolute', left: '-40px', top: '50px'
            }} />
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%',
              background: 'var(--color-bg-primary)', border: '4px solid var(--color-accent-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(91, 101, 220, 0.15)', zIndex: 2
            }}>
              <FaNetworkWired size={32} style={{ color: 'var(--color-accent-blue)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>FedCare Coordinator</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-accent-green)', fontWeight: 600 }}>Secure Aggregation Active</div>
            </div>
          </div>

          {/* Global Model */}
          <div style={{ flex: 0.5, display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ height: '2px', flex: 1, background: 'var(--color-accent-blue)', opacity: 0.3 }} />
            <div className="card" style={{ padding: '24px', textAlign: 'center', border: '2px solid var(--color-accent-blue)' }}>
              <FaStethoscope size={28} style={{ color: 'var(--color-accent-blue)', marginBottom: '12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Global Model</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Version {latestModel ? latestModel.version : 'v20'}</div>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
