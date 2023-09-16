import { MongoClient } from 'mongodb';
import clientPromise from '../../lib/mongodb';
import { random } from 'lodash';
import { ObjectId } from "bson"

if (!process.env.MONGODB_DATABASE_NAME) {
  throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
}

const dbName = process.env.MONGODB_DATABASE_NAME;
const collectionName = 'products';

async function performSale(productsCollection, salesCollection, color, size, quantity) {
  console.log(`Performing sale: Color: ${color}, Size: ${size}, Quantity: ${quantity}`);

 // const product = await productsCollection.findOne({ 'color.name': color, 'items.size': size });

  const productColor = await productsCollection
  .find({ 'color.name': color, 'items.size': size }).toArray();
const product= JSON.parse(JSON.stringify(productColor[0]))

  if (!product) {
    return { message: `Product with color '${color}' and size '${size}' not found.` };
  }

  const sizeItem = product.items.find((item) => item.size === size);
  const availableStock = sizeItem.stock.find(stock => stock.location === 'store').amount;
  const availableTotalStock = product.total_stock_sum.find(stock => stock.location === 'store').amount;

  if (availableStock <= 0 || availableTotalStock <= 0) {
    return { message: `Product with color '${color}' and size '${size}' is out of stock.` };
  }

  if (availableStock < quantity || availableTotalStock < quantity) {
    return { message: `Insufficient stock for color '${color}' and size '${size}'. Available stock: ${availableStock}` };
  }
/*
  const productArray = await productsCollection
            .find({ _id: ObjectId(product._id)}).toArray();
        const productHolder = JSON.parse(JSON.stringify(productArray[0]))
        console.log("PRODUCT HOLDER  " + JSON.stringify(productHolder));

  for (var i = 0; i < productHolder.items.length; i++) { 
    if(productHolder.items[i].size == size){
      console.log("PRODUCT ITEMS  " + productHolder.items[i]);
      for(var j =0; j < productHolder.items[i].stock.length; j++)
      {
        console.log("HERE");
        if(productHolder.items[i].stock[j].location == 'store' ){
          console.log("PRODUCT STOCK  " + productHolder.items[i].stock[j]);
          for(var k=0; k <productHolder.total_stock_sum.length; k++) {
            
          if(productHolder.total_stock_sum[k].location =='store'){
            console.log("PRODUCT TOTAL STOCK  " + productHolder.total_stock_sum[k]);
      await productsCollection.updateOne(
        {
          _id: product._id,
          'color.name': color,
          'items.size': size,
          'items.stock.location': 'store',
        },
        {
          $inc: {
            'items.$[i].stock.$[j].amount': -quantity,
            'total_stock_sum.$[k].amount': -quantity,
          }
        }
              )
      }
      }
      }
    }
  }
  }
*/

  await productsCollection.updateOne(
    {
      _id: product._id,
      'color.name': color,
      'items.size': size,
      'items.stock.location': 'store',
    },
    {
      $inc: {
        'items.$[item].stock.$[elem].amount': -quantity,
        'total_stock_sum.$[stock].amount': -quantity,
      }
    },
    {
      arrayFilters: [
        { 'item.size': size }, // Filter the correct 'items' element based on the size
        { 'elem.location': 'store' }, // Filter the correct 'stock' element based on location
        { 'stock.location': 'store' }, // Filter the correct 'total_stock_sum' element based on location
      ],
    }
  );

  // Save the sales data to the new collection
  const saleData = {
    product_id: ObjectId(product._id),
    name: product.name,
    color: {
      name: color,
      hex: product.color.hex, // Include the color hex
    },
    size: size,
    sku: sizeItem.sku,
    quantity: quantity,
    channel: 'in-store', // Generate a random value of either 'online' or 'in-store'
    timestamp: new Date(),
  };
  await salesCollection.insertOne(saleData);

  return {
    message: `Sold ${quantity} units of ${product.name} (Color: ${color}, Size: ${size}). New stock: ${
      availableStock - quantity
    }`,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const color = req.query.color;
  const size = req.query.size;
  const quantity = parseInt(req.query.quantity, 10); // Parse the quantity to an integer

  if (!color || !size || isNaN(quantity) || quantity <= 0) {
    res.status(400).json({ error: 'Valid color, size, and positive quantity query parameters are required' });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const productsCollection = db.collection(collectionName);
    const salesCollection = db.collection('sales'); // Get the 'sales' collection

    const result = await performSale(productsCollection, salesCollection, color, size, quantity); // Pass both collections
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
