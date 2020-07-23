const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const excludeListSchema = new Schema({
    exclude: [Object]
}, {
    collection: 'exclude'
});

module.exports = mongoose.model('ExcludeList', excludeListSchema);