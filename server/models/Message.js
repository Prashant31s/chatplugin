import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  text: String,
  sender: String,
  receiver: String,
  chatId: String,
  createdAt: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
