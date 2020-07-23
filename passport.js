const LocalStrategy = require('passport-local/lib').Strategy;
const mongoose = require("mongoose");
const User = require('./models/user');

module.exports = function(passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'username'}, (username, password, done) => {
            //Match User
            User.findOne({ username: username})
                .then(user => {
                    if(!user){
                        return done(null, false, {message: 'User not found'});
                    }

                    if (user.password === password) {
                        return done(null, user);
                    } else {
                        return done(null, false, {message: "Wrong password"});
                    }
                })
                .catch(err => console.log(err))
        })
    )

    passport.serializeUser((user, done) => {
        done(null, user.username);
    })

    passport.deserializeUser((username, done) => {
        //User.findById(username, (err, user) => {
        User.findOne({username: username}, (err, user) => {
            done(err, user);
        })
    })
}