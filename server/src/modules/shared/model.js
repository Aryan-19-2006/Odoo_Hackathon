const mongoose = require('mongoose');

function getModel(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

module.exports = { mongoose, Schema: mongoose.Schema, getModel };
