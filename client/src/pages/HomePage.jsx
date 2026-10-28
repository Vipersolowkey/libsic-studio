import { Navigate } from 'react-router-dom';
import { getLastRoomCode } from '../myRooms.js';
import RoomScreen from '../room/RoomScreen.jsx';

// The start page: reopens the room this browser used last, or starts a new one.
export default function HomePage() {
  const last = getLastRoomCode();
  if (last) return <Navigate to={`/r/${last}`} replace />;
  return <RoomScreen />;
}
