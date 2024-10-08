import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { ExpressPeerServer } from "peer";
import dotenv from "dotenv";
import { Socket } from "dgram";
dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: "/myapp",
});

app.use("/peerjs", peerServer);

// MongoDB connection setup
const mongoURI = process.env.MONGO_URI;
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define MongoDB Schemas and Models
const userSchema = new mongoose.Schema({
  id: String,
  username: String,
  userType: String,
  parentId: String,
  socketIds: [String], // Changed to an array of strings
});

const groupSchema = new mongoose.Schema({
  id: String,
  name: String,
  members: [String],
  parentId: String,
  createdBy: String,
  oncall: {
    type: [String], // Array of user IDs currently on call
    default: [], // Initialize as an empty array
  },
});

const messageSchema = new mongoose.Schema({
  text: String,
  sender: String,
  receiver: { type: String, default: null },
  chatId: String,
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Group = mongoose.model("Group", groupSchema);
const Message = mongoose.model("Message", messageSchema);

const users = new Map();
//const groups = new Map();
let callingsockets = [];
//let groupsoncall = [];

const removeOnCallUser = async (groupId, userId, socketid) => {
  try {
    const updatedGroup = await Group.findOneAndUpdate(
      { id: groupId }, // Find the group by the custom `id`
      { $pull: { oncall: userId } }, // Remove the userId from the oncall array
      { new: true } // Return the updated document
    );
  } catch (error) {
    console.error("Error removing oncall user:", error);
  }

  const group = await Group.findOne({ id: groupId });
  
  const currentuser = await User.findOne({ id: userId });
  

  //console.log("reeeeeeeeeeeeeemoooceceeecalluser", currentuser);
  if(currentuser){
    const usersWithSameParent = await User.find({
      parentId: currentuser.parentId,
    });
    usersWithSameParent.forEach((user) => {
      user.socketIds.forEach(async (socketid) => {
        const groupList = await Group.find({ members: { $in: user.id } });
        io.to(socketid).emit("group list", groupList);
      });
    });
  }
  

  // users.forEach((value, key) => {
  //   //console.log("valueparent", value.parentId,useroncall);

  //   if (currentuser.parentId === value.parentId) {
  //     //console.log("datasocket", value.socketId);

  //     usersWithSameParent.push(value.socketId);
  //   }
  // });

  // usersWithSameParent.forEach(async (socket) => {
  //   //const user = users.get(socket.id);
  //   //if (user && user.parentId === parentId) {
  //   const u = users.get(socket);
  //   const groupList = await Group.find({ members: { $in: u.id } });
  //   //console.log("userswithsameparent", groupList,u);
  //   io.to(socket).emit("group list", groupList);
  //   //}
  // });
};
const getGroupDetails = async (groupId, allUsers) => {
  const group = await Group.findOne({ id: groupId });

  const usersInGroup = allUsers.filter((user) =>
    group.members.includes(user.id)
  );

  const usersNotInGroup = allUsers.filter(
    (user) => !group.members.includes(user.id)
  );

  return { ...group.toObject(), usersInGroup, usersNotInGroup };
};

// Dummy database
const dummyEmployees = {
  employees: [
    {
      name: "Alice Johnson",
      catcher_id: "CATCHER001",
      parent_id: "CATCHER001",
      type_id: 1,
    },
    {
      name: "Bob Smith",
      catcher_id: "CATCHER002",
      parent_id: "CATCHER001",
      type_id: 0,
    },
    {
      name: "Charlie Brown",
      catcher_id: "CATCHER003",
      parent_id: "CATCHER001",
      type_id: 0,
    },
    {
      name: "David Wilson",
      catcher_id: "CATCHER004",
      parent_id: "CATCHER001",
      type_id: 0,
    },
    {
      name: "Eva Adams",
      catcher_id: "CATCHER005",
      parent_id: "CATCHER001",
      type_id: 0,
    },
    {
      name: "Frank Miller",
      catcher_id: "CATCHER006",
      parent_id: "CATCHER001",
      type_id: 0,
    },
    {
      name: "Grace Lee",
      catcher_id: "CATCHER007",
      parent_id: "CATCHER007",
      type_id: 1,
    },
    {
      name: "Henry Taylor",
      catcher_id: "CATCHER008",
      parent_id: "CATCHER007",
      type_id: 0,
    },
    {
      name: "Isabella Martinez",
      catcher_id: "CATCHER009",
      parent_id: "CATCHER007",
      type_id: 0,
    },
    {
      name: "Jack White",
      catcher_id: "CATCHER010",
      parent_id: "CATCHER010",
      type_id: 1,
    },
    {
      name: "Karen Harris",
      catcher_id: "CATCHER011",
      parent_id: "CATCHER010",
      type_id: 0,
    },
    {
      name: "Leo Scott",
      catcher_id: "CATCHER012",
      parent_id: "CATCHER010",
      type_id: 0,
    },
    {
      name: "Mia King",
      catcher_id: "CATCHER013",
      parent_id: "CATCHER010",
      type_id: 0,
    },
    {
      name: "Noah Wright",
      catcher_id: "CATCHER014",
      parent_id: "CATCHER010",
      type_id: 0,
    },
    {
      name: "Paul Young",
      catcher_id: "CATCHER015",
      parent_id: "CATCHER015",
      type_id: 1,
    },
    {
      name: "Quinn Lopez",
      catcher_id: "CATCHER016",
      parent_id: "CATCHER015",
      type_id: 0,
    },
    {
      name: "Rachel Robinson",
      catcher_id: "CATCHER017",
      parent_id: "CATCHER015",
      type_id: 0,
    },
  ],
};

const updateUserList = async (parentId) => {
  const userList = dummyEmployees.employees
    .filter((emp) => emp.parent_id === parentId)
    .map((emp) => ({
      id: emp.catcher_id,
      username: emp.name,
      userType: emp.type_id === 1 ? "employer" : "sub-employee",
      parentId: emp.parent_id,
      socketId: Array.from(users.entries()).find(
        ([_, user]) => user.id === emp.catcher_id
      )?.[0],
    }));

  const sockets = await io.fetchSockets();
  //console.log("update user list ", sockets)
  const usersWithSameParent = await User.find({
    parentId: parentId,
  });
  usersWithSameParent.forEach((user) => {
    user.socketIds.forEach(async (socketid) => {
      io.to(socketid).emit("user list", userList);
    });
  });
  sockets.forEach((socket) => {
    const user = users.get(socket.id);
    if (user && user.parentId === parentId) {
      socket.emit("user list", userList);
    }
  });
};

const updateGroupList = async (members) => {

  console.log("updategrouplist members", members);
  const groupList = await Group.find({ members: { $in: members } });
  members.forEach(async (memberId) => {
    const member = await User.findOne({ id: memberId });
    if(member){
      member.socketIds.forEach((socketid) => {
        if (socketid) {
          io.to(socketid).emit("group list", groupList);
        }
      });
    }
    
    // const memberSocket = Array.from(users.values()).find(
    //   (user) => user.id === memberId
    // )?.socketId;
    // if (memberSocket) {
    //   io.to(memberSocket).emit("group list", groupList);
    // }
  });
};

const removeSocketIdFromUser = async (userId, socketIdToRemove) => {
  try {
    const result = await User.updateOne(
      { id: userId },
      { $pull: { socketIds: socketIdToRemove } } // Remove the specified socketId
    );

    if (result.nModified > 0) {
      console.log("Socket ID removed successfully.");
    } else {
      console.log("Socket ID not found or user not found.");
    }
  } catch (error) {
    console.error("Error updating user:", error);
  }
};

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("login", async (catcherId) => {
    const employee = dummyEmployees.employees.find(
      (emp) => emp.catcher_id === catcherId
    );
    if (employee) {
      const chatHistory = await Message.find({
        $or: [
          { sender: employee.catcher_id },
          { receiver: employee.catcher_id },
          { chatId: `employer-${employee.parent_id}` },
        ],
      }).sort({ createdAt: 1 });
      const user = {
        id: employee.catcher_id,
        username: employee.name,
        socketId: socket.id,
        userType: employee.type_id === 1 ? "employer" : "sub-employee",
        parentId: employee.parent_id,
      };
      const usertofind = await User.findOne({ id: employee.catcher_id });
      if (usertofind) {
        usertofind.socketIds.push(socket.id);
        const updatedUser = await usertofind.save();
        //console.log("Updated user:", updatedUser);
      } else {
        const newUser = {
          id: employee.catcher_id,
          username: employee.name,
          userType: employee.type_id === 1 ? "employer" : "sub-employee",
          parentId: employee.parent_id,
          socketIds: [socket.id],
        };
        const savedUser = new User(newUser);
        await savedUser.save();
      }

      // Save the user to the database
      let existingUser = await User.findOne({ id: user.id });

      if (existingUser) {
        // User exists, update their data
        const xsocketid = existingUser.socketId;
        existingUser.username = user.username;
        existingUser.socketId = user.socketId; // Update with new socketId
        existingUser.userType = user.userType;
        existingUser.parentId = user.parentId;

        // Save the updated user to the database
        //console.log("prevsocketid", xsocketid);
        users.delete(xsocketid);
        users.set(socket.id, user);
        //await existingUser.save();
      } else {
        const newUser = new User(user);
        //await newUser.save();
        users.set(socket.id, user);
      }

      // Fetch all users with the same parentId
      socket.userId = user.id;
      const userGroups = await Group.find({ members: user.id });
      const usersWithSameParent = dummyEmployees.employees
        .filter((emp) => emp.parent_id === user.parentId)
        .map((emp) => ({
          id: emp.catcher_id,
          username: emp.name,
          userType: emp.type_id === 1 ? "employer" : "sub-employee",
          parentId: emp.parent_id,
          socketIds: users[emp.catcher_id]?.socketIds || [],
        }));
      //console.log("useerwithsameparent", usersWithSameParent,users);
      socket.emit("login successful", {
        user,
        usersWithSameParent,
        chatHistory,
        groups: userGroups,
      });

      const roomId = `employer-${user.parentId}`;
      socket.join(roomId);
      //console.log(`${user.userType} ${user.username} joined room ${roomId}`);
      //const groupList = await Group.find({ members: { $in: employee.catcher_id } });
      //io.to(user.socketId).emit("group list", groupList);

      //const userGroups = await Group.find({ members: user.id });

      // Update the groups map with fetched groups from MongoDB
      // userGroups.forEach((group) => {
      //   groups.set(group.id, group);
      // });
      //console.log("usergroups", userGroups, groups);

      // Emit the group list to the user
      io.to(user.socketId).emit("group list", userGroups);
      io.to(user.socketId).emit("i am on call", callingsockets);

      if (user.userType === "sub-employee") {
        const employerSocket = Array.from(users.values()).find(
          (u) => u.id === user.parentId
        )?.socketId;
        if (employerSocket) {
          io.to(employerSocket).emit("sub-employee joined", user);
        }
      }
      await updateUserList(user.parentId);
    } else {
      socket.emit("login failed", "User not found");
    }
  });

  socket.on("create group", async (groupData) => {
    try {
      const user = await User.findOne({ socketIds: socket.id }); // Search by socket ID
      // console.log("uuuser", user);
      if (!user) {
        console.log("User not found");
        return;
      } else {
        const groupId = uuidv4();
        const newGroup = {
          id: groupId,
          name: groupData.name,
          members: groupData.members,
          parentId: user.parentId,
          createdBy: user.id,
          oncall: [],
        };
        const savedGroup = new Group(newGroup);
        await savedGroup.save();

        //groups.set(groupId, newGroup);

        newGroup.members.forEach(async (memberId) => {
          //console.log("memberid", memberId);
          const user = await User.findOne({ id: memberId });
          if (user) {
            for (let i = 0; i < user.socketIds.length; i++) {
              io.to(user.socketIds[i]).emit("group created", newGroup);
            }
          }
        });
        await updateGroupList(newGroup.members);
      }
    } catch (error) {
      console.error("Error searching for user:", error);
    }
    //const user = users.get(socket.id);
    //console.log("groupdata", groupData);
    //if (!user) return;

    // const groupId = uuidv4();
    // const newGroup = {
    //   id: groupId,
    //   name: groupData.name,
    //   members: groupData.members,
    //   parentId: user.parentId,
    //   createdBy: user.id,
    //   oncall: [],
    // };
    //console.log("group created", newGroup);

    // Save the group to the database
    // const savedGroup = new Group(newGroup);
    // await savedGroup.save();

    // groups.set(groupId, newGroup);

    // newGroup.members.forEach((memberId) => {
    //   //console.log("memberid", memberId);
    //   const member = Array.from(users.values()).find((u) => u.id === memberId);
    //   if (member) {
    //     io.to(member.socketId).emit("group created", newGroup);
    //   }
    // });
  });

  socket.on("add to group", async ({ groupId, userId }) => {
    try {
      const group = await Group.findOne({ id: groupId });
      const allUsers = dummyEmployees.employees
        .filter((emp) => emp.parent_id === group.parentId)
        .map((emp) => ({
          id: emp.catcher_id,
          username: emp.name,
          userType: emp.type_id === 1 ? "employer" : "sub-employee",
        }));

      if (group && group.createdBy === socket.userId) {
        if (!group.members.includes(userId)) {
          group.members.push(userId);
          await group.save();

          const updatedGroupDetails = await getGroupDetails(groupId, allUsers);

          // Emit the updated group to all members
          group.members.forEach(async (memberId) => {
           // const memberSockets = users[memberId]?.socketIds || [];
            const addSocketIds = []; // Initialize an array to store keys
            const user = await User.findOne({ id: memberId });
            if (user) {
              for (let i = 0; i < user.socketIds.length; i++) {
                addSocketIds.push(user.socketIds[i]);
              }
            }
            // users.forEach((values, keys) => {
            //   //console.log("valuesid", values, keys);
            //   if (values.id === memberId) {
            //     addSocketIds.push(keys); // Push the key into the array if the condition is met
            //   }
            // });
            addSocketIds.forEach((socketId) => {
              io.to(socketId).emit("group updated", updatedGroupDetails);
            });
          });

          //console.log(`User ${userId} added to group ${groupId}`);
        }
      } else {
        socket.emit(
          "error",
          "You do not have permission to add users to this group."
        );
      }
    } catch (error) {
      console.error("Error adding user to group:", error);
      socket.emit(
        "error",
        "An error occurred while adding the user to the group."
      );
    }
  });

  // Event for removing a member from a group
  socket.on("remove from group", async ({ groupId, userId }) => {
    //console.log("user removed", groupId, userId);
    try {
      //console.log("ussssserrr rerreemmoovveedd");
      const group = await Group.findOne({ id: groupId });
      const allUsers = dummyEmployees.employees
        .filter((emp) => emp.parent_id === group.parentId)
        .map((emp) => ({
          id: emp.catcher_id,
          username: emp.name,
          userType: emp.type_id === 1 ? "employer" : "sub-employee",
        }));
      //console.log("removed group&& users", group.createdBy, socket.userId);

      if (group && group.createdBy === socket.userId) {
        group.members = group.members.filter((member) => member !== userId);
        await group.save();

        const updatedGroupDetails = await getGroupDetails(groupId, allUsers);

        // Emit to all remaining members
        //let removeSocketIds =[];
        group.members.forEach(async (memberId) => {
          // const memberSockets = users[memberId]?.socketIds || [];
          // console.log("membersocektsss", memberSockets);
          // memberSockets.forEach((socketId) => {
          //   console.log("removesocketid", socketId);
          //   io.to(socketId).emit("group updated", updatedGroupDetails);
          // });

          const user = await User.findOne({ id: memberId });
          if (user) {
            for (let i = 0; i < user.socketIds.length; i++) {
              io.to(user.socketIds[i]).emit(
                "group updated",
                updatedGroupDetails
              );
              // removeSocketIds.push(user.socketIds[i]);
              console.log("memeberssssssssss", user.id, user.socketIds[i]);
            }
          }
        });

        // Emit a specific event to the removed user

        //const removedUserSockets = users[userId]?.socketIds || [];
        const removeuser = await User.findOne({ id: userId });
        const removedSocketIds = []; // Initialize an array to store keys

        if (removeuser) {
          removeuser.socketIds.forEach((socketId) => {
            console.log("removedsocektidssss", socketId);
            removedSocketIds.push(socketId); // Push the key into the array if the condition is met
          });
        }

        //console.log("removed users", removedSocketIds);
        //io.to(removedsocketid).emit("removed from group", groupId);
        removedSocketIds.forEach((socketId) => {
          //console.log("USER REMOVER", socketId, groupId);
          io.to(socketId).emit("removed from group", groupId);
        });

        //console.log(`User ${userId} removed from group ${groupId}`);
      } else {
        socket.emit(
          "error",
          "You do not have permission to remove users from this group."
        );
      }
    } catch (error) {
      console.error("Error removing user from group:", error);
      socket.emit(
        "error",
        "An error occurred while removing the user from the group."
      );
    }
  });

  socket.on("fetch group details", async (groupId) => {
    try {
      const group = await Group.findOne({ id: groupId });

      if (group) {
        // Fetch users from dummy data based on parentId

        const allUsers = dummyEmployees.employees

          .filter((emp) => emp.parent_id === group.parentId)

          .map((emp) => ({
            id: emp.catcher_id,

            username: emp.name,

            userType: emp.type_id === 1 ? "employer" : "sub-employee",
          }));

        // Find users in the group and those not in the group

        const usersInGroup = allUsers.filter((user) =>
          group.members.includes(user.id)
        );

        const usersNotInGroup = allUsers.filter(
          (user) => !group.members.includes(user.id)
        );

        // Emit the group details to the client

        socket.emit("group details", {
          id: group.id,
          usersInGroup,
          usersNotInGroup,
          group,
        });
      } else {
        socket.emit("error", "Group not found.");
      }
    } catch (error) {
      console.error("Error fetching group details:", error);

      socket.emit("error", "An error occurred while fetching group details.");
    }
  });

  socket.on("chat message", async (messageData) => {
    const sender = await User.findOne({ id: messageData.sender });
    if (!sender) return;
    console.log("cahat", messageData);

    const { receiver, chatId, text } = messageData;
    const newMessage = new Message({
      text,
      sender: sender.id,
      receiver: receiver || null,
      chatId,
    });

    await newMessage.save();

    // Add the `createdAt` field (timestamp) to the messageData before sending it to clients
    const messageToSend = {
      ...messageData,
      createdAt: newMessage.createdAt, // Include the timestamp from the saved message
    };

    if (chatId.startsWith("group-")) {
      const groupId = chatId.split("group-")[1];
      
      
      const group = await Group.findOne({ id: groupId });
      //console.log("grouppppppp", group, groupId);
      if (
        group &&
        group.members.includes(sender.id) &&
        group.parentId === sender.parentId
      ) {
        group.members.forEach(async (memberId) => {
          const member = await User.findOne({ id: memberId });
          // const member = Array.from(users.values()).find(
          //   (u) => u.id === memberId
          // );
          if (member) {
            member.socketIds.forEach((socketId) => {
              //console.log("removedsocektidssss", socketId);
              io.to(socketId).emit("chat message", messageToSend); // Push the key into the array if the condition is met
            });
          }
        });
      }
    } else if (chatId === `employer-${sender.parentId}`) {
      io.to(chatId).emit("chat message", messageToSend); // Send message with timestamp
    } else if (receiver) {
      // const receiverSocket = Array.from(users.values()).find(
      //   (user) => user.id === receiver && user.parentId === sender.parentId
      // )?.socketId;

      const allrecieverSockets = await User.findOne({ id: receiver });
      const allsenderrSockets = await User.findOne({ id: sender.id });

      // const receiverSockets = Array.from(users.values())
      //   .filter((user) => user.id === receiver)
      //   .map((user) => user.socketId);
      // const senderSockets = Array.from(users.values())
      //   .filter((user) => user.id === sender.id)
      //   .map((user) => user.socketId);
      if (allrecieverSockets) {
        allrecieverSockets.socketIds.forEach((socketId) => {
          io.to(socketId).emit("chat message", messageToSend); // Send message with timestamp
        });
      }
      if (allsenderrSockets) {
        allsenderrSockets.socketIds.forEach((socketId) => {
          io.to(socketId).emit("chat message", messageToSend); // Send message to sender with timestamp
        });
      }
    }
  });

  socket.on("fetch chat history", async (chatId) => {
    const chatHistory = await Message.find({ chatId }).sort({ createdAt: 1 });
    socket.emit("chat history", chatHistory);
  });

  // socket.on("check-available", (data) => {
  //   //console.log("data", data);
  //   const { useroncall, signalData } = data;
  //   const userdetails = users.get(socket.id);
  //   //console.log("userdetails", userdetails, useroncall);
  //   const userToCall = Array.from(users.values()).find(
  //     (user) => user.id === useroncall.id
  //   );
  //   if (userToCall) {
  //     io.to(userToCall.socketId).emit("check-call", {
  //       signal: signalData,
  //       from: socket.id,
  //       useroncall: userdetails,
  //     });
  //   }
  // });

  // socket.on("response", (data) => {
  //   io.to(data.from).emit("response-final", data);
  //   //console.log("ddddd", data);
  // });
  socket.on("call-user", async (data) => {
    //console.log("usrs", users);
    //console.log("data", data);
    const { useroncall, signalData, currentid } = data;
    console.log("useroncall", useroncall.id, currentid);

    if (useroncall && useroncall.id) {
      //const userdetails = users.get(socket.id);
      const userdetails = await User.findOne({ id: currentid.userid });
      console.log("userdetails", userdetails);
      const userToCall = await User.findOne({ id: useroncall.id });
      // const userToCall = Array.from(users.values())
      //   .reverse()
      //   .find((user) => user.id === useroncall.id);

      if (userToCall.socketIds.length > 0) {
        io.to(userToCall.socketIds[userToCall.socketIds.length - 1]).emit(
          "incoming-call",
          {
            signal: signalData,
            from: currentid.userid,
            useroncall: userdetails,
          }
        );
      }
    }
  });

  socket.on("answer-call", async (data) => {
    console.log("dddddddddddda", data.to, socket.id, data.groupcall);
    //let current = users.get(socket.id);
    //console.log("ansswerrr-calll", data);
    const current = await User.findOne({ id: data.user.userid });
    const caller = await User.findOne({ id: data.to });
    const mygroup = await Group.findOne({ id: data.groupcall });
    console.log("mygroup",mygroup)
    if (current) {
      callingsockets.push(current.id);
      // current.socketIds.forEach((socketId) => {
      //    // Send message with timestamp
      // });
    }
    if (caller) {
      callingsockets.push(caller.id);
      // caller.socketIds.forEach((socketId) => {
      //   callingsockets.push(socketId); // Send message with timestamp
      // });
    }
    //let usersWithSameParent = [];
    const usersWithSameParentt = await User.find({
      parentId: current.parentId,
    });
    usersWithSameParentt.forEach((user) => {
      user.socketIds.forEach((socketid) => {
        io.to(socketid).emit("i am on call", callingsockets);
      });
    });
    //console.log("usersonccall", users);
    if(mygroup){
      const updatedGroup = await Group.findOneAndUpdate(
        { id: mygroup.id }, // Use `findOneAndUpdate` instead of `findByIdAndUpdate`
        { $addToSet: { oncall: current.id } }, // Push current user ID into `oncall` array
        { new: true } // Return the updated document
      );
    }

    updateGroupList(mygroup.members);
    
    //console.log("uuuuuuusssserrrrrwwwwiiitthhhhpareeentnt", usersWithSameParentt);
    // users.forEach((value, key) => {
    //console.log("valueparent", value.parentId,useroncall);
    // if (data.groupcall) {
    //   //console.log("vvvvvvvvvvvvvv", value);
    //   if (value.id === data.to || key === socket.id) {
    //     //console.log("111", key);
    //     callingsockets.push(key);
    //   }
    // } else {
    //   if (key === data.to || key === socket.id) {
    //     callingsockets.push(key);
    //     //console.log("22222", key);
    //   }
    // }

    //   if (current.parentId === value.parentId) {
    //     //console.log("datasocket", value.socketId);
    //     usersWithSameParent.push(value.socketId);
    //   }
    // });
    //console.log("ddddooooooooo", usersWithSameParent, callingsockets);
    // for (let i = 0; i < usersWithSameParent.length; i++) {
    //   //console.log("userswithsame", usersWithSameParent[i]);
    //   io.to(usersWithSameParent[i]).emit("i am on call", callingsockets);
    // }
    if (!data.groupcall) {
      io.to(data.to).emit("call-accepted", data.signal);
    }
  });

  socket.on("end-call", async (user, targetUserId, data2, videoid) => {
    console.log("targetuserid", user, targetUserId, data2, videoid);
    //let current = users.get(socket.id);
    const current = await User.findOne({ id: user.userid });
    let targetuser;
    //data2.videoid= videoid;
    if (data2) {
      targetuser = await User.findOne({ id: targetUserId.userid });
      targetUserId = targetUserId.userid;
      console.log("data2", data2);
      data2.members.forEach(async(memberId)=>{
        const member = await User.findOne({ id: memberId });
        if(member){
          member.socketIds.forEach((socketid)=>{
            io.to(socketid).emit("call-ended", targetuser.id,current.id);
          })
        }

        
      })
      removeOnCallUser(data2.id, current.id, socket.id);
      console.log("check1.1");
    } else {
      targetuser = await User.findOne({ id: targetUserId });
      targetuser.socketIds.forEach((socketid) => {
        io.to(socketid).emit("call-ended", targetuser.id);
      });
      // users.forEach((value, key) => {
      //   console.log("valuid", value.id);
      //   if (value.id === targetUserId) {
      //     io.to(value.socketId).emit("call-ended", socket.id, data2);
      //   }
      // });
    }
    console.log("check2");
    const usersWithSameParentt = await User.find({
      parentId: current.parentId,
    });
    usersWithSameParentt.forEach((user) => {
      user.socketIds.forEach((socketid) => {
        io.to(socketid).emit(
          "call-list-update",
          current.id,
          targetuser.id,
          videoid
        );
      });
    });

    // let usersWithSameParent = [];
    //let callingsockets =[];

    //console.log("usersonccall", users);
    // users.forEach((value, key) => {
    //   //console.log("valueparent", value.parentId,useroncall);

    //   if (current.parentId === value.parentId) {
    //     //console.log("datasocket", value.socketId);
    //     usersWithSameParent.push(value.socketId);
    //   }
    // });
    //console.log("ddddooooooooo", usersWithSameParent);

    // const targetSockets = Array.from(users.values())
    //   .filter((user) => user.id === targetUserId) // Find all users that match the condition
    //   .map((user) => user.socketId); // Extract their socketIds
    //console.log("targetsockets", targetSockets, users);
    // for (let i = 0; i < usersWithSameParent.length; i++) {
    //   //console.log("userswithsame", usersWithSameParent[i]);

    //   //console.log("userswithsameparent", usersWithSameParent);
    //   io.to(usersWithSameParent[i]).emit(
    //     "call-list-update",
    //      current.id,
    //     targetuser.id,
    //     videoid
    //   );
    // }

    // Emit to each socketId that satisfies the condition
    // console.log(
    //   "ttttttttttaaaaaaaaaaaaarrrgegeee",
    //   targetSockets,
    //   callingsockets
    // );

    for (let i = callingsockets.length - 1; i >= 0; i--) {
      console.log(
        "calling sockets",
        callingsockets[i],
        current.socketIds,
        callingsockets.length
      );
      if (
        callingsockets[i] === current.id ||
        callingsockets[i] === targetuser.id
      ) {
        console.log("deleteing sockkettt", callingsockets[i]);
        callingsockets.splice(i, 1);
      }
    }
  });

  socket.on("group-call", async (data1, data2, user) => {
    //console.log("group-call", data1,data2, user);
    const currentuser = await User.findOne({ id: user.userid });

    callingsockets.push(currentuser.id);
    //groupsoncall.push(data1.name);
    //console.log("data1,id", data1.id);
    //const currentuser = users.get(socket.id);
    let sockets = [];
    //let usersWithSameParent = [];

    const usersWithSameParent = await User.find({
      parentId: currentuser.parentId,
    });

    // users.forEach((value, key) => {
    //   if (currentuser.parentId === value.parentId) {
    //     usersWithSameParent.push(value.socketId);
    //   }
    // });

    //const group = await Group.findOne({ id: data1.id });
    try {
      // Find the group by your custom `id` field
      const group = await Group.findOne({ id: data1.id });

      if (!group) {
        console.error("Group not found with id:", data1.id);
        return; // Exit if the group doesn't exist
      }

      // Update the group, adding the current user to the `oncall` array
      const updatedGroup = await Group.findOneAndUpdate(
        { id: data1.id }, // Use `findOneAndUpdate` instead of `findByIdAndUpdate`
        { $addToSet: { oncall: currentuser.id } }, // Push current user ID into `oncall` array
        { new: true } // Return the updated document
      );

      // if (updatedGroup) {
      //   console.log("Updated group with new oncall user:", updatedGroup);
      // } else {
      //   console.error("Failed to update group with id:", data1.id);
      // }

      data1.members = updatedGroup.members;
    } catch (error) {
      console.error("Error updating oncall users:", error);
      return; // Exit early if there's an error
    }

    //data1.members = group.members;
    let availablesocket = [];
    //console.log("availablessssssssssssss", data1.members);

    for (let j = 0; j < data1.members.length; j++) {
      let check = false;
      for (let i = 0; i < callingsockets.length; i++) {
        //const user = users.get(callingsockets[i]);
        //console.log("calling socketsssss", user.id, data1.members[j])
        if (data1.members[j] == callingsockets[i]) {
          check = true;
          //console.log("calling socketsssssinnnn", user.id, data1.members[j])
        }
      }
      if (!check) {
        availablesocket.push(data1.members[j]);
      }
    }

    data1.members = availablesocket;
    // for (let i = 0; i < usersWithSameParent.length; i++) {
    //   //console.log("userswithsame", usersWithSameParent[i]);
    //   io.to(usersWithSameParent[i]).emit(
    //     "i am on call",
    //     callingsockets,
    //     currentuser,
    //     data1
    //   );
    // }
    usersWithSameParent.forEach((user) => {
      user.socketIds.forEach((socketid) => {
        io.to(socketid).emit(
          "i am on call",
          callingsockets,
          currentuser,
          data1
        );
      });
    });
    //console.log("dddaaaaatttaa11groudpttttttttttttttttttttttttttttttttttt", availablesocket);
    //console.log("cuureeenntuser", currentuser);
    for (let i = 0; i < data1.members.length; i++) {
      const memberdetails = await User.findOne({ id: data1.members[i] });
      if (memberdetails && memberdetails.socketIds.length > 0) {
        sockets.push(
          memberdetails.socketIds[memberdetails.socketIds.length - 1]
        );
      }
      // const userToCall = Array.from(users.values())
      //   .reverse()
      //   .find(
      //     (user) => user.id === data1.members[i] && user.id != currentuser.id
      //   );
      // //console.log("usertocall", userToCall);
      // sockets.push(userToCall);
    }
    //console.log("socketssss",sockets);
    sockets.forEach((socket) => {
      //console.log("socketsforeach",socket);
      if (socket) {
        io.to(socket).emit("group-call-incoming", {
          signal: data2,
          from: currentuser.id,
          useroncall: currentuser,
          data: data1,
        });
        //io.to(socket.socketId).emit("group-call-incoming",data1.members,currentuser.socketId);
      }
    });
    // if (userToCall) {

    // }
  });
  socket.on("member-call", async (user, data1, data2, member) => {
    const currentuser = await User.findOne({ id: user.userid });
    const memberdata = await User.findOne({ id: member });

    //console.log("member-data and currentuser", currentuser.id, memberdata);

    let sockets = [];
    //console.log("cuureeenntuser", currentuser);
    // for(let i=0;i<data2.data.members.length;i++){

    try {
      // Find the group by your custom `id` field
      const group = await Group.findOne({ id: data2.data.id });
      
      console.log("gggggggggggggggggggggggggmmmmmmmmmmm", group)
      if (group) {
         // replace with the ID you want to check
        const isOnCall = group.oncall.includes(member);
        if (!isOnCall) {
          return;
        }
      }
      if (!group) {
        console.error("Group not found with id:", data2.data.id);
        return; // Exit if the group doesn't exist
      }

      // Update the group, adding the current user to the `oncall` array
      const updatedGroup = await Group.findOneAndUpdate(
        { id: data2.data.id }, // Use `findOneAndUpdate` instead of `findByIdAndUpdate`
        { $addToSet: { oncall: currentuser.id } }, // Push current user ID into `oncall` array
        { new: true } // Return the updated document
      );
    } catch (error) {
      console.error("Error updating oncall users:", error);
      return; // Exit early if there's an error
    }

    if (memberdata && memberdata.socketIds.length > 0) {
      sockets.push(memberdata.socketIds[memberdata.socketIds.length - 1]);
    }

    
    sockets.forEach((socket) => {
      //console.log("socketsforeach",socket);
      if (socket) {
        io.to(socket).emit("member-call-incoming", {
          signal: data1,
          from: currentuser.id,
          useroncall: currentuser,
          data: data2,
        });
        //console.log("dddddddddddddddddddd", socket);
        //io.to(socket.socketId).emit("group-call-incoming",data1.members,currentuser.socketId);
      }
    });
  });

  socket.on("join-group-call", async (user, data1, data2, member) => {
    const currentuser = await User.findOne({ id: user.userid });
    const memberdata = await User.findOne({ id: member });
    callingsockets.push(currentuser.id);
    //let currentuser = users.get(socket.id);
    //console.log("member-data", data1, data2, member);
    let usersWithSameParent = [];

    let sockets = [];
    //console.log("cuureeenntuser", currentuser);
    // for(let i=0;i<data2.data.members.length;i++){

    try {
      // Find the group by your custom `id` field
      const group = await Group.findOne({ id: data2.id });
      

      if (!group) {
        console.error("Group not found with id:", data2.id);
        return; // Exit if the group doesn't exist
      }
      console.log("join group members", group.members);
      

      removeOnCallUser(1, 2, socket.id);
      // Update the group, adding the current user to the `oncall` array
      const updatedGroup = await Group.findOneAndUpdate(
        { id: data2.id }, // Use `findOneAndUpdate` instead of `findByIdAndUpdate`
        { $addToSet: { oncall: currentuser.id } }, // Push current user ID into `oncall` array
        { new: true } // Return the updated document
      );
      // data1.data=updatedGroup;
      data2.oncall = updatedGroup.oncall;

      const usersWithSameParentt = await User.find({
        parentId: currentuser.parentId,
      });
      usersWithSameParentt.forEach((user) => {
        user.socketIds.forEach((socketid) => {
          io.to(socketid).emit("i am on call", callingsockets, currentuser);
        });
      });

      //const usersWithSameParent = Array.from(users.values())
      // users.forEach((value, key) => {
      //   if (currentuser.parentId === value.parentId) {
      //     usersWithSameParent.push(value.socketId);
      //   }
      // });
      // .reverse()
      // .find((user) => user.parentId === currentuser.parentId);
      // for (let i = 0; i < usersWithSameParent.length; i++) {
      //   //console.log("userswithsame", usersWithSameParent[i]);
      //   io.to(usersWithSameParent[i]).emit(
      //     "i am on call",
      //     callingsockets,
      //     currentuser
      //   );
      // }

      // if (updatedGroup) {
      //   console.log("Updated group with new oncall user:", updatedGroup);
      // } else {
      //   console.error("Failed to update group with id:", data1.id);
      // }

      //data2.members = updatedGroup.members;
      updateGroupList(group.members)
    } catch (error) {
      console.error("Error updating oncall users:", error);
      return; // Exit early if there's an error
    }

    if (memberdata && memberdata.socketIds.length > 0) {
      sockets.push(memberdata.socketIds[memberdata.socketIds.length - 1]);
    }

    // const userToCall = Array.from(users.values())
    //   .reverse()
    //   .find((user) => user.id === member);
    // //console.log("usertocall", userToCall);
    // sockets.push(userToCall);
    // }
    //console.log("socketsssss", sockets);
    sockets.forEach((socket) => {
      //console.log("socketsforeach",socket);
      if (socket) {
        io.to(socket).emit("member-call-incoming", {
          signal: data1,
          from: currentuser.id,
          useroncall: currentuser,
          data: data2,
        });
        //console.log("dddddddddddddddddddd", socket);
        //io.to(socket.socketId).emit("group-call-incoming",data1.members,currentuser.socketId);
      }
    });
  });

  socket.on("group-call-declined", async (data) => {
    console.log("declined", data.userid);

    const user = await User.findOne({ id: data.userid });
    const groupList = await Group.find({ members: { $in: user.id } });
    user.socketIds.forEach((socketid) => {
      io.to(socketid).emit("group list", groupList);
    });
  });

  socket.on("disconnect", async () => {
    const user = users.get(socket.id);
    console.log("user", users, socket.id);
    if (user) {
      removeSocketIdFromUser(user.id, socket.id);
    }

    if (user) {
      console.log("User disconnected:", user.username);
      users.delete(socket.id);

      try {
        // Find all groups where the user is currently on call
        const groupsWithUserOnCall = await Group.find({ oncall: user.id });

        if (groupsWithUserOnCall.length === 0) {
          console.log(`User ${user.id} is not on call in any group`);
          return;
        }

        // Iterate through each group and remove the user from `oncall`
        for (const group of groupsWithUserOnCall) {
          await Group.findOneAndUpdate(
            { id: group.id },
            { $pull: { oncall: user.id } }, // Remove the user from `oncall`
            { new: true }
          );
          console.log(
            `Removed user ${user.id} from oncall in group ${group.id}`
          );
        }
      } catch (error) {
        console.error("Error during user disconnect:", error);
      }
      // await User.deleteOne({ id: user.id });
      // await updateUserList(user.parentId);
    }
  });
});

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
