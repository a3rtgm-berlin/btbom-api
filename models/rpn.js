const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const rpnSchema = new Schema({
    id: String,
    hasConsumption: Boolean,
    parts: [Object]
}, {
    collection: 'rpn'
});

module.exports = mongoose.model('RPN', rpnSchema);