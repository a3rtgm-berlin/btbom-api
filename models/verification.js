const fs = require('file-system');

const privateKey = fs.readFileSync('./keys/private.key', 'utf8');
const publicKey = fs.readFileSync('./keys/public.key', 'utf8');
const signOptions = {
    expiresIn: '3h', //3 hours
    algorithm: 'HS512',
};
const verifyOptions = {
    expiresIn: '3h', //3 hours
    algorithms: ['HS512'],
};

module.exports = {privateKey, publicKey, signOptions, verifyOptions};