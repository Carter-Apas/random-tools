export const socketEvents = {
  hostCreateLobby: "host:createLobby",
  hostKickPlayer: "host:kickPlayer",
  playerJoinLobby: "player:joinLobby",
  playerLeaveLobby: "player:leaveLobby",
  gameStart: "game:start",
  playerSubmitAnswer: "player:submitAnswer",
  gameRestart: "game:restart",
  lobbySnapshot: "lobby:snapshot",
  lobbyError: "lobby:error",
  playerKicked: "player:kicked",
} as const;
