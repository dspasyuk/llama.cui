const { MongoClient } = require('mongodb');


class MDB {
    constructor(url, dbn) {
        this.url = url;
        this.dbn = dbn;
        this.start_date = new Date(Date.now() - (3600 * 1000 * 24 * 365 * 3));
    }

    async initdb(dbname) {
        const db = new MDB(this.url, dbname);
        return db;
    }

    handle_errors(err, db, msg) {
        if (err) throw err;
        // console.log(msg);
        db.close();
    }

    async create_db() {
        const client = new MongoClient(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            console.log("Database has been created ", this.url);
        } catch (err) {
            this.handle_errors(err, client);
        } finally {
            await client.close();
        }
    }

    async create_collection(collection) {
        const client = new MongoClient(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            const dbo = client.db(this.dbn);
            await dbo.createCollection(collection);
            console.log("Collection has been created ", collection);
        } catch (err) {
            this.handle_errors(err, client);
        } finally {
            await client.close();
        }
    }

    async insertOne(collection, obj) {
        const client = new MongoClient(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            const dbo = client.db(this.dbn);
            await dbo.collection(collection).insertOne(obj);
            console.log("Document inserted");
        } catch (err) {
            this.handle_errors(err, client);
        } finally {
            await client.close();
        }
    }

    async stats(collection) {
        const client = new MongoClient(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            const dbo = client.db(this.dbn);
            const stats = await dbo.collection(collection).stats();
            return stats;
        } catch (err) {
            throw err;
        } finally {
            await client.close();
        }
    }

    async updateOne(collection, target, newitem) {
        const client = new MongoClient(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            const dbo = client.db(this.dbn);
            await dbo.collection(collection).updateOne(target, { $set: newitem });
            console.log("Document updated");
        } catch (err) {
            this.handle_errors(err, client);
        } finally {
            await client.close();
        }
    }

    async updateMany(collection, target, newitem) {
        const client = new MongoClient(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            const dbo = client.db(this.dbn);
            await dbo.collection(collection).updateMany(target, { $set: newitem });
            console.log("Documents updated");
        } catch (err) {
            this.handle_errors(err, client);
        } finally {
            await client.close();
        }
    }

    async insertMany(collection, arr) {
        const client = new MongoClient(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            const dbo = client.db(this.dbn);
            await dbo.collection(collection).insertMany(arr);
            console.log("Documents inserted");
        } catch (err) {
            this.handle_errors(err, client);
        } finally {
            await client.close();
        }
    }

    async find(collection, queryobj) {
        const client = new MongoClient(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            const dbo = client.db(this.dbn);
            const docs = await dbo.collection(collection).find(queryobj).toArray();
            return docs;
        } catch (err) {
            throw err;
        } finally {
            await client.close();
        }
    }

    async deleteOne(collection, delquery) {
        const client = new MongoClient(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            const dbo = client.db(this.dbn);
            await dbo.collection(collection).deleteOne(delquery);
            console.log("Document deleted");
        } catch (err) {
            this.handle_errors(err, client);
        } finally {
            await client.close();
        }
    }

    async deleteMany(collection, delquery) {
        const client = new MongoClient(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            const dbo = client.db(this.dbn);
            await dbo.collection(collection).deleteMany(delquery);
            console.log("Documents deleted");
        } catch (err) {
            this.handle_errors(err, client);
        } finally {
            await client.close();
        }
    }

    async drop_collection(collection) {
        const client = new MongoClient(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            const dbo = client.db(this.dbn);
            await dbo.collection(collection).drop();
            console.log("Collection deleted");
        } catch (err) {
            this.handle_errors(err, client);
        } finally {
            await client.close();
        }
    }

    now() {
        return new Date();
    }

    async get_lattest_date(arr) {
        if (arr.length > 0) {
            return arr.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b);
        } else {
            return { date: this.start_date };
        }
    }

    async createIndex(collection, index = { "text": "test" }) {
        const client = new MongoClient(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            const dbo = client.db(this.dbn);
            await dbo.collection(collection).createIndex(index);
            console.log("Index created!");
        } catch (err) {
            this.handle_errors(err, client);
        } finally {
            await client.close();
        }
    }
}

module.exports = MDB;
