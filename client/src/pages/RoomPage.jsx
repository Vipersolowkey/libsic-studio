// Part of: Room page (/r/:code): opens a saved room.
// Uses: RoomScreen.jsx.
// Used by: App.jsx.
import { useParams } from 'react-router-dom';
import RoomScreen from '../room/RoomScreen.jsx';

// /r/:code opens a saved room. key={code} resets all room state when the code changes.
export default function RoomPage() {
  const { code } = useParams();
  return <RoomScreen key={code} code={code} />;
}
