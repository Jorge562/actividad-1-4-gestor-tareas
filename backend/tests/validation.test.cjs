const { validateTask } = require('../src/validation');

describe('Validación de una tarea', () => {
 test('U1. Normaliza un título válido y asigna el estado inicial', () => {
 const result = validateTask({ title: ' Preparar práctica ' });
 expect(result.ok).toBe(true);
 expect(result.errors).toEqual([]);
 expect(result.value).toEqual({
 title: 'Preparar práctica',
 description: '',
 status: 'pendiente'
 });
 });

 test('U2. Rechaza un título vacío', () => {
 const result = validateTask({ title: '' });
 expect(result.ok).toBe(false);
 expect(result.errors.length).toBeGreaterThan(0);
 });

 test('U3. Rechaza un título numérico', () => {
 const result = validateTask({ title: 42 });
 expect(result.ok).toBe(false);
 expect(result.errors.length).toBeGreaterThan(0);
 });

 // Añade U4, U5 y U6 de la tabla de la guía.
 test('U4. Rechaza un título compuesto solo por espacios', () => {
 const result = validateTask({ title: '    ' });
 expect(result.ok).toBe(false);
 expect(result.errors.length).toBeGreaterThan(0);
 });

 test('U5. Rechaza un título de 81 caracteres pero acepta uno de 80', () => {
 const largo = 'A'.repeat(81);
 const correcto = 'B'.repeat(80);
 expect(validateTask({ title: largo }).ok).toBe(false);
 expect(validateTask({ title: correcto }).ok).toBe(true);
 });

 test('U6. Rechaza un estado no permitido', () => {
 const result = validateTask({ title: 'Válida', status: 'finalizada' });
 expect(result.ok).toBe(false);
 expect(result.errors).toContain('Estado no permitido');
 });
});
