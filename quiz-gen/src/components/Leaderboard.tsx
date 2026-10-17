import { Trophy } from "lucide-react";
import type { LobbyPlayerView } from "../features/shared/types";
import { cn } from "../lib/cn";

type LeaderboardProps = {
  players: LobbyPlayerView[];
  highlightPlayerId?: string | null;
};

export function Leaderboard({ players, highlightPlayerId }: LeaderboardProps) {
  if (!players.length) {
    return (
      <p className="leaderboard-empty">
        A clean slate. Who’s taking the top spot?
      </p>
    );
  }
  return (
    <div className="roster-list">
      {players.map((player) => (
        <div
          key={player.id}
          className={cn(
            "player-row leaderboard-row",
            player.id === highlightPlayerId && "is-you",
          )}
        >
          <span className={cn("rank", player.rank === 1 && "rank-first")}>
            {player.rank === 1 ? (
              <Trophy size={16} aria-label="First place" />
            ) : (
              String(player.rank).padStart(2, "0")
            )}
          </span>
          <div className="player-detail">
            <strong>
              {player.nickname}
              {player.id === highlightPlayerId ? (
                <span className="you-tag">You</span>
              ) : null}
            </strong>
            <span>
              {player.hasAnswered
                ? "Answered"
                : player.isConnected
                  ? "In the game"
                  : "Disconnected"}
            </span>
          </div>
          <strong className="player-score">
            {player.score.toLocaleString()}
            <small>pts</small>
          </strong>
        </div>
      ))}
    </div>
  );
}
