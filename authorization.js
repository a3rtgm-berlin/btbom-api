const jwt = require("jsonwebtoken");
const verification = require('./models/verification');

const guard = function (req, res, callback, privateKey = verification.privateKey, verifyOptions = verification.verifyOptions)  {
    if (req.headers.authorization) {
        jwt.verify(req.headers.authorization, privateKey, verifyOptions, (err, decoded) => {
            if (err) {
                return res.sendStatus(401);
            }
            callback(decoded.role, req, res);
        });
    } else {
        res.sendStatus(401);
    }
}


module.exports = { guard };