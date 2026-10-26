import { useParams } from 'react-router-dom';
import RoomScreen from '../room/RoomScreen.jsx';

// /r/:code opens a saved room. The key makes the screen start fresh when the code changes.
export default function RoomPage() {
  const { code } = useParams();
  return <RoomScreen key={code} code={code} />;
}
