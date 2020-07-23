const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const planogramSchema = new Schema({
    state: String,
    planogram: [Object],
    mapping: [Object],
    updated: Date,
}, {
    collection: 'planogram'
});

module.exports = mongoose.model('Planogram', planogramSchema);