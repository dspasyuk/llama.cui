/*jshint esversion: 8 */
var MC = require("mongodb").MongoClient;
//**  const url = "mongodb://localhost:27017/"*/


function mdb(url = "mongodb://localhost:27017/", dbn) {
  this.options = {};
  this.client = new MC(url, this.options);
  this.url = url;
  this.dbn = dbn;
}

mdb.prototype.insertOne = async function (collection, obj) {
  try {
    await this.client.connect();
    const db = this.client.db(this.dbn);
    const dbc = db.collection(collection);
    await dbc.insertOne(obj);
  } catch (err) {
    console.log(err);
    return false;
  }
};

mdb.prototype.updateOne = async function (
  collection,
  target,
  newitem,
  options = { upsert: true }
) {
  try {
    await this.client.connect();
    const db = this.client.db(this.dbn);
    const dbc = db.collection(collection);
    var source = { $set: newitem };
    await dbc.updateOne(target, source, options);
  } catch (err) {
    console.log(err);
    return false;
  }
};

mdb.prototype.updateMany = async function (
  collection,
  target,
  newitem,
  options = { upsert: true }
) {
  try {
    await this.client.connect();
    const db = this.client.db(this.dbn);
    var source = { $set: newitem };
    const dbc = db.collection(collection);
    await dbc.updateMany(target, source, options);
  } catch (err) {
    console.log(err);
    return false;
  }
};

mdb.prototype.insertMany = async function (collection, arr) {
  try {
    await this.client.connect();
    const db = this.client.db(this.dbn);
    const dbc = db.collection(collection);
    await dbc.insertMany(arr, { ordered: true });
  } catch (err) {
    console.log(err);
    return false;
  }
};

mdb.prototype.createCollection = async function (collection) {
    try {
      await this.client.connect();
      const db = this.client.db(this.dbn);
      await db.createCollection(collection);
    } catch (err) {
      console.log(err);
      return false;
    }
  };

mdb.prototype.stats = async function (collection) {
  try {
    await this.client.connect();
    const db = this.client.db(this.dbn);
    const dbc = db.collection(collection);
    var stats = await dbc.stats();
    return stats;
  } catch (err) {
    console.log(err);
    return false;
  }
};

mdb.prototype.find = async function (collection, queryobj) {
  try {
    await this.client.connect();
    const db = this.client.db(this.dbn);
    const dbc = db.collection(collection);
    var cursor = await dbc.find(queryobj, { ordered: true });
    var docs = await cursor.toArray();
    return docs.map((el) => {
      el._id = el._id.toHexString();
      return el;
    });
  } catch (err) {
    console.log(err);
    return false;
  }
};

mdb.prototype.get_lattest_date = async function (arr) {
  if (arr.length > 0) {
    return arr.reduce((a, b) => {
      return new Date(a.date) > new Date(b.date) ? a : b;
    });
  } else {
    var d = {};
    d["date"] = new Date(Date.now() - 3600 * 1000 * 24 * 365 * 3);
    return d;
  }
};

try {
  module.exports = exports = mdb;
} catch (e) {}

// var dt = {
//     date: '2021-09-30T05:00:00.000Z',
//     open: 115,
//     close: 114.51,
//     high: 115,
//     low: 114.51,
//     volume: 400
// }

// async function run(){
//     console.time('test');
//     const url = "mongodb://localhost:27017/";
//     var db = new mdb(url, "yfmb");
//     // data = await db.find("AFRM", {"open":115})
//     // console.log(data);
//     var i=0;
//     while (i<10000) {
//         await db.updateOne("AMZN", {"id":"617cb038852d0b7001851117"}, dt)
//         // db.deleteOne("AFRM", {"date":"2021-09-30T05:00:00Z"})
//         i++;
//     }
//     db.client.close();
//     console.timeEnd('test');
// }
// run()