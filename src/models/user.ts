import { Schema, model, models } from 'mongoose';

const userSchema = new Schema({
  username: String,
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  phoneNumber: String,
  gender: String,
  dateOfBirth: Date,
});

const User = models.User || model('User', userSchema);

export default User;
