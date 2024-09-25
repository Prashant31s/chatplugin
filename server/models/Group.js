
import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  id: String,
  name: String,
  members: [String],
  parentId: String,
});

const Group = mongoose.model('Group', groupSchema);
export default Group;
