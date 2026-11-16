const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
 title: {
 type: String,
 required: true,
 trim: true,
 minlength: 1,
 maxlength: 80
 },
 description: {
 type: String,
 default: '',
 maxlength: 500
 },
 status: {
 type: String,
 enum: ['pendiente', 'en_progreso', 'completada'],
 default: 'pendiente'
 },
 owner: {
 type: mongoose.Schema.Types.ObjectId,
 ref: 'User',
 required: true
 }
}, { timestamps: true });

taskSchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
