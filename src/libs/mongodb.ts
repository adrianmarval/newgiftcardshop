import { connect, Mongoose, Connection } from 'mongoose';

const { MONGO_DB_URI } = process.env;

if (!MONGO_DB_URI) {
  throw new Error('MONGO_DB_URI must be defined');
}

const conn = {
  isConnected: false,
};

export const connectDb = async (): Promise<void> => {
  if (conn.isConnected) return;

  try {
    const db: Mongoose = await connect(MONGO_DB_URI);
    const connection: Connection = db.connection;

    if (connection.readyState === 1) {
      console.log(new Date(), 'MongoDB connected');
      conn.isConnected = true;
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(new Date(), 'Error connecting to MongoDB', error.message);
    } else {
      console.log(new Date(), 'An unknown error occurred while connecting to MongoDB');
    }
    throw new Error('Ocurrio un problema al conectar la base de datos');
  }
};
