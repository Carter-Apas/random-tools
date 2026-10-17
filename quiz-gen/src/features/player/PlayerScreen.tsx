import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Radio,
  Trophy,
} from "lucide-react";
import type { LobbySnapshot } from "../shared/types";
import { getSocket, type ClientSocketLike } from "../../lib/socket";
import { Leaderboard } from "../../components/Leaderboard";
import { Panel, AccentButton, SectionLabel, Shell } from "../../components/ui";
import { TimerBar } from "../../components/TimerBar";

type PlayerScreenProps = {
  socket?: ClientSocketLike;
};

export function PlayerScreen({ socket = getSocket() }: PlayerScreenProps) {
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleSnapshot = (nextSnapshot: LobbySnapshot) => {
      setError(null);
      setSnapshot(nextSnapshot);
    };
    const handleError = (payload: { message: string }) =>
      setError(payload.message);
    const handleKicked = () => {
      setSnapshot(null);
      setError("You were removed from the lobby.");
    };

    socket.connect();
    socket.on("lobby:snapshot", handleSnapshot);
    socket.on("lobby:error", handleError);
    socket.on("player:kicked", handleKicked);

    return () => {
      socket.off("lobby:snapshot", handleSnapshot);
      socket.off("lobby:error", handleError);
      socket.off("player:kicked", handleKicked);
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    if (!snapshot?.me || !snapshot.code) {
      return;
    }

    const handlePageHide = () => {
      socket.emit("player:leaveLobby", { code: snapshot.code });
      socket.disconnect();
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [snapshot?.code, snapshot?.me, socket]);

  const isJoined = Boolean(snapshot?.me);
  const currentQuestion = snapshot?.currentQuestion;
  const showCorrectCelebration =
    snapshot?.status === "question_result" &&
    snapshot.me?.answerWasCorrect === true;
  const isQuestionVisible =
    Boolean(currentQuestion) &&
    ["question_live", "question_result"].includes(snapshot?.status ?? "");
  const isLeaderboardPhase = snapshot?.status === "leaderboard";
  const hasNextQuestion =
    typeof snapshot?.currentQuestionIndex === "number" &&
    snapshot.currentQuestionIndex < snapshot.totalQuestions - 1;

  return (
    <Shell>
      <div
        className={`page-heading ${isJoined ? "player-heading-joined" : ""}`}
      >
        <div>
          <p className="eyebrow">A seat at the table</p>
          <h1>{isJoined ? "You’re in good company." : "Come on in."}</h1>
          <p>
            {isJoined
              ? "Trust your gut. The best guess might be yours."
              : "One room code. Your favourite nickname. You’re in."}
          </p>
        </div>
        <span className="context-tag">
          <Radio size={15} /> Player view
        </span>
      </div>
      <div
        className={`player-layout ${isJoined ? "player-layout-joined" : ""}`}
      >
        <div className="side-column">
          <Panel className="join-panel">
            {!isJoined ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (code.trim() && nickname.trim()) {
                    socket.emit("player:joinLobby", {
                      code: code.trim(),
                      nickname: nickname.trim(),
                    });
                  }
                }}
              >
                <SectionLabel>Your invite</SectionLabel>
                <h2>Join a lobby</h2>
                <p className="panel-description">
                  The host has your room code.
                </p>
                <label className="field">
                  <span>Room code</span>
                  <input
                    aria-label="Room code"
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.toUpperCase())
                    }
                    className="code-input"
                    placeholder="ABCD"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </label>
                <label className="field">
                  <span>Nickname</span>
                  <input
                    aria-label="Nickname"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder="What should we call you?"
                    autoComplete="nickname"
                    required
                  />
                </label>
                <AccentButton
                  className="join-submit"
                  type="submit"
                  disabled={!code.trim() || !nickname.trim()}
                >
                  Join lobby
                  <ArrowRight size={18} />
                </AccentButton>
                <p className="form-footnote">
                  No sign-up. No downloads. Just play.
                </p>
              </form>
            ) : (
              <div className="player-identity">
                <SectionLabel>You are in</SectionLabel>
                <p className="identity-room">{snapshot?.code}</p>
                <div className="identity-name">
                  <span className="player-avatar">
                    {snapshot?.me?.nickname.slice(0, 1).toUpperCase()}
                  </span>
                  <strong>{snapshot?.me?.nickname}</strong>
                  <span className="you-tag">You</span>
                </div>
                <div className="score-display">
                  <span>Your score</span>
                  <strong>
                    {(snapshot?.me?.score ?? 0).toLocaleString()}
                    <small>pts</small>
                  </strong>
                </div>
                <p className="player-status">
                  <span className="status-dot" />
                  {snapshot?.status === "ready" ||
                  snapshot?.status === "collecting"
                    ? "Waiting for the host to start the game."
                    : snapshot?.status === "leaderboard"
                      ? hasNextQuestion
                        ? "Round complete. Next question coming up."
                        : "The final standings are in."
                      : snapshot?.status === "finished"
                        ? "Stay for another round?"
                        : "The round is live."}
                </p>
              </div>
            )}
            {error ? (
              <div className="error-message" role="alert">
                {error}
              </div>
            ) : null}
          </Panel>
          {isJoined ? (
            <Panel className="leaderboard-panel">
              <div className="panel-heading">
                <SectionLabel>Leaderboard</SectionLabel>
                <Trophy size={17} className="muted-icon" />
              </div>
              <Leaderboard
                players={snapshot?.players ?? []}
                highlightPlayerId={snapshot?.me?.id}
              />
            </Panel>
          ) : (
            <div className="host-tip">
              <span>↳</span>
              <p>
                Playing together? Keep the host’s screen in view and use your
                phone for answers.
              </p>
            </div>
          )}
        </div>
        <Panel
          className={`play-board ${!isQuestionVisible && !isLeaderboardPhase ? "play-board-waiting" : ""}`}
        >
          {isQuestionVisible && currentQuestion ? (
            <>
              <div className="question-heading">
                <SectionLabel>
                  Question {snapshot!.currentQuestionIndex + 1} of{" "}
                  {snapshot!.totalQuestions}
                </SectionLabel>
                {snapshot?.me?.answerLocked ? (
                  <span className="locked-badge">
                    <Check size={14} />
                    Locked in
                  </span>
                ) : (
                  <span className="question-hint">Your first instinct?</span>
                )}
              </div>
              <h2 className="question-title">{currentQuestion.prompt}</h2>
              <TimerBar
                startedAt={currentQuestion.startedAt}
                endsAt={currentQuestion.endsAt}
                isActive={snapshot?.status === "question_live"}
              />
              {showCorrectCelebration ? (
                <div className="correct-notice" role="status">
                  <CheckCircle2 size={22} />
                  <div>
                    <strong>Correct!</strong>
                    <span>A good guess, or did you know that one?</span>
                  </div>
                </div>
              ) : null}
              <div className="answer-grid">
                {currentQuestion.options.map((option, index) => {
                  const selected = snapshot?.me?.selectedAnswerIndex === index;
                  const revealedCorrect =
                    currentQuestion.correctIndex === index;
                  const revealedWrong =
                    typeof currentQuestion.correctIndex === "number" &&
                    selected &&
                    !revealedCorrect;
                  return (
                    <button
                      key={option}
                      onClick={() =>
                        snapshot &&
                        socket.emit("player:submitAnswer", {
                          code: snapshot.code,
                          answerIndex: index,
                        })
                      }
                      disabled={
                        snapshot?.status !== "question_live" ||
                        snapshot?.me?.answerLocked
                      }
                      aria-pressed={selected}
                      className={[
                        "answer-tile",
                        selected ? "answer-selected" : "",
                        revealedCorrect ? "answer-correct" : "",
                        revealedWrong ? "answer-wrong" : "",
                      ].join(" ")}
                    >
                      <span className="answer-letter">{"ABCD"[index]}</span>
                      <span>{option}</span>
                      {revealedCorrect ? (
                        <Check size={18} className="answer-check" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {currentQuestion.explanation ? (
                <div className="explanation">
                  <SectionLabel>A little more to know</SectionLabel>
                  <p>{currentQuestion.explanation}</p>
                  {snapshot?.me?.lastScoreAwarded !== null ? (
                    <p className="round-score">
                      Score this round: {snapshot?.me?.lastScoreAwarded}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="answer-footnote">
                  {snapshot?.me?.answerLocked
                    ? "Answer saved. Let’s see how everyone did."
                    : "Pick one answer. The quicker you are, the more you score."}
                </p>
              )}
            </>
          ) : isLeaderboardPhase ? (
            <div className="phase-message">
              <span className="empty-icon">
                <Trophy size={28} />
              </span>
              <SectionLabel>
                {hasNextQuestion ? "Round results" : "Final leaderboard"}
              </SectionLabel>
              <h2>
                {hasNextQuestion ? "Next round in" : "And that’s a game."}
              </h2>
              <p>
                {hasNextQuestion
                  ? "Take a breath. Check the scores. We’ll be right back."
                  : "Bragging rights have been awarded. Thanks for playing."}
              </p>
              {hasNextQuestion ? (
                <TimerBar
                  startedAt={snapshot?.phaseStartedAt ?? null}
                  endsAt={snapshot?.phaseEndsAt ?? null}
                  isActive
                  label="Next round in"
                />
              ) : null}
            </div>
          ) : (
            <div className="waiting-content">
              <span className="waiting-art" aria-hidden="true">
                <span className="waiting-circle" />
                <CircleHelp size={64} strokeWidth={1.2} />
                <span className="waiting-star">✳</span>
              </span>
              <SectionLabel>
                {snapshot?.status === "finished"
                  ? "Waiting room"
                  : isJoined
                    ? "You’re on the list"
                    : "A little curiosity goes a long way"}
              </SectionLabel>
              <h2>
                {snapshot?.status === "finished"
                  ? "That was a good round."
                  : isJoined
                    ? "Everyone’s getting settled."
                    : "Your next good guess is right here."}
              </h2>
              <p>
                {snapshot?.status === "finished"
                  ? "Waiting for the host. Stay in the room for a rematch."
                  : isJoined
                    ? "The host will start the game when everyone’s ready. Get comfortable."
                    : "Join your friends for a few questions, a few surprises, and something new to talk about."}
              </p>
              <div className="waiting-detail">
                <span className="status-dot" />
                {isJoined
                  ? "Waiting for the first question"
                  : "Made for friends. Played from anywhere."}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </Shell>
  );
}
