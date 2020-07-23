const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const masterBomSchema = new Schema({
    id: String,
    json: {
        type: Object,
        required: true,
        default: {}
    },
    movingFile: Object,
    date: String,
    uploadDate: Date,
    projects: [String],
    rpn: Boolean,
    planogram: Boolean
}, {
    collection: 'master'
});


module.exports = mongoose.model('MasterBom', masterBomSchema);