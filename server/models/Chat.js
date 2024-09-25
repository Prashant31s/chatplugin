const chatSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    messages: [messageSchema],
  });
  
  const User = mongoose.model('User', userSchema);
  const Group = mongoose.model('Group', groupSchema);
  const Message = mongoose.model('Message', messageSchema);
  const Chat = mongoose.model('Chat', chatSchema);
  
  export { connectDB, User, Group, Message, Chat };