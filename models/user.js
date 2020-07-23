const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: String,
    username: String,
    password: String,
    role: Number,
}, {
    collection: 'fe-users'
});

module.exports = mongoose.model('User', userSchema);
