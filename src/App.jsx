import { useState, useEffect, useRef, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { motion, AnimatePresence } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'
import './index.css'

// Node types with their colors
const NODE_TYPES = {
  behavior: { label: 'Behavior', color: '#a855f7', emoji: '!' },
  emotion: { label: 'Emotion', color: '#ec4899', emoji: '@' },
  'root-cause': { label: 'Root Cause', color: '#f59e0b', emoji: '#' },
  protection: { label: 'Protection', color: '#3b82f6', emoji: '$' },
  question: { label: 'Question', color: '#06b6d4', emoji: '?' },
  insight: { label: 'Insight', color: '#10b981', emoji: '*' },
}

// Keywords for auto-linking
const CONCEPT_KEYWORDS = {
  avoidance: ['avoid', 'escape', 'hide', 'retreat', 'withdrawal', 'procrastinat'],
  fear: ['fear', 'afraid', 'scared', 'anxious', 'worry', 'nervous'],
  comfort: ['comfort', 'safe', 'cozy', 'warm', 'familiar', 'easy'],
  failure: ['fail', 'mistake', 'wrong', 'mess up', 'disappoint', 'not good enough'],
  effort: ['effort', 'try', 'work', 'energy', 'motivation', 'lazy'],
  identity: ['who i am', 'identity', 'self', 'person', 'really am'],
  control: ['control', 'power', 'choice', 'decide', 'agency'],
  protection: ['protect', 'shield', 'guard', 'defend', 'safety'],
  discomfort: ['discomfort', 'uncomfortable', 'pain', 'hard', 'difficult'],
  time: ['time', 'hours', 'day', 'morning', 'night', 'sleep', 'bed', 'wake'],
}

// Initial data - your sleep procrastination analysis
const INITIAL_INSIGHTS = [
  {
    id: uuidv4(),
    type: 'behavior',
    title: 'Extended bed procrastination',
    description: 'Getting in bed around 11:30-12:30 and staying until noon the next day. Spending 12+ hours in bed regularly.',
    keywords: ['bed', 'time', 'procrastination', 'avoidance']
  },
  {
    id: uuidv4(),
    type: 'question',
    title: 'What is it protecting me from?',
    description: 'Every behavior serves a function. What need is this meeting? What would I have to face if I got up?',
    keywords: ['protection', 'avoidance', 'fear']
  },
  {
    id: uuidv4(),
    type: 'root-cause',
    title: 'Avoiding discomfort',
    description: 'The bed is comfortable and familiar. Getting up means facing the uncertainty and potential discomfort of the day.',
    keywords: ['comfort', 'discomfort', 'avoidance', 'fear']
  },
  {
    id: uuidv4(),
    type: 'root-cause',
    title: 'Fear of failure through non-effort',
    description: 'If the only thing holding me back is effort, then I haven\'t truly failed. It\'s a sneaky way to protect my identity - "I could if I wanted to."',
    keywords: ['failure', 'effort', 'identity', 'protection', 'fear']
  },
  {
    id: uuidv4(),
    type: 'protection',
    title: 'Identity preservation',
    description: 'Not trying protects the belief that I\'m capable. If I tried and failed, that belief would be threatened.',
    keywords: ['identity', 'failure', 'protection', 'fear']
  },
  {
    id: uuidv4(),
    type: 'insight',
    title: 'Addressing root cause > forcing behavior',
    description: 'Instead of forcing myself out of bed, understand why I\'m there. The behavior will shift when the underlying need is met differently.',
    keywords: ['avoidance', 'protection', 'effort']
  },
  {
    id: uuidv4(),
    type: 'question',
    title: 'What would "trying" actually look like?',
    description: 'If effort is the bottleneck I\'m hiding behind, what specific actions am I avoiding? What\'s the smallest step?',
    keywords: ['effort', 'avoidance', 'fear', 'failure']
  },
  {
    id: uuidv4(),
    type: 'emotion',
    title: 'Ambivalence about the day',
    description: 'There might be nothing specifically bad about today, but nothing specifically pulling me toward it either. A quiet dread mixed with inertia.',
    keywords: ['discomfort', 'fear', 'avoidance', 'comfort']
  }
]

// Find connections between insights based on shared keywords
function findConnections(insights) {
  const links = []

  for (let i = 0; i < insights.length; i++) {
    for (let j = i + 1; j < insights.length; j++) {
      const shared = insights[i].keywords.filter(k =>
        insights[j].keywords.includes(k)
      )
      if (shared.length > 0) {
        links.push({
          source: insights[i].id,
          target: insights[j].id,
          strength: shared.length,
          keywords: shared
        })
      }
    }
  }

  return links
}

// Extract keywords from text
function extractKeywords(text) {
  const lower = text.toLowerCase()
  const found = new Set()

  Object.entries(CONCEPT_KEYWORDS).forEach(([concept, keywords]) => {
    keywords.forEach(kw => {
      if (lower.includes(kw)) {
        found.add(concept)
      }
    })
  })

  return Array.from(found)
}

// Find most connected concept (central theme)
function findCentralTheme(insights, links) {
  const connectionCount = {}

  links.forEach(link => {
    connectionCount[link.source] = (connectionCount[link.source] || 0) + link.strength
    connectionCount[link.target] = (connectionCount[link.target] || 0) + link.strength
  })

  let maxId = null
  let maxCount = 0

  Object.entries(connectionCount).forEach(([id, count]) => {
    if (count > maxCount) {
      maxCount = count
      maxId = id
    }
  })

  return insights.find(i => i.id === maxId)
}

function App() {
  const [insights, setInsights] = useState(() => {
    const saved = localStorage.getItem('psyche-insights')
    return saved ? JSON.parse(saved) : INITIAL_INSIGHTS
  })
  const [selectedId, setSelectedId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [newInsight, setNewInsight] = useState({ type: 'insight', title: '', description: '' })
  const graphRef = useRef()

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('psyche-insights', JSON.stringify(insights))
  }, [insights])

  const links = findConnections(insights)
  const centralTheme = findCentralTheme(insights, links)

  // Graph data
  const graphData = {
    nodes: insights.map(i => ({
      id: i.id,
      title: i.title,
      type: i.type,
      color: NODE_TYPES[i.type].color,
      val: links.filter(l => l.source === i.id || l.target === i.id)
        .reduce((sum, l) => sum + l.strength, 0) + 3
    })),
    links: links.map(l => ({
      source: l.source,
      target: l.target,
      strength: l.strength
    }))
  }

  const handleNodeClick = useCallback((node) => {
    setSelectedId(node.id)
    // Center on node
    graphRef.current?.centerAt(node.x, node.y, 500)
    graphRef.current?.zoom(2, 500)
  }, [])

  const handleAddInsight = () => {
    if (!newInsight.title.trim()) return

    const keywords = extractKeywords(newInsight.title + ' ' + newInsight.description)

    const insight = {
      id: uuidv4(),
      type: newInsight.type,
      title: newInsight.title,
      description: newInsight.description,
      keywords
    }

    setInsights([...insights, insight])
    setNewInsight({ type: 'insight', title: '', description: '' })
    setShowModal(false)
  }

  const handleDeleteInsight = (id) => {
    setInsights(insights.filter(i => i.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const selectedInsight = insights.find(i => i.id === selectedId)
  const connectedInsights = selectedId
    ? links
        .filter(l => l.source === selectedId || l.target === selectedId)
        .map(l => {
          const otherId = l.source === selectedId ? l.target : l.source
          return insights.find(i => i.id === otherId)
        })
        .filter(Boolean)
    : []

  return (
    <div className="app">
      <div className="brain-canvas">
        <header className="header">
          <div className="logo">
            <div className="logo-icon">~</div>
            <div>
              <h1>Psyche Explorer</h1>
              <span>Map your inner landscape</span>
            </div>
          </div>
        </header>

        {centralTheme && (
          <div className="central-theme">
            <div className="pulse" />
            <span>Central theme: <strong>{centralTheme.title}</strong></span>
          </div>
        )}

        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeColor={node => node.color}
          nodeRelSize={6}
          linkColor={() => 'rgba(136, 136, 160, 0.2)'}
          linkWidth={link => link.strength * 0.5}
          onNodeClick={handleNodeClick}
          nodeCanvasObject={(node, ctx, globalScale) => {
            // Draw glow
            const size = node.val * 1.5
            const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 2)
            gradient.addColorStop(0, node.color + '40')
            gradient.addColorStop(1, 'transparent')
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(node.x, node.y, size * 2, 0, 2 * Math.PI)
            ctx.fill()

            // Draw node
            ctx.fillStyle = node.color
            ctx.beginPath()
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
            ctx.fill()

            // Draw border if selected
            if (node.id === selectedId) {
              ctx.strokeStyle = '#fff'
              ctx.lineWidth = 2
              ctx.stroke()
            }

            // Draw label if zoomed in
            if (globalScale > 1) {
              ctx.font = `${12/globalScale}px Inter, sans-serif`
              ctx.fillStyle = '#e8e8f0'
              ctx.textAlign = 'center'
              ctx.fillText(node.title.slice(0, 25), node.x, node.y + size + 12/globalScale)
            }
          }}
          backgroundColor="transparent"
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />

        <div className="stats-bar">
          <div className="stat">
            <div className="stat-icon purple">*</div>
            <div>
              <div className="stat-value">{insights.length}</div>
              <div className="stat-label">Insights</div>
            </div>
          </div>
          <div className="stat">
            <div className="stat-icon pink">~</div>
            <div>
              <div className="stat-value">{links.length}</div>
              <div className="stat-label">Connections</div>
            </div>
          </div>
        </div>

        <button className="add-insight-btn" onClick={() => setShowModal(true)}>
          +
        </button>
      </div>

      <aside className="side-panel">
        <div className="panel-header">
          <h2>Exploration</h2>
          <h3>{selectedInsight ? selectedInsight.title : 'Select a node'}</h3>
        </div>

        <div className="panel-content">
          {selectedInsight ? (
            <>
              <div className="insight-card selected">
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteInsight(selectedInsight.id)}
                >
                  x
                </button>
                <div className={`type-badge ${selectedInsight.type}`}>
                  {NODE_TYPES[selectedInsight.type].emoji} {NODE_TYPES[selectedInsight.type].label}
                </div>
                <h4>{selectedInsight.title}</h4>
                <p>{selectedInsight.description}</p>
                {selectedInsight.keywords.length > 0 && (
                  <div className="insight-connections">
                    <h5>Concepts</h5>
                    <div className="connection-tags">
                      {selectedInsight.keywords.map(k => (
                        <span key={k} className="connection-tag">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {connectedInsights.length > 0 && (
                <>
                  <h5 style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '12px',
                    marginTop: '8px'
                  }}>
                    Connected to
                  </h5>
                  {connectedInsights.map(insight => (
                    <div
                      key={insight.id}
                      className="insight-card"
                      onClick={() => setSelectedId(insight.id)}
                    >
                      <div className={`type-badge ${insight.type}`}>
                        {NODE_TYPES[insight.type].emoji} {NODE_TYPES[insight.type].label}
                      </div>
                      <h4>{insight.title}</h4>
                      <p>{insight.description.slice(0, 100)}...</p>
                    </div>
                  ))}
                </>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">~</div>
              <h4>Your neural map</h4>
              <p>Click on a node in the brain visualization to explore that thought and its connections.</p>
            </div>
          )}
        </div>
      </aside>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Add Insight</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>x</button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label>Type</label>
                  <div className="type-selector">
                    {Object.entries(NODE_TYPES).map(([key, { label, emoji }]) => (
                      <div
                        key={key}
                        className={`type-option ${newInsight.type === key ? 'selected' : ''}`}
                        onClick={() => setNewInsight({ ...newInsight, type: key })}
                      >
                        <span>{emoji}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    placeholder="What's the core thought?"
                    value={newInsight.title}
                    onChange={e => setNewInsight({ ...newInsight, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    placeholder="Explore it further... What does it connect to? How does it make you feel?"
                    value={newInsight.description}
                    onChange={e => setNewInsight({ ...newInsight, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddInsight}>Add to Map</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
