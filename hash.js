//https://stackoverflow.com/questions/14015677/node-js-hashing-of-password
var bcrypt = require('bcrypt');

exports.cryptPassword = function(password) {
    return bcrypt.hash(password, 10);
};

exports.comparePassword = function(plainPass, hashword) {
    return bcrypt.compare(plainPass, hashword);
};