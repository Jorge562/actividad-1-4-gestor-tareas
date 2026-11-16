import { useState, useEffect } from 'react';
import { api } from './api';

function App() {
 const [user, setUser] = useState(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [tasks, setTasks] = useState([]);
 const [statusFilter, setStatusFilter] = useState('');
 const [editingId, setEditingId] = useState(null);
 const [editTitle, setEditTitle] = useState('');
 const [editDesc, setEditDesc] = useState('');
 const [editStatus, setEditStatus] = useState('');

 // Formulario nueva tarea
 const [newTitle, setNewTitle] = useState('');
 const [newDesc, setNewDesc] = useState('');

 // Login
 const [loginUser, setLoginUser] = useState('');
 const [loginPass, setLoginPass] = useState('');

 useEffect(() => {
 checkAuth();
 }, []);

 const checkAuth = async () => {
 try {
 const data = await api.me();
 setUser(data.user);
 } catch {
 setUser(null);
 }
 };

 const handleLogin = async (e) => {
 e.preventDefault();
 setLoading(true);
 setError('');
 try {
 const data = await api.login(loginUser, loginPass);
 setUser(data.user);
 setLoginUser('');
 setLoginPass('');
 } catch (err) {
 setError(err.message || 'Credenciales inválidas');
 } finally {
 setLoading(false);
 }
 };

 const handleLogout = async () => {
 try {
 await api.logout();
 setUser(null);
 setTasks([]);
 } catch (err) {
 console.error('Logout error:', err);
 }
 };

 const loadTasks = async (status = '') => {
 try {
 const data = await api.getTasks(status);
 setTasks(data.tasks);
 } catch (err) {
 setError(err.message || 'Error al cargar tareas');
 }
 };

 const handleCreate = async (e) => {
 e.preventDefault();
 setError('');
 if (!newTitle.trim()) { setError('El título es obligatorio'); return; }
 try {
 await api.createTask(newTitle, newDesc, 'pendiente');
 setNewTitle('');
 setNewDesc('');
 loadTasks(statusFilter);
 } catch (err) {
 setError(err.message || 'Error al crear tarea');
 }
 };

 const handleDelete = async (id) => {
 try {
 await api.deleteTask(id);
 loadTasks(statusFilter);
 } catch (err) {
 setError(err.message || 'Error al eliminar');
 }
 };

 const startEdit = (task) => {
 setEditingId(task.id);
 setEditTitle(task.title);
 setEditDesc(task.description);
 setEditStatus(task.status);
 };

 const handleUpdate = async (id) => {
 setError('');
 if (!editTitle.trim()) { setError('El título es obligatorio'); return; }
 try {
 await api.updateTask(id, { title: editTitle, description: editDesc, status: editStatus });
 setEditingId(null);
 loadTasks(statusFilter);
 } catch (err) {
 setError(err.message || 'Error al actualizar');
 }
 };

 // --- LOGIN VIEW ---
 if (!user) {
 return (
 <div style={{ maxWidth: 400, margin: '60px auto', padding: 20, fontFamily: 'sans-serif' }}>
 <h2>Gestor de Tareas - Login</h2>
 <form onSubmit={handleLogin}>
 <div style={{ marginBottom: 10 }}>
 <label>Usuario:</label><br/>
 <input value={loginUser} onChange={e => setLoginUser(e.target.value)} style={{ width: '100%', padding: 8 }} required />
 </div>
 <div style={{ marginBottom: 10 }}>
 <label>Contraseña:</label><br/>
 <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} style={{ width: '100%', padding: 8 }} required />
 </div>
 <button type="submit" disabled={loading} style={{ padding: '10px 20px', cursor: 'pointer' }}>
 {loading ? 'Entrando...' : 'Entrar'}
 </button>
 </form>
 {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}
 <p style={{ marginTop: 20, fontSize: 14, color: '#666' }}>
 Usuarios de prueba: <b>alice</b> / <b>Alice_PPS14_2026</b> o <b>bob</b> / <b>Bob_PPS14_2026</b>
 </p>
 </div>
 );
 }

 // --- DASHBOARD VIEW ---
 return (
 <div style={{ maxWidth: 800, margin: '20px auto', padding: 20, fontFamily: 'sans-serif' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
 <h2>Bienvenido, {user.username}</h2>
 <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer' }}>Cerrar Sesión</button>
 </div>

 {error && <div style={{ background: '#fee', border: '1px solid #f66', padding: 10, marginBottom: 10, borderRadius: 4 }}>{error}</div>}
 {success && <div style={{ background: '#efe', border: '1px solid #6f6', padding: 10, marginBottom: 10, borderRadius: 4 }}>{success}</div>}

 {/* Formulario crear tarea */}
 <form onSubmit={handleCreate} style={{ background: '#f9f9f9', padding: 15, borderRadius: 6, marginBottom: 20 }}>
 <h3>Crear Tarea</h3>
 <div style={{ marginBottom: 8 }}>
 <label>Título (1-80 caracteres):</label><br/>
 <input value={newTitle} onChange={e => setNewTitle(e.target.value)} maxLength={80} placeholder="Título de la tarea" style={{ width: '100%', padding: 8, boxSizing: 'border-box' }} required />
 </div>
 <div style={{ marginBottom: 8 }}>
 <label>Descripción:</label><br/>
 <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} maxLength={500} rows={3} style={{ width: '100%', padding: 8, boxSizing: 'border-box' }} />
 </div>
 <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4 }}>Crear Tarea</button>
 </form>

 {/* Filtro */}
 <div style={{ marginBottom: 15 }}>
 <label>Filtrar por estado: </label>
 <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); loadTasks(e.target.value); }} style={{ padding: 6, marginRight: 10 }}>
 <option value="">Todas</option>
 <option value="pendiente">Pendiente</option>
 <option value="en_progreso">En progreso</option>
 <option value="completada">Completada</option>
 </select>
 <button onClick={() => loadTasks(statusFilter)} style={{ padding: '6px 12px', cursor: 'pointer' }}>Refrescar</button>
 </div>

 {/* Listado tareas */}
 {tasks.length === 0 && <p>No hay tareas</p>}
 {tasks.map(task => (
 <div key={task.id} style={{ border: '1px solid #ddd', padding: 15, marginBottom: 10, borderRadius: 6, background: '#fff' }}>
 {editingId === task.id ? (
 <div>
 <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: '100%', padding: 6, marginBottom: 6, boxSizing: 'border-box' }} />
 <input value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ width: '100%', padding: 6, marginBottom: 6, boxSizing: 'border-box' }} />
 <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ padding: 6, marginBottom: 6 }}>
 <option value="pendiente">Pendiente</option>
 <option value="en_progreso">En progreso</option>
 <option value="completada">Completada</option>
 </select>
 <div style={{ marginTop: 8 }}>
 <button onClick={() => handleUpdate(task.id)} style={{ padding: '6px 12px', marginRight: 8, cursor: 'pointer' }}>Guardar</button>
 <button onClick={() => setEditingId(null)} style={{ padding: '6px 12px', cursor: 'pointer' }}>Cancelar</button>
 </div>
 </div>
 ) : (
 <div>
 <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{task.title}</div>
 <div style={{ marginBottom: 4, color: '#555' }}>{task.description || 'Sin descripción'}</div>
 <div style={{ fontSize: 13, color: '#888' }}>
 Estado: <b>{task.status === 'en_progreso' ? 'En progreso' : task.status}</b>
 </div>
 <div style={{ marginTop: 8 }}>
 <button onClick={() => startEdit(task)} style={{ padding: '4px 10px', marginRight: 6, cursor: 'pointer' }}>Editar</button>
 <button onClick={() => handleDelete(task.id)} style={{ padding: '4px 10px', background: '#dc3545', color: '#fff', border: 'none', cursor: 'pointer' }}>Eliminar</button>
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 );
}

export default App;
