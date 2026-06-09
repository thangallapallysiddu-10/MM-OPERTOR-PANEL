import { useState } from 'react';
import { Request, Track } from '../types';
import { useAppStore } from '../../../store/useAppStore';

interface UseRequestsProps {
  activeChannel: number;
  setLocalCurrentTrack: (track: Track) => void;
  setCurrentTrack: (track: Track) => void;
  addNotification: (type: "request" | "system" | "alert", message: string) => void;
  loadIntoStandbyPlayer: (track: Track) => void;
}

export const useRequests = ({ 
  activeChannel, 
  setLocalCurrentTrack, 
  setCurrentTrack, 
  addNotification,
  loadIntoStandbyPlayer
}: UseRequestsProps) => {
  const { rjStudio, updateRjStudioState } = useAppStore();
  
  const [newRequest, setNewRequest] = useState<string>("");
  const [songUrl, setSongUrl] = useState("");
  const [showSongUrlInput, setShowSongUrlInput] = useState(false);
  
  const requests = rjStudio.songRequests;
  const setRequests = (fn: any) => {
    if (typeof fn === 'function') {
      updateRjStudioState({ songRequests: fn(requests) });
    } else {
      updateRjStudioState({ songRequests: fn });
    }
  };

  const handleNewRequest = (): void => {
    if (!newRequest.trim()) return;
    const newReq = { 
      id: Date.now(), 
      user: "Listener", 
      song: newRequest, 
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), 
      played: false,
      votes: 0,
      hasVoted: false
    };
    setRequests([newReq, ...requests]);
    setNewRequest("");
    addNotification("request", `🎵 New request: ${newRequest}`);
  };

  const voteRequest = (requestId: number) => {
    setRequests((prev: any[]) => prev.map((req: any) => 
      req.id === requestId && !req.hasVoted
        ? { ...req, votes: req.votes + 1, hasVoted: true }
        : req
    ));
  };

 const playRequest = (req: any): void => {
  setRequests((prev: any[]) => prev.map((r: any) => 
    r.id === req.id ? { ...r, played: true } : r
  ));
  
  let songTitle = req.song.split(" - ")[0] || req.song;
  let artist = req.song.includes(" - ") ? req.song.split(" - ")[1] : "Requested";
    
    const requestedTrack: Track = {
    id: Date.now(),
    title: songTitle,
    artist: artist,
    duration: "3:30",
    bpm: 120,
    channel: activeChannel || 1,
    beatIntensity: 70,
    shortTitle: songTitle.substring(0, 6).toUpperCase(),
    gain: 70,
    eq: { low: 50, mid: 50, high: 50 },
    fx: { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 }
  };
  
  loadIntoStandbyPlayer(requestedTrack);
  addNotification("system", `📀 "${songTitle}" loaded into standby. Click PLAY SONG on the player to broadcast!`);
};

  const handleUrlSubmit = (): boolean => {
    if (!songUrl.trim()) {
      addNotification("system", "❌ Please enter a valid URL");
      return false;
    }
    
    let songName = "🎵 URL Track";
    let artist = "External Source";
    
    if (songUrl.includes("youtube.com") || songUrl.includes("youtu.be")) {
      songName = "YouTube Track";
      artist = "YouTube";
    } else if (songUrl.includes("spotify.com")) {
      songName = "Spotify Track";
      artist = "Spotify";
    } else if (songUrl.includes("soundcloud.com")) {
      songName = "SoundCloud Track";
      artist = "SoundCloud";
    }
    
    const newReq = { 
      id: Date.now(), 
      user: "Listener", 
      song: songName, 
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), 
      played: false,
      votes: 0,
      hasVoted: false
    };
    setRequests([newReq, ...requests]);
    
    const urlTrack: Track = {
      id: Date.now(),
      title: songName,
      artist: artist,
      bpm: 125,
      beatIntensity: 70,
      duration: "3:30",
      channel: activeChannel || 1,
      shortTitle: "URL",
      gain: 70,
      eq: { low: 50, mid: 50, high: 50 },
      fx: { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 }
    };
    
    loadIntoStandbyPlayer(urlTrack);
    addNotification("system", `📀 URL loaded into standby. Click PLAY SONG on the player to broadcast!`);
    
    setShowSongUrlInput(false);
    setSongUrl("");
    return true;
  };

  return {
    requests,
    newRequest,
    setNewRequest,
    songUrl,
    setSongUrl,
    showSongUrlInput,
    setShowSongUrlInput,
    handleNewRequest,
    voteRequest,
    playRequest,
    handleUrlSubmit,
  };
};