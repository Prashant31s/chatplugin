// frontend/pages/api/messages.js
import axios from 'axios';

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const { appId } = req.query;
        const response = await axios.get(`https://chatplugin-backend.onrender.com/api/messages?appId=${appId}`);
        res.status(500).json(response.data);
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch messages' });
      }
      break;

    case 'POST':
      try {
        const { appId, message } = req.body;
        const response = await axios.post('https://chatplugin-backend.onrender.com/api/messages', { appId, message });
        res.status(201).json(response.data);
      } catch (error) {
        res.status(500).json({ message: 'Failed to send message' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
      break;
  }
}
