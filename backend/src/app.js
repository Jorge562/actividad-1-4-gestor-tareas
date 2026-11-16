const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const { validateTask, validateTaskPatch } = require('./validation');
const User = require('./models/User');
const Task = require('./models/Task');
const path = require('path');

function createApp({ sessionStore, sessionSecret, cookieSecure = false, allowedOrigin = 'http://localhost:5173' }) {
 const app = express();

 // Helmet (config local)
 app.use(helmet({
 contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
 strictTransportSecurity: false
 }));

 // Body parser (16kb)
 app.use(express.json({ limit: '16kb' }));

 // CORS
 app.use((req, res, next) => {
 const origin = req.headers.origin;
 if (origin === allowedOrigin) {
 res.setHeader('Access-Control-Allow-Origin', origin);
 }
 res.setHeader('Access-Control-Allow-Credentials', 'true');
 res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
 res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
 if (req.method === 'OPTIONS') return res.sendStatus(204);
 next();
 });

 // Sesión
 app.use(session({
 store: sessionStore,
 secret: sessionSecret,
 resave: false,
 saveUninitialized: false,
 cookie: {
 httpOnly: true,
 secure: cookieSecure,
 sameSite: 'strict',
 maxAge: 30 * 60 * 1000 // 30 min
 },
 name: '__session' // nombre seguro
 }));

 // Rate limit login
 const loginLimiter = rateLimit({
 windowMs: 60 * 1000,
 max: 60,
 standardHeaders: true,
 legacyHeaders: false,
 message: { error: 'Demasiados intentos de login' }
 });

 // Middleware: verificar usuario en sesión
 app.use((req, res, next) => {
 if (req.session.user) {
 res.locals.user = req.session.user;
 }
 next();
 });

 // Health
 app.get('/api/health', (_req, res) => {
 res.status(200).json({ ok: true });
 });

 // CSRF
 app.get('/api/auth/csrf', (req, res) => {
 if (!req.session.csrfToken) {
 req.session.csrfToken = Buffer.from(Math.random().toString(36).substring(2) + Date.now().toString(36)).toString('base64').substring(0, 32);
 }
 res.status(200).json({ csrfToken: req.session.csrfToken });
 });

 // Login
 app.post('/api/auth/login', loginLimiter, async (req, res) => {
 try {
 const origin = req.headers.origin;
 if (origin && origin !== allowedOrigin) {
 return res.status(403).json({ error: 'Origen no permitido' });
 }
 const csrfToken = req.headers['x-csrf-token'];
 if (!csrfToken || csrfToken !== req.session.csrfToken) {
 return res.status(403).json({ error: 'CSRF inválido' });
 }
 const { username, password } = req.body;
 if (!username || !password) {
 return res.status(400).json({ errors: ['Usuario y contraseña son obligatorios'] });
 }
 const user = await User.findOne({ username: username.toLowerCase() }).lean();
 if (!user) {
 return res.status(401).json({ error: 'Credenciales inválidas' });
 }
 const bcrypt = require('bcryptjs');
 const valid = await bcrypt.compare(password, user.passwordHash);
 if (!valid) {
 return res.status(401).json({ error: 'Credenciales inválidas' });
 }
 // Regenerar sesión
 await new Promise((resolve, reject) => {
 req.session.regenerate((err) => {
 if (err) return reject(err);
 req.session.user = { id: String(user._id), username: user.username };
 req.session.csrfToken = Buffer.from(Math.random().toString(36).substring(2) + Date.now().toString(36)).toString('base64').substring(0, 32);
 req.session.save((e) => e ? reject(e) : resolve());
 });
 });
 res.status(200).json({ user: { id: String(user._id), username: user.username } });
 } catch (err) {
 res.status(500).json({ error: 'Error interno' });
 }
 });

 // Me
 app.get('/api/auth/me', (req, res) => {
 if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
 res.status(200).json({ user: req.session.user });
 });

 // Logout
 app.post('/api/auth/logout', async (req, res) => {
 const origin = req.headers.origin;
 if (origin && origin !== allowedOrigin) return res.status(403).json({ error: 'Origen no permitido' });
 const csrfToken = req.headers['x-csrf-token'];
 if (!csrfToken || csrfToken !== req.session.csrfToken) return res.status(403).json({ error: 'CSRF inválido' });
 await new Promise((resolve, reject) => {
 req.session.destroy((err) => {
 if (err) return reject(err);
 res.clearCookie('__session');
 resolve();
 });
 });
 res.status(204).send();
 });

 // GET tareas (filtrar)
 app.get('/api/tasks', async (req, res) => {
 if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
 const filter = {};
 if (req.query.status) filter.status = req.query.status;
 const tasks = await Task.find({ owner: req.session.user.id, ...filter }, { __v: 0 }).lean();
 res.status(200).json({ tasks: tasks.map(t => ({ id: String(t._id), title: t.title, description: t.description, status: t.status })) });
 });

 // POST tarea
 app.post('/api/tasks', async (req, res) => {
 if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
 const origin = req.headers.origin;
 if (origin && origin !== allowedOrigin) return res.status(403).json({ error: 'Origen no permitido' });
 const csrfToken = req.headers['x-csrf-token'];
 if (!csrfToken || csrfToken !== req.session.csrfToken) return res.status(403).json({ error: 'CSRF inválido' });
 const result = validateTask(req.body);
 if (!result.ok) return res.status(400).json({ errors: result.errors });
 const task = await Task.create({
 title: result.value.title,
 description: result.value.description,
 status: result.value.status,
 owner: req.session.user.id
 });
 res.status(201).json({ task: { id: String(task._id), title: task.title, description: task.description, status: task.status } });
 });

 // PATCH tarea
 app.patch('/api/tasks/:id', async (req, res) => {
 if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
 const origin = req.headers.origin;
 if (origin && origin !== allowedOrigin) return res.status(403).json({ error: 'Origen no permitido' });
 const csrfToken = req.headers['x-csrf-token'];
 if (!csrfToken || csrfToken !== req.session.csrfToken) return res.status(403).json({ error: 'CSRF inválido' });
 const result = validateTaskPatch(req.body);
 if (!result.ok) return res.status(400).json({ errors: result.errors });
 const task = await Task.findOne({ _id: req.params.id, owner: req.session.user.id });
 if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });
 Object.assign(task, result.value);
 await task.save();
 res.status(200).json({ task: { id: String(task._id), title: task.title, description: task.description, status: task.status } });
 });

 // DELETE tarea
 app.delete('/api/tasks/:id', async (req, res) => {
 if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
 const origin = req.headers.origin;
 if (origin && origin !== allowedOrigin) return res.status(403).json({ error: 'Origen no permitido' });
 const csrfToken = req.headers['x-csrf-token'];
 if (!csrfToken || csrfToken !== req.session.csrfToken) return res.status(403).json({ error: 'CSRF inválido' });
 const result = await Task.findOneAndDelete({ _id: req.params.id, owner: req.session.user.id });
 if (!result) return res.status(404).json({ error: 'Tarea no encontrada' });
 res.status(204).send();
 });

const publicDir = process.env.PUBLIC_DIR || path.join(__dirname, '..', 'public');

// Servir los archivos estáticos del frontend
app.use(express.static(publicDir));

// Responder correctamente a rutas API inexistentes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta API no encontrada' });
});

// Permitir que React gestione las rutas del frontend
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

 return app;
}

module.exports = { createApp };
