const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { createApp } = require('../src/app');
const User = require('../src/models/User');
const Task = require('../src/models/Task');

const ORIGIN = 'http://localhost:5173';
const PASSWORD = 'ClavePrueba_14!';
const sessionStore = new session.MemoryStore();
let app;
let ana;
let bruno;
let testDatabaseVerified = false;

function clearSessions() {
 return new Promise((resolve, reject) => {
 sessionStore.clear(error => error ? reject(error) : resolve());
 });
}

beforeAll(async () => {
 const uri = process.env.MONGO_TEST_URI;
 if (!uri) throw new Error('Falta MONGO_TEST_URI en backend/.env.test');
 const parsed = new URL(uri);
 if (parsed.protocol !== 'mongodb:' || parsed.pathname !== '/pps14_test') {
 throw new Error('Las pruebas solo pueden utilizar la base pps14_test');
 }
 await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
 if (mongoose.connection.name !== 'pps14_test') {
 throw new Error('La conexión no corresponde a pps14_test');
 }
 testDatabaseVerified = true;
 app = createApp({
 sessionStore,
 sessionSecret: 'secreto-exclusivo-de-pruebas-de-al-menos-32-caracteres',
 cookieSecure: false,
 allowedOrigin: ORIGIN
 });
}, 20000);

beforeEach(async () => {
 if (!testDatabaseVerified) throw new Error('Base de pruebas no verificada');
 await Task.deleteMany({});
 await User.deleteMany({});
 await clearSessions();
 const passwordHash = await bcrypt.hash(PASSWORD, 4);
 [ana, bruno] = await User.create([
 { username: 'ana', passwordHash },
 { username: 'bruno', passwordHash }
 ]);
});

afterAll(async () => {
 try {
 if (testDatabaseVerified && mongoose.connection.readyState === 1) {
 await Task.deleteMany({});
 await User.deleteMany({});
 }
 await clearSessions();
 } finally {
 await mongoose.disconnect();
 }
});

async function login(username) {
 const client = request.agent(app);
 const initial = await client.get('/api/auth/csrf').expect(200);
 expect(typeof initial.body.csrfToken).toBe('string');
 await client.post('/api/auth/login')
 .set('Origin', ORIGIN)
 .set('X-CSRF-Token', initial.body.csrfToken)
 .send({ username, password: PASSWORD })
 .expect(200);
 const renewed = await client.get('/api/auth/csrf').expect(200);
 expect(typeof renewed.body.csrfToken).toBe('string');
 return { client, csrfToken: renewed.body.csrfToken };
}

describe('API de tareas con MongoDB real de laboratorio', () => {
 test('I1. Impide consultar tareas sin iniciar sesión', async () => {
 await request(app).get('/api/tasks').expect(401);
 });

 test('I2. Crea, persiste y lista una tarea propia', async () => {
 const { client, csrfToken } = await login('ana');
 const response = await client.post('/api/tasks')
 .set('Origin', ORIGIN)
 .set('X-CSRF-Token', csrfToken)
 .send({ title: 'Revisar dependencias', description: 'Ejecutar auditoría' })
 .expect(201);
 const id = response.body.task.id;
 expect(typeof id).toBe('string');
 const saved = await Task.findById(id).lean();
 expect(String(saved.owner)).toBe(String(ana._id));
 const list = await client.get('/api/tasks').expect(200);
 expect(list.body.tasks.some(t => t.id === id)).toBe(true);
 });

 test('I3. Modifica una tarea propia y persiste el cambio', async () => {
 const task = await Task.create({
 title: 'Preparar pruebas', description: '',
 status: 'pendiente', owner: ana._id
 });
 const { client, csrfToken } = await login('ana');
 await client.patch('/api/tasks/' + task._id)
 .set('Origin', ORIGIN)
 .set('X-CSRF-Token', csrfToken)
 .send({ title: 'Preparar pruebas', description: 'Casos revisados', status: 'completada' })
 .expect(200);
 const saved = await Task.findById(task._id).lean();
 expect(saved.status).toBe('completada');
 });

 test('I4. Oculta tareas ajenas y rechaza su modificación', async () => {
 const otherTask = await Task.create({
 title: 'Tarea de Bruno', description: 'Solo para Bruno',
 status: 'pendiente', owner: bruno._id
 });
 const { client, csrfToken } = await login('ana');
 const list = await client.get('/api/tasks').expect(200);
 expect(list.body.tasks.some(t => t.id === String(otherTask._id))).toBe(false);
 await client.patch('/api/tasks/' + otherTask._id)
 .set('Origin', ORIGIN)
 .set('X-CSRF-Token', csrfToken)
 .send({ title: 'Cambio ajeno', description: '', status: 'completada' })
 .expect(404);
 const unchanged = await Task.findById(otherTask._id).lean();
 expect(unchanged.title).toBe('Tarea de Bruno');
 });

 // I5 añadida: eliminar una tarea propia y verificar su ausencia en MongoDB
 test('I5. Elimina una tarea propia y verifica su ausencia en MongoDB', async () => {
 const { client, csrfToken } = await login('ana');
 const created = await client.post('/api/tasks')
 .set('Origin', ORIGIN)
 .set('X-CSRF-Token', csrfToken)
 .send({ title: 'Para borrar', description: '', status: 'pendiente' })
 .expect(201);
 const id = created.body.task.id;
 await client.delete('/api/tasks/' + id)
 .set('Origin', ORIGIN)
 .set('X-CSRF-Token', csrfToken)
 .expect(204);
 const gone = await Task.findById(id).lean();
 expect(gone).toBeNull();
 });
});
