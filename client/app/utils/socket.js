// frontend/utils/socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:8000/"); // Ensure this URL matches your backend server

export default socket;
