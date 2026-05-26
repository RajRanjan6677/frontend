import React, { useState, useEffect } from 'react';
import './App.css';

const API_ROOT = 'https://backend-adk0.onrender.com/bfhl/tasks'; // Replace with live Render deployment target configuration

function App() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [flightSubmission, setFlightSubmission] = useState(false);
  const [appError, setAppError] = useState('');
  const [formError, setFormError] = useState('');

  // Matrix Filtering Configurations
  const [statusFilter, setStatusFilter] = useState('');
  const [minImportance, setMinImportance] = useState(1);

  const [form, setForm] = useState({ title: '', description: '', importance: 3, dueDate: '' });

  const fetchCoreMetrics = async () => {
    try {
      const res = await fetch(`${API_ROOT}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Metric aggregation offline.");
    }
  };

  const fetchTaskQueue = async () => {
    setLoading(true);
    setAppError('');
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.append('status', statusFilter);
      if (minImportance > 1) queryParams.append('minImportance', minImportance);

      const res = await fetch(`${API_ROOT}?${queryParams.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setTasks(data);
      } else {
        setAppError(data.error || 'Failed to sync queue data.');
      }
    } catch (err) {
      setAppError('Target operational API is offline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskQueue();
    fetchCoreMetrics();
  }, [statusFilter, minImportance]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setFlightSubmission(true);

    try {
      const res = await fetch(API_ROOT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Validation checkpoint failed.');
      } else {
        setForm({ title: '', description: '', importance: 3, dueDate: '' });
        fetchTaskQueue();
        fetchCoreMetrics();
      }
    } catch (err) {
      setFormError('Network communication error.');
    } finally {
      setFlightSubmission(false);
    }
  };

  const handleCompleteState = async (id) => {
    try {
      const res = await fetch(`${API_ROOT}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      if (res.ok) {
        fetchTaskQueue();
        fetchCoreMetrics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm("Purge this task permanently?")) return;
    try {
      const res = await fetch(`${API_ROOT}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTaskQueue();
        fetchCoreMetrics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getHumanReadableDate = (dateString) => {
    const diff = new Date(dateString) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    return `in ${days} day${days > 1 ? 's' : ''}`;
  };

  return (
    <div className="dashboard-container">
      <header style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: 0, fontSize: '26px' }}>TaskFlow Engine</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Algorithmic Ranking & Priority Framework</p>
      </header>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card"><h4>Volume</h4><p>{stats.totalTasks}</p></div>
          <div className="stat-card"><h4>Pending</h4><p>{stats.pendingTasks}</p></div>
          <div className="stat-card"><h4>Resolved</h4><p>{stats.completedTasks}</p></div>
          <div className="stat-card"><h4>Avg Importance</h4><p>{stats.averageImportance}</p></div>
          <div className="stat-card" style={{ borderColor: stats.overdueTasks > 0 ? 'var(--danger-color)' : '' }}>
            <h4 style={{ color: stats.overdueTasks > 0 ? 'var(--danger-color)' : '' }}>Overdue Breach</h4>
            <p style={{ color: stats.overdueTasks > 0 ? 'var(--danger-color)' : '' }}>{stats.overdueTasks}</p>
          </div>
        </div>
      )}

      {appError && <div className="inline-error">{appError}</div>}

      <div className="workspace-split">
        <aside className="sticky-panel">
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Register Activity</h3>
          {formError && <div className="inline-error">{formError}</div>}
          <form onSubmit={handleCreate}>
            <div className="input-block">
              <label>Task Title</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="input-block">
              <label>Description Context</label>
              <textarea rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="input-block">
              <label>Importance Matrix Assignment</label>
              <select value={form.importance} onChange={e => setForm({ ...form, importance: parseInt(e.target.value, 10) })}>
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>Tier {v}</option>)}
              </select>
            </div>
            <div className="input-block">
              <label>Deadline Target</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} required />
            </div>
            <button type="submit" disabled={flightSubmission} className="action-cta">
              {flightSubmission ? 'Processing Transaction...' : 'Commit Core Schema'}
            </button>
          </form>
        </aside>

        <main>
          <div className="filters-row">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: 600 }}>Workflow Filter:</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Standings</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
              <label style={{ fontSize: '14px', fontWeight: 600 }}>Min Importance ({minImportance}):</label>
              <input type="range" min="1" max="5" value={minImportance} onChange={e => setMinImportance(parseInt(e.target.value, 10))} />
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Synchronizing cluster registries...</p>
          ) : (
            <div className="task-stack">
              {tasks.length === 0 ? (
                <div style={{ background: 'white', textAlign: 'center', padding: '40px', borderRadius: '8px', border: '1px solid var(--line-border)' }}>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No records returned matching runtime parameters.</p>
                </div>
              ) : (
                tasks.map(task => {
                  const isHighPriority = task.priorityScore >= 50;
                  return (
                    <div key={task._id} className={`task-card-item ${isHighPriority ? 'critical-priority' : ''} ${task.status === 'completed' ? 'state-completed' : ''}`}>
                      <div style={{ width: '70%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <h4 style={{ margin: 0, fontSize: '16px' }}>{task.title}</h4>
                          {isHighPriority && task.status === 'pending' && (
                            <span style={{ background: '#fef2f2', color: 'var(--danger-color)', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', border: '1px solid #fca5a5' }}>
                              CRITICAL THRESHOLD
                            </span>
                          )}
                        </div>
                        {task.description && <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>{task.description}</p>}
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Importance: <strong style={{ color: 'var(--text-primary)' }}>{task.importance}/5</strong> | Due: <strong>{getHumanReadableDate(task.dueDate)}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className={`score-tag ${isHighPriority ? 'high-score' : ''}`}>
                          Score: {task.priorityScore}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {task.status === 'pending' && (
                            <button onClick={() => handleCompleteState(task._id)} style={{ padding: '6px 12px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                              Resolve
                            </button>
                          )}
                          <button onClick={() => handleDeleteRecord(task._id)} style={{ padding: '6px 12px', background: 'white', color: 'var(--danger-color)', border: '1px solid var(--line-border)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                            Purge
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;