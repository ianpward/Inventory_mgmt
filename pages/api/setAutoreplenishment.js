import clientPromise from '../../lib/mongodb';

export default async (req, res) => {
    try {
        if (!process.env.MONGODB_DATABASE_NAME) {
            throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
        }

        const dbName = process.env.MONGODB_DATABASE_NAME;
        const client = await clientPromise;
        const { ObjectId } = require('mongodb');
        const db = client.db(dbName);

        const active  = req.body;
        const productId = req.query.product_id;

      const product = await db
            .collection("products")
            .find({ _id: ObjectId(productId)}).toArray();
        const productHolder = JSON.parse(JSON.stringify(product[0]));
        const price = productHolder.price;

        const newPrice = price.amount-5;


        await db.collection("products").updateOne(
            {
                _id: ObjectId(productId)
            },
            {
                $set: {
                    "price.amount": newPrice
                }
            }
        );

        console.log("Price Updated to " + newPrice);
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error creating order' });
    }
 };