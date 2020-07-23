const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const arbMatrixSchema = new Schema({
    json: {
        type: Object,
        required: true,
        default: {}
    },
    uploadDate: {
        type: Date,
        required: true,
        default: new Date()
    }
}, {
    collection: 'matrix'
});

module.exports = mongoose.model('ArbMatrix', arbMatrixSchema);