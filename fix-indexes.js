const mongoose = require("mongoose");

async function fixWishlistIndexes() {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/shoezo", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log("Connected to MongoDB");

        const collection = mongoose.connection.collection("wishlists");

    
        const indexes = await collection.indexes();
        console.log("Current indexes:", indexes.map(idx => idx.name));


        const conflictingIndexes = ["user_1", "userId_1"];

        for (const indexName of conflictingIndexes) {
            if (indexes.find(idx => idx.name === indexName)) {
                await collection.dropIndex(indexName);
                console.log(`Dropped index: ${indexName}`);
            }
        }

        console.log("Index cleanup complete. Mongoose will recreate the correct unique index based on the new model.");
        process.exit(0);
    } catch (error) {
        console.error("Error fixing indexes:", error);
        process.exit(1);
    }
}

fixWishlistIndexes();
