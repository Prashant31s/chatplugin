import React, { useState, useEffect, useCallback, useRef } from "react";
import io from "socket.io-client";
import Peer from "peerjs";

const ChatWindow = (userid) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [catcherId, setCatcherId] = useState("");
  const [userId, setUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState({});
  const [inputMessage, setInputMessage] = useState("");
  const [activeChat, setActiveChat] = useState("employer");
  const [selectedUser, setSelectedUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState({});
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [employerRoom, setEmployerRoom] = useState(null);

  const [peerId, setPeerId] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerInstance = useRef(null);
  const [useroncall, setUserOnCall]=useState(null);

  // useEffect(() => {
  //   console.log('Connection status changed:', isConnected);
  //   console.log('User ID:', userId);
  // }, [isConnected, userId]);
  // useEffect(()=>{
  //   //console.log("userid", userid)
  // },[userid])
  useEffect(() => {
    const newSocket = io("https://chatplugin-74io.onrender.com/");
    setSocket(newSocket);
    newSocket.on("connect", () => setIsConnected(true));
    newSocket.on("disconnect", () => setIsConnected(false));
    return () => newSocket.close();
  }, []);

  const login = useCallback(() => {
    if (catcherId.trim() !== "" && socket) {
      socket.emit("login", catcherId);
    }
  }, [socket, catcherId]);

  useEffect(() => {
    if (!socket) return;
    const peer = new Peer(undefined, {
  host: "https://chatplugin-74io.onrender.com/", // Change this to your actual backend URL
  secure: true,  // Use secure WebSocket (wss) connection
  path: "/peerjs/myapp", // Keep the same path as on your server
});

    peer.on("open", (id) => {
      console.log("My peer ID is: " + id);
      setPeerId(id);
    });

    peerInstance.current = peer;

    const handleMessage = (msg) => {
      //console.log("message",msg);
      setMessages((prevMessages) => {
        const chatId = msg.chatId;
        if (
          prevMessages[chatId]?.some((existingMsg) => existingMsg.id === msg.id)
        ) {
          return prevMessages;
        }
        return {
          ...prevMessages,
          [chatId]: [...(prevMessages[chatId] || []), msg],
        };
      });
    };

    socket.on("user list", (userList) => {
      setUsers(userList);
    });

    socket.on("group list", (allGroups) => {
      const filteredGroups = allGroups.filter((group) =>
        group.members.includes(userId)
      );
      setGroups(filteredGroups);
    });

    socket.on("sub-employee joined", (subEmployee) => {
      setUsers((prevUsers) => [...prevUsers, subEmployee]);
    });

    socket.on("chat message", handleMessage);
    socket.on("chat history", (history) => {
      setMessages((prevMessages) => ({
        ...prevMessages,
        [history[0]?.chatId]: history,
      }));
    });
    socket.on(
      "login successful",
      ({ user, usersWithSameParent, chatHistory }) => {
        //console.log('Received login successful', { user, usersWithSameParent });
        setUserId(user.id);
        setIsConnected(true);
        setEmployerRoom(`employer-${user.parentId}`);
        setUsers(usersWithSameParent);

        const organizedHistory = chatHistory.reduce((acc, msg) => {
          if (!acc[msg.chatId]) {
            acc[msg.chatId] = [];
          }
          acc[msg.chatId].push(msg);
          return acc;
        }, {});

        setMessages(organizedHistory);
      }
    );

    socket.on("login failed", (error) => {
      console.error("Login failed:", error);
      // Handle login failure (e.g., show an error message to the user)
    });

    socket.on("user joined", (user) =>
      setUsers((prevUsers) => [...prevUsers, user])
    );
    socket.on("user left", (userId) =>
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId))
    );
    socket.on("group created", (group) =>
      setGroups((prevGroups) => [...prevGroups, group])
    );
    socket.on("group list", setGroups);

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-ended", handleCallEnded);

    peer.on("call", handleIncomingPeerCall);
    socket.on("check-call", handlecheckcall);
    socket.on("response-final",handlereponsefinal);

    return () => {
      socket.off("chat message", handleMessage);
      socket.off("login successful");
      socket.off("login failed");
      socket.off("user list");
      socket.off("user joined");
      socket.off("user left");
      socket.off("group created");
      socket.off("group list");
      socket.off("sub-employee joined");

      socket.off("incoming-call", handleIncomingCall);
      peer.destroy();
      socket.off("call-ended", handleCallEnded);
    };
  }, [socket, userId]);
  const check=()=>{
    socket.emit("check-available",{
      useroncall: useroncall,
      signalData: peerId,
    })
  }
  const handlereponsefinal=(data)=>{
    console.log("dataaaaaaaa",data);
    startCall();
  }

  const handlecheckcall=(data)=>{
    console.log("remotestream-localstream", remoteStream,localStream,data)
    socket.emit ("response", data);
  }

  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      const call = peerInstance.current.call(selectedUser.id, stream);
      call.on("stream", handleStream);
      
      socket.emit("call-user", {
        useroncall: useroncall,
        signalData: peerId,
      });

      setIsCallActive(true);
    } catch (error) {
      console.error("Error starting call:", error);
    }
  }, [selectedUser, socket, peerId,useroncall]);

  const handleIncomingCall = useCallback((data) => {
    console.log("rrrrrrrr", useroncall,remoteStream,localStream);
    if(useroncall||localStream){
      socket.emit("user-in-call")
      console.log("data", data);
      return ;
    }
    console.log("incoming call", data);
    setIncomingCall(data);
    console.log("usersssssss", data.useroncall)
    setUserOnCall(data.useroncall);
  }, []);

  const handleIncomingPeerCall = useCallback(async (call) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      call.answer(stream);
      call.on("stream", handleStream);
      setIsCallActive(true);
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  }, []);

  const acceptCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      const call = peerInstance.current.call(incomingCall.signal, stream);
      call.on("stream", handleStream);

      socket.emit("answer-call", { signal: peerId, to: incomingCall.from });
      setIsCallActive(true);
      setIncomingCall(null);
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  }, [incomingCall, socket, peerId]);
  const calldeclined=()=>{
    setIncomingCall(null);
    console.log("useroncall", useroncall);
    endCall();
  }

  const handleStream = useCallback((remoteStream) => {
    setRemoteStream(remoteStream);
    
  }, []);

  const endCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
    
    // Notify the other peer that the call has ended
    socket.emit("end-call", useroncall.id);
    setUserOnCall(null);
  }, [localStream, selectedUser, socket,useroncall]);

  const handleCallEnded = useCallback(() => {
    console.log("call-ended");
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }
  
    console.log("remotestream ended", remoteStream, localStream);
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
    setUserOnCall(null);

    console.log("switch-off call");
  }, [endCall,localStream]);

  const getChatId = (user1, user2) => {
    return [user1, user2].sort().join("-");
  };

  useEffect(() => {
    console.log("remote stream", remoteStream,localStream);
  }, [remoteStream]);

  const sendMessage = useCallback(() => {
    if (inputMessage.trim() !== "" && socket) {
      const messageData = {
        id: Date.now().toString(),
        text: inputMessage,
        sender: userId,
        chatId:
          activeChat === "private"
            ? getChatId(userId, selectedUser?.id)
            : activeChat === "group"
            ? `group-${selectedGroup?.id}`
            : employerRoom,
        receiver: activeChat === "private" ? selectedUser?.id : undefined,
      };

      socket.emit("chat message", messageData);

      setMessages((prevMessages) => ({
        ...prevMessages,
        [messageData.chatId]: [
          ...(prevMessages[messageData.chatId] || []),
          messageData,
        ],
      }));

      setInputMessage("");
    }
  }, [
    socket,
    inputMessage,
    activeChat,
    selectedUser,
    selectedGroup,
    userId,
    employerRoom,
  ]);

  const selectUser = (user) => {
    setSelectedUser(user);
    if(!useroncall){
      setUserOnCall(user);
    }
    setActiveChat("private");
    setSelectedGroup(null);
    const chatId = getChatId(userId, user.id);
    socket.emit("fetch chat history", chatId);
  };

  const selectGroup = (group) => {
    setSelectedGroup(group);
    setActiveChat("group");
    setSelectedUser(null);
    const chatId = `group-${group.id}`;
    socket.emit("fetch chat history", chatId);
  };

  const createGroup = useCallback(() => {
    if (newGroupName.trim() !== "" && socket) {
      const members = Object.keys(selectedUsersForGroup).filter(
        (id) => selectedUsersForGroup[id]
      );
      const newGroup = {
        name: newGroupName,
        members: [...members, userId],
      };
      socket.emit("create group", newGroup);
      setNewGroupName("");
      setSelectedUsersForGroup({});
      setShowCreateGroupModal(false);
    }
  }, [socket, newGroupName, selectedUsersForGroup, userId]);

  const toggleUserForGroup = (userId) => {
    setSelectedUsersForGroup((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };
  const currentChatId =
    activeChat === "private" && selectedUser
      ? getChatId(userId, selectedUser.id)
      : activeChat === "group" && selectedGroup
      ? `group-${selectedGroup.id}`
      : employerRoom;

  const currentMessages = currentChatId ? messages[currentChatId] || [] : [];
  // ... (rest of the component logic remains the same)

  if (!isConnected || !userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-64">
          <input
            type="text"
            value={catcherId}
            onChange={(e) => setCatcherId(e.target.value)}
            placeholder="Enter your Catcher ID"
            className="w-full px-3 py-2 border rounded mb-4"
          />
          <button
            onClick={login}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen max-w-4xl mx-auto p-4">
      {/* {selectedUser && (
        <div className="mt-4">
          {!isCallActive && (
            <button
              onClick={startCall}
              className="bg-green-500 text-white px-4 py-2 rounded mr-2"
            >
              Start Voice Call
            </button>
          )}
          {isCallActive && (
            <button
              onClick={endCall}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              End Call
            </button>
          )}
        </div>
      )} */}

      {incomingCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Incoming Call</h2>
            <p>
              {users.find((u) => u.id === incomingCall.from)?.username} is
              calling you.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={calldeclined}
                className="bg-red-500 text-white px-4 py-2 rounded mr-2"
              >
                Decline
              </button>
              <button
                onClick={acceptCall}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-1/3 mr-4">
        <div className="mb-4">
          <button
            className={`px-4 py-2 mr-2 ${
              activeChat === "private"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
            onClick={() => setActiveChat("private")}
          >
            Users
          </button>
          <button
            className={`px-4 py-2 mr-2 ${
              activeChat === "group" ? "bg-blue-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => setActiveChat("group")}
          >
            Groups
          </button>
          {/* <button
            className={`px-4 py-2 ${activeChat === 'employer' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setActiveChat('employer')}
          >
            Employer Room
          </button> */}
        </div>

        {activeChat === "private" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Users</h2>
            <div className="h-64 border rounded p-2 overflow-y-auto">
              {users
                .filter((user) => user.id !== userId)
                .map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center p-2 cursor-pointer hover:bg-gray-100 ${
                      selectedUser?.id === user.id ? "bg-gray-200" : ""
                    }`}
                    onClick={() => selectUser(user)}
                  >
                    <span>
                      {user.username} ({user.userType})
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeChat === "group" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Groups</h2>
            <div className="h-48 border rounded p-2 mb-2 overflow-y-auto">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className={`p-2 cursor-pointer hover:bg-gray-100 ${
                    selectedGroup?.id === group.id ? "bg-gray-200" : ""
                  }`}
                  onClick={() => selectGroup(group)}
                >
                  {group.name}
                </div>
              ))}
            </div>
            <button
              className="w-full bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => setShowCreateGroupModal(true)}
            >
              Create New Group
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col w-2/3">
        <div className="flex flex-row ">
          <h2 className="text-lg font-semibold mb-2">
            {activeChat === "private" && selectedUser
              ? `Chat with ${selectedUser.username}`
              : activeChat === "group" && selectedGroup
              ? `Group: ${selectedGroup.name}`
              : activeChat === "employer"
              ? "Employer Room"
              : "Select a user, group, or room to chat"}
          </h2>

          {useroncall && (
            <div className="mt-4">
              {!isCallActive && (
                <button
                  onClick={startCall}
                  className="bg-green-500 text-white px-4 py-2 rounded mr-2"
                >
                  Start Voice Call
                </button>
              )}
              {isCallActive && (
                <button
                  onClick={endCall}
                  className="bg-red-500 text-white px-4 py-2 rounded"
                >
                  End Call
                </button>
              )}
            </div>
          )}
          {isCallActive && (
            <div className="mt-4  flex flex-col">
              <p className="h-[10px]">Call in progress with </p>
              <audio
                ref={(audio) => {
                  if (audio && remoteStream) {
                    audio.srcObject = remoteStream;
                    audio.play();
                  }
                }}
              />
            </div>
          )}
        </div>

        <div className="flex-grow mb-4 border rounded p-2 overflow-y-auto">
          {currentMessages.map((message, index) => (
            <div
              key={index}
              className={`mb-2 ${
                message.sender === userId ? "text-right" : "text-left"
              }`}
            >
              <span className="font-bold">
                {message.sender === userId
                  ? "You"
                  : users.find((u) => u.id === message.sender)?.username}
                :
              </span>{" "}
              {message.text}
            </div>
          ))}
        </div>

        <div className="flex">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow mr-2 px-2 py-1 border rounded"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </div>
      </div>

      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Create a New Group</h2>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group Name"
              className="w-full px-2 py-1 border rounded mb-4"
            />
            <div className="mb-4">
              <h3 className="mb-2 font-semibold">Select Users:</h3>
              {users
                .filter((user) => user.id !== userId)
                .map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-2 mb-2"
                  >
                    <input
                      type="checkbox"
                      id={`user-${user.id}`}
                      checked={selectedUsersForGroup[user.id] || false}
                      onChange={() => toggleUserForGroup(user.id)}
                    />
                    <label htmlFor={`user-${user.id}`}>{user.username}</label>
                  </div>
                ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="mr-2 px-4 py-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={createGroup}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
