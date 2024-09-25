import mongoose from 'mongoose';

const userdetailsSchema = new mongoose.Schema({
  _id: String,
  name: String,
  parentId: String,
  userId: String,
});

const Userdetails = mongoose.model('User', userdetailsSchema);
export default Userdetails;
