const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bomSchema = new Schema({
    id: String,
    name: String,
    project: String,
    json: {
        type: Object,
        required: true,
        default: {}
    },
    csv: String,
    date: String,
    uploadDate: Date,
    updated: Date
}, {
    collection: 'bom'
});

module.exports = mongoose.model('Bom', bomSchema);