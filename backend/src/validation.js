const ALLOWED_FIELDS = ['title', 'description', 'status'];
const STATUSES = ['pendiente', 'en_progreso', 'completada'];

// Validación completa para creación (POST)
function validateTask(body) {
 const errors = [];
 if (body === null || typeof body !== 'object' || Array.isArray(body)) {
 return { ok: false, errors: ['El cuerpo debe ser un objeto JSON'], value: null };
 }
 for (const key of Object.keys(body)) {
 if (!ALLOWED_FIELDS.includes(key)) {
 errors.push(`Campo no admitido: ${key}`);
 }
 }
 let title = '';
 if (typeof body.title !== 'string') {
 errors.push('El título debe ser una cadena de texto');
 } else {
 title = body.title.trim();
 if (title.length < 1) errors.push('El título es obligatorio');
 if (title.length > 80) errors.push('El título no puede superar 80 caracteres');
 }
 let description = '';
 if (body.description === undefined) {
 description = '';
 } else if (typeof body.description !== 'string') {
 errors.push('La descripción debe ser una cadena de texto');
 } else {
 description = body.description;
 if (description.length > 500) errors.push('La descripción no puede superar 500 caracteres');
 }
 let status = 'pendiente';
 if (body.status === undefined) {
 status = 'pendiente';
 } else if (!STATUSES.includes(body.status)) {
 errors.push('Estado no permitido');
 } else {
 status = body.status;
 }
 if (errors.length > 0) return { ok: false, errors, value: null };
 return { ok: true, errors: [], value: { title, description, status } };
}

// Validación parcial para PATCH (sin defaults de creación)
function validateTaskPatch(body) {
 const errors = [];
 if (body === null || typeof body !== 'object' || Array.isArray(body)) {
 return { ok: false, errors: ['El cuerpo debe ser un objeto JSON'], value: null };
 }
 if (Object.keys(body).length === 0) {
 return { ok: false, errors: ['No se ha enviado ningún campo a modificar'], value: null };
 }
 const value = {};
 for (const key of Object.keys(body)) {
 if (!ALLOWED_FIELDS.includes(key)) {
 errors.push(`Campo no admitido: ${key}`);
 }
 }
 if ('title' in body) {
 if (typeof body.title !== 'string') {
 errors.push('El título debe ser una cadena de texto');
 } else {
 const t = body.title.trim();
 if (t.length < 1 || t.length > 80) errors.push('El título debe tener entre 1 y 80 caracteres');
 else value.title = t;
 }
 }
 if ('description' in body) {
 if (typeof body.description !== 'string') {
 errors.push('La descripción debe ser una cadena de texto');
 } else if (body.description.length > 500) {
 errors.push('La descripción no puede superar 500 caracteres');
 } else {
 value.description = body.description;
 }
 }
 if ('status' in body) {
 if (!STATUSES.includes(body.status)) errors.push('Estado no permitido');
 else value.status = body.status;
 }
 if (errors.length > 0) return { ok: false, errors, value: null };
 return { ok: true, errors: [], value };
}

module.exports = { validateTask, validateTaskPatch };
