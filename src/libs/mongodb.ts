import { connect, Mongoose, Connection } from "mongoose";

const { MONGO_DB_URI } = process.env;

if (!MONGO_DB_URI) {
  throw new Error("MONGO_DB_URI must be defined");
}

interface Conn {
  isConnected: boolean;
}

const conn: Conn = {
  isConnected: false,
};

export const connectDb = async (): Promise<void> => {
  if (conn.isConnected) return;

  try {
    const db: Mongoose = await connect(MONGO_DB_URI);
    const connection: Connection = db.connection;

    if (connection.readyState === 1) {
      console.log(new Date(), "MongoDB connected");
      conn.isConnected = true;
    }
  } catch (error: unknown) {
    // Unknown es más seguro que any
    if (error instanceof Error) {
      // Verificamos si es un objeto Error antes de acceder a .message
      console.log(new Date(), "Error connecting to MongoDB", error.message);
    } else {
      console.log(
        new Date(),
        "An unknown error occurred while connecting to MongoDB",
      );
    }
  }
};
