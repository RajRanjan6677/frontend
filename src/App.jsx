import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'https://backend-adk0.onrender.com/tickets'; 

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterPriority, setFilterPriority] = useState('');
  const [filterBreached, setFilterBreached] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    customerEmail: '',
    priority: 'low'
  });

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (filterPriority) params.append('priority', filterPriority);
      if (filterBreached) params.append('breached', 'true');

      const res = await fetch(`${API_BASE_URL}?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setTickets(data);
    } catch (err) {
      console.error('Error fetching tickets', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/stats`);
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err) {
      console.error('Error fetching stats', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [filterPriority, filterBreached]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (!res.ok) {
        setFormError(data.error || 'Failed to create ticket.');
      } else {
        setShowModal(false);
        setFormData({ subject: '', description: '', customerEmail: '', priority: 'low' });
        fetchTickets();
        fetchStats();
      }
    } catch (err) {
      setFormError('Network error. Try again.');
    }
  };

  const handleTransition = async (id, nextStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchTickets();
        fetchStats();
      } else {
        const data = await res.json();
        alert(data.error || 'Transition failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatAge = (mins) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const statuses = ['open', 'in_progress', 'resolved', 'closed'];

  const getTransitions = (currentStatus) => {
    switch(currentStatus) {
      case 'open': return { forward: 'in_progress', backward: null };
      case 'in_progress': return { forward: 'resolved', backward: 'open' };
      case 'resolved': return { forward: 'closed', backward: 'in_progress' };
      case 'closed': return { forward: null, backward: 'resolved' };
      default: return { forward: null, backward: null };
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h2>DeskFlow Board</h2>
        <button className="action-btn" style={{padding: '8px 16px', background: '#4f46e5', color: 'white'}} onClick={() => setShowModal(true)}>
          + Create Ticket
        </button>
      </div>

      {stats && (
        <div className="stats-strip">
          <div className="stat-item">Open: <span>{stats.statusCounts.open}</span></div>
          <div className="stat-item">In Progress: <span>{stats.statusCounts.in_progress}</span></div>
          <div className="stat-item">Resolved: <span>{stats.statusCounts.resolved}</span></div>
          <div className="stat-item">Closed: <span>{stats.statusCounts.closed}</span></div>
          <div className="stat-item" style={{marginLeft: 'auto', color: 'var(--urg-color)'}}>
            Active SLA Breaches: <strong>{stats.openBreachedCount}</strong>
          </div>
        </div>
      )}

      <div className="controls">
        <label>Priority Filter:</label>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        <label style={{marginLeft: '16px'}}>
          <input type="checkbox" checked={filterBreached} onChange={(e) => setFilterBreached(e.target.checked)} />
          SLA Breached Only
        </label>
      </div>

      <div className="board">
        {statuses.map(status => {
          const statusTickets = tickets.filter(t => t.status === status);
          return (
            <div key={status} className="column">
              <h3>{status.replace('_', ' ')} ({statusTickets.length})</h3>
              {statusTickets.map(ticket => {
                const moves = getTransitions(ticket.status);
                return (
                  <div key={ticket._id} className={`ticket-card ${ticket.slaBreached ? 'breached' : ''}`}>
                    <span className={`priority-badge ${ticket.priority}`}>{ticket.priority}</span>
                    <h4 style={{margin: '4px 0 8px 0', fontSize: '15px'}}>{ticket.subject}</h4>
                    <div style={{fontSize: '12px', color: '#64748b'}}>
                      Age: {formatAge(ticket.ageMinutes)}
                      {ticket.slaBreached && <span style={{color: 'var(--urg-color)', marginLeft: '8px', fontWeight: 'bold'}}>! SLA OUT</span>}
                    </div>
                    
                    <div className="card-actions">
                      {moves.backward ? (
                        <button className="action-btn" onClick={() => handleTransition(ticket._id, moves.backward)}>
                          ← {moves.backward.replace('_', ' ')}
                        </button>
                      ) : <div />}
                      
                      {moves.forward ? (
                        <button className="action-btn" onClick={() => handleTransition(ticket._id, moves.forward)}>
                          {moves.forward.replace('_', ' ')} →
                        </button>
                      ) : <div />}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>New Support Ticket</h3>
            {formError && <div className="error-banner">{formError}</div>}
            <form onSubmit={handleCreateTicket}>
              <div className="form-group">
                <label>Subject</label>
                <input type="text" name="subject" value={formData.subject} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" rows="3" value={formData.description} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Customer Email</label>
                <input type="email" name="customerEmail" value={formData.customerEmail} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select name="priority" value={formData.priority} onChange={handleInputChange}>
                  <option value="low">Low (72h Target)</option>
                  <option value="medium">Medium (24h Target)</option>
                  <option value="high">High (4h Target)</option>
                  <option value="urgent">Urgent (1h Target)</option>
                </select>
              </div>
              <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px'}}>
                <button type="button" className="action-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="action-btn" style={{background: '#4f46e5', color: 'white'}}>Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;